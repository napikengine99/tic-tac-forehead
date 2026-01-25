const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

let users = [];       // {id, name, ws}
let duels = [];       // {id, playerX, playerO, board, turn}

// simple unique ID generator
const genId = () => Math.floor(Math.random() * 1000000);

// broadcast online users to everyone
function broadcastUserList() {
  const list = users.map(u => ({ id: u.id, name: u.name }));
  users.forEach(u => {
    u.ws.send(JSON.stringify({ type: "userList", list }));
  });
}

// handle moves and check win
function checkWin(board, mark){
    const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(line=>line.every(i=>board[i]===mark));
}

wss.on("connection", ws => {
  let currentUser = null;

  ws.on("message", msg => {
    let data;
    try { data = JSON.parse(msg); } catch(e){return;}

    if(data.type === "setName"){
      const id = genId();
      currentUser = { id, name: data.name, ws };
      users.push(currentUser);
      ws.send(JSON.stringify({ type: "assignId", userId: id }));
      broadcastUserList();
    }

    // challenge another user
    if(data.type === "challenge"){
      const target = users.find(u => u.id === data.target);
      if(target) target.ws.send(JSON.stringify({
        type: "challengeRequest",
        from: currentUser.id,
        name: currentUser.name
      }));
    }

    // response to challenge
    if(data.type === "challengeResponse"){
      const fromUser = users.find(u => u.id === data.from);
      if(fromUser){
        if(data.accept){
          const duelId = genId();
          const duel = {
            id: duelId,
            playerX: fromUser.id,
            playerO: currentUser.id,
            board: Array(9).fill(null),
            turn: fromUser.id
          };
          duels.push(duel);

          // notify both players
          fromUser.ws.send(JSON.stringify({
            type: "duelStart",
            duelId,
            yourId: fromUser.id,
            opponent: currentUser.name
          }));
          currentUser.ws.send(JSON.stringify({
            type: "duelStart",
            duelId,
            yourId: currentUser.id,
            opponent: fromUser.name
          }));
        } else {
          fromUser.ws.send(JSON.stringify({ type: "challengeDenied", from: currentUser.name }));
        }
      }
    }

    // player move
    if(data.type === "move"){
      const duel = duels.find(d => d.id === data.duelId);
      if(!duel) return;
      if(duel.board[data.index]) return; // already filled
      if(duel.turn !== currentUser.id) return; // not your turn

      duel.board[data.index] = data.mark;
      duel.turn = (duel.turn === duel.playerX) ? duel.playerO : duel.playerX;

      // broadcast updated board
      [duel.playerX, duel.playerO].forEach(pid=>{
        const u = users.find(u => u.id === pid);
        if(u){
          u.ws.send(JSON.stringify({
            type: "updateBoard",
            board: duel.board,
            turn: duel.turn
          }));
        }
      });
    }
  });

  ws.on("close", ()=>{
    if(currentUser){
      users = users.filter(u => u.id !== currentUser.id);
      broadcastUserList();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("Server running on port", PORT));
