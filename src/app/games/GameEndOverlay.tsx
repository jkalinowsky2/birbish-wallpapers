"use client";

import type { CSSProperties } from "react";

type GameEndOverlayProps = {
  result: "win" | "lose";
  title: string;
  message: string;
  onPlayAgain: () => void;
};

const CONFETTI_COLORS = ["#ce0000", "#ffd28f", "#111111", "#ffffff", "#7c1315"];
const CONFETTI_PIECES = Array.from({ length: 72 }, (_, index) => ({
  id: index,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 0.75}s`,
  duration: `${2.2 + Math.random() * 1.4}s`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  rotate: `${Math.random() * 360}deg`,
}));

export default function GameEndOverlay({
  result,
  title,
  message,
  onPlayAgain,
}: GameEndOverlayProps) {
  const won = result === "win";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      {won ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI_PIECES.map((piece) => (
            <span
              key={piece.id}
              className="absolute top-[-24px] h-3 w-2 rounded-[2px]"
              style={
                {
                  left: piece.left,
                  backgroundColor: piece.color,
                  rotate: piece.rotate,
                  animation: `game-confetti-fall ${piece.duration} ${piece.delay} ease-out forwards`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}

      <div className="relative w-full max-w-sm rounded-lg border bg-white p-6 text-center shadow-2xl">
        <div
          className={[
            "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-black",
            won ? "bg-[#fff1f1] text-[#ce0000]" : "bg-neutral-100 text-neutral-900",
          ].join(" ")}
        >
          {won ? "W" : "L"}
        </div>
        <h3 className="text-2xl font-black tracking-tight text-neutral-900">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-neutral-700">{message}</p>
        <button
          type="button"
          className="btn btn-primary mt-5 w-full"
          onClick={onPlayAgain}
        >
          Play again
        </button>
      </div>

      <style jsx global>{`
        @keyframes game-confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -24px, 0) rotate(0deg);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 110vh, 0) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
}
