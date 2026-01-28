const socket = io()

let board = Array(9).fill(null)
let mySymbol = null
let room = null
let myTurn = false

const boardDiv = document.getElementById("board")
const usersDiv = document.getElementById("users")
const popup = document.getElementById("popup")
const popupText = document.getElementById("popupText")
const turnText = document.getElementById("turnText")

function setName() {
  const name = document.getElementById("nameInput").value.trim()
  if (name) socket.emit("set-name", name)
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
  popupText.textContent = `duel request from ${data.fromName}`
  popup.classList.remove("hidden")
  popup.dataset.from = data.fromId
})

function acceptDuel() {
  socket.emit("duel-accept", popup.dataset.from)
  popup.classList.add("hidden")
}

function declineDuel() {
  popup.classList.add("hidden")
}

socket.on("duel-start", data => {
  room = data.room
  socket.emit("join-room", room)
})

socket.on("init", data => {
  mySymbol = data.symbol
  board = data.board
  myTurn = data.turn === socket.id
  updateTurnText()
  render()
})

socket.on("state", data => {
  board = data.board
  myTurn = data.turn === socket.id

  if (data.winner) {
    turnText.textContent =
      data.winner === "draw"
        ? "draw"
        : `${data.winner} wins`
  } else {
    updateTurnText()
  }

  render()
})

function makeMove(i) {
  if (!myTurn) return
  if (board[i]) return
  socket.emit("move", { room, index: i })
}

function updateTurnText() {
  turnText.textContent = myTurn
    ? "your turn"
    : "their turn"
}

function render() {
  [...boardDiv.children].forEach((c, i) => {
    c.textContent = board[i] || ""
  })
}
