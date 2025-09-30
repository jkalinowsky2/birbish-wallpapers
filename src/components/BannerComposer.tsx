"use client";

import { useEffect, useRef, useState } from "react";
import { PIXEL_BASE, ODDITY_BASE, ILLU_PROXY } from "@/lib/assets";

type ArtStyle = "none" | "illustrated" | "pixel" | "oddity";

type Slot = {
    id: string;      // token id (string so inputs bind easily)
    style: ArtStyle; // which art set
    x: number;
    y: number;
    w: number;
    h: number;
    scale: number;   // per-slot scale multiplier
    mirror?: boolean;
};

const BANNER_W = 1500;
const BANNER_H = 500;


/** Initial 4 slots spaced across the banner. */
const initialSlots: Slot[] = [
    { id: "", style: "illustrated", x: 60, y: 100, w: 260, h: 300, scale: 1.75, mirror: false },
    { id: "", style: "pixel", x: 420, y: 100, w: 260, h: 300, scale: 1.75, mirror: false },
    { id: "", style: "oddity", x: 780, y: 100, w: 260, h: 300, scale: 1.75, mirror: false },
    { id: "", style: "illustrated", x: 1140, y: 100, w: 260, h: 300, scale: 1.75, mirror: false },
];

/** Background image choices (replace with your actual banner backgrounds). */
const BG_OPTIONS: { id: string; label: string; src: string }[] = [
    { id: "red", label: "Red", src: "/banner-bg/red.png" },
    { id: "black", label: "Black", src: "/banner-bg/black.png" },
    { id: "blue", label: "Blue", src: "/banner-bg/blue.png" },
    { id: "plum", label: "Plum", src: "/banner-bg/plum.png" },
    { id: "absract", label: "Abstract", src: "/banner-bg/abstract.png" },

    //{ id: "spencer", label: "Head Birb - Limited Time Only!", src: "/banner-bg/spencer.png" },
];

/** Center overlay (logo / phrase) choices. Always centered; no scale/pos controls. */
const CENTER_OPTIONS: { id: string; label: string; src: string }[] = [
    { id: "none", label: "None", src: "" },
    { id: "birbish", label: "birbish", src: "/bannertext/birbish.png" },
    { id: "control", label: "birbs in Control", src: "/bannertext/control.png" },
    { id: "gbirb", label: "gbirb.", src: "/bannertext/gbirb.png" },
    { id: "logo", label: "logo", src: "/bannertext/logo.png" },
    { id: "toobins", label: "Toobins", src: "/bannertext/toobins.png" },
];

