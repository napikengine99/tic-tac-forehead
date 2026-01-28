const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.static("public"))

let users = {}   // { socketId: {id, name, inGame} }
let games = {}   // { roomName: { board, turn, players: {X: id, O: id} } }

// broadcast the current users to everyone
function broadcastUsers() {
  io.emit("users", Object.values(users))
}

io.on("connection", socket => {
  // add user immediately as guest
  users[socket.id] = { id: socket.id, name: "guest" + socket.id.slice(0,4), inGame: false }
  broadcastUsers()

  // update name
  socket.on("set-name", name => {
    if (users[socket.id]) {
      users[socket.id].name = name
      broadcastUsers()
    }
  })

  // send duel request
  socket.on("duel-request", targetId => {
    if (!users[targetId] || users[targetId].inGame) return
    io.to(targetId).emit("duel-request", {
      fromId: socket.id,
      fromName: users[socket.id].name
    })
  })

  // accept duel
  socket.on("duel-accept", targetId => {
    if (!users[targetId]) return

    const room = `${socket.id}_${targetId}`

    // initialize game
    games[room] = {
      board: Array(9).fill(null),
      turn: "X",
      players: { X: socket.id, O: targetId }
    }

    // mark players in-game
    users[socket.id].inGame = true
    users[targetId].inGame = true
    broadcastUsers()

    socket.join(room)
    io.to(targetId).emit("duel-start", { room })
    socket.emit("duel-start", { room })
  })

  // join room
  socket.on("join-room", room => {
    const game = games[room]
    if (!game) return
    socket.join(room)

    const symbol = game.players.X === socket.id ? "X" :
                   game.players.O === socket.id ? "O" : null

    socket.emit("init", { symbol, board: game.board, turn: game.turn })
  })

  // handle moves
  socket.on("move", ({ room, index }) => {
    const game = games[room]
    if (!game) return

    const symbol = game.players.X === socket.id ? "X" :
                   game.players.O === socket.id ? "O" : null
    if (!symbol) return
    if (game.turn !== symbol) return
    if (game.board[index]) return

    game.board[index] = symbol
    game.turn = symbol === "X" ? "O" : "X"

    const winner = checkWinner(game.board)

    io.to(room).emit("state", { board: game.board, turn: game.turn, winner })
  })

  // handle disconnection
  socket.on("disconnect", () => {
    const user = users[socket.id]
    if (user) delete users[socket.id]
    broadcastUsers()
  })
})

// win detection
function checkWinner(b) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ]
  for (const [a,b1,c] of wins) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a]
  }
  return b.every(cell => cell) ? "draw" : null
}

const port = process.env.PORT || 3000
http.listen(port, () => console.log("server running"))
