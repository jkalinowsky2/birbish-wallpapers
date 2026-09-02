"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { buildCustomTokenUrl, type VariantKey } from "@/app/shop/customCollections";
import GameEndOverlay from "./GameEndOverlay";

type Player = "X" | "O";
type Cell = Player | null;

const PLAYER: Player = "X";
const COMPUTER: Player = "O";
const COMPUTER_TOKEN_ID = "8209";
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

const COMPUTER_SMART_WIN_CHANCE = 0.9;
const COMPUTER_SMART_BLOCK_CHANCE = 0.7;
const COMPUTER_PREFERRED_MOVE_CHANCE = 0.65;

function getWinner(board: Cell[]) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }

  return null;
}

function getOpenCells(board: Cell[]) {
  return board
    .map((cell, index) => (cell ? null : index))
    .filter((index): index is number => index !== null);
}

function getRandomMove(board: Cell[]) {
  const openCells = getOpenCells(board);

  if (openCells.length === 0) return null;

  return openCells[Math.floor(Math.random() * openCells.length)];
}

function findMove(board: Cell[], player: Player) {
  for (let index = 0; index < board.length; index += 1) {
    if (board[index]) continue;

    const next = [...board];
    next[index] = player;

    if (getWinner(next)?.player === player) {
      return index;
    }
  }

  return null;
}

function getComputerMove(board: Cell[]) {
  const winningMove = findMove(board, COMPUTER);
  if (winningMove !== null && Math.random() < COMPUTER_SMART_WIN_CHANCE) {
    return winningMove;
  }

  const blockingMove = findMove(board, PLAYER);
  if (blockingMove !== null && Math.random() < COMPUTER_SMART_BLOCK_CHANCE) {
    return blockingMove;
  }

  if (Math.random() < COMPUTER_PREFERRED_MOVE_CHANCE) {
    for (const index of [4, 0, 2, 6, 8, 1, 3, 5, 7]) {
      if (!board[index]) return index;
    }
  }

  return getRandomMove(board);
}

function Piece({
  value,
  imageUrl,
  imageKey,
  onImageError,
}: {
  value: Player;
  imageUrl: string;
  imageKey: string;
  onImageError: (key: string) => void;
}) {
  const fallbackColor = value === PLAYER ? "text-[#ce0000]" : "text-neutral-900";

  if (imageUrl) {
    return (
      <Image
        key={imageKey}
        src={imageUrl}
        alt={value}
        width={80}
        height={80}
        className="h-[82%] w-[82%] object-contain"
        onError={() => onImageError(imageKey)}
      />
    );
  }

  return (
    <span className={`text-5xl font-black leading-none sm:text-6xl ${fallbackColor}`}>
      {value}
    </span>
  );
}

