"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Layer = { id: string; label: string; src: string };
type Device = { id: string; w: number; h: number; name: string };

export type Config = {
    devices: { id: string; w: number; h: number; name: string }[];
    backgrounds: { id: string; label: string; src: string }[];
    texts: { id: string; label: string; src: string }[];
    birds: { id: string; label: string; src: string }[];
    headwear: { id: string; label: string; src: string }[];
};

export default function Composer({ config }: { config: Config }) {
    // --- State ---
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    //
    const [tokenId, setTokenId] = useState<string>("");
    //  const [useTokenImg, setUseTokenImg] = useState<boolean>(false);
    const [tokenVersion, setTokenVersion] = useState(0);
    const moonbirdImgRef = useRef<HTMLImageElement | null>(null);
    const pixelBirdImgRef = useRef<HTMLImageElement | null>(null);    // pixel
    const [artStyle, setArtStyle] = useState<"illustrated" | "pixel">("illustrated");
    //const PIXEL_DEFAULT_SCALE = 1.0; // tweak to taste

    // .env (Vercel -> Project Settings -> Environment Variables)
    // near top of Composer.tsx
    // Read once at build-time. Must be NEXT_PUBLIC_* to be available client-side.
    const PIXEL_SHA = process.env.NEXT_PUBLIC_PIXEL_SHA || "main"; // fallback if not set
    const PIXEL_BASE = `https://cdn.jsdelivr.net/gh/jkalinowsky2/birb-assets@${PIXEL_SHA}/pixel_clean`;

    // choose your default bird when reverting from token mode
    const DEFAULT_BIRD_ID =
        config.birds.find((b) => b.id === "red")?.id ?? config.birds[0].id;

    // convenience flag
    const isTokenActive = () =>
        Boolean(tokenId.trim() && (moonbirdImgRef.current || pixelBirdImgRef.current));

    // one reset that both the UI "Reset" button and headwear-change can use
    async function resetToken({ keepHat }: { keepHat: boolean }) {
        setTokenId("");
        moonbirdImgRef.current = null;
        pixelBirdImgRef.current = null; // <-- add this
        setBird(DEFAULT_BIRD_ID);
        if (!keepHat) setHat("none");
        setTokenVersion((v) => v + 1);
    }

    // build URL & load through proxy
    const buildTokenUrl = (id: string) =>
        `/api/imgproxy?url=${encodeURIComponent(
            `https://collection-assets.proof.xyz/moonbirds/images_no_bg/${id}.png`
        )}&v=${Date.now()}`; // <- bust any caches

    async function loadMoonbirdById(id: string): Promise<HTMLImageElement> {
        const n = Number(id);
        if (!Number.isInteger(n) || n < 0 || n > 9999) throw new Error("Invalid token ID");
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = buildTokenUrl(id);
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
        });
        return img;
    }

    //NEW
    async function loadPixelBirdById(id: string): Promise<HTMLImageElement> {
        const n = Number(id);
        if (!Number.isInteger(n) || n < 0 || n > 9999) {
            throw new Error("Invalid token ID");
        }

        // If you ever want a “local dev” switch, you can set NEXT_PUBLIC_PIXEL_SHA=local
        // and use /public assets instead. For now, always use the pinned CDN SHA:
        const url = `${PIXEL_BASE}/${n}.png`;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => {
                console.error("[pixel] failed to load", url, e);
                reject(e);
            };
        });
        return img;
    }

    const [deviceId, setDeviceId] = useState<string>(config.devices[0].id);
    const device = useMemo(
        () => config.devices.find((d) => d.id === deviceId)!,
        [deviceId, config.devices]
    );
    const [previewHeight, setPreviewHeight] = useState<number>(0); //NEW
    const [bg, setBg] = useState<string>(config.backgrounds[0].id);
    const [text, setText] = useState<string>(config.texts[0].id);
    const [bird, setBird] = useState<string>(config.birds[0].id);
    const [hat, setHat] = useState<string>(config.headwear[0].id);

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Helpers ---
    const get = (arr: Layer[], id: string) => arr.find((x) => x.id === id)!;

    const load = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });

    const draw = async () => {
        const c = canvasRef.current;
        if (!c) return;

        setIsDrawing(true);
        try {
            // target canvas size for export
            c.width = device.w;
            c.height = device.h;

            const ctx = c.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, c.width, c.height);

            // token is "active" if we have an id and at least one cached token image
            const useToken = Boolean(
                tokenId.trim() && (moonbirdImgRef.current || pixelBirdImgRef.current)
            );

            // load static layers in parallel; skip built-in bird if token art is used
            const [bgImg, textImg, birdImgOrNull, hatImg] = await Promise.all([
                load(get(config.backgrounds, bg).src),
                load(get(config.texts, text).src),
                useToken ? Promise.resolve(null) : load(get(config.birds, bird).src),
                load(get(config.headwear, hat).src),
            ] as const);

            // --- background (center-crop if larger than canvas) ---
            if (bgImg.width >= c.width && bgImg.height >= c.height) {
                const sx = Math.floor((bgImg.width - c.width) / 2);
                const sy = Math.floor((bgImg.height - c.height) / 2);
                const sw = c.width;
                const sh = c.height;
                ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, sw, sh);
            } else {
                ctx.drawImage(bgImg, 0, 0, c.width, c.height);
            }

            // --- text ---
            drawCenteredNoScale(ctx, textImg, c);

            // --- bird / token art ---
            // --- bird / token art ---
            if (useToken) {
                // pick strictly by style (no fallback to the other style)
                const tokenImg =
                    artStyle === "pixel"
                        ? pixelBirdImgRef.current
                        : moonbirdImgRef.current;

                if (tokenImg) {
                    if (artStyle === "pixel") {
                        const s = getIntegerPixelScale(tokenImg, c, /*targetWidthRatio*/ 1);
                        drawBottomScaled(ctx, tokenImg, c, s, 0);
                    } else {
                        drawBottomScaled(ctx, tokenImg, c, 0.4, 0);
                    }
                } else {
                    // Optional: tiny hint while the correct asset is loading
                    // console.log("[token] waiting for", artStyle, "asset to load…");
                }
            } else if (birdImgOrNull) {
                // built-in bird (no scaling, bottom-center)
                drawBottomOffsetNoScale(ctx, birdImgOrNull, c, 0);
            }

            else if (birdImgOrNull) {
                // built-in bird (no scaling, bottom-center)
                drawBottomOffsetNoScale(ctx, birdImgOrNull, c, 0);
            }

            // --- headwear ---
            drawBottomOffsetNoScale(ctx, hatImg, c, 35);

            // mirror to <img> for mobile long-press save
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

    useEffect(() => {
        const updateScale = () => {
            const maxHeight = window.innerHeight * 0.8; // fit within 80% of viewport height
            const scale = Math.min(maxHeight / device.h, 1) * 0.9; // never upscale
            setPreviewHeight(device.h * scale);
        };
        updateScale();
        window.addEventListener("resize", updateScale);
        return () => window.removeEventListener("resize", updateScale);
    }, [device]);

    useEffect(() => {
        (async () => {
            if (artStyle === "pixel" && tokenId && !pixelBirdImgRef.current) {
                try {
                    pixelBirdImgRef.current = await loadPixelBirdById(tokenId);
                    setTokenVersion(v => v + 1); // trigger re-draw
                } catch {
                    // ignore; illustrated will continue to show
                }
            }
            if (artStyle === "illustrated" && tokenId && !moonbirdImgRef.current) {
                try {
                    moonbirdImgRef.current = await loadMoonbirdById(tokenId);
                    setTokenVersion(v => v + 1);
                } catch {/* ignore */ }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [artStyle]);

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

    const canNativeShare =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function";

    const shareImage = () => {
        const c = canvasRef.current;
        if (!c) return;
        c.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `wallpaper-${device.id}.png`, { type: "image/png" });


            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: "Moonbirds Wallpaper",
                        text: "Custom wallpaper",
                    });
                } catch {
                    // user canceled or share failed; silently ignore
                }
            } else {
                // Fallback: open in new tab for manual save
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank", "noopener,noreferrer");
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
            }
        }, "image/png");
    };

    // --- UI ---
    return (
        <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
            {/* Controls panel */}
            <aside className="h-full lg:sticky lg:top-6 h-fit rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                <h2 className="text-sm font-semibold mb-3">Settings</h2>
                <div className="space-y-4">
                    <Field label="Device">
                        <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                            {config.devices.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Background">
                        <select className="input" value={bg} onChange={(e) => setBg(e.target.value)}>
                            {config.backgrounds.map((x) => (
                                <option key={x.id} value={x.id}>{x.label}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Text">
                        <select className="input" value={text} onChange={(e) => setText(e.target.value)}>
                            {config.texts.map((x) => (
                                <option key={x.id} value={x.id}>{x.label}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Birb">
                        <select
                            className="input"
                            value={bird}
                            onChange={async (e) => {
                                const nextBird = e.target.value;
                                if (isTokenActive()) await resetToken({ keepHat: true });
                                setBird(nextBird);
                            }}
                        >
                            {config.birds.map((x) => (
                                <option key={x.id} value={x.id}>{x.label}</option>
                            ))}
                        </select>
                    </Field>


                    <Field label="Headwear" className="mb-4">
                        <select
                            className="input"
                            value={hat}
                            onChange={async (e) => {
                                const nextHat = e.target.value;
                                setHat(nextHat);
                                if (isTokenActive() && nextHat !== "none") {
                                    await resetToken({ keepHat: true });
                                }
                            }}
                        >
                            {config.headwear.map((x) => (
                                <option key={x.id} value={x.id}>{x.label}</option>
                            ))}
                        </select>
                    </Field>


                    <p className="text-xs text-neutral-500 mt-6">
                        Or select your Moonbird…
                    </p>

                    {/* <Field label="Moonbird Token" className="!mt-8"> */}
                    <Field label="Moonbird Token">
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="e.g. 8209"
                                value={tokenId}
                                onChange={(e) => setTokenId(e.target.value)}
                                className="input w-40"
                                min={1}
                                max={10000}
                            />
                            <button
                                onClick={async () => {
                                    try {
                                        const id = tokenId.trim();
                                        if (!id) return;

                                        // clear any previous
                                        moonbirdImgRef.current = null;
                                        pixelBirdImgRef.current = null;

                                        // kick off both in parallel
                                        const [illu, pix] = await Promise.allSettled([
                                            loadMoonbirdById(id),     // illustrated PNG via /api/imgproxy (your existing helper)
                                            loadPixelBirdById(id),    // pixel PNG from /public/pixel_clean
                                        ]);

                                        if (illu.status === "fulfilled") moonbirdImgRef.current = illu.value;
                                        if (pix.status === "fulfilled") pixelBirdImgRef.current = pix.value;

                                        setHat("none");
                                        setTokenVersion(v => v + 1);
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
                                        await resetToken({ keepHat: false });
                                    }}
                                    type="button"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </Field>


                    <Field label="Art Style">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                className={`btn ${artStyle === "illustrated" ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setArtStyle("illustrated")}
                            >
                                Illustrated
                            </button>
                            <button
                                type="button"
                                className={`btn ${artStyle === "pixel" ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setArtStyle("pixel")}
                            >
                                Pixel
                            </button>
                        </div>
                    </Field>

                    <div className="border-t border-neutral-200 my-8" />

                    <div className="grid grid-cols-2 gap-2 mt-8">
                        <button className="btn" onClick={() => download("png")}>Download PNG</button>
                        <button className="btn" onClick={() => download("jpeg")}>Download JPEG</button>
                        {canNativeShare && (
                            <button className="btn col-span-2" onClick={shareImage} title="Share to Photos/Files">
                                Share / Save
                            </button>
                        )}
                    </div>

                    {isDrawing && <p className="text-xs text-neutral-500">Rendering…</p>}
                </div>
            </aside >

            {/* Preview card */}
            < section className="h-full min-w-0 rounded-2xl border bg-white shadow-sm p-4 lg:p-5" >
                <h2 className="text-sm font-semibold mb-3">Preview</h2>

                <div className="rounded-xl bg-white p-3 max-h-[80vh] overflow-auto">
                    {/* Desktop canvas */}
                    <canvas
                        ref={canvasRef}
                        className="hidden md:block max-w-full h-auto mx-auto"
                        style={{
                            height: previewHeight,
                            width: (device.w / device.h) * previewHeight,
                        }}
                    />
                    {/* Mobile <img> for long-press save */}
                    <img
                        id="mobile-preview"
                        className="block md:hidden max-w-full h-auto mx-auto"
                        alt="Wallpaper preview"
                    />
                </div>

                {/* <p className="mt-3 text-xs text-neutral-500">
        Tip: Long-press the image on your phone to save to Photos.
      </p> */}
            </section >
        </div >
    );

}

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

function drawCenteredNoScale(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement
) {
    // draw size = the smaller of image/canvas in each dimension (no scaling)
    const dw = Math.min(img.width, c.width);
    const dh = Math.min(img.height, c.height);

    // crop source from the image center if image is bigger than canvas
    const sx = Math.max(0, Math.floor((img.width - dw) / 2));
    const sy = Math.max(0, Math.floor((img.height - dh) / 2));

    // center destination rect on the canvas
    const dx = Math.floor((c.width - dw) / 2);
    const dy = Math.floor((c.height - dh) / 2);

    // draw 1:1 pixels, centered; crops if needed, never scales
    ctx.drawImage(img, sx, sy, dw, dh, dx, dy, dw, dh);
}
function drawBottomOffsetNoScale(ctx: CanvasRenderingContext2D, img: HTMLImageElement, c: HTMLCanvasElement, offset: number) {
    const { w: iw, h: ih } = getImgSize(img);
    const dw = Math.min(iw, c.width);
    const dh = Math.min(ih, c.height);
    const sx = Math.max(0, Math.floor((iw - dw) / 2));
    const sy = Math.max(0, Math.floor((ih - dh) / 2));
    const dx = Math.floor((c.width - dw) / 2);
    const dy = c.height - dh - offset;
    ctx.drawImage(img, sx, sy, dw, dh, dx, dy, dw, dh);
}

/**
 * Draws an image scaled by `scale`, horizontally centered,
 * and bottom-aligned (offset is optional).
 */
function drawBottomScaled(ctx: CanvasRenderingContext2D, img: HTMLImageElement, c: HTMLCanvasElement, scale: number, offset = 0) {
    const { w: iw, h: ih } = getImgSize(img);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (c.width - dw) / 2;
    const dy = c.height - dh - offset;
    ctx.drawImage(img, dx, dy, dw, dh);
}

function getImgSize(img: HTMLImageElement, fallbackW = 1600, fallbackH = 1600) {
    const w = img.naturalWidth || img.width || fallbackW;
    const h = img.naturalHeight || img.height || fallbackH;
    return { w, h };
}

// Choose an INTEGER scale so the SVG "pixel grid" lands on device pixels.
// targetWidthRatio controls how wide the pixel bird should be relative to canvas width.
function getIntegerPixelScale(
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    targetWidthRatio = 0.6,
    maxScale = 1.1   // <-- new
) {
    const { w, h } = getImgSize(img);
    const maxByWidth = (c.width * targetWidthRatio) / w;
    const maxByHeight = (c.height * .9) / h; // keep it from getting too tall; tweak if you like
    const raw = Math.min(maxByWidth, maxByHeight);
    // force a minimum of 1, and make it an integer to avoid seams
    return Math.max(1, Math.min(maxScale, Math.floor(raw))); // <-- clamp
}

// // Draw with nearest-neighbor and integer positioning to avoid gaps.
// function drawBottomScaledCrisp(
//     ctx: CanvasRenderingContext2D,
//     img: HTMLImageElement,
//     c: HTMLCanvasElement,
//     scale: number,
//     offset = 0
// ) {
//     const { w: iw, h: ih } = getImgSize(img);
//     const dw = Math.round(iw * scale);
//     const dh = Math.round(ih * scale);

//     const dx = Math.round((c.width - dw) / 2);  // center on whole pixels
//     const dy = Math.round(c.height - dh - offset);

//     const prev = ctx.imageSmoothingEnabled;
//     ctx.imageSmoothingEnabled = false;          // nearest-neighbor
//     ctx.drawImage(img, dx, dy, dw, dh);
//     ctx.imageSmoothingEnabled = prev;
// }