export default function BannerComposer() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [bgColor, setBgColor] = useState("#0b0b0b");
    const [bgImageId, setBgImageId] = useState<string>("red");   // "none" or BG_OPTIONS[id]
    const [centerId, setCenterId] = useState<string>("birbish");   // "none" or CENTER_OPTIONS[id]
    const [slots, setSlots] = useState<Slot[]>(initialSlots);

    // --- image cache ---
    const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const imgCache = imgCacheRef.current;

    // --- helpers ---
    function urlForSlot(style: ArtStyle, id: string | undefined) {
        if (style === "none") return null;
        if (!id || id.trim() === "") return null;
        const n = Number(id);
        if (!Number.isFinite(n)) return null;

        if (style === "pixel") return `${PIXEL_BASE}/${n}.png`;
        if (style === "oddity") return `${ODDITY_BASE}/${n}.png`;

        // illustrated via proxy to Proof PNGs
        return `${ILLU_PROXY}?url=${encodeURIComponent(
            `https://collection-assets.proof.xyz/moonbirds/images_no_bg/${n}.png`
        )}`;
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
        // const dy = Math.round(y + (h - dh) / 2);
        const dy = Math.round(y + (h - dh));
        ctx.drawImage(img, dx, dy, dw, dh);
    }

    // --- draw ---
    const draw = async () => {
        const c = canvasRef.current;
        if (!c) return;
        c.width = BANNER_W;
        c.height = BANNER_H;

        const ctx = c.getContext("2d");
        if (!ctx) return;

        // 1) background color
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, BANNER_W, BANNER_H);

        // 2) background image (optional)
        if (bgImageId !== "none") {
            const bg = BG_OPTIONS.find(b => b.id === bgImageId);
            if (bg) {
                try {
                    const img = await loadImage(bg.src);
                    drawCover(ctx, img, 0, 0, BANNER_W, BANNER_H);
                } catch {
                    /* ignore */
                }
            }
        }
        // 4) centered overlay (logo / phrase) — draw on top of tokens
        if (centerId !== "none") {
            const opt = CENTER_OPTIONS.find(o => o.id === centerId);
            if (opt) {
                try {
                    const overlay = await loadImage(opt.src);
                    // fit within this max box, centered on banner
                    const MAX_W = 1500;
                    const MAX_H = 500;
                    const dw = Math.min(MAX_W, BANNER_W);
                    const dh = Math.min(MAX_H, BANNER_H);
                    const x = Math.round((BANNER_W - dw) / 2);
                    const y = Math.round((BANNER_H - dh) / 2);
                    drawContain(ctx, overlay, x, y, dw, dh);
                } catch {
                    /* ignore overlay load errors */
                }
            }
        }
        // 3) draw slots (only draw if there’s an id)
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const hasId = Boolean(slot.id && slot.id.trim());
            if (!hasId) continue;

            const src = urlForSlot(slot.style, slot.id);
            if (!src) continue;

            const img = imgCache.get(src) || (await loadImage(src).catch(() => null));
            if (!img) continue;

            // expand the slot’s box by scale, still center it within the original box
            const wBox = Math.round(slot.w * slot.scale);
            const hBox = Math.round(slot.h * slot.scale);
            const xBox = Math.round(slot.x + (slot.w - wBox) / 2);
            const yBox = Math.round(slot.y + (slot.h - hBox) / 2);

            // compute "contain" fit for the image inside (xBox,yBox,wBox,hBox)
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            if (!iw || !ih) continue;

            const s = Math.min(wBox / iw, hBox / ih);
            const dw = Math.round(iw * s);
            const dh = Math.round(ih * s);
            const dx = Math.round(xBox + (wBox - dw) / 2);
            // const dy = Math.round(yBox + (hBox - dh) / 2);
            const dy = Math.round(yBox + (hBox - dh)); // bottom-align inside the slot box

            // pixel art crispness
            const prev = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = slot.style !== "pixel";

            // optional horizontal mirror
            ctx.save();
            if (slot.mirror) {
                ctx.translate(dx + dw, 0); // move origin to the right edge of the draw rect
                ctx.scale(-1, 1);          // flip horizontally
                ctx.drawImage(img, 0, dy, dw, dh);
            } else {
                ctx.drawImage(img, dx, dy, dw, dh);
            }
            ctx.restore();

            ctx.imageSmoothingEnabled = prev;
        }

        // // 4) centered overlay (logo / phrase) — draw on top of tokens
        // if (centerId !== "none") {
        //     const opt = CENTER_OPTIONS.find(o => o.id === centerId);
        //     if (opt) {
        //         try {
        //             const overlay = await loadImage(opt.src);
        //             // fit within this max box, centered on banner
        //             const MAX_W = 1500;
        //             const MAX_H = 500;
        //             const dw = Math.min(MAX_W, BANNER_W);
        //             const dh = Math.min(MAX_H, BANNER_H);
        //             const x = Math.round((BANNER_W - dw) / 2);
        //             const y = Math.round((BANNER_H - dh) / 2);
        //             drawContain(ctx, overlay, x, y, dw, dh);
        //         } catch {
        //             /* ignore overlay load errors */
        //         }
        //     }
        // }
    };

    // Preload when inputs change, then draw
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
                const bg = BG_OPTIONS.find(b => b.id === bgImageId);
                if (bg) urls.push(bg.src);
            }
            // center overlay
            if (centerId !== "none") {
                const co = CENTER_OPTIONS.find(o => o.id === centerId);
                if (co) urls.push(co.src);
            }

            await Promise.allSettled(urls.map(u => loadImage(u)));
            await draw();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        bgColor,
        bgImageId,
        centerId,
        // track relevant slot props
        slots.map(s => `${s.style}:${s.id}:${s.x}:${s.y}:${s.w}:${s.h}:${s.scale}:${s.mirror ? 1 : 0}`).join("|"),
    ]);

    //NEW
    const slotsLeftToRight = slots
        .map((s, i) => ({ s, i }))
        .sort((a, b) => a.s.x - b.s.x);

    // --- UI helpers ---
    const updateSlot = (index: number, patch: Partial<Slot>) => {
        setSlots(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const download = () => {
        const c = canvasRef.current;
        if (!c) return;
        c.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "x-banner-1500x500.png";
            a.click();
            URL.revokeObjectURL(url);
        }, "image/png");
    };

    return (
        <div className="space-y-6">
            {/* Preview on top */}
            <section className="rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                <h2 className="text-sm font-semibold mb-3">Preview</h2>
                <div className="rounded-xl bg-white p-3 overflow-auto">
                    <canvas
                        ref={canvasRef}
                        className="block max-w-full h-auto mx-auto"
                        style={{
                            width: "100%",
                            maxWidth: 1000, // keep it manageable in the UI
                            aspectRatio: `${BANNER_W} / ${BANNER_H}`,
                        }}
                    />
                </div>
            </section>

            {/* Builder: Background/Overlay + Slots in one section */}
            <section className="rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                {/* Top row: compact controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {/* Background image */}
                    <label className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-600">Background Image</span>
                        <select
                            className="input"
                            value={bgImageId}
                            onChange={(e) => setBgImageId(e.target.value)}
                        >
                            <option value="none">None</option>
                            {BG_OPTIONS.map((bg) => (
                                <option key={bg.id} value={bg.id}>
                                    {bg.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* Center overlay */}
                    <label className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-600">Center Overlay</span>
                        <select
                            className="input"
                            value={centerId}
                            onChange={(e) => setCenterId(e.target.value)}
                        >
                            {CENTER_OPTIONS.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* (Optional) room for a future control; keep empty to preserve grid alignment */}
                    <div className="hidden lg:block" />
                </div>

                {/* Slots row(s) */}
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
                                        <option value="illustrated">Illustrated</option>
                                        <option value="pixel">Pixel</option>
                                        <option value="oddity">Oddity</option>
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
                                        step="0.05"
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

                                {/* Mirror checkbox */}
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

                {/* Actions under slots */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
                    <button className="btn" onClick={download}>
                        Download PNG
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => {
                            setSlots(initialSlots);
                            setBgColor("#0b0b0b"); // remove this line if you removed bgColor entirely
                            setBgImageId("none");
                            setCenterId("none");
                        }}
                    >
                        Reset
                    </button>
                </div>
            </section>
        </div>
    );

}
