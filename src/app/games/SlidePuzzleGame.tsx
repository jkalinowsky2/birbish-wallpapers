"use client";

import { useMemo, useState } from "react";
import { buildCustomTokenUrl, type VariantKey } from "@/app/shop/customCollections";
import GameEndOverlay from "./GameEndOverlay";

const BOARD_SIZE = 3;
const EMPTY_TILE = -1;

function createSolvedBoard() {
  const tileCount = BOARD_SIZE * BOARD_SIZE;
  return Array.from({ length: tileCount }, (_, index) =>
    index === tileCount - 1 ? EMPTY_TILE : index
  );
}

function getAdjacentIndexes(index: number) {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const adjacent: number[] = [];

  if (row > 0) adjacent.push(index - BOARD_SIZE);
  if (row < BOARD_SIZE - 1) adjacent.push(index + BOARD_SIZE);
  if (col > 0) adjacent.push(index - 1);
  if (col < BOARD_SIZE - 1) adjacent.push(index + 1);

  return adjacent;
}

function swapTiles(board: number[], fromIndex: number, toIndex: number) {
  const nextBoard = [...board];
  [nextBoard[fromIndex], nextBoard[toIndex]] = [nextBoard[toIndex], nextBoard[fromIndex]];
  return nextBoard;
}

function isSolved(board: number[]) {
  return board.every((tile, index) =>
    index === board.length - 1 ? tile === EMPTY_TILE : tile === index
  );
}

function createShuffledBoard() {
  let board = createSolvedBoard();
  let previousEmptyIndex: number | null = null;
  const moveCount = BOARD_SIZE * BOARD_SIZE * 24;

  for (let move = 0; move < moveCount; move += 1) {
    const emptyIndex = board.indexOf(EMPTY_TILE);
    const choices = getAdjacentIndexes(emptyIndex).filter(
      (index) => index !== previousEmptyIndex
    );
    const moveIndex = choices[Math.floor(Math.random() * choices.length)];

    previousEmptyIndex = emptyIndex;
    board = swapTiles(board, moveIndex, emptyIndex);
  }

  if (!isSolved(board)) return board;

  const emptyIndex = board.indexOf(EMPTY_TILE);
  const moveIndex = getAdjacentIndexes(emptyIndex)[0];
  return swapTiles(board, moveIndex, emptyIndex);
}

export default function SlidePuzzleGame() {
  const [board, setBoard] = useState<number[]>(() => createShuffledBoard());
  const [moves, setMoves] = useState(0);
  const [tokenId, setTokenId] = useState("8209");
  const [variant, setVariant] = useState<VariantKey>("illustrated");

  const tokenIdTrimmed = tokenId.trim();
  const imageUrl = useMemo(
    () => buildCustomTokenUrl(tokenIdTrimmed, "moonbirds", variant),
    [tokenIdTrimmed, variant]
  );
  const complete = isSolved(board);

  function startNewGame() {
    setBoard(createShuffledBoard());
    setMoves(0);
  }

  function handleTokenChange(value: string) {
    setTokenId(value.replace(/\D/g, "").slice(0, 4));
  }

  function handleTileClick(index: number) {
    if (complete) return;

    const emptyIndex = board.indexOf(EMPTY_TILE);
    if (!getAdjacentIndexes(emptyIndex).includes(index)) return;

    setBoard((currentBoard) => swapTiles(currentBoard, index, emptyIndex));
    setMoves((currentMoves) => currentMoves + 1);
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      {complete ? (
        <GameEndOverlay
          result="win"
          title="Puzzle solved"
          message={`You rebuilt Moonbird ${tokenIdTrimmed} in ${moves} moves.`}
          onPlayAgain={startNewGame}
        />
      ) : null}

      <div className="rounded-md border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 sm:gap-3 sm:pb-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900 sm:text-lg">
              Moonbirds Slide Puzzle
            </h2>
            <p className="mt-1 hidden text-sm text-neutral-600 sm:block">
              Rebuild Moonbird {tokenIdTrimmed || "8209"} by sliding the tiles.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary h-10 px-2 text-sm sm:h-auto sm:px-3"
            onClick={startNewGame}
          >
            New game
          </button>
        </div>

        <div className="mt-2 rounded-md border bg-[#faf7f2] p-2 sm:mt-4 sm:p-3">
          <label
            className="text-sm font-bold text-neutral-900"
            htmlFor="slide-puzzle-moonbird-token"
          >
            Choose your Moonbird
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <input
              id="slide-puzzle-moonbird-token"
              value={tokenId}
              onChange={(event) => handleTokenChange(event.target.value)}
              placeholder="Token ID"
              inputMode="numeric"
              className="input h-10 max-w-28 text-sm sm:h-auto sm:max-w-36 sm:text-base"
            />

            <select
              value={variant}
              onChange={(event) => setVariant(event.target.value as VariantKey)}
              className="input h-10 w-32 text-sm sm:hidden"
              aria-label="Puzzle art"
            >
              <option value="illustrated">Illustrated</option>
              <option value="pixel">Pixel</option>
            </select>

            <div className="hidden grid-cols-2 rounded-full bg-neutral-200 p-1 sm:inline-grid">
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
          {tokenIdTrimmed && !imageUrl ? (
            <p className="text-xs font-medium text-[#b20000]">
              Enter a Moonbird token ID from 0 to 9999.
            </p>
          ) : null}
        </div>

        <div className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-center text-sm font-black text-neutral-900 sm:hidden">
          3x3 · {moves} moves · {board.length - 1} tiles
        </div>

        <div className="mt-4 hidden grid-cols-3 gap-3 rounded-md bg-neutral-100 p-2 text-center sm:grid">
          <div>
            <div className="text-lg font-black text-neutral-900">3x3</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Board
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-neutral-900">{moves}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Moves
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-neutral-900">{board.length - 1}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Tiles
            </div>
          </div>
        </div>

        <div className="mx-auto mt-2 max-w-[540px] rounded-md border bg-[#faf7f2] p-1 sm:mt-4 sm:p-2">
          <div
            className="grid gap-1 sm:gap-1.5"
            style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
          >
            {board.map((tile, index) => {
              if (tile === EMPTY_TILE) {
                return (
                  <div
                    key="empty"
                    className="aspect-square rounded-md border border-dashed border-[#b20000]/40 bg-[#ce0000]/10"
                    aria-label="Empty space"
                  />
                );
              }

              const originalRow = Math.floor(tile / BOARD_SIZE);
              const originalCol = tile % BOARD_SIZE;
              const canMove = getAdjacentIndexes(board.indexOf(EMPTY_TILE)).includes(index);

              return (
                <button
                  key={tile}
                  type="button"
                  aria-label={`Tile ${tile + 1}${canMove ? ", can move" : ""}`}
                  onClick={() => handleTileClick(index)}
                  className={[
                    "aspect-square overflow-hidden rounded-md border border-neutral-300 bg-white bg-no-repeat shadow-sm transition",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black",
                    canMove ? "cursor-pointer hover:brightness-105" : "cursor-default",
                  ].join(" ")}
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: `${BOARD_SIZE * 100}% ${BOARD_SIZE * 100}%`,
                    backgroundPosition: `${(originalCol / (BOARD_SIZE - 1)) * 100}% ${(originalRow / (BOARD_SIZE - 1)) * 100}%`,
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-neutral-100 px-3 py-2 sm:mt-4 sm:px-4 sm:py-3">
          <p className="text-sm font-semibold text-neutral-800">
            {complete
              ? "Puzzle solved"
              : "Slide neighboring tiles into the open space"}
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Casual mode
          </p>
        </div>
      </div>
    </section>
  );
}