export default function TicTacToeGame() {
  const [board, setBoard] = useState<Cell[]>(Array<Cell>(9).fill(null));
  const [lastStarter, setLastStarter] = useState<Player>(PLAYER);
  const [playerTokenId, setPlayerTokenId] = useState("8209");
  const [variant, setVariant] = useState<VariantKey>("illustrated");
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const winner = useMemo(() => getWinner(board), [board]);
  const isDraw = !winner && board.every(Boolean);
  const gameOver = Boolean(winner) || isDraw;
  const tokenIdTrimmed = playerTokenId.trim();
  const playerImageKey = `moonbirds:${variant}:${tokenIdTrimmed}`;
  const computerImageKey = `moonbirds:${variant}:${COMPUTER_TOKEN_ID}`;
  const playerImageUrl = failedImages.has(playerImageKey)
    ? ""
    : buildCustomTokenUrl(tokenIdTrimmed, "moonbirds", variant);
  const computerImageUrl = failedImages.has(computerImageKey)
    ? ""
    : buildCustomTokenUrl(COMPUTER_TOKEN_ID, "moonbirds", variant);
  const pieceImages: Record<Player, { url: string; key: string }> = {
    X: { url: playerImageUrl, key: playerImageKey },
    O: { url: computerImageUrl, key: computerImageKey },
  };

  const status = winner
    ? winner.player === PLAYER
      ? "You won"
      : "Computer won"
    : isDraw
      ? "Draw game"
      : "Your turn";

  function handleTokenChange(value: string) {
    setPlayerTokenId(value.replace(/\D/g, "").slice(0, 4));
  }

  function handleImageError(key: string) {
    setFailedImages((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  function handleCellClick(index: number) {
    if (board[index] || gameOver) return;

    const playerMove = [...board];
    playerMove[index] = PLAYER;

    if (getWinner(playerMove) || playerMove.every(Boolean)) {
      setBoard(playerMove);
      return;
    }

    const computerMove = getComputerMove(playerMove);
    if (computerMove !== null) {
      playerMove[computerMove] = COMPUTER;
    }

    setBoard(playerMove);
  }

  function resetGame() {
    const nextStarter = lastStarter === PLAYER ? COMPUTER : PLAYER;
    const nextBoard = Array<Cell>(9).fill(null);

    if (nextStarter === COMPUTER) {
      nextBoard[getComputerMove(nextBoard) ?? 4] = COMPUTER;
    }

    setLastStarter(nextStarter);
    setBoard(nextBoard);
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      {winner?.player === PLAYER ? (
        <GameEndOverlay
          result="win"
          title="You win"
          message="You beat Kapow at tic-tac-toe."
          onPlayAgain={resetGame}
        />
      ) : null}
      {winner?.player === COMPUTER ? (
        <GameEndOverlay
          result="lose"
          title="You lose"
          message="Kapow won this round."
          onPlayAgain={resetGame}
        />
      ) : null}

      <div className="rounded-md border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Moonbirds Tic-Tac-Toe</h2>
            <p className="mt-1 text-sm text-neutral-600">
              You are Moonbird {tokenIdTrimmed || "X"}. Computer is Tiny King Kapow.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={resetGame}>
            New game
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-md border bg-[#faf7f2] p-3">
          <label className="text-sm font-bold text-neutral-900" htmlFor="moonbird-token">
            Choose your Moonbird
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="moonbird-token"
              value={playerTokenId}
              onChange={(event) => handleTokenChange(event.target.value)}
              placeholder="Token ID"
              inputMode="numeric"
              className="input max-w-36"
            />

            <div className="inline-grid grid-cols-2 rounded-full bg-neutral-200 p-1">
              <button
                type="button"
                onClick={() => setVariant("illustrated")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  variant === "illustrated"
                    ? "bg-[#d1242a] text-white shadow-sm"
                    : "text-neutral-700 hover:text-neutral-900"
                }`}
              >
                Illustrated
              </button>
              <button
                type="button"
                onClick={() => setVariant("pixel")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  variant === "pixel"
                    ? "bg-[#d1242a] text-white shadow-sm"
                    : "text-neutral-700 hover:text-neutral-900"
                }`}
              >
                Pixel
              </button>
            </div>
          </div>
          {tokenIdTrimmed && !playerImageUrl ? (
            <p className="text-xs font-medium text-[#b20000]">
              Could not load that Moonbird image, so your piece is using X for now.
            </p>
          ) : null}
        </div>

        <div className="mx-auto mt-4 grid max-w-[460px] grid-cols-3 gap-2">
          {board.map((cell, index) => {
            const isWinningCell = winner?.line.some((cellIndex) => cellIndex === index);

            return (
              <button
                key={index}
                type="button"
                aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ""}`}
                disabled={Boolean(cell) || gameOver}
                onClick={() => handleCellClick(index)}
                className={[
                  "flex aspect-square items-center justify-center rounded-md border text-neutral-900 transition",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
                  isWinningCell
                    ? "border-[#ce0000] bg-[#fff1f1] text-[#b20000]"
                    : "border-neutral-300 bg-neutral-50 hover:bg-white",
                  cell || gameOver ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                {cell ? (
                  <Piece
                    value={cell}
                    imageUrl={pieceImages[cell].url}
                    imageKey={pieceImages[cell].key}
                    onImageError={handleImageError}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-neutral-100 px-4 py-3">
          <p className="text-sm font-semibold text-neutral-800">{status}</p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Best of one
          </p>
        </div>
      </div>
    </section>
  );
}
