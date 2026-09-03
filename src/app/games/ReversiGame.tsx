"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import GameEndOverlay from "./GameEndOverlay";

type Piece = "black" | "white";
type Cell = Piece | null;
type GameStatus = "playing" | "won" | "lost" | "draw";

const BOARD_SIZE = 8;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const PLAYER: Piece = "black";
const COMPUTER: Piece = "white";
const BLACK_IMAGE = "/assets/store/stickers/droobinssticker.png";
const TOOBINS_WHITE_IMAGE = "/assets/store/stickers/toobinssticker-transparent.png";
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

function getOpponent(piece: Piece): Piece {
  return piece === "black" ? "white" : "black";
}

function getIndex(row: number, col: number) {
  return row * BOARD_SIZE + col;
}

function isOnBoard(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function createBoard() {
  const board = Array<Cell>(CELL_COUNT).fill(null);
  board[getIndex(3, 3)] = "white";
  board[getIndex(3, 4)] = "black";
  board[getIndex(4, 3)] = "black";
  board[getIndex(4, 4)] = "white";
  return board;
}

function getFlips(board: Cell[], index: number, piece: Piece) {
  if (board[index]) return [];

  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const opponent = getOpponent(piece);
  const flips: number[] = [];

  for (const [rowDirection, colDirection] of DIRECTIONS) {
    const candidates: number[] = [];
    let nextRow = row + rowDirection;
    let nextCol = col + colDirection;

    while (isOnBoard(nextRow, nextCol)) {
      const nextIndex = getIndex(nextRow, nextCol);
      const nextCell = board[nextIndex];

      if (nextCell === opponent) {
        candidates.push(nextIndex);
      } else if (nextCell === piece) {
        flips.push(...candidates);
        break;
      } else {
        break;
      }

      nextRow += rowDirection;
      nextCol += colDirection;
    }
  }

  return flips;
}

function getValidMoves(board: Cell[], piece: Piece) {
  return board
    .map((cell, index) =>
      cell === null && getFlips(board, index, piece).length > 0 ? index : null
    )
    .filter((index): index is number => index !== null);
}

function applyMove(board: Cell[], index: number, piece: Piece) {
  const flips = getFlips(board, index, piece);
  if (flips.length === 0) return board;

  const nextBoard = [...board];
  nextBoard[index] = piece;
  flips.forEach((flipIndex) => {
    nextBoard[flipIndex] = piece;
  });

  return nextBoard;
}

function getComputerMove(board: Cell[]) {
  const moves = getValidMoves(board, COMPUTER);
  if (moves.length === 0) return null;

  const scoredMoves = moves.map((index) => ({
    index,
    score:
      getFlips(board, index, COMPUTER).length +
      ([0, 7, 56, 63].includes(index) ? 4 : 0),
  }));
  const bestScore = Math.max(...scoredMoves.map((move) => move.score));
  const bestMoves = scoredMoves.filter((move) => move.score === bestScore);

  return bestMoves[Math.floor(Math.random() * bestMoves.length)].index;
}

function countPieces(board: Cell[]) {
  return board.reduce(
    (score, cell) => {
      if (cell === "black") score.black += 1;
      if (cell === "white") score.white += 1;
      return score;
    },
    { black: 0, white: 0 }
  );
}

function getGameStatus(board: Cell[]): GameStatus | null {
  if (
    board.some((cell) => cell === null) &&
    (getValidMoves(board, PLAYER).length > 0 ||
      getValidMoves(board, COMPUTER).length > 0)
  ) {
    return null;
  }

  const score = countPieces(board);
  if (score.black > score.white) return "won";
  if (score.white > score.black) return "lost";
  return "draw";
}

function PieceImage({ piece }: { piece: Piece }) {
  return (
    <Image
      src={piece === "black" ? BLACK_IMAGE : TOOBINS_WHITE_IMAGE}
      alt={piece === "black" ? "Droobins black piece" : "Toobins white piece"}
      width={64}
      height={64}
      className="h-[86%] w-[86%] object-contain drop-shadow-sm"
    />
  );
}

export default function ReversiGame() {
  const [board, setBoard] = useState<Cell[]>(() => createBoard());
  const [turn, setTurn] = useState<Piece>(PLAYER);
  const [status, setStatus] = useState<GameStatus>("playing");

  const playerMoves = useMemo(() => getValidMoves(board, PLAYER), [board]);
  const computerMoves = useMemo(() => getValidMoves(board, COMPUTER), [board]);
  const validMoves = turn === PLAYER ? playerMoves : computerMoves;
  const score = useMemo(() => countPieces(board), [board]);

  const statusText =
    status === "won"
      ? "You won"
      : status === "lost"
        ? "Toobins won"
        : status === "draw"
          ? "Draw game"
          : turn === PLAYER
            ? "Your turn"
            : "Toobins thinking";

  useEffect(() => {
    if (status !== "playing") return;

    const finished = getGameStatus(board);
    if (finished) {
      setStatus(finished);
      return;
    }

    if (turn === PLAYER && playerMoves.length === 0 && computerMoves.length > 0) {
      setTurn(COMPUTER);
      return;
    }

    if (turn === COMPUTER && computerMoves.length === 0 && playerMoves.length > 0) {
      setTurn(PLAYER);
      return;
    }

    if (turn !== COMPUTER) return;

    const timer = window.setTimeout(() => {
      const move = getComputerMove(board);
      if (move === null) return;

      const nextBoard = applyMove(board, move, COMPUTER);
      setBoard(nextBoard);
      setTurn(PLAYER);

      const finishedAfterMove = getGameStatus(nextBoard);
      if (finishedAfterMove) setStatus(finishedAfterMove);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [board, computerMoves.length, playerMoves.length, status, turn]);

  function resetGame() {
    setBoard(createBoard());
    setTurn(PLAYER);
    setStatus("playing");
  }

  function handleMove(index: number) {
    if (status !== "playing" || turn !== PLAYER || !validMoves.includes(index)) {
      return;
    }

    const nextBoard = applyMove(board, index, PLAYER);
    setBoard(nextBoard);

    const finished = getGameStatus(nextBoard);
    if (finished) {
      setStatus(finished);
    } else {
      setTurn(COMPUTER);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      {status === "won" ? (
        <GameEndOverlay
          result="win"
          title="You win"
          message={`Droobins beat Toobins ${score.black} to ${score.white}.`}
          onPlayAgain={resetGame}
        />
      ) : null}
      {status === "lost" ? (
        <GameEndOverlay
          result="lose"
          title="You lose"
          message={`Toobins won ${score.white} to ${score.black}.`}
          onPlayAgain={resetGame}
        />
      ) : null}

      <div className="rounded-md border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 sm:gap-3 sm:pb-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900 sm:text-lg">
              Toobins Reversi
            </h2>
            <p className="mt-1 hidden text-sm text-neutral-600 sm:block">
              You are Droobins. Toobins plays white.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary h-10 px-2 text-sm sm:h-auto sm:px-3"
            onClick={resetGame}
          >
            New game
          </button>
        </div>

        <div className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-center text-sm font-black text-neutral-900 sm:hidden">
          Droobins {score.black} · Toobins {score.white} · {validMoves.length} moves
        </div>

        <div className="mt-4 hidden grid-cols-3 gap-3 rounded-md bg-neutral-100 p-2 text-center sm:grid">
          <div>
            <div className="text-lg font-black text-neutral-900">{score.black}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Droobins
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-neutral-900">{score.white}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Toobins
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-neutral-900">{validMoves.length}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Moves
            </div>
          </div>
        </div>

        <div className="mx-auto mt-2 max-w-[520px] rounded-md border bg-[#faf7f2] p-1 shadow-sm sm:mt-4 sm:p-2">
          <div className="grid grid-cols-8 gap-px bg-[#9f0000]">
            {board.map((cell, index) => {
              const playable =
                status === "playing" &&
                turn === PLAYER &&
                validMoves.includes(index);

              return (
                <button
                  key={index}
                  type="button"
                  aria-label={`Square ${index + 1}${
                    playable ? ", valid move" : ""
                  }${cell ? `, ${cell}` : ""}`}
                  onClick={() => handleMove(index)}
                  className={[
                    "relative flex aspect-square min-w-0 appearance-none items-center justify-center border-0 bg-[#ce0000] p-0",
                    "focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8f0000]",
                    playable ? "cursor-pointer hover:bg-[#d60a0a]" : "",
                  ].join(" ")}
                >
                  {cell ? <PieceImage piece={cell} /> : null}
                  {playable ? (
                    <span className="absolute h-1/2 w-1/2 rounded-full border-4 border-[#8f0000] bg-[#8f0000]/10" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-neutral-100 px-3 py-2 sm:mt-4 sm:px-4 sm:py-3">
          <p className="text-sm font-semibold text-neutral-800">{statusText}</p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Flip to win
          </p>
        </div>
      </div>
    </section>
  );
}
