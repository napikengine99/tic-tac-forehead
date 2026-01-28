let board = Array(9).fill(null)
let player = "X"
let bot = true
let difficulty = "easy"
let socket = null
let mySymbol = null
let multiplayer = false

const boardDiv = document.getElementById("board")

function startGame() {
  board = Array(9).fill(null)
  boardDiv.innerHTML = ""

  difficulty = document.getElementById("mode").value
  multiplayer = difficulty === "multi"
  bot = !multiplayer

  if (multiplayer) {
    socket = io()
    const room = document.getElementById("room").value || "default"
    socket.emit("join", room)

    socket.on("symbol", s => mySymbol = s)
    socket.on("start", () => {})
    socket.on("move", ({ i, symbol }) => {
      board[i] = symbol
      render()
    })
  }

  for (let i = 0; i < 9; i++) {
    const c = document.createElement("div")
    c.className = "cell"
    c.onclick = () => move(i)
    boardDiv.appendChild(c)
  }

  render()
}

function move(i) {
  if (board[i]) return

  if (multiplayer) {
    if (board[i] || player !== mySymbol) return
    board[i] = mySymbol
    socket.emit("move", { i, symbol: mySymbol })
    player = mySymbol === "X" ? "O" : "X"
  } else {
    board[i] = player
    player = player === "X" ? "O" : "X"
    if (bot) setTimeout(botMove, 300)
  }

  render()
}

function render() {
  [...boardDiv.children].forEach((c, i) => c.textContent = board[i] || "")
}

function botMove() {
  let i
  if (difficulty === "easy") i = randomMove()
  if (difficulty === "medium") i = mediumMove()
  if (difficulty === "hard") i = minimax(board, "O").index

  if (i !== undefined) {
    board[i] = "O"
    player = "X"
    render()
  }
}

function randomMove() {
  const moves = board.map((v, i) => v ? null : i).filter(v => v !== null)
  return moves[Math.floor(Math.random() * moves.length)]
}

function mediumMove() {
  return randomMove()
}

function minimax(newBoard, p) {
  const avail = newBoard.map((v,i)=>v?null:i).filter(v=>v!==null)
  if (winner(newBoard,"X")) return { score:-10 }
  if (winner(newBoard,"O")) return { score:10 }
  if (!avail.length) return { score:0 }

  const moves = []
  for (let i of avail) {
    const move = {}
    move.index = i
    newBoard[i] = p
    move.score = minimax(newBoard, p==="O"?"X":"O").score
    newBoard[i] = null
    moves.push(move)
  }

  let best
  if (p === "O") {
    let max = -999
    for (let m of moves) if (m.score > max) { max = m.score; best = m }
  } else {
    let min = 999
    for (let m of moves) if (m.score < min) { min = m.score; best = m }
  }
  return best
}

function winner(b, p) {
  const w = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ]
  return w.some(l => l.every(i => b[i] === p))
}
