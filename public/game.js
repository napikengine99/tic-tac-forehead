const socket = io()

let board = Array(9).fill(null)
let mySymbol = null
let room = null
let pendingDuel = null

const boardDiv = document.getElementById("board")
const usersDiv = document.getElementById("users")
const popup = document.getElementById("popup")
const popupText = document.getElementById("popupText")

function setName() {
  const name = document.getElementById("nameInput").value.trim()
  if (!name) return
  socket.emit("set-name", name)
}

for (let i = 0; i < 9; i++) {
  const c = document.createElement("div")
  c.className = "cell"
  c.onclick = () => makeMove(i)
  boardDiv.appendChild(c)
}

socket.on("users", users => {
  usersDiv.innerHTML = ""
  users.forEach(u => {
    if (u.id === socket.id) return
    const el = document.createElement("div")
    el.className = "user"
    el.textContent = u.name
    el.onclick = () => socket.emit("duel-request", u.id)
    usersDiv.appendChild(el)
  })
})

socket.on("duel-request", data => {
  pendingDuel = data.fromId
  popupText.textContent = `duel request from ${data.fromName}`
  popup.classList.remove("hidden")
})

function acceptDuel() {
  if (!pendingDuel) return
  socket.emit("duel-accept", pendingDuel)
  clearPopup()
}

function declineDuel() {
  if (!pendingDuel) return
  socket.emit("duel-decline", pendingDuel)
  clearPopup()
}

socket.on("duel-declined", clearPopup)
socket.on("duel-cancelled", clearPopup)

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

function clearPopup() {
  pendingDuel = null
  popup.classList.add("hidden")
}

function makeMove(i) {
  if (!room || board[i]) return
  board[i] = mySymbol
  socket.emit("move", { room, i, symbol: mySymbol })
  render()
}

function render() {
  [...boardDiv.children].forEach((c, i) => {
    c.textContent = board[i] || ""
  })
}
