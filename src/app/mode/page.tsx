"use client";

import { useState } from "react";

const LOGO_COLORS = {
  red: "#d12429",
  black: "#000000",
  blue: "#1a265e",
  cream: "#ecd9ba",
  pink: "#e84294",
  maroon: "#7d050d"
} as const;

type LogoColor = (typeof LOGO_COLORS)[keyof typeof LOGO_COLORS];

function getRandomLogoColor(): LogoColor {
  const roll = Math.random();

  if (roll < 0.75) return LOGO_COLORS.red;
  if (roll < 0.8) return LOGO_COLORS.cream;
  if (roll < 0.85) return LOGO_COLORS.black;
  if (roll < 0.90) return LOGO_COLORS.pink;
  if (roll < 0.95) return LOGO_COLORS.maroon;
  return LOGO_COLORS.blue;
}

export default function BirbModePage() {
  const [enabled, setEnabled] = useState(false);
  const [logoColor, setLogoColor] = useState<LogoColor>(LOGO_COLORS.red);
  const [modeCount, setModeCount] = useState(0);

  function toggleMode() {
    if (!enabled) {
      setLogoColor(getRandomLogoColor());
      setModeCount((count) => count + 1);
    }

    setEnabled((current) => !current);
  }

  return (
    <div className="relative min-h-[calc(100dvh-10rem)] w-full bg-transparent">
      <input
        aria-label="BIRB mode toggle count"
        className="fixed right-4 top-20 z-20 h-9 w-20 rounded border-0 bg-transparent px-2 text-center text-sm font-semibold text-black focus:outline-none"
        readOnly
        type="text"
        value={modeCount.toLocaleString()}
      />

      <section className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-2xl flex-col items-center justify-center gap-20 px-6 py-16">
        <div
          className={[
            "h-44 w-44 transition duration-500 sm:h-62 sm:w-62",
            enabled ? "opacity-100" : "bg-neutral-200 opacity-30",
          ].join(" ")}
          aria-hidden="true"
          style={{
            backgroundColor: enabled ? logoColor : undefined,
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

        <div className="flex w-full items-center justify-center gap-5 sm:gap-7">
          <h1
            className="whitespace-nowrap text-[2rem] font-semibold leading-none tracking-normal text-neutral-200 transition-colors duration-500 sm:text-5xl"
            style={enabled ? { color: logoColor } : undefined}
          >
            $birb mode
          </h1>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="BIRB Mode"
            onClick={toggleMode}
            className={[
              "relative h-14 w-28 shrink-0 rounded-full border-2 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black",
              enabled ? "" : "border-neutral-300 bg-neutral-200",
            ].join(" ")}
            style={
              enabled
                ? {
                    backgroundColor: logoColor,
                    borderColor: logoColor,
                  }
                : undefined
            }
          >
            <span
              aria-hidden="true"
              className={[
                "absolute left-1 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-300",
                enabled ? "translate-x-14" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
