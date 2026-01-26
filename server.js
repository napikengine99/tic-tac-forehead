const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "game.html"))
);

let users = [];   // { id, name, ws }
let duels = [];   // { id, x, o, board, turn }

const genId = () => Math.random().toString(36).slice(2);

function sendUserList() {
  const list = users.map(u => ({ id: u.id, name: u.name }));
  users.forEach(u => u.ws.send(JSON.stringify({ type:"userList", list })));
}

function checkWin(board, m) {
  const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return w.some(l=>l.every(i=>board[i]===m));
}

wss.on("connection", ws => {
  let me = null;

  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    /* SET NAME */
    if (msg.type === "setName") {
      if (me) return;

      if (users.some(u => u.name === msg.name)) {
        ws.send(JSON.stringify({ type:"nameTaken" }));
        return;
      }

      me = { id: genId(), name: msg.name, ws };
      users.push(me);
      ws.send(JSON.stringify({ type:"assignId", userId: me.id }));
      sendUserList();
    }

    /* CHALLENGE */
    if (msg.type === "challenge") {
      if (!me) return;
      if (msg.target === me.id) return;

      const target = users.find(u => u.id === msg.target);
      if (!target) return;

      target.ws.send(JSON.stringify({
        type:"challengeRequest",
        from: me.id,
        name: me.name
      }));
    }

    /* RESPONSE */
    if (msg.type === "challengeResponse") {
      const other = users.find(u => u.id === msg.from);
      if (!other || !me) return;

      if (!msg.accept) {
        other.ws.send(JSON.stringify({ type:"challengeDenied" }));
        return;
      }

      const duel = {
        id: genId(),
        x: other.id,
        o: me.id,
        board: Array(9).fill(null),
        turn: other.id
      };

      duels.push(duel);

      other.ws.send(JSON.stringify({
        type:"duelStart",
        duelId: duel.id,
        mark:"X",
        turn: duel.turn,
        opponent: me.name
      }));

      me.ws.send(JSON.stringify({
        type:"duelStart",
        duelId: duel.id,
        mark:"O",
        turn: duel.turn,
        opponent: other.name
      }));
    }

    /* MOVE */
    if (msg.type === "move") {
      const d = duels.find(d => d.id === msg.duelId);
      if (!d || d.turn !== me.id) return;
      if (d.board[msg.index]) return;

      const mark = d.x === me.id ? "X" : "O";
      d.board[msg.index] = mark;
      d.turn = d.turn === d.x ? d.o : d.x;

      for (const u of users) {
        if (u.id === d.x || u.id === d.o) {
          u.ws.send(JSON.stringify({
            type:"updateBoard",
            board:d.board,
            turn:d.turn
          }));
        }
      }

      if (checkWin(d.board, mark)) {
        for (const u of users) {
          if (u.id === d.x || u.id === d.o) {
            u.ws.send(JSON.stringify({
              type:"gameOver",
              result: u.id === me.id ? "you win" : "you lose"
            }));
          }
        }
        duels = duels.filter(x => x.id !== d.id);
      }
    }
  });

  ws.on("close", () => {
    if (!me) return;
    users = users.filter(u => u !== me);
    sendUserList();
  });
});

server.listen(process.env.PORT || 3000);
