"use client";

import { useEffect, useRef, useState } from "react";

const EXPORT_SIZE = 3334;
const MIN_TOKEN_ID = 1;
const MAX_TOKEN_ID = 122153;
const CHECK_VIEWBOX_SIZE = 47.5;

type CreditCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
};

type CreditArtwork = {
  cells: CreditCell[];
  viewBox: [number, number, number, number];
};

type Background = "white" | "black";

function isWhite(fill: string) {
  return ["#fff", "#ffffff", "white", "rgb(255,255,255)"].includes(
    fill.toLowerCase().replace(/\s/g, ""),
  );
}

function numberAttribute(element: Element, name: string) {
  return Number.parseFloat(element.getAttribute(name) ?? "0");
}

async function loadCredit(src: string) {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Unable to load credit");
  const svg = await response.text();
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = document.documentElement;
  const viewBoxValues = (root.getAttribute("viewBox") ?? "0 0 320 320")
    .trim()
    .split(/[ ,]+/)
    .map(Number);
  if (viewBoxValues.length !== 4 || viewBoxValues.some((value) => !Number.isFinite(value))) {
    throw new Error("Invalid Credit viewBox");
  }

  const cells = [...document.querySelectorAll("rect")].flatMap((rect) => {
    const fill = rect.getAttribute("fill") ?? "";
    const width = numberAttribute(rect, "width");
    const height = numberAttribute(rect, "height");
    if (!fill || isWhite(fill) || width <= 0 || height <= 0) return [];
    return [{
      x: numberAttribute(rect, "x"),
      y: numberAttribute(rect, "y"),
      width,
      height,
      fill,
    }];
  });
  if (cells.length === 0) throw new Error("Credit contains no colored cells");

  return {
    cells,
    viewBox: viewBoxValues as CreditArtwork["viewBox"],
  } satisfies CreditArtwork;
}

async function loadCheckPath() {
  const response = await fetch("/creditcheck/check.svg");
  if (!response.ok) throw new Error("Unable to load check artwork");
  const svg = await response.text();
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  const pathData = document.querySelector("path")?.getAttribute("d");
  if (!pathData) throw new Error("Check artwork has no path");
  return new Path2D(pathData);
}

function drawCreditCheck(
  ctx: CanvasRenderingContext2D,
  credit: CreditArtwork,
  checkPath: Path2D,
  background: Background,
) {
  ctx.fillStyle = background === "black" ? "#111111" : "#ffffff";
  ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
  const [viewX, viewY, viewWidth, viewHeight] = credit.viewBox;
  const scaleX = EXPORT_SIZE / viewWidth;
  const scaleY = EXPORT_SIZE / viewHeight;

  for (const cell of credit.cells) {
    ctx.save();
    ctx.translate((cell.x - viewX) * scaleX, (cell.y - viewY) * scaleY);
    ctx.scale(
      (cell.width * scaleX) / CHECK_VIEWBOX_SIZE,
      (cell.height * scaleY) / CHECK_VIEWBOX_SIZE,
    );
    ctx.fillStyle = cell.fill;
    ctx.fill(checkPath);
    ctx.restore();
  }
}

