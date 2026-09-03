"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCustomTokenUrl, type VariantKey } from "@/app/shop/customCollections";
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
const DEFAULT_BOARD_SIZE: BoardSize = 5;
const BOARD_SIZE_STORAGE_KEY = "moonbirds-memory-board-size";

function isBoardSize(value: number): value is BoardSize {
  return BOARD_SIZES.includes(value as BoardSize);
}

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
  const [boardSize, setBoardSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE);
  const [cards, setCards] = useState<Card[]>(() => createDeck(DEFAULT_BOARD_SIZE));
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [variant, setVariant] = useState<VariantKey>("illustrated");
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const pairCount = getPairCount(boardSize);
  const cardCount = getCardCount(boardSize);
  const matchedPairs = useMemo(
    () => cards.filter((card) => card.matched && !card.free).length / 2,
    [cards]
  );
  const complete = matchedPairs === pairCount;
  const preloadUrls = useMemo(() => {
    const tokenIds = new Set(cards.filter((card) => !card.free).map((card) => card.tokenId));

    return [...tokenIds]
      .map((tokenId) => buildCustomTokenUrl(tokenId, "moonbirds", variant))
      .filter(Boolean);
  }, [cards, variant]);

  useEffect(() => {
    let active = true;

    if (preloadUrls.length === 0) {
      setImagesReady(true);
      return;
    }

    setImagesReady(false);

    const preloadJobs = preloadUrls.map((url) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = url;

      return new Promise<void>((resolve) => {
        image.onload = () => {
          if (image.decode) {
            image.decode().then(resolve).catch(resolve);
            return;
          }

          resolve();
        };
        image.onerror = () => resolve();
      });
    });

    Promise.all(preloadJobs).then(() => {
      if (active) setImagesReady(true);
    });

    return () => {
      active = false;
    };
  }, [preloadUrls]);

  useEffect(() => {
    const savedBoardSize = Number(window.localStorage.getItem(BOARD_SIZE_STORAGE_KEY));
    if (!isBoardSize(savedBoardSize) || savedBoardSize === DEFAULT_BOARD_SIZE) return;

    setBoardSize(savedBoardSize);
    setCards(createDeck(savedBoardSize));
    setSelectedIndexes([]);
    setMoves(0);
    setLocked(false);
    setFailedImages(new Set());
  }, []);

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
    window.localStorage.setItem(BOARD_SIZE_STORAGE_KEY, String(nextBoardSize));
    setBoardSize(nextBoardSize);
    setCards(createDeck(nextBoardSize));
    setSelectedIndexes([]);
    setMoves(0);
    setLocked(false);
    setFailedImages(new Set());
  }

  function handleVariantChange(nextVariant: VariantKey) {
    setVariant(nextVariant);
    setSelectedIndexes([]);
    setLocked(false);
    setFailedImages(new Set());
  }

  function handleCardClick(index: number) {
    if (locked || complete || !imagesReady) return;

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

      <div className="rounded-md border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 sm:gap-3 sm:pb-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900 sm:text-lg">Moonbirds Memory</h2>
            <p className="mt-1 hidden text-sm text-neutral-600 sm:block">
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
              className="input h-10 w-28 text-sm sm:h-auto sm:w-44 sm:text-base"
              aria-label="Board size"
            >
              {BOARD_SIZES.map((size) => (
                <option key={size} value={size}>
                  Board size: {size}x{size}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="memory-card-art-mobile">
              Card art
            </label>
            <select
              id="memory-card-art-mobile"
              value={variant}
              onChange={(event) => handleVariantChange(event.target.value as VariantKey)}
              className="input h-10 w-24 text-sm sm:hidden"
              aria-label="Card art"
            >
              <option value="illustrated">Art</option>
              <option value="pixel">Pixel</option>
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

        <div className="mt-2 hidden flex-wrap items-center justify-between gap-2 rounded-md border bg-[#faf7f2] p-2 sm:mt-4 sm:flex sm:gap-3 sm:p-3">
          <p className="text-sm font-bold text-neutral-900">
            Card art
          </p>
          <div className="hidden grid-cols-2 rounded-full bg-neutral-200 p-1 sm:inline-grid">
            <button
              type="button"
              onClick={() => handleVariantChange("illustrated")}
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
              onClick={() => handleVariantChange("pixel")}
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

        <div className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-center text-sm font-black text-neutral-900 sm:hidden">
          {matchedPairs}/{pairCount} matches · {moves} moves
        </div>

        <div className="mt-4 hidden grid-cols-3 gap-3 rounded-md bg-neutral-100 p-2 text-center sm:grid">
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

        <div className="relative mx-auto mt-2 max-w-[620px] rounded-md border bg-[#faf7f2] p-1 sm:mt-4 sm:p-2">
          {!imagesReady ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/55 backdrop-blur-[1px]">
              <div className="rounded-md border bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-sm font-black text-neutral-900">Shuffling cards</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#b20000]">
                  Loading Moonbirds
                </p>
              </div>
            </div>
          ) : null}
          <div
            className="grid gap-1 sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
          >
            {cards.map((card, index) => {
              const visible = card.flipped || card.matched;
              const imageUrl = failedImages.has(card.tokenId)
                ? ""
                : buildCustomTokenUrl(card.tokenId, "moonbirds", variant);

              return (
                <button
                  key={card.id}
                  type="button"
                  aria-label={`Memory card ${index + 1}${
                    visible ? `, Moonbird ${card.tokenId}` : ""
                  }`}
                  disabled={locked || !imagesReady || card.matched || card.free}
                  onClick={() => handleCardClick(index)}
                  className={[
                    "relative flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-md border transition",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black",
                    visible
                      ? "border-neutral-300 bg-[#faf7f2]"
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
                    <img
                      src={imageUrl}
                      alt={`Moonbird ${card.tokenId}`}
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

        <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-neutral-100 px-3 py-2 sm:mt-4 sm:px-4 sm:py-3">
          <p className="text-sm font-semibold text-neutral-800">
            {complete
              ? "All pairs matched"
              : imagesReady
                ? "Find each matching Moonbird"
                : "Shuffling cards"}
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            {cardCount} cards
          </p>
        </div>
      </div>
    </section>
  );
}
