"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionMeta, CollectionConfig } from "@/types/collections";

// ---------- local layer types ----------
type Device = { id: string; w: number; h: number; name: string };
type BaseLayer = { id: string; label: string; src: string };

// Backgrounds can be tiled or a single image
type BackgroundLayer = BaseLayer & { mode?: "tile" | "image" };

// Text images can have optional scaling caps
type TextLayer = BaseLayer & {
    maxWidthRatio?: number;
    maxHeightRatio?: number;
    allowUpscale?: boolean;
};

// Exported so pages can import the prop type
export type ComposerConfig = Omit<CollectionConfig, "backgrounds" | "texts"> & {
    backgrounds: BackgroundLayer[];
    texts: TextLayer[];
};

type ArtStyle = "illustrated" | "pixel" | "oddity";

export default function Composer({
    meta,
    config,
}: {
    meta: CollectionMeta;
    config: ComposerConfig;
}) {
    // --- Asset bases from config ---
    // const { pixelBase, oddityBase, illustratedProxy } = config.assetBases ?? {};
    // Inside Composer component (you already extract this above)
    const { pixelBase, oddityBase, illustratedProxy, illustratedBase } = config.assetBases ?? {};
    // --- Meta-driven toggles & labels ---
    const features = new Set(meta?.features ?? []);
    const hasBirds = Boolean(config.birds && config.birds.length > 0);
    const hasHeadwear = features.has("headwear") && Boolean(config.headwear?.length);
    const hasTokens = features.has("tokens");

    // Which art styles are available?
    const enabledStyles = new Set((meta?.artStyles ?? []) as ArtStyle[]);
    const canIllustrated = enabledStyles.has("illustrated");
    const canPixel = enabledStyles.has("pixel") && !!pixelBase;
    const canOddity = enabledStyles.has("oddity") && !!oddityBase;

    // Default to first enabled style
    const [artStyle, setArtStyle] = useState<ArtStyle>(
        (canIllustrated && "illustrated") ||
        (canPixel && "pixel") ||
        (canOddity && "oddity") ||
        "illustrated"
    );

    const labels = {
        background: meta?.labels?.background ?? "Background",
        text: meta?.labels?.text ?? "Text",
        character: meta?.labels?.character ?? (hasBirds ? "Birb" : "Character"),
        headwear: meta?.labels?.headwear ?? "Headwear",
        tokenId: meta?.labels?.tokenId ?? "Token ID",
        tokenHint: meta?.labels?.tokenHint ?? "Or select your token…",
    };

    // --- State ---
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [tokenId, setTokenId] = useState<string>("");
    const [tokenVersion, setTokenVersion] = useState(0);

    const moonbirdImgRef = useRef<HTMLImageElement | null>(null);
    const pixelBirdImgRef = useRef<HTMLImageElement | null>(null);
    const oddityImgRef = useRef<HTMLImageElement | null>(null);

    // Config fallbacks per collection
    const firstDevice = config.devices[0];
    const [deviceId, setDeviceId] = useState<string>(firstDevice.id);
    const device = useMemo(
        () => config.devices.find((d) => d.id === deviceId)!,
        [deviceId, config.devices]
    );

    const [bg, setBg] = useState<string>(config.backgrounds[0].id);
    const [text, setText] = useState<string>(config.texts[0].id);

    const DEFAULT_CHAR_ID =
        hasBirds
            ? config.birds!.find((b) => b.id === "red")?.id ?? config.birds![0].id
            : "";

    const [bird, setBird] = useState<string>(DEFAULT_CHAR_ID);
    const [hat, setHat] = useState<string>(hasHeadwear ? config.headwear![0].id : "");

    // --- Convenience flags ---
    const isTokenActive = () =>
        Boolean(
            tokenId.trim() &&
            (moonbirdImgRef.current || pixelBirdImgRef.current || oddityImgRef.current)
        );

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Helpers ---
    type WithId = { id: string };

    // Overloads so TS knows which shape comes back
    function get(arr: BackgroundLayer[], id: string): BackgroundLayer;
    function get(arr: TextLayer[], id: string): TextLayer;
    function get<T extends WithId>(arr: T[], id: string): T;
    function get<T extends WithId>(arr: T[], id: string): T {
        const item = arr.find((x) => x.id === id);
        if (!item) throw new Error(`Item with id "${id}" not found`);
        return item;
    }

    const load = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });

    function buildIllustratedUrl(id: string) {
        // Prefer per-collection base first (for Glyders)
        const base = config.assetBases?.illustratedBase;
        if (base) {
            // normalize slashes
            const clean = base.replace(/\/+$/, "");
            return `${clean}/${Number(id)}.png`;
        }
        // Otherwise fall back to Moonbirds behavior (Proof raw + optional proxy)
        const raw = `https://collection-assets.proof.xyz/moonbirds/images_no_bg/${id}.png`;
        return illustratedProxy ? `${illustratedProxy}?url=${encodeURIComponent(raw)}` : raw;
    }
    // function buildIllustratedUrl(id: string) {
    //     const raw = `https://collection-assets.proof.xyz/moonbirds/images_no_bg/${id}.png`;
    //     return illustratedProxy ? `${illustratedProxy}?url=${encodeURIComponent(raw)}` : raw;
    // }

    async function loadMoonbirdById(id: string): Promise<HTMLImageElement> {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = buildIllustratedUrl(id);

        //troubleshooting
        useEffect(() => {
            // This shows what your page is *actually* using at runtime
            console.log("assetBases in Composer:", config.assetBases);
        }, [config.assetBases]);
////////

        await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
        });
        return img;


    }

    async function loadIllustratedById(id: string): Promise<HTMLImageElement> {
        const n = Number(id);
        if (!Number.isInteger(n) || n < 0) throw new Error("Invalid token ID");
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = buildIllustratedUrl(id);
        await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
        });
        return img;
    }

    async function loadPixelById(id: string): Promise<HTMLImageElement> {
        if (!pixelBase) throw new Error("pixelBase not configured for this collection");
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `${pixelBase}/${Number(id)}.png`;
        await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
        });
        return img;
    }

    async function loadOddityById(id: string): Promise<HTMLImageElement> {
        if (!oddityBase) throw new Error("oddityBase not configured for this collection");
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `${oddityBase}/${Number(id)}.png`;
        await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
        });
        return img;
    }

    async function resetToken({ keepHeadwear }: { keepHeadwear: boolean }) {
        setTokenId("");
        moonbirdImgRef.current = null;
        pixelBirdImgRef.current = null;
        oddityImgRef.current = null;
        if (hasBirds) setBird(DEFAULT_CHAR_ID);
        if (hasHeadwear && !keepHeadwear) setHat(config.headwear![0].id);
        setTokenVersion((v) => v + 1);
    }

    // --- Drawing ---
    const draw = async () => {
        const c = canvasRef.current;
        if (!c) return;

        setIsDrawing(true);
        try {
            c.width = device.w;
            c.height = device.h;

            const ctx = c.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, c.width, c.height);

            const usingToken = hasTokens && isTokenActive();

            // Load layers (skip character image if token is active)
            const [bgImg, textImg, charImgOrNull, headImg] = await Promise.all([
                load(get(config.backgrounds, bg).src),
                load(get(config.texts, text).src),
                usingToken || !hasBirds ? Promise.resolve(null) : load(get(config.birds!, bird).src),
                hasHeadwear ? load(get(config.headwear!, hat).src) : Promise.resolve(null),
            ] as const);

            // --- background ---
            const bgDef = get(config.backgrounds, bg);
            if (bgDef.mode === "image") {
                // fill canvas like CSS background-size: cover
                drawBackgroundCover(ctx, bgImg, c);
            } else {
                // default/fallback = tile pattern
                const pattern = ctx.createPattern(bgImg, "repeat");
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, c.width, c.height);
                }
            }

            // --- text ---
            const textLayer = get(config.texts, text);
            const hasCap = textLayer.maxWidthRatio || textLayer.maxHeightRatio;

            if (hasCap) {
                drawCenteredWithMaxWidth(
                    ctx,
                    textImg,
                    c,
                    textLayer.maxWidthRatio ?? 1,
                    textLayer.maxHeightRatio ?? 1,
                    textLayer.allowUpscale ?? false
                );
            } else {
                drawTextCenteredVertically(ctx, textImg, c);
            }

            // --- character / token ---
            if (usingToken) {
                const tokenImg =
                    artStyle === "pixel"
                        ? pixelBirdImgRef.current ?? moonbirdImgRef.current ?? oddityImgRef.current
                        : artStyle === "oddity"
                            ? oddityImgRef.current ?? moonbirdImgRef.current ?? pixelBirdImgRef.current
                            : moonbirdImgRef.current ?? pixelBirdImgRef.current ?? oddityImgRef.current;

                if (tokenImg) {
                    if (artStyle === "pixel") {
                        const base = getIntegerPixelScale(tokenImg, c, 1);
                        const mult = config.assetBases?.pixelTokenScale ?? 1;
                        const s = base * mult;
                        drawBottomScaled(ctx, tokenImg, c, s, 0);
                    }
                    else if (artStyle === "illustrated") {
                        const s = config.assetBases?.illustratedTokenScale ?? 0.4; // default used before
                        drawBottomScaled(ctx, tokenImg, c, s, 0);
                    }
                    else if (artStyle === "oddity") {
                        drawBottomScaled(ctx, tokenImg, c, 0.8, 0);
                    }
                    else {
                        drawBottomScaled(ctx, tokenImg, c, 0.4, 0);
                    }
                }
            } else if (charImgOrNull) {
                drawBottomOffsetNoScale(ctx, charImgOrNull, c, 0);
            }

            // headwear
            if (hasHeadwear && headImg) {
                drawBottomOffsetNoScale(ctx, headImg, c, 35);
            }

            // mirror to <img> for mobile save
            const dataUrl = c.toDataURL("image/png");
            setPreviewUrl(dataUrl);
            const imgEl = document.getElementById("mobile-preview") as HTMLImageElement | null;
            if (imgEl) imgEl.src = dataUrl;
        } finally {
            setIsDrawing(false);
        }
    };

    useEffect(() => {
        draw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bg, text, bird, hat, deviceId, tokenVersion, artStyle]);

    // Lazy-load token images only when needed
    useEffect(() => {
        if (!hasTokens) return;

        (async () => {
            if (artStyle === "pixel" && tokenId && !pixelBirdImgRef.current && enabledStyles.has("pixel")) {
                try {
                    pixelBirdImgRef.current = await loadPixelById(tokenId);
                    setTokenVersion((v) => v + 1);
                } catch { }
            }

            if (artStyle === "illustrated" && tokenId && !moonbirdImgRef.current && enabledStyles.has("illustrated")) {
                try {
                    moonbirdImgRef.current = await loadIllustratedById(tokenId);
                    setTokenVersion((v) => v + 1);
                } catch { }
            }

            if (artStyle === "oddity" && tokenId && !oddityImgRef.current && enabledStyles.has("oddity")) {
                try {
                    oddityImgRef.current = await loadOddityById(tokenId);
                    setTokenVersion((v) => v + 1);
                } catch { }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [artStyle, tokenId, hasTokens]);

    // --- Download / Share ---
    const download = (format: "png" | "jpeg" = "png") => {
        const c = canvasRef.current;
        if (!c) return;
        const mime = format === "png" ? "image/png" : "image/jpeg";
        c.toBlob(
            (blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `wallpaper-${device.id}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
            },
            mime,
            0.95
        );
    };

    // type-safe Web Share API usage (no `any`)
    const canNativeShare =
        typeof navigator !== "undefined" &&
        "canShare" in navigator &&
        typeof navigator.canShare === "function";

    const shareImage = () => {
        const c = canvasRef.current;
        if (!c) return;
        c.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `wallpaper-${device.id}.png`, { type: "image/png" });

            const nav = navigator as Navigator & {
                canShare?: (data?: ShareData) => boolean;
                share?: (data: ShareData) => Promise<void>;
            };

            if (nav.canShare && nav.canShare({ files: [file] })) {
                try {
                    await nav.share?.({
                        files: [file],
                        title: `${meta.name} Wallpaper`,
                        text: "Custom wallpaper",
                    });
                } catch {
                    // user canceled
                }
            } else {
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank", "noopener,noreferrer");
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
            }
        }, "image/png");
    };

    // --- Preview sizing (no stretching) ---
    const isPortrait = device.h > device.w;
    const previewCanvasStyle: React.CSSProperties = isPortrait
        ? { height: "min(80vh, 720px)", width: "auto", maxWidth: "100%" }
        : { width: "100%", height: "auto" };

    // --- UI ---
    return (
        <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
            {/* Controls panel */}
            <aside className="h-full lg:sticky lg:top-6 h-fit rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                <h2 className="text-sm font-semibold mb-3">Settings</h2>
                <div className="space-y-4">
                    {/* Device */}
                    <Field label="Device">
                        <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                            {config.devices.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {/* Background */}
                    <Field label={labels.background}>
                        <select className="input" value={bg} onChange={(e) => setBg(e.target.value)}>
                            {config.backgrounds.map((x) => (
                                <option key={x.id} value={x.id}>
                                    {x.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {/* Text */}
                    <Field label={labels.text}>
                        <select className="input" value={text} onChange={(e) => setText(e.target.value)}>
                            {config.texts.map((x) => (
                                <option key={x.id} value={x.id}>
                                    {x.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {/* Character selector */}
                    {hasBirds && (
                        <Field label={labels.character}>
                            <select
                                className="input"
                                value={bird}
                                onChange={async (e) => {
                                    const next = e.target.value;
                                    if (isTokenActive()) await resetToken({ keepHeadwear: true });
                                    setBird(next);
                                }}
                            >
                                {config.birds!.map((x) => (
                                    <option key={x.id} value={x.id}>
                                        {x.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {/* Headwear */}
                    {hasHeadwear && (
                        <Field label={labels.headwear} className="mb-4">
                            <select
                                className="input"
                                value={hat}
                                onChange={async (e) => {
                                    const nextHat = e.target.value;
                                    setHat(nextHat);
                                    if (isTokenActive() && nextHat !== "none") {
                                        await resetToken({ keepHeadwear: true });
                                    }
                                }}
                            >
                                {config.headwear!.map((x) => (
                                    <option key={x.id} value={x.id}>
                                        {x.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {/* Tokens */}
                    {hasTokens && (
                        <>
                            <p className="text-xs text-neutral-500 mt-6">{labels.tokenHint}</p>

                            <Field label={labels.tokenId}>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="e.g. 8209"
                                        value={tokenId}
                                        onChange={(e) => setTokenId(e.target.value)}
                                        className="input w-40"
                                        min={1}
                                    />
                                    <button
                                        onClick={async () => {
                                            try {
                                                const id = tokenId.trim();
                                                if (!id) return;

                                                // clear previous
                                                moonbirdImgRef.current = null;
                                                pixelBirdImgRef.current = null;
                                                oddityImgRef.current = null;

                                                const results = await Promise.allSettled([
                                                    canIllustrated ? loadIllustratedById(id) : Promise.reject("illustrated disabled"),
                                                    canPixel ? loadPixelById(id) : Promise.reject("pixel disabled"),
                                                    canOddity ? loadOddityById(id) : Promise.reject("oddity disabled"),
                                                ]);

                                                // const results = await Promise.allSettled([
                                                //     canIllustrated ? loadMoonbirdById(id) : Promise.reject("illustrated disabled"),
                                                //     canPixel ? loadPixelById(id) : Promise.reject("pixel disabled"),
                                                //     canOddity ? loadOddityById(id) : Promise.reject("oddity disabled"),
                                                // ]);

                                                if (results[0].status === "fulfilled") moonbirdImgRef.current = results[0].value;
                                                if (results[1].status === "fulfilled") pixelBirdImgRef.current = results[1].value;
                                                if (results[2].status === "fulfilled") oddityImgRef.current = results[2].value;

                                                if (hasHeadwear) setHat("none");
                                                setTokenVersion((v) => v + 1);
                                                await draw();
                                            } catch {
                                                alert("Could not load that token image. Double-check the ID.");
                                            }
                                        }}
                                        disabled={!tokenId}
                                    >
                                        Load
                                    </button>
                                    {tokenId && (
                                        <button
                                            className="btn btn-ghost"
                                            onClick={async () => {
                                                await resetToken({ keepHeadwear: false });
                                            }}
                                            type="button"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </Field>

                            {/* Art styles available for this collection */}
                            <Field label="Art Style">
                                <div className="grid grid-cols-3 gap-2">
                                    {canIllustrated && (
                                        <button
                                            type="button"
                                            className={`btn ${artStyle === "illustrated" ? "btn-primary" : "btn-ghost"}`}
                                            onClick={() => setArtStyle("illustrated")}
                                        >
                                            Illustrated
                                        </button>
                                    )}
                                    {canPixel && (
                                        <button
                                            type="button"
                                            className={`btn ${artStyle === "pixel" ? "btn-primary" : "btn-ghost"}`}
                                            onClick={() => setArtStyle("pixel")}
                                        >
                                            Pixel
                                        </button>
                                    )}
                                    {canOddity && (
                                        <button
                                            type="button"
                                            className={`btn ${artStyle === "oddity" ? "btn-primary" : "btn-ghost"}`}
                                            onClick={() => setArtStyle("oddity")}
                                        >
                                            Oddity
                                        </button>
                                    )}
                                </div>
                            </Field>
                        </>
                    )}

                    <div className="border-t border-neutral-200 my-8" />

                    <div className="grid grid-cols-2 gap-2 mt-8">
                        <button className="btn" onClick={() => download("png")}>
                            Download PNG
                        </button>
                        <button className="btn" onClick={() => download("jpeg")}>
                            Download JPEG
                        </button>
                        {canNativeShare && (
                            <button className="btn col-span-2" onClick={shareImage} title="Share to Photos/Files">
                                Share / Save
                            </button>
                        )}
                    </div>

                    {isDrawing && <p className="text-xs text-neutral-500">Rendering…</p>}
                </div>
            </aside>

            {/* Preview card */}
            <section className="h-full min-w-0 rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                <h2 className="text-sm font-semibold mb-3">Preview</h2>

                <div className="rounded-xl bg-white p-3 max-h-[80vh] overflow-auto">
                    {/* Desktop canvas */}
                    <canvas ref={canvasRef} className="hidden md:block mx-auto" style={previewCanvasStyle} />

                    {/* Mobile <img> for long-press save */}
                    <img id="mobile-preview" className="block md:hidden mx-auto" style={previewCanvasStyle} alt="Wallpaper preview" />
                </div>
            </section>
        </div>
    );
}

/* ---------------- helpers ---------------- */

function Field({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <label className={`flex flex-col gap-2 ${className ?? ""}`}>
            <span className="text-sm font-medium">{label}</span>
            {children}
        </label>
    );
}

function getImgSize(img: HTMLImageElement, fallbackW = 1600, fallbackH = 1600) {
    const w = img.naturalWidth || img.width || fallbackW;
    const h = img.naturalHeight || img.height || fallbackH;
    return { w, h };
}

function drawTextCenteredVertically(ctx: CanvasRenderingContext2D, img: HTMLImageElement, c: HTMLCanvasElement) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(1, c.width / iw, c.height / ih);
    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);
    const dx = Math.round((c.width - dw) / 2);
    const dy = Math.round((c.height - dh) / 2);
    ctx.drawImage(img, dx, dy, dw, dh);
}

function drawBottomOffsetNoScale(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    offset: number
) {
    const { w: iw, h: ih } = getImgSize(img);
    const dw = Math.min(iw, c.width);
    const dh = Math.min(ih, c.height);
    const sx = Math.max(0, Math.floor((iw - dw) / 2));
    const sy = ih > dh ? ih - dh : 0; // bottom-crop if needed
    const dx = Math.floor((c.width - dw) / 2);
    const dy = c.height - dh - offset;
    ctx.drawImage(img, sx, sy, dw, dh, dx, dy, dw, dh);
}

function drawBottomScaled(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    scale: number,
    offset = 0
) {
    const { w: iw, h: ih } = getImgSize(img);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (c.width - dw) / 2;
    const dy = c.height - dh - offset;
    ctx.drawImage(img, dx, dy, dw, dh);
}

// Integer scale for crisp pixel art
function getIntegerPixelScale(
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    targetWidthRatio = 0.6,
    maxScale = 1.1
) {
    const { w, h } = getImgSize(img);
    const maxByWidth = (c.width * targetWidthRatio) / w;
    const maxByHeight = (c.height * 0.9) / h;
    const raw = Math.min(maxByWidth, maxByHeight);
    return Math.max(1, Math.min(maxScale, Math.floor(raw)));
}

function drawCenteredWithMaxWidth(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    maxWidthRatio = 1,
    maxHeightRatio = 1,
    allowUpscale = false
) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    const scaleByW = (c.width * maxWidthRatio) / iw;
    const scaleByH = (c.height * maxHeightRatio) / ih;

    let scale = Math.min(scaleByW, scaleByH);
    if (!allowUpscale) scale = Math.min(1, scale);

    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);
    const dx = Math.round((c.width - dw) / 2);
    const dy = Math.round((c.height - dh) / 2);

    ctx.drawImage(img, dx, dy, dw, dh);
}

// Contain (fit)
function drawBackgroundScaled(ctx: CanvasRenderingContext2D, img: HTMLImageElement, c: HTMLCanvasElement) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(c.width / iw, c.height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (c.width - dw) / 2;
    const dy = (c.height - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
}

// Cover (fill, may crop)
function drawBackgroundCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, c: HTMLCanvasElement) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(c.width / iw, c.height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (c.width - dw) / 2;
    const dy = (c.height - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
}