"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import GameEndOverlay from "./GameEndOverlay";

type Cell = {
  hasMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
};

type GameStatus = "playing" | "won" | "lost";
type BoardSize = 8 | 10 | 12;

const BOARD_SIZES: BoardSize[] = [8, 10, 12];
const DEFAULT_BOARD_SIZE: BoardSize = 10;
const MINE_IMAGE = "/assets/store/stickers/droobinssticker.png";
const FLAG_IMAGE = "/assets/store/stickers/toobinssticker-transparent.png";

function getMineCount(boardSize: BoardSize) {
  if (boardSize === 8) return 10;
  if (boardSize === 12) return 22;
  return 14;
}

function getNeighbors(index: number, boardSize: BoardSize) {
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;
  const neighbors: number[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;

      if (
        nextRow >= 0 &&
        nextRow < boardSize &&
        nextCol >= 0 &&
        nextCol < boardSize
      ) {
        neighbors.push(nextRow * boardSize + nextCol);
      }
    }
  }

  return neighbors;
}

function createBoard(boardSize: BoardSize) {
  const mineCount = getMineCount(boardSize);
  const cellCount = boardSize * boardSize;
  const minePositions = new Set<number>();

  while (minePositions.size < mineCount) {
    minePositions.add(Math.floor(Math.random() * cellCount));
  }

  return Array.from({ length: cellCount }, (_, index): Cell => {
    const hasMine = minePositions.has(index);
    const adjacentMines = getNeighbors(index, boardSize).filter((neighbor) =>
      minePositions.has(neighbor)
    ).length;

    return {
      hasMine,
      adjacentMines,
      revealed: false,
      flagged: false,
    };
  });
}

function revealCells(board: Cell[], startIndex: number, boardSize: BoardSize) {
  const nextBoard = board.map((cell) => ({ ...cell }));
  const queue = [startIndex];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const index = queue.shift();
    if (index === undefined || visited.has(index)) continue;

    visited.add(index);
    const cell = nextBoard[index];

    if (cell.flagged || cell.revealed) continue;

    cell.revealed = true;

    if (!cell.hasMine && cell.adjacentMines === 0) {
      getNeighbors(index, boardSize).forEach((neighbor) => {
        if (!visited.has(neighbor)) queue.push(neighbor);
      });
    }
  }

  return nextBoard;
}

function revealAllMines(board: Cell[]) {
  return board.map((cell) =>
    cell.hasMine ? { ...cell, revealed: true } : { ...cell }
  );
}

function hasWon(board: Cell[]) {
  return board.every((cell) => cell.hasMine || cell.revealed);
}

