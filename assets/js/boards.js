/* Palouse Chess Club — chessboards.
   Uses Chessground (the board from Lichess.org) to draw boards and
   chess.js to know the rules. Both are stored in /assets/vendor/. */
import { Chessground } from "../vendor/chessground.min.js";
import { Chess } from "../vendor/chess.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

function legalMoves(game) {
  const dests = new Map();
  for (const m of game.moves({ verbose: true })) {
    if (!dests.has(m.from)) dests.set(m.from, []);
    dests.get(m.from).push(m.to);
  }
  return dests;
}
function colorOf(game) { return game.turn() === "w" ? "white" : "black"; }
function isPromotion(game, from, to) {
  const piece = game.get(from);
  return piece && piece.type === "p" && (to[1] === "8" || to[1] === "1");
}

/* ---------- Diagrams: <div data-board data-fen="..." data-dots="a1 b2"> ---------- */
document.querySelectorAll("[data-board]").forEach((node) => {
  const fen = node.dataset.fen === "start" ? START : node.dataset.fen;
  const dots = (node.dataset.dots || "").split(/\s+/).filter(Boolean);
  Chessground(node, {
    fen,
    viewOnly: true,
    coordinates: node.hasAttribute("data-coords"),
    orientation: node.dataset.orientation || "white",
    highlight: { custom: new Map(dots.map((sq) => [sq, "dot"])) },
  });
});

/* ---------- Practice board: <div data-practice-board> ---------- */
document.querySelectorAll("[data-practice-board]").forEach((node) => {
  const game = new Chess();
  const status = document.querySelector("[data-practice-status]");
  const cg = Chessground(node, {
    fen: game.fen(),
    turnColor: "white",
    movable: { free: false, color: "white", dests: legalMoves(game), showDests: true },
    events: { move: onMove },
  });
  function sync(lastMove) {
    const turn = colorOf(game);
    cg.set({
      fen: game.fen(), turnColor: turn, lastMove, check: game.inCheck(),
      movable: { color: turn, dests: legalMoves(game) },
    });
    if (!status) return;
    if (game.isCheckmate()) status.textContent = "Checkmate! " + (turn === "white" ? "Black" : "White") + " wins.";
    else if (game.isStalemate()) status.textContent = "Stalemate. It's a draw: the player to move has no legal moves but isn't in check.";
    else if (game.isDraw()) status.textContent = "It's a draw.";
    else status.textContent = (turn === "white" ? "White" : "Black") + " to move" + (game.inCheck() ? " (in check!)" : "") + ".";
  }
  function onMove(from, to) {
    game.move({ from, to, promotion: "q" });
    sync([from, to]);
  }
  const reset = document.querySelector("[data-practice-reset]");
  if (reset) reset.addEventListener("click", () => { game.reset(); sync(undefined); });
  sync(undefined);
});

/* ---------- Weekly puzzle preview on the home page ---------- */
document.querySelectorAll("[data-puzzle-preview]").forEach((node) => {
  const current = window.ClubPuzzle && window.ClubPuzzle.current();
  if (!current) return;
  const game = new Chess(current.puzzle.position);
  Chessground(node, { fen: game.fen(), viewOnly: true, coordinates: false, orientation: colorOf(game) });
});

/* ---------- The weekly puzzle ---------- */
const app = document.querySelector("[data-puzzle-app]");
if (app) setUpPuzzle(app);

function setUpPuzzle(app) {
  const current = window.ClubPuzzle && window.ClubPuzzle.current();
  if (!current) { app.hidden = true; return; }
  const { puzzle, number, weekOf } = current;

  const $ = (sel) => app.querySelector(sel);
  $("[data-p-number]").textContent = "Puzzle #" + number + " · Week of " +
    weekOf.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  $("[data-p-title]").textContent = puzzle.title;
  $("[data-p-task]").textContent = puzzle.task;
  $("[data-p-explanation]").textContent = puzzle.explanation;
  $("[data-p-lichess]").href = "https://lichess.org/analysis/standard/" + puzzle.position.replace(/ /g, "_");
  const status = $("[data-p-status]");
  const answerBox = $("[data-p-answer]");
  const answerButton = $("[data-p-show]");

  let game, expected, step, solved, busy;
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  try {
    game = new Chess(puzzle.position);
    // Work out the exact solution moves (from/to squares) ahead of time.
    const replay = new Chess(puzzle.position);
    expected = puzzle.solution.split(/\s+/).filter(Boolean).map((san) => replay.move(san));
  } catch (err) {
    status.textContent = "Oops! This puzzle has a typo in its position or solution. Please check _data/puzzles.yml.";
    console.error(err);
    return;
  }
  const player = colorOf(game);
  const playerName = player === "white" ? "White" : "Black";
  $("[data-p-answer-moves]").textContent = expected.map((m) => m.san).join("  ");

  const cg = Chessground($("[data-p-board]"), {
    orientation: player,
    events: { move: onMove },
  });

  function sync(lastMove, interactive) {
    cg.set({
      fen: game.fen(), turnColor: colorOf(game), lastMove, check: game.inCheck(),
      movable: interactive
        ? { free: false, color: player, dests: legalMoves(game), showDests: true }
        : { color: undefined, dests: new Map() },
    });
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    game.load(puzzle.position);
    step = 0; solved = false; busy = false;
    answerBox.hidden = true;
    answerButton.hidden = false;
    setStatus(playerName + " to move. Drag or tap a piece to make your move.", "");
    sync(undefined, true);
  }

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = "puzzle-status" + (kind ? " is-" + kind : "");
  }

  function finish(message) {
    solved = true;
    setStatus(message, "right");
    answerBox.hidden = false;
    answerButton.hidden = true;
    sync(undefined, false);
  }

  function onMove(from, to) {
    if (solved || busy) return;
    const want = expected[step];
    const promotion = isPromotion(game, from, to)
      ? (want && want.from === from && want.to === to && want.promotion) || "q"
      : undefined;
    const move = game.move({ from, to, promotion });
    const right = (want && move.from === want.from && move.to === want.to && (move.promotion || "") === (want.promotion || ""))
      || game.isCheckmate();

    if (!right) {
      busy = true;
      sync([from, to], false);
      setStatus("Not quite. Try again!", "wrong");
      later(() => { game.undo(); busy = false; sync(undefined, true); }, 900);
      return;
    }
    if (game.isCheckmate()) return finish("Checkmate! You solved it! 🎉");
    step++;
    if (step >= expected.length) return finish("Correct! You solved it! 🎉");

    // Play the opponent's reply, then it's the visitor's turn again.
    busy = true;
    sync([from, to], false);
    setStatus("Good move! Now the other side replies…", "right");
    later(() => {
      const reply = game.move(expected[step].san);
      step++;
      busy = false;
      sync([reply.from, reply.to], true);
      setStatus("Keep going. What's your next move?", "");
    }, 800);
  }

  answerButton.addEventListener("click", () => {
    timers.forEach(clearTimeout);
    timers = [];
    game.load(puzzle.position);
    busy = true; solved = true;
    answerBox.hidden = false;
    answerButton.hidden = true;
    setStatus("Here's the answer:", "");
    sync(undefined, false);
    expected.forEach((m, i) => {
      later(() => {
        game.move(m.san);
        sync([m.from, m.to], false);
      }, 700 * (i + 1));
    });
  });
  $("[data-p-reset]").addEventListener("click", reset);

  reset();
}
