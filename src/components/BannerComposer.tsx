"use client";

import { useEffect, useRef, useState } from "react";
import type { CollectionMeta, CollectionConfig } from "@/types/collections";
import type { BannerConfig, BannerBackground, BannerCenterOverlay } from "@/types/banner";

type ArtStyle = "none" | "illustrated" | "pixel" | "oddity";

type Slot = {
  id: string;
  style: ArtStyle;
  x: number; y: number; w: number; h: number;
  scale: number;
  mirror?: boolean;
};

const BANNER_W = 1500;
const BANNER_H = 500;



export default function BannerComposer({
  meta,
  config,
  banner
}: {
  meta: CollectionMeta;
  config: CollectionConfig;
  banner: BannerConfig;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // defaults if you eventually add them to banner.defaults, we’ll read them
  const [centerScale, setCenterScale] = useState<number>(banner.defaults?.centerScale ?? 1);
  const [centerYOffset, setCenterYOffset] = useState<number>(banner.defaults?.centerYOffset ?? 0);
  const [tileScale, setTileScale] = useState<number>(banner.defaults?.tileScale ?? 1);


  // ---- defaults from banner config ----
  const defaultBgId = banner.defaults?.bgId ?? "none";
  const defaultCenter = banner.defaults?.centerId ?? "none";
  const defaultSlots: Slot[] =
    (banner.defaults?.slots as Slot[] | undefined) ?? [
      { id: "", style: "illustrated", x: 60, y: 100, w: 260, h: 300, scale: 1.75 },
      { id: "", style: "pixel", x: 420, y: 100, w: 260, h: 300, scale: 1.75 },
      { id: "", style: "oddity", x: 780, y: 100, w: 260, h: 300, scale: 1.75 },
      { id: "", style: "illustrated", x: 1140, y: 100, w: 260, h: 300, scale: 1.75 }
    ];

  // ---- state ----
  const [bgColor] = useState("#0b0b0b");
  const [bgImageId, setBgImageId] = useState<string>(defaultBgId);
  const [centerId, setCenterId] = useState<string>(defaultCenter);
  const [slots, setSlots] = useState<Slot[]>(defaultSlots);

  // ---- bases & per-style banner multipliers from collection config ----
  const {
    pixelBase,
    illustratedBase,
    oddityBase,
    pixelBannerScale = 1.75,
    illustratedBannerScale = 1.75,
    oddityBannerScale = 1.75,
  } = config.assetBases ?? {};

  // ---- image cache ----
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const imgCache = imgCacheRef.current;

  function findById<T extends { id: string }>(arr: T[], id: string) {
    return arr.find(x => x.id === id) || null;
  }

  function urlForSlot(style: ArtStyle, id?: string) {
    if (style === "none") return null;
    if (!id || id.trim() === "") return null;
    const n = Number(id);
    if (!Number.isFinite(n)) return null;

    if (style === "pixel" && pixelBase) return `${pixelBase}/${n}.png`;
    if (style === "oddity" && oddityBase) return `${oddityBase}/${n}.png`;
    if (style === "illustrated" && illustratedBase) return `${illustratedBase}/${n}.png`;
    return null;
  }

  async function loadImage(src: string): Promise<HTMLImageElement> {
    const cached = imgCache.get(src);
    if (cached) return cached;
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = src;
    });
    imgCache.set(src, img);
    return img;
  }

  function drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number, y: number, w: number, h: number
  ) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(w / iw, h / ih);
    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);
    const dx = Math.round(x + (w - dw) / 2);
    const dy = Math.round(y + (h - dh) / 2);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawContain(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number, y: number, w: number, h: number
  ) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const s = Math.min(w / iw, h / ih);
    const dw = Math.round(iw * s);
    const dh = Math.round(ih * s);
    const dx = Math.round(x + (w - dw) / 2);
    const dy = Math.round(y + (h - dh)); // bottom-align
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // ---- draw ----
  const draw = async () => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = BANNER_W;
    c.height = BANNER_H;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    // 1) solid bg
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, BANNER_W, BANNER_H);

    // 2) background image (optional)
    if (bgImageId !== "none") {
      const bgDef = banner.backgrounds.find(b => b.id === bgImageId);
      if (bgDef) {
        const bgImg = await loadImage(bgDef.src);
        if (bgDef.mode === "image") {
          drawCover(ctx, bgImg, 0, 0, BANNER_W, BANNER_H);
        } else {
          fillTiledCenteredScaled(ctx, bgImg, c, tileScale);
        }
      }
    }


    // ---- Optional vignette effect ----
    // ---- Optional vignette effect (elliptical) ----
    ctx.save();

    // Move origin to center
    ctx.translate(BANNER_W / 2, BANNER_H / 2);

    // Scale vertically — smaller value squashes it into an ellipse
    ctx.scale(1, 0.7);  // ← adjust 0.7 for more or less vertical flattening

    // Create the gradient as if centered at (0,0)
    const vignette = ctx.createRadialGradient(
      0, 0, 0,             // inner circle
      0, 0, BANNER_W / 1.2 // outer circle radius
    );

    // Define fade from clear center to dark edges
    vignette.addColorStop(0.1, "rgba(0,0,0,0)");
    vignette.addColorStop(1.0, "rgba(0,0,0,.35)");

    // Apply gradient fill
    ctx.fillStyle = vignette;

    // Because we scaled the context, draw a full rect around origin
    ctx.fillRect(-BANNER_W / 2, -BANNER_H / 2 / 0.7, BANNER_W, BANNER_H / 0.7);

    ctx.restore();




    // 4) centered overlay (draw after tokens so it sits on top)
    if (centerId !== "none") {
      const opt = banner.centerOverlays.find(o => o.id === centerId);
      if (opt?.src) {
        try {
          const overlay = await loadImage(opt.src);

          // Base “contain” size
          const iw = overlay.naturalWidth || overlay.width;
          const ih = overlay.naturalHeight || overlay.height;
          if (iw && ih) {
            const MAX_W = BANNER_W;
            const MAX_H = BANNER_H;
            const sContain = Math.min(MAX_W / iw, MAX_H / ih);

            // Apply user scale
            const s = sContain * centerScale;

            const dw = Math.round(iw * s);
            const dh = Math.round(ih * s);
            const dx = Math.round((BANNER_W - dw) / 2);
            const dy = Math.round((BANNER_H - dh) / 2) + centerYOffset;

            // draw
            ctx.drawImage(overlay, dx, dy, dw, dh);
          }
        } catch {
          /* ignore overlay load errors */
        }
      }
    }
    // 3) tokens (slots)
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const hasId = Boolean(slot.id && slot.id.trim());
      if (!hasId) continue;

      const src = urlForSlot(slot.style, slot.id);
      if (!src) continue;

      const img = imgCache.get(src) || (await loadImage(src).catch(() => null));
      if (!img) continue;

      const styleMul =
        slot.style === "pixel" ? pixelBannerScale :
          slot.style === "oddity" ? oddityBannerScale :
            slot.style === "illustrated" ? illustratedBannerScale : 1;

      const effScale = slot.scale * styleMul;

      // expanded box
      const wBox = Math.round(slot.w * effScale);
      const hBox = Math.round(slot.h * effScale);
      const xBox = Math.round(slot.x + (slot.w - wBox) / 2);
      const yBox = Math.round(slot.y + (slot.h - hBox) / 2);

      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) continue;

      const s = Math.min(wBox / iw, hBox / ih);
      const dw = Math.round(iw * s);
      const dh = Math.round(ih * s);
      const dx = Math.round(xBox + (wBox - dw) / 2);
      const dy = Math.round(yBox + (hBox - dh)); // bottom-align

      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = slot.style !== "pixel";

      ctx.save();
      if (slot.mirror) {
        ctx.translate(dx + dw, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, dy, dw, dh);
      } else {
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      ctx.restore();

      ctx.imageSmoothingEnabled = prev;
    }


  };

  // ---- preload + draw on changes ----
  useEffect(() => {
    (async () => {
      const urls: string[] = [];

      // slot images
      for (const s of slots) {
        const u = urlForSlot(s.style, s.id || "");
        if (u) urls.push(u);
      }
      // bg image
      if (bgImageId !== "none") {
        const bg = findById<BannerBackground>(banner.backgrounds, bgImageId);
        if (bg?.src) urls.push(bg.src);
      }
      // center overlay
      if (centerId !== "none") {
        const co = findById<BannerCenterOverlay>(banner.centerOverlays, centerId);
        if (co?.src) urls.push(co.src);
      }

      await Promise.allSettled(urls.map(u => loadImage(u)));
      await draw();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bgColor,
    bgImageId,
    centerId,
    centerScale,        // ← add
    centerYOffset,      // ← add
    tileScale,
    slots.map(s => `${s.style}:${s.id}:${s.x}:${s.y}:${s.w}:${s.h}:${s.scale}:${s.mirror ? 1 : 0}`).join("|"),
  ]);

  // sorted view (left -> right) for UI cards
  const slotsLeftToRight = slots
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.x - b.s.x);

  // const download = () => {
  //   const c = canvasRef.current;
  //   if (!c) return;
  //   c.toBlob((blob) => {
  //     if (!blob) return;
  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = "x-banner-1500x500.png";
  //     a.click();
  //     URL.revokeObjectURL(url);
  //   }, "image/png");
  // };
  // --- Save / share helpers ---
  const canNativeShare =
    typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare;

  const download = (type: "png" | "jpeg") => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `banner-${BANNER_W}x${BANNER_H}.${type}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      `image/${type}`,
      type === "jpeg" ? 0.92 : undefined
    );
  };

  const shareImage = async () => {
    const c = canvasRef.current;
    if (!c || typeof navigator === "undefined") return;
    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "banner.png", { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "My Banner" });
        } catch (err) {
          console.error("Share cancelled or failed", err);
        }
      } else {
        // fallback download
        download("png");
      }
    }, "image/png");
  };


  return (
    <div className="space-y-6">
      {/* Preview */}
      <section className="rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
        <h2 className="text-sm font-semibold mb-3">Preview</h2>
        <div className="rounded-xl bg-white p-3 overflow-auto">
          <canvas
            ref={canvasRef}
            className="block max-w-full h-auto mx-auto"
            style={{ width: "100%", maxWidth: 1000, aspectRatio: `${BANNER_W} / ${BANNER_H}` }}
          />
        </div>
      </section>

      {/* Controls */}
      <section className="rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {/* Background image */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">Background Image</span>
            <div className="flex items-center gap-2">
              <select
                className="input"
                value={bgImageId}
                onChange={(e) => setBgImageId(e.target.value)}
              >
                <option value="none">None</option>
                {banner.backgrounds.map((bg) => (
                  <option key={bg.id} value={bg.id}>{bg.label}</option>
                ))}
              </select>

              {/* Tile scale (only for tile mode) */}
              {banner.backgrounds.find(b => b.id === bgImageId)?.mode === "tile" && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-neutral-600">Scale</span>
                  {/* <button
                    type="button"
                    className="btn btn-ghost px-2"
                    onClick={() => setTileScale(s => Math.max(0.25, +(s - 0.1).toFixed(2)))}
                    title="Decrease tile scale"
                  >–</button> */}
                  <input
                    type="number"
                    step={0.1}
                    min={0.25}
                    max={5}
                    value={tileScale}
                    onChange={(e) => setTileScale(Math.max(0.25, Math.min(5, Number(e.target.value) || 1)))}
                    className="input w-20"
                    aria-label="Tile scale"
                  />
                  {/* <button
                    type="button"
                    className="btn btn-ghost px-2"
                    onClick={() => setTileScale(s => Math.min(5, +(s + 0.1).toFixed(2)))}
                    title="Increase tile scale"
                  >+</button> */}
                </div>
              )}
            </div>
          </label>
          {/* Center overlay + controls */}
          {/* Center overlay + controls */}
          <div className="flex flex-col gap-1 pl-6">
            <span className="text-xs text-neutral-600">Glyph</span>

            <div className="flex items-center gap-2">
              {/* Dropdown */}
              <select
                className="input w-auto"
                value={centerId}
                onChange={(e) => setCenterId(e.target.value)}
              >
                {banner.centerOverlays.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Scale */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-600">Scale</span>
                <input
                  className="input w-20"
                  type="number"
                  step={0.05}
                  min={0.1}
                  max={5}
                  value={centerScale}
                  onChange={(e) => setCenterScale(Number(e.target.value))}
                  title="Overlay scale"
                />
              </div>

              {/* Nudge (↑/↓) */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-600">Nudge</span>
                <button
                  type="button"
                  className="btn btn-ghost p-1 h-6 min-h-6 relative z-10 pointer-events-auto"
                  onClick={() => setCenterYOffset((y) => y - 10)}
                  title="Nudge up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-ghost p-1 h-6 min-h-6 relative z-10 pointer-events-auto"
                  onClick={() => setCenterYOffset((y) => y + 10)}
                  title="Nudge down"
                >
                  ↓
                </button>
              </div>
            </div>
          </div>

          <div className="hidden lg:block" />
        </div>

        {/* Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {slotsLeftToRight.map(({ s: slot, i }) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="text-sm font-semibold mb-2">Slot {i + 1}</div>

              <div className="grid grid-cols-2 gap-2">
                {/* Style */}
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-600">Style</span>
                  <select
                    className="input"
                    value={slot.style}
                    onChange={(e) =>
                      setSlots((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], style: e.target.value as ArtStyle };
                        return next;
                      })
                    }
                  >
                    <option value="none">None</option>
                    {(banner.allowedStyles ?? ["illustrated", "pixel", "oddity"]).map((styleOpt) => (
                      <option key={styleOpt} value={styleOpt}>
                        {styleOpt.charAt(0).toUpperCase() + styleOpt.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Token ID */}
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-600">Token ID</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={99999}
                    placeholder="e.g. 8209"
                    value={slot.id}
                    disabled={slot.style === "none"}
                    onChange={(e) =>
                      setSlots((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], id: e.target.value };
                        return next;
                      })
                    }
                  />
                </label>

                {/* Scale */}
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-600">Scale</span>
                  <input
                    className="input"
                    type="number"
                    step={0.05}
                    min={0.2}
                    max={3}
                    value={slot.scale}
                    disabled={slot.style === "none"}
                    onChange={(e) =>
                      setSlots((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], scale: Number(e.target.value) };
                        return next;
                      })
                    }
                  />
                </label>

                {/* Nudges */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      setSlots((p) => {
                        const n = [...p];
                        n[i] = { ...n[i], y: n[i].y - 10 };
                        return n;
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      setSlots((p) => {
                        const n = [...p];
                        n[i] = { ...n[i], y: n[i].y + 10 };
                        return n;
                      })
                    }
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      setSlots((p) => {
                        const n = [...p];
                        n[i] = { ...n[i], x: n[i].x - 10 };
                        return n;
                      })
                    }
                  >
                    ←
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      setSlots((p) => {
                        const n = [...p];
                        n[i] = { ...n[i], x: n[i].x + 10 };
                        return n;
                      })
                    }
                  >
                    →
                  </button>
                  <div className="col-span-4 text-[11px] text-neutral-500 text-center">
                    Nudge position
                  </div>
                </div>

                {/* Mirror */}
                <label className="flex items-center gap-2 col-span-2">
                  <input
                    type="checkbox"
                    checked={slot.mirror || false}
                    disabled={slot.style === "none"}
                    onChange={(e) =>
                      setSlots((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], mirror: e.target.checked };
                        return next;
                      })
                    }
                  />
                  <span className="text-xs text-neutral-600">Mirror</span>
                </label>
              </div>
            </div>
          ))}
        </div>

    
        {/* Actions */}
        <div className="w-full flex justify-left mt-8">
          <div className="grid grid-cols-2 gap-2 w-full sm:w-3/4 lg:w-1/2">
            <button className="btn" onClick={() => download("png")}>
              Download PNG
            </button>
            <button className="btn" onClick={() => download("jpeg")}>
              Download JPEG
            </button>
            {canNativeShare && (
              <button
                className="btn col-span-2"
                onClick={shareImage}
                title="Share to Photos/Files"
              >
                Share / Save
              </button>
            )}
            <button
              className="btn btn-ghost col-span-2"
              onClick={() => {
                setSlots(defaultSlots);
                setBgImageId(defaultBgId);
                setCenterId(defaultCenter);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function fillTiledCentered(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  c: HTMLCanvasElement
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const pattern = ctx.createPattern(img, "repeat");
  if (!pattern || iw === 0 || ih === 0) return;

  // center a tile on canvas center
  const txRaw = c.width / 2 - iw / 2;
  const tyRaw = c.height / 2 - ih / 2;
  const mod = (v: number, m: number) => ((v % m) + m) % m;
  const tx = mod(txRaw, iw);
  const ty = mod(tyRaw, ih);

  const p = pattern as CanvasPattern & { setTransform?: (m: DOMMatrix) => void };
  if (typeof p.setTransform === "function") {
    p.setTransform(new DOMMatrix().translate(tx, ty));
  }

  ctx.save();
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.restore();
}

function fillTiledCenteredScaled(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  c: HTMLCanvasElement,
  scale: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const pattern = ctx.createPattern(img, "repeat");
  if (!pattern) return;

  // Compute the visual offset so a tile center lands on canvas center.
  const iwScaled = iw * scale;
  const ihScaled = ih * scale;

  const mod = (v: number, m: number) => ((v % m) + m) % m;
  const tx = mod(c.width / 2 - iwScaled / 2, iwScaled);
  const ty = mod(c.height / 2 - ihScaled / 2, ihScaled);

  // Apply scale first, then translate in *pattern space* (divide by scale)
  const p = pattern as CanvasPattern & { setTransform?: (m: DOMMatrix) => void };
  if (typeof p.setTransform === "function") {
    p.setTransform(new DOMMatrix().scale(scale, scale).translate(tx / scale, ty / scale));
  }

  ctx.save();
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.restore();
}