export default function CreditChecksClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderVersionRef = useRef(0);
  const [tokenInput, setTokenInput] = useState("1");
  const [tokenId, setTokenId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [background, setBackground] = useState<Background>("white");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedToken = Number(params.get("token"));
    if (Number.isInteger(sharedToken) && sharedToken >= MIN_TOKEN_ID && sharedToken <= MAX_TOKEN_ID) {
      setTokenInput(String(sharedToken));
      setTokenId(sharedToken);
    }
    if (params.get("background") === "black") setBackground("black");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const version = ++renderVersionRef.current;
    setLoading(true);
    setError("");

    Promise.all([
      loadCredit(`/api/creditcheck?id=${tokenId}`),
      loadCheckPath(),
    ]).then(([credit, checkPath]) => {
      if (version !== renderVersionRef.current) return;
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      drawCreditCheck(ctx, credit, checkPath, background);
      setLoading(false);
    }).catch(() => {
      if (version !== renderVersionRef.current) return;
      setLoading(false);
      setError(`Credit ${tokenId.toLocaleString()} could not be loaded.`);
    });
  }, [background, tokenId]);

  const updateUrl = (nextToken: number, nextBackground: Background) => {
    const params = new URLSearchParams({ token: String(nextToken) });
    if (nextBackground === "black") params.set("background", "black");
    window.history.replaceState(null, "", `/creditchecks?${params.toString()}`);
  };

  const selectToken = () => {
    const parsed = Number(tokenInput);
    if (!Number.isInteger(parsed) || parsed < MIN_TOKEN_ID || parsed > MAX_TOKEN_ID) {
      setError(`Enter a token ID from ${MIN_TOKEN_ID} to ${MAX_TOKEN_ID.toLocaleString()}.`);
      return;
    }
    setTokenInput(String(parsed));
    if (parsed === tokenId) {
      setError("");
    } else {
      setTokenId(parsed);
    }
    updateUrl(parsed, background);
  };

  const selectBackground = (nextBackground: Background) => {
    setBackground(nextBackground);
    updateUrl(tokenId, nextBackground);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || loading || error) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `credit-check-${tokenId}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const openXComposer = () => {
    const shareParams = new URLSearchParams({ token: String(tokenId) });
    if (background === "black") shareParams.set("background", "black");
    const shareUrl = `${window.location.origin}/creditchecks?${shareParams.toString()}`;
    const params = new URLSearchParams({
      text: `I ran a Credit Check on Credit #${tokenId}. Tool by @_jknft_.`,
      url: shareUrl,
    });
    window.open(
      `https://twitter.com/intent/tweet?${params.toString()}`,
      "credit-check-share",
      "popup,width=640,height=520,noopener,noreferrer",
    );
  };

  const shareOnX = () => openXComposer();

  return (
    <section className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 bg-white font-mono text-xs text-black">
      <header className="flex h-12 items-center justify-between border-b border-neutral-300 px-4 sm:px-6">
        <h1 className="font-normal uppercase">Credit Checks</h1>
        <span className="text-neutral-500">Credit #{tokenId}</span>
      </header>

      <div className="mx-auto flex w-full max-w-[820px] flex-col items-center px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <form
          className="flex w-full max-w-[380px] items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            selectToken();
          }}
        >
          <label htmlFor="credit-token-id" className="flex min-w-0 flex-1 flex-col gap-1.5 text-[10px] uppercase text-neutral-500">
            Credit number
            <input
              id="credit-token-id"
              type="number"
              min={MIN_TOKEN_ID}
              max={MAX_TOKEN_ID}
              step="1"
              inputMode="numeric"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="h-9 w-full border border-neutral-300 bg-white px-3 text-xs text-black outline-none focus:border-black"
              placeholder="1–122153"
            />
          </label>
          <button
            type="submit"
            className="h-9 w-16 flex-none whitespace-nowrap border border-black bg-black px-3 text-[10px] uppercase text-white transition-colors hover:bg-neutral-700"
          >
            Run
          </button>
        </form>

        <div className="relative mt-6 aspect-square w-full max-w-[380px] border border-neutral-300">
          <canvas
            ref={canvasRef}
            className={`block h-auto w-full ${background === "black" ? "bg-[#111111]" : "bg-white"}`}
            aria-label={`Credit Check for token ${tokenId}`}
          />
          {loading && (
            <div className={`absolute inset-0 flex items-center justify-center text-[10px] uppercase ${
              background === "black" ? "bg-[#111111] text-neutral-400" : "bg-white text-neutral-500"
            }`}>
              Running credit check
            </div>
          )}
        </div>

        <div className="mt-3 flex min-h-9 w-full max-w-[380px] items-center justify-between gap-2">
          <div className="flex border border-neutral-300" role="group" aria-label="Image background">
            {(["white", "black"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={background === option}
                onClick={() => selectBackground(option)}
                className={`h-7 min-w-14 px-3 text-[9px] uppercase transition-colors ${
                  background === option
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {error ? (
            <p role="alert" className="text-right text-[10px] uppercase text-red-700">{error}</p>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={download}
                disabled={loading}
                className="h-9 border border-neutral-300 bg-white px-4 text-[10px] uppercase text-black transition-colors hover:border-black hover:bg-neutral-100 disabled:opacity-40"
              >
                PNG ↓
              </button>
              <button
                type="button"
                onClick={shareOnX}
                disabled={loading}
                className="h-9 border border-neutral-300 bg-white px-4 text-[10px] uppercase text-black transition-colors hover:border-black hover:bg-neutral-100 disabled:opacity-40"
              >
                Share on X ↗
              </button>
            </div>
          )}
        </div>
      </div>
      <footer className="border-t border-neutral-300 px-4 py-4 text-center text-[9px] leading-relaxed text-neutral-500 sm:px-6">
        <span className="block">Credit Checks is unaffiliated with Credits, Checks, or Jack Butcher.</span>
        <span className="block">Made by @_JKNFT_ and hosted on Generational Merch for fun only; these images are not intended to be minted.</span>
      </footer>
    </section>
  );
}
