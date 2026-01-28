const socket = io()

let board = Array(9).fill(null)
let mySymbol = null
let currentTurn = null
let room = null
let pendingFrom = null

const boardDiv = document.getElementById("board")
const usersDiv = document.getElementById("users")
const popup = document.getElementById("popup")
const popupText = document.getElementById("popupText")
const turnText = document.getElementById("turnText")

// board setup
boardDiv.innerHTML = ""
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div")
  cell.className = "cell"
  cell.onclick = () => clickCell(i)
  boardDiv.appendChild(cell)
}

function setName() {
  const val = document.getElementById("nameInput").value.trim()
  if (val) socket.emit("set-name", val)
}

// online users
socket.on("users", users => {
  usersDiv.innerHTML = ""
  users.forEach(u => {
    if (u.id === socket.id) return
    const el = document.createElement("div")
    el.className = "user"
    el.textContent = u.name + (u.inGame ? " (busy)" : "")
    if (!u.inGame) {
      el.onclick = () => socket.emit("duel-request", u.id)
    }
    usersDiv.appendChild(el)
  })
})

// duel request
socket.on("duel-request", data => {
  pendingFrom = data.fromId
  popupText.textContent = `duel request from ${data.fromName}`
  popup.classList.remove("hidden")
})

function acceptDuel() {
  if (!pendingFrom) return
  socket.emit("duel-accept", pendingFrom)
  popup.classList.add("hidden")
  pendingFrom = null
}

function declineDuel() {
  popup.classList.add("hidden")
  pendingFrom = null
}

// duel start
socket.on("duel-start", data => {
  room = data.room
  socket.emit("join-room", room)
})

// init game
socket.on("init", data => {
  mySymbol = data.symbol
  board = data.board
  currentTurn = data.turn
  updateTurn()
  render()
})

// state update
socket.on("state", data => {
  board = data.board
  currentTurn = data.turn

  if (data.winner) {
    if (data.winner === "draw") {
      turnText.textContent = "draw"
    } else {
      turnText.textContent =
        data.winner === mySymbol ? "you win" : "you lose"
    }
  } else {
    updateTurn()
  }

  render()
})

function clickCell(i) {
  if (!room) return
  if (board[i]) return
  if (currentTurn !== mySymbol) return

  socket.emit("move", { room, index: i })
}

function updateTurn() {
  turnText.textContent =
    currentTurn === mySymbol ? "your turn" : "their turn"
}

function render() {
  [...boardDiv.children].forEach((c, i) => {
    c.textContent = board[i] || ""
  })
}
