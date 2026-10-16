/* Palouse Chess Club — chessboards.
   Uses Chessground (the board from Lichess.org) to draw boards and
   chess.js to know the rules. Both are stored in /assets/vendor/. */
import { Chessground } from "../vendor/chessground.min.js";
import { Chess } from "../vendor/chess.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
const REDUCED_MOTION = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Chessground only re-measures where a board sits on the page when the visitor
// scrolls or resizes the window. If text above a board re-wraps (for example when
// the web fonts finish loading), taps would land on the wrong square, so ask it
// to re-measure whenever the page layout changes.
const remeasure = () => window.dispatchEvent(new Event("resize"));
if ("ResizeObserver" in window) new ResizeObserver(remeasure).observe(document.body);
if (document.fonts) document.fonts.ready.then(remeasure);

function board(node, config) {
  return Chessground(node, { animation: { enabled: !REDUCED_MOTION }, ...config });
}

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
  board(node, {
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
  const cg = board(node, {
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

/* ---------- Special moves: <div data-special="castle|promote|enpassant"> ---------- */
const SPECIALS = {
  castle: {
    fen: "4k3/8/8/8/8/8/PPP2PPP/R3K2R w KQ - 0 1",
    setup: [],
    demo: ["O-O"],
    allowed: /[kq]/,
    hint: [["e1", "g1"], ["e1", "c1"]],
    start: "Your turn: move the king two squares toward either rook.",
    done: (m) => m.flags.includes("k")
      ? "That's castling! The king moved two squares (green arrow) and the rook hopped over to the other side (blue arrow). This is \"castling kingside\" (written O-O)."
      : "That's castling! The king moved two squares (green arrow) and the rook hopped over to the other side (blue arrow). This is \"castling queenside\" (written O-O-O).",
    demoText: ["The king moves two squares toward the rook (green arrow), and the rook hops over to the king's other side (blue arrow)."],
  },
  promote: {
    fen: "8/4P3/8/8/8/2k5/8/4K3 w - - 0 1",
    setup: [],
    demo: ["e8=Q"],
    allowed: /p/,
    hint: [["e7", "e8"]],
    start: "Your turn: push the pawn to the last row.",
    done: (m) => "Your pawn became a " + { q: "queen", r: "rook", b: "bishop", n: "knight" }[m.promotion] + "!",
    demoText: ["The pawn reaches the last row and turns into a queen!"],
  },
  enpassant: {
    fen: "4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1",
    setup: ["d5"],
    demo: ["d5", "exd6"],
    allowed: /e/,
    hint: [["e5", "d6"]],
    start: "Black's pawn just jumped two squares, from d7 to d5, landing right beside your pawn. Your turn: capture it en passant!",
    done: () => "En passant! Your pawn moved diagonally to d6 and captured the black pawn \"in passing,\" as if it had only moved one square.",
    demoText: ["Black's pawn jumps two squares, landing right beside White's pawn…", "…and White captures it \"in passing\" by moving diagonally behind it. The black pawn is removed."],
  },
};

document.querySelectorAll("[data-special]").forEach((card) => {
  const spec = SPECIALS[card.dataset.special];
  if (!spec) return;
  const status = card.querySelector("[data-special-status]");
  const choices = card.querySelector("[data-special-choices]");
  const game = new Chess();
  let timers = [];
  let pending = null; // promotion waiting for a piece choice
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const arrows = (pairs, brush) => pairs.map(([orig, dest]) => ({ orig, dest, brush }));
  // Arrows for a move; castling also gets an arrow for the rook's hop.
  const moveArrows = (m) => {
    const rank = m.from[1];
    const rook = m.flags.includes("k") ? ["h" + rank, "f" + rank] : m.flags.includes("q") ? ["a" + rank, "d" + rank] : null;
    return arrows([[m.from, m.to]], "green").concat(rook ? arrows([rook], "blue") : []);
  };

  const cg = board(card.querySelector("[data-special-board]"), {
    coordinates: true,
    drawable: { enabled: false, visible: true },
    events: { move: onMove },
  });

  function specialDests() {
    const dests = new Map();
    for (const m of game.moves({ verbose: true })) {
      if (!spec.allowed.test(m.flags)) continue;
      if (!dests.has(m.from)) dests.set(m.from, []);
      if (!dests.get(m.from).includes(m.to)) dests.get(m.from).push(m.to);
    }
    return dests;
  }

  function sync(lastMove, interactive, shapes) {
    const turn = colorOf(game);
    cg.set({
      fen: game.fen(), turnColor: turn, orientation: "white", lastMove,
      movable: interactive
        ? { free: false, color: turn, dests: specialDests(), showDests: true }
        : { color: undefined, dests: new Map() },
    });
    cg.setAutoShapes(shapes || []);
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    pending = null;
    if (choices) choices.hidden = true;
    game.load(spec.fen);
    let last;
    for (const san of spec.setup) { const m = game.move(san); last = [m.from, m.to]; }
    status.textContent = spec.start;
    sync(last, true, arrows(spec.hint, "paleGreen"));
  }

  function finish(move) {
    status.textContent = spec.done(move);
    sync([move.from, move.to], false, moveArrows(move));
  }

  function onMove(from, to) {
    if (isPromotion(game, from, to) && choices) {
      pending = { from, to };
      status.textContent = "Choose what your pawn becomes:";
      choices.hidden = false;
      cg.set({ movable: { color: undefined, dests: new Map() } });
      cg.setAutoShapes([]);
      return;
    }
    finish(game.move({ from, to, promotion: "q" }));
  }

  if (choices) {
    choices.querySelectorAll("[data-piece]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!pending) return;
        const move = game.move({ ...pending, promotion: btn.dataset.piece });
        pending = null;
        choices.hidden = true;
        finish(move);
      });
    });
  }

  card.querySelector("[data-special-demo]").addEventListener("click", () => {
    reset();
    game.load(spec.fen);
    status.textContent = "Watch…";
    sync(undefined, false);
    spec.demo.forEach((san, i) => {
      later(() => {
        const m = game.move(san);
        status.textContent = spec.demoText[i] || "";
        sync([m.from, m.to], false, moveArrows(m));
        if (i === spec.demo.length - 1) later(() => { status.textContent += " Now tap Start over and try it yourself!"; }, 900);
      }, 900 + i * 2200);
    });
  });
  card.querySelector("[data-special-reset]").addEventListener("click", reset);

  reset();
});

/* ---------- Weekly puzzle preview on the home page ---------- */
document.querySelectorAll("[data-puzzle-preview]").forEach((node) => {
  const current = window.ClubPuzzle && window.ClubPuzzle.current();
  if (!current) return;
  try {
    const game = new Chess(current.puzzle.position);
    board(node, { fen: game.fen(), viewOnly: true, coordinates: false, orientation: colorOf(game) });
  } catch (err) {
    console.error("This week's puzzle has a typo in its position. Please check _data/puzzles.yml.", err);
  }
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
    // Allow "1. Nc7+ Kd8 2. Nxa8" or "Nc7+, Kd8" by ignoring move numbers and commas.
    expected = puzzle.solution.replace(/\d+\.+/g, " ").replace(/,/g, " ")
      .split(/\s+/).filter(Boolean).map((san) => replay.move(san));
  } catch (err) {
    status.textContent = "Oops! This puzzle has a typo in its position or solution. Please check _data/puzzles.yml.";
    console.error(err);
    return;
  }
  const player = colorOf(game);
  const playerName = player === "white" ? "White" : "Black";
  $("[data-p-answer-moves]").textContent = expected.map((m) => m.san).join("  ");

  const cg = board($("[data-p-board]"), {
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
    $("[data-p-reset]").focus();
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
