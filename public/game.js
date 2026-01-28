const socket = io()

let board = Array(9).fill(null)
let mySymbol = null
let room = null
let pendingDuel = null

const boardDiv = document.getElementById("board")
const usersDiv = document.getElementById("users")
const popup = document.getElementById("popup")

for (let i = 0; i < 9; i++) {
  const c = document.createElement("div")
  c.className = "cell"
  c.onclick = () => makeMove(i)
  boardDiv.appendChild(c)
}

socket.on("users", users => {
  usersDiv.innerHTML = ""
  users.forEach(id => {
    if (id === socket.id) return
    const u = document.createElement("div")
    u.className = "user"
    u.textContent = "user " + id.slice(0, 4)
    u.onclick = () => socket.emit("duel-request", id)
    usersDiv.appendChild(u)
  })
})

socket.on("duel-request", from => {
  pendingDuel = from
  popup.classList.remove("hidden")
})

function acceptDuel() {
  socket.emit("duel-accept", pendingDuel)
  popup.classList.add("hidden")
}

function declineDuel() {
  pendingDuel = null
  popup.classList.add("hidden")
}

socket.on("duel-start", data => {
  room = data.room
  board = Array(9).fill(null)
  render()
  socket.emit("join-room", room)
})

socket.on("symbol", s => mySymbol = s)

socket.on("move", data => {
  board[data.i] = data.symbol
  render()
})

function makeMove(i) {
  if (!room) return
  if (board[i]) return

  board[i] = mySymbol
  socket.emit("move", { room, i, symbol: mySymbol })
  render()
}

function render() {
  [...boardDiv.children].forEach((c, i) => {
    c.textContent = board[i] || ""
  })
}
