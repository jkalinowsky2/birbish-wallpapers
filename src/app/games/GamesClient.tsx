"use client";

import { useState } from "react";
import MemoryGame from "./MemoryGame";
import ReversiGame from "./ReversiGame";
import SlidePuzzleGame from "./SlidePuzzleGame";
import TicTacToeGame from "./TicTacToeGame";
import ToobinsweeperGame from "./ToobinsweeperGame";

type GameKey = "memory" | "tic-tac-toe" | "toobinsweeper" | "reversi" | "slide";

const GAMES: Array<{ key: GameKey; label: string }> = [
  { key: "memory", label: "Memory" },
  { key: "tic-tac-toe", label: "Tic-Tac-Toe" },
  { key: "toobinsweeper", label: "Toobinsweeper" },
  { key: "reversi", label: "Reversi" },
  { key: "slide", label: "Slide Puzzle" },
];

export default function GamesClient() {
  const [selectedGame, setSelectedGame] = useState<GameKey>("memory");

  return (
    <section className="grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className="lg:hidden">
        <label className="sr-only" htmlFor="mobile-game-selector">
          Choose a game
        </label>
        <select
          id="mobile-game-selector"
          value={selectedGame}
          onChange={(event) => setSelectedGame(event.target.value as GameKey)}
          className="input w-full"
          aria-label="Choose a game"
        >
          {GAMES.map((game) => (
            <option key={game.key} value={game.key}>
              Game: {game.label}
            </option>
          ))}
        </select>
      </div>

      <nav
        aria-label="Choose a game"
        className="hidden rounded-md border bg-white p-2 shadow-sm lg:sticky lg:top-20 lg:block"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-1">
          {GAMES.map((game) => {
            const active = selectedGame === game.key;

            return (
              <button
                key={game.key}
                type="button"
                onClick={() => setSelectedGame(game.key)}
                className={[
                  "rounded-md px-3 py-2 text-center text-sm font-semibold transition lg:text-left",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
                  active
                    ? "bg-gradient-to-b from-[#ce0000] to-[#b20000] text-white"
                    : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
                ].join(" ")}
              >
                {game.label}
              </button>
            );
          })}
        </div>
      </nav>

      {selectedGame === "memory" ? <MemoryGame /> : null}
      {selectedGame === "tic-tac-toe" ? <TicTacToeGame /> : null}
      {selectedGame === "toobinsweeper" ? <ToobinsweeperGame /> : null}
      {selectedGame === "reversi" ? <ReversiGame /> : null}
      {selectedGame === "slide" ? <SlidePuzzleGame /> : null}
    </section>
  );
}
