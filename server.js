const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.static("public"))

let users = {}

io.on("connection", socket => {

  socket.on("set-name", name => {
    users[socket.id] = { id: socket.id, name }
    io.emit("users", Object.values(users))
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
    socket.join(room)
    io.to(targetId).emit("duel-start", { room })
    socket.emit("duel-start", { room })
  })

  socket.on("duel-decline", targetId => {
    io.to(targetId).emit("duel-declined")
  })

  socket.on("join-room", room => {
    socket.join(room)
    const size = io.sockets.adapter.rooms.get(room)?.size || 0
    const symbol = size === 1 ? "X" : "O"
    socket.emit("symbol", symbol)
  })

  socket.on("move", data => {
    socket.to(data.room).emit("move", data)
  })

  socket.on("disconnect", () => {
    delete users[socket.id]
    io.emit("users", Object.values(users))
    io.emit("duel-cancelled", socket.id)
  })
})

const port = process.env.PORT || 3000
http.listen(port, () => console.log("server running"))
