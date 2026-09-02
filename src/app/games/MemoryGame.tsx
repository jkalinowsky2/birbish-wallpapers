"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { buildCustomTokenUrl } from "@/app/shop/customCollections";
import GameEndOverlay from "./GameEndOverlay";

type Card = {
  id: string;
  tokenId: string;
  flipped: boolean;
  matched: boolean;
  free?: boolean;
};

type BoardSize = 4 | 5 | 6;

const TOKEN_MIN = 0;
const TOKEN_MAX = 9999;
const BOARD_SIZES: BoardSize[] = [4, 5, 6];

function shuffle<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getPairCount(boardSize: BoardSize) {
  return Math.floor((boardSize * boardSize) / 2);
}

function getCardCount(boardSize: BoardSize) {
  return boardSize * boardSize;
}

function getRandomTokenIds(pairCount: number) {
  const tokenIds = new Set<string>();

  while (tokenIds.size < pairCount) {
    tokenIds.add(
      String(Math.floor(Math.random() * (TOKEN_MAX - TOKEN_MIN + 1)) + TOKEN_MIN)
    );
  }

  return [...tokenIds];
}

function createDeck(boardSize: BoardSize): Card[] {
  const pairCount = getPairCount(boardSize);
  const cards: Card[] = getRandomTokenIds(pairCount).flatMap((tokenId) => [
    {
      id: `${tokenId}:a`,
      tokenId,
      flipped: false,
      matched: false,
    },
    {
      id: `${tokenId}:b`,
      tokenId,
      flipped: false,
      matched: false,
    },
  ]);

  const shuffled = shuffle(cards);

  if (boardSize % 2 === 1) {
    const centerIndex = Math.floor(getCardCount(boardSize) / 2);
    shuffled.splice(centerIndex, 0, {
      id: "free-space",
      tokenId: "FREE",
      flipped: true,
      matched: true,
      free: true,
    });
  }

  return shuffled;
}

export default function MemoryGame() {
  const [boardSize, setBoardSize] = useState<BoardSize>(6);
  const [cards, setCards] = useState<Card[]>(() => createDeck(6));
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const pairCount = getPairCount(boardSize);
  const cardCount = getCardCount(boardSize);
  const matchedPairs = useMemo(
    () => cards.filter((card) => card.matched && !card.free).length / 2,
    [cards]
  );
  const complete = matchedPairs === pairCount;

  function resetGame() {
    setCards(createDeck(boardSize));
    setSelectedIndexes([]);
    setMoves(0);
    setLocked(false);
    setFailedImages(new Set());
  }

  function handleImageError(tokenId: string) {
    setFailedImages((current) => {
      const next = new Set(current);
      next.add(tokenId);
      return next;
    });
  }

  function handleBoardSizeChange(value: string) {
    const nextBoardSize = Number(value) as BoardSize;
    setBoardSize(nextBoardSize);
    setCards(createDeck(nextBoardSize));
    setSelectedIndexes([]);
    setMoves(0);
    setLocked(false);
    setFailedImages(new Set());
  }

  function handleCardClick(index: number) {
    if (locked || complete) return;

    const card = cards[index];
    if (card.flipped || card.matched || selectedIndexes.includes(index)) return;

    const nextSelected = [...selectedIndexes, index];
    const nextCards = cards.map((currentCard, cardIndex) =>
      cardIndex === index ? { ...currentCard, flipped: true } : currentCard
    );

    setCards(nextCards);
    setSelectedIndexes(nextSelected);

    if (nextSelected.length !== 2) return;

    setMoves((currentMoves) => currentMoves + 1);

    const [firstIndex, secondIndex] = nextSelected;
    const firstCard = nextCards[firstIndex];
    const secondCard = nextCards[secondIndex];

    if (firstCard.tokenId === secondCard.tokenId) {
      setCards((currentCards) =>
        currentCards.map((currentCard, cardIndex) =>
          cardIndex === firstIndex || cardIndex === secondIndex
            ? { ...currentCard, matched: true }
            : currentCard
        )
      );
      setSelectedIndexes([]);
      return;
    }

    setLocked(true);
    window.setTimeout(() => {
      setCards((currentCards) =>
        currentCards.map((currentCard, cardIndex) =>
          cardIndex === firstIndex || cardIndex === secondIndex
            ? { ...currentCard, flipped: false }
            : currentCard
        )
      );
      setSelectedIndexes([]);
      setLocked(false);
    }, 850);
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      {complete ? (
        <GameEndOverlay
          result="win"
          title="Memory solved"
          message={`You matched all ${pairCount} Moonbird pairs in ${moves} moves.`}
          onPlayAgain={resetGame}
        />
      ) : null}

      <div className="rounded-md border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Moonbirds Memory</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Match {pairCount} randomized Moonbird pairs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="memory-board-size">
              Board size
            </label>
            <select
              id="memory-board-size"
              value={boardSize}
              onChange={(event) => handleBoardSizeChange(event.target.value)}
              className="input w-44"
              aria-label="Board size"
            >
              {BOARD_SIZES.map((size) => (
                <option key={size} value={size}>
                  Board size: {size}x{size}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-primary" onClick={resetGame}>
              New game
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 rounded-md bg-neutral-100 p-2 text-center">
          <div>
            <div className="text-lg font-black text-neutral-900">{matchedPairs}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Matches
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-neutral-900">{pairCount}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Pairs
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-neutral-900">{moves}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Moves
            </div>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-[620px] rounded-md border bg-[#faf7f2] p-2">
          <div
            className="grid gap-1.5 sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
          >
            {cards.map((card, index) => {
              const visible = card.flipped || card.matched;
              const imageUrl = failedImages.has(card.tokenId)
                ? ""
                : buildCustomTokenUrl(card.tokenId, "moonbirds", "illustrated");

              return (
                <button
                  key={card.id}
                  type="button"
                  aria-label={`Memory card ${index + 1}${
                    visible ? `, Moonbird ${card.tokenId}` : ""
                  }`}
                  disabled={locked || card.matched || card.free}
                  onClick={() => handleCardClick(index)}
                  className={[
                    "relative flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-md border transition",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black",
                    visible
                      ? "border-neutral-300 bg-white"
                      : "border-neutral-400 bg-gradient-to-b from-[#ce0000] to-[#b20000] hover:brightness-110",
                    card.matched ? "ring-2 ring-[#ce0000]/30" : "",
                  ].join(" ")}
                >
                  {visible && card.free ? (
                    <span className="text-xs font-black text-[#b20000] sm:text-sm">
                      FREE
                    </span>
                  ) : null}
                  {visible && !card.free && imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`Moonbird ${card.tokenId}`}
                      width={96}
                      height={96}
                      className="h-[92%] w-[92%] object-contain"
                      onError={() => handleImageError(card.tokenId)}
                    />
                  ) : null}
                  {visible && !card.free && !imageUrl ? (
                    <span className="text-xs font-black text-neutral-800 sm:text-sm">
                      #{card.tokenId}
                    </span>
                  ) : null}
                  {!visible ? (
                    <span
                      aria-hidden="true"
                      className="h-[58%] w-[58%] bg-white/45"
                      style={{
                        WebkitMaskImage: "url('/overlays/birblogo.png')",
                        maskImage: "url('/overlays/birblogo.png')",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-neutral-100 px-4 py-3">
          <p className="text-sm font-semibold text-neutral-800">
            {complete ? "All pairs matched" : "Find each matching Moonbird"}
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            {cardCount} cards
          </p>
        </div>
      </div>
    </section>
  );
}
