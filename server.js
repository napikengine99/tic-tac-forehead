const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.static("public"))

let rooms = {}

io.on("connection", socket => {
  socket.on("join", room => {
    socket.join(room)

    if (!rooms[room]) {
      rooms[room] = []
    }

    rooms[room].push(socket.id)

    const symbol = rooms[room].length === 1 ? "X" : "O"
    socket.emit("symbol", symbol)

    if (rooms[room].length === 2) {
      io.to(room).emit("start")
    }

    socket.on("move", data => {
      socket.to(room).emit("move", data)
    })

    socket.on("disconnect", () => {
      rooms[room] = rooms[room].filter(id => id !== socket.id)
      if (rooms[room].length === 0) delete rooms[room]
    })
  })
})

const port = process.env.PORT || 3000
http.listen(port, () => console.log("server running on " + port))