export default function ToobinsweeperGame() {
  const [boardSize, setBoardSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE);
  const [board, setBoard] = useState<Cell[]>(() => createBoard(DEFAULT_BOARD_SIZE));
  const [status, setStatus] = useState<GameStatus>("playing");
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const mineCount = getMineCount(boardSize);

  const flagsUsed = useMemo(
    () => board.filter((cell) => cell.flagged).length,
    [board]
  );
  const revealedCount = useMemo(
    () => board.filter((cell) => cell.revealed).length,
    [board]
  );

  const statusText =
    status === "won"
      ? "You cleared the nest"
      : status === "lost"
        ? "Droobins got you"
        : "Find the safe squares";

  function resetGame() {
    setBoard(createBoard(boardSize));
    setStatus("playing");
  }

  function handleBoardSizeChange(value: string) {
    const nextBoardSize = Number(value) as BoardSize;
    setBoardSize(nextBoardSize);
    setBoard(createBoard(nextBoardSize));
    setStatus("playing");
  }

  function handleReveal(index: number) {
    if (status !== "playing") return;

    const cell = board[index];
    if (cell.revealed || cell.flagged) return;

    if (cell.hasMine) {
      setBoard(revealAllMines(board));
      setStatus("lost");
      return;
    }

    const nextBoard = revealCells(board, index, boardSize);
    setBoard(nextBoard);

    if (hasWon(nextBoard)) {
      setStatus("won");
    }
  }

  function handleFlag(index: number) {
    if (status !== "playing") return;

    setBoard((currentBoard) =>
      currentBoard.map((cell, cellIndex) =>
        cellIndex === index && !cell.revealed
          ? { ...cell, flagged: !cell.flagged }
          : cell
      )
    );
  }

  function clearLongPressTimer() {
    if (!longPressTimer.current) return;

    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  function handleTouchStart(index: number) {
    if (status !== "playing") return;

    longPressTriggered.current = false;
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      handleFlag(index);
      clearLongPressTimer();
    }, 450);
  }

  function handleTouchEnd() {
    clearLongPressTimer();

    if (longPressTriggered.current) {
      window.setTimeout(() => {
        longPressTriggered.current = false;
      }, 350);
    }
  }

  function handleCellClick(index: number) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    handleReveal(index);
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      {status === "won" ? (
        <GameEndOverlay
          result="win"
          title="You win"
          message="You cleared the board without hitting a Droobins mine."
          onPlayAgain={resetGame}
        />
      ) : null}

      <div className="rounded-md border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 sm:gap-3 sm:pb-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900 sm:text-lg">
              Moonbirds Toobinsweeper
            </h2>
            <p className="mt-1 hidden text-sm text-neutral-600 sm:block">
              {boardSize}x{boardSize} grid with Droobins mines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="toobinsweeper-board-size">
              Board size
            </label>
            <select
              id="toobinsweeper-board-size"
              value={boardSize}
              onChange={(event) => handleBoardSizeChange(event.target.value)}
              className="input h-10 w-32 text-sm sm:h-auto sm:w-44 sm:text-base"
              aria-label="Board size"
            >
              {BOARD_SIZES.map((size) => (
                <option key={size} value={size}>
                  Board size: {size}x{size}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary h-10 px-2 text-sm sm:h-auto sm:px-3"
              onClick={resetGame}
            >
              New game
            </button>
          </div>
        </div>

        <div className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-center text-sm font-black text-neutral-900 sm:hidden">
          {mineCount} mines · {flagsUsed} flags · {revealedCount} clear
        </div>

        <div className="mt-4 hidden grid-cols-3 gap-3 rounded-md bg-neutral-100 p-2 text-center sm:grid">
          <div>
            <div className="text-lg font-black text-neutral-900">{mineCount}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Mines
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-neutral-900">{flagsUsed}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Flags
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-neutral-900">{revealedCount}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Clear
            </div>
          </div>
        </div>

        <div className="mx-auto mt-2 max-w-[560px] rounded-md border bg-[#faf7f2] p-1 sm:mt-4 sm:p-2">
          <div
            className="grid gap-0.5 sm:gap-1"
            style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
          >
            {board.map((cell, index) => {
              const open = cell.revealed;
              const exploded = open && cell.hasMine && status === "lost";

              return (
                <button
                  key={index}
                  type="button"
                  aria-label={`Square ${index + 1}${
                    cell.flagged ? ", flagged" : ""
                  }${open ? ", revealed" : ""}`}
                  onClick={() => handleCellClick(index)}
                  onTouchStart={() => handleTouchStart(index)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (longPressTriggered.current) return;
                    handleFlag(index);
                  }}
                  className={[
                    "relative flex aspect-square min-w-0 items-center justify-center rounded-[4px] border text-xs font-black transition sm:text-sm md:text-base",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black",
                    open
                      ? "border-neutral-300 bg-white text-[#b20000]"
                      : "border-neutral-400 bg-neutral-200 text-neutral-800 hover:bg-neutral-100",
                    exploded ? "border-[#ce0000] bg-[#fff1f1]" : "",
                  ].join(" ")}
                >
                  {cell.flagged && !open ? (
                    <Image
                      src={FLAG_IMAGE}
                      alt="Toobins flag"
                      width={56}
                      height={56}
                      className="h-[88%] w-[88%] object-contain"
                    />
                  ) : null}
                  {open && cell.hasMine ? (
                    <Image
                      src={MINE_IMAGE}
                      alt="Droobins mine"
                      width={56}
                      height={56}
                      className="h-[88%] w-[88%] object-contain"
                    />
                  ) : null}
                  {open && !cell.hasMine && cell.adjacentMines > 0 ? (
                    <span>{cell.adjacentMines}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={[
            "mt-2 flex items-center justify-between gap-3 rounded-md px-3 py-2 sm:mt-4 sm:px-4 sm:py-3",
            status === "lost" ? "bg-[#fff1f1]" : "bg-neutral-100",
          ].join(" ")}
        >
          <p className="text-sm font-semibold text-neutral-800">{statusText}</p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Tap to reveal · Hold to flag
          </p>
        </div>
      </div>
    </section>
  );
}
