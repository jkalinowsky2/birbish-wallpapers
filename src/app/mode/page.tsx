"use client";

import { useState } from "react";

export default function BirbModePage() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="min-h-[calc(100dvh-10rem)] w-full bg-transparent">
      <section className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-2xl flex-col items-center justify-center gap-20 px-6 py-16">
        <div className="flex w-full items-center justify-between gap-8">
          <h1 className="text-4xl font-semibold tracking-normal text-black sm:text-5xl">
            $BIRB Mode
          </h1>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="BIRB Mode"
            onClick={() => setEnabled((current) => !current)}
            className={[
              "relative h-14 w-28 shrink-0 rounded-full border-2 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black",
              enabled
                ? "border-[#c30500] bg-[#c30500]"
                : "border-neutral-300 bg-neutral-200",
            ].join(" ")}
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

        <div
          className={[
            "h-36 w-36 transition duration-500 sm:h-44 sm:w-44",
            enabled ? "bg-[#c30500] opacity-100" : "bg-neutral-200 opacity-30",
          ].join(" ")}
          aria-hidden="true"
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
      </section>
    </div>
  );
}
