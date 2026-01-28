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

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendUserList() {
  const list = users.map(u => ({ id: u.id, name: u.name }));
  users.forEach(u => send(u.ws, { type: "userList", list }));
}

function checkWin(board, m) {
  const w = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return w.some(l => l.every(i => board[i] === m));
}

function checkDraw(board) {
  return board.every(c => c !== null);
}

function endDuel(duel, winnerId = null) {
  for (const u of users) {
    if (u.id === duel.x || u.id === duel.o) {
      if (!winnerId) {
        send(u.ws, { type: "gameOver", result: "draw" });
      } else {
        send(u.ws, {
          type: "gameOver",
          result: u.id === winnerId ? "you win" : "you lose"
        });
      }
    }
  }
  duels = duels.filter(d => d.id !== duel.id);
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
        send(ws, { type: "nameTaken" });
        return;
      }

      me = { id: genId(), name: msg.name, ws };
      users.push(me);
      send(ws, { type: "assignId", userId: me.id });
      sendUserList();
    }

    /* CHALLENGE */
    if (msg.type === "challenge" && me) {
      const target = users.find(u => u.id === msg.target);
      if (!target) return;

      send(target.ws, {
        type: "challengeRequest",
        from: me.id,
        name: me.name
      });
    }

    /* RESPONSE */
    if (msg.type === "challengeResponse" && me) {
      const other = users.find(u => u.id === msg.from);
      if (!other) return;

      if (!msg.accept) {
        send(other.ws, { type: "challengeDenied" });
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

      send(other.ws, {
        type: "duelStart",
        duelId: duel.id,
        mark: "X",
        turn: duel.turn,
        opponent: me.name
      });

      send(me.ws, {
        type: "duelStart",
        duelId: duel.id,
        mark: "O",
        turn: duel.turn,
        opponent: other.name
      });
    }

    /* MOVE */
    if (msg.type === "move" && me) {
      const d = duels.find(d => d.id === msg.duelId);
      if (!d) return;
      if (d.turn !== me.id) return;
      if (d.board[msg.index] !== null) return;

      const mark = d.x === me.id ? "X" : "O";
      d.board[msg.index] = mark;
      d.turn = d.turn === d.x ? d.o : d.x;

      for (const u of users) {
        if (u.id === d.x || u.id === d.o) {
          send(u.ws, {
            type: "updateBoard",
            board: d.board,
            turn: d.turn
          });
        }
      }

      if (checkWin(d.board, mark)) {
        endDuel(d, me.id);
      } else if (checkDraw(d.board)) {
        endDuel(d, null);
      }
    }
  });

  ws.on("close", () => {
    if (!me) return;

    // kill any duel this user was in
    const duel = duels.find(d => d.x === me.id || d.o === me.id);
    if (duel) {
      const otherId = duel.x === me.id ? duel.o : duel.x;
      const other = users.find(u => u.id === otherId);
      if (other) {
        send(other.ws, {
          type: "gameOver",
          result: "enemy disconnected"
        });
      }
      duels = duels.filter(d => d !== duel);
    }

    users = users.filter(u => u !== me);
    sendUserList();
  });
});

server.listen(process.env.PORT || 3000);
