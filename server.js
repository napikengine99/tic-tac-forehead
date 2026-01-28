const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.static("public"))

let users = {}
let games = {}

function broadcastUsers() {
  io.emit("users", Object.values(users))
}

io.on("connection", socket => {
  users[socket.id] = {
    id: socket.id,
    name: "guest" + socket.id.slice(0, 4)
  }

  broadcastUsers()

  socket.on("set-name", name => {
    users[socket.id].name = name
    broadcastUsers()
  })

  socket.on("duel-request", targetId => {
    if (!users[targetId]) return
    io.to(targetId).emit("duel-request", {
      fromId: socket.id,
      fromName: users[socket.id].name
    })
  })

  socket.on("duel-accept", targetId => {
    if (!users[targetId]) return

    const room = socket.id + "#" + targetId

    games[room] = {
      board: Array(9).fill(null),
      turn: socket.id,
      players: {
        X: socket.id,
        O: targetId
      }
    }

    socket.join(room)
    io.to(targetId).emit("duel-start", { room })
    socket.emit("duel-start", { room })
  })

  socket.on("join-room", room => {
    socket.join(room)
    const game = games[room]
    if (!game) return

    let symbol =
      game.players.X === socket.id ? "X" :
      game.players.O === socket.id ? "O" :
      null

    socket.emit("init", {
      symbol,
      board: game.board,
      turn: game.turn
    })
  })

  socket.on("move", ({ room, index }) => {
    const game = games[room]
    if (!game) return
    if (game.turn !== socket.id) return
    if (game.board[index]) return

    const symbol =
      game.players.X === socket.id ? "X" : "O"

    game.board[index] = symbol
    game.turn =
      game.turn === game.players.X
        ? game.players.O
        : game.players.X

    const winner = checkWinner(game.board)

    io.to(room).emit("state", {
      board: game.board,
      turn: game.turn,
      winner
    })
  })

  socket.on("disconnect", () => {
    delete users[socket.id]
    broadcastUsers()
  })
})

function checkWinner(b) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ]

  for (const [a,b1,c] of wins) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
      return b[a]
    }
  }

  return b.every(x => x) ? "draw" : null
}

const port = process.env.PORT || 3000
http.listen(port, () => console.log("server running"))
