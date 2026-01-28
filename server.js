const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.static("public"))

let users = {}

io.on("connection", socket => {
  users[socket.id] = { id: socket.id }
  io.emit("users", Object.keys(users))

  socket.on("duel-request", target => {
    io.to(target).emit("duel-request", socket.id)
  })

  socket.on("duel-accept", target => {
    const room = socket.id + "#" + target
    socket.join(room)
    io.to(target).emit("duel-start", { room })
    socket.emit("duel-start", { room })
  })

  socket.on("join-room", room => {
    socket.join(room)
    const symbol = io.sockets.adapter.rooms.get(room).size === 1 ? "X" : "O"
    socket.emit("symbol", symbol)
  })

  socket.on("move", data => {
    socket.to(data.room).emit("move", data)
  })

  socket.on("disconnect", () => {
    delete users[socket.id]
    io.emit("users", Object.keys(users))
  })
})

const port = process.env.PORT || 3000
http.listen(port, () => console.log("server running"))
