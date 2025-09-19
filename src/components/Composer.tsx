"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Layer = { id: string; label: string; src: string };
type Device = { id: string; w: number; h: number; name: string };

export type Config = {
    devices: Device[];
    backgrounds: Layer[];
    texts: Layer[];
    birds: Layer[];
    headwear: Layer[];
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

    // choose your default bird when reverting from token mode
    const DEFAULT_BIRD_ID =
        config.birds.find((b) => b.id === "red")?.id ?? config.birds[0].id;

    // convenience flag
    const isTokenActive = () =>
        Boolean(tokenId.trim() && moonbirdImgRef.current);

    // one reset that both the UI "Reset" button and headwear-change can use
    async function resetToken({ keepHat }: { keepHat: boolean }) {
        setTokenId("");
        moonbirdImgRef.current = null;
        setBird(DEFAULT_BIRD_ID);
        if (!keepHat) setHat("none"); // only clear hat when you explicitly want to
        setTokenVersion((v) => v + 1); // triggers your draw() effect
        // don't call draw() here
    }


    // build URL & load through proxy
    const buildTokenUrl = (id: string) =>
        `/api/proxy?url=${encodeURIComponent(
            `https://collection-assets.proof.xyz/moonbirds/images_no_bg/${id}.png`
        )}&v=${Date.now()}`; // <- bust any caches
    async function loadMoonbirdById(id: string) {
        // --- Easter egg for your friend ---
        // Compare numerically to avoid any string/whitespace issues.
        if (Number(id) === 6421) {
            const img = new Image();
            img.crossOrigin = "anonymous";

            // Make sure this path matches your real file location under /public
            // If the file is at: public/traits/birds/spida.png  -> use "/traits/birds/spida.png"
            // If it's at:        public/birds/spida.png        -> use "/birds/spida.png"
            img.src = "/birds/spida.png";

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
            });

            moonbirdImgRef.current = img;
            return; // IMPORTANT: stop here so we don't fetch the Proof URL
        }

        // --- normal token loading (unchanged) ---
        const n = Number(id);
        if (!Number.isInteger(n) || n < 1 || n > 10000) throw new Error("Invalid token ID");

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = buildTokenUrl(id); // hits your /api/proxy?... for other IDs

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
        });

        moonbirdImgRef.current = img;
    }
    //
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
            // Ensure target size for pixel-perfect exports
            c.width = device.w;
            c.height = device.h;

            const ctx = c.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, c.width, c.height);

            const useToken = Boolean(tokenId.trim() && moonbirdImgRef.current);

            // Load layers in parallel; skip bird when using token art
            const [bgImg, textImg, birdImgOrNull, hatImg] = await Promise.all([
                load(get(config.backgrounds, bg).src),
                load(get(config.texts, text).src),
                useToken ? Promise.resolve(null) : load(get(config.birds, bird).src),
                load(get(config.headwear, hat).src),
            ] as const);

            // Draw in order: background -> text -> bird -> headwear
            if (bgImg.width >= c.width && bgImg.height >= c.height) {
                // Crop the center area of the big background to match the canvas size
                const sx = Math.floor((bgImg.width - c.width) / 2);
                const sy = Math.floor((bgImg.height - c.height) / 2);
                const sw = c.width;
                const sh = c.height;

                // draw at 1:1 pixels (no scaling)
                ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, sw, sh);
            } else {
                // Failsafe: if somehow the bg is smaller than the canvas, scale to cover
                ctx.drawImage(bgImg, 0, 0, c.width, c.height);
            }

            drawCenteredNoScale(ctx, textImg, c);
            // AFTER:
            // draw token bird OR normal bird
            if (useToken && moonbirdImgRef.current) {
                if (parseInt(tokenId, 10) === 6421) {
                    // Easter egg: draw full-size, bottom-aligned (no scale)
                    drawBottomOffsetNoScale(ctx, moonbirdImgRef.current, c, 0);
                } else {
                    // All other tokens: scale to 0.4 and bottom-center
                    drawBottomScaled(ctx, moonbirdImgRef.current, c, 0.4, 0);
                }
            } else if (birdImgOrNull) {
                // Regular birds: no scaling, bottom-center
                drawBottomOffsetNoScale(ctx, birdImgOrNull, c, 0);
            }
            // (no else — if neither, we simply don't draw a bird layer)
            drawBottomOffsetNoScale(ctx, hatImg, c, 35);

            // Mirror to <img> for mobile long-press save
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
    }, [bg, text, bird, hat, deviceId, tokenVersion]);

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

    const openImage = () => {
        if (previewUrl) {
            // Data URL path (fastest)
            window.open(previewUrl, "_blank", "noopener,noreferrer");
            return;
        }
        // Fallback: create on-the-fly blob from canvas
        const c = canvasRef.current;
        if (!c) return;
        c.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }, "image/png");
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
        <div className="grid gap-6 md:grid-cols-[360px_minmax(0,1fr)]">
            {/* Controls */}
            <div className="space-y-4">
                <Field label="Device">
                    <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                        {config.devices.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Background">
                    <select value={bg} onChange={(e) => setBg(e.target.value)}>
                        {config.backgrounds.map((x) => (
                            <option key={x.id} value={x.id}>
                                {x.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Text">
                    <select value={text} onChange={(e) => setText(e.target.value)}>
                        {config.texts.map((x) => (
                            <option key={x.id} value={x.id}>
                                {x.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Birb">
                    <select
                        value={bird}
                        onChange={async (e) => {
                            const nextBird = e.target.value;

                            // If a token image is active, clear token first (but keep current headwear)
                            if (isTokenActive()) {
                                await resetToken({ keepHat: true });
                            }

                            // Now apply the user's selected bird
                            setBird(nextBird);
                        }}
                    >
                        {config.birds.map((x) => (
                            <option key={x.id} value={x.id}>
                                {x.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Moonbird Token">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Token ID (e.g. 8209)"
                            value={tokenId}
                            onChange={(e) => setTokenId(e.target.value)}
                            className="w-40"
                            min={1}
                            max={10000}
                        />
                        <button
                            onClick={async () => {
                                try {
                                    const id = tokenId.trim();
                                    if (!id) return;
                                    await loadMoonbirdById(id);   // sets moonbirdImgRef.current
                                    //setBird("none");
                                    setHat("none");
                                    setTokenVersion(v => v + 1);  // force effects to re-run
                                    await draw();                  // immediate redraw
                                } catch {
                                    alert("Could not load that token image. Double-check the ID.");
                                }
                            }}
                            disabled={!tokenId}
                        >
                            Load
                        </button>

                    </div>
                </Field>

                <Field label="Headwear">
                    <select
                        value={hat}
                        onChange={async (e) => {
                            const nextHat = e.target.value;

                            // Apply user's choice immediately
                            setHat(nextHat);

                            // If a token image is active and the user picked a real hat,
                            // clear the token but KEEP their newly chosen hat
                            if (isTokenActive() && nextHat !== "none") {
                                await resetToken({ keepHat: true });
                            }
                        }}
                    >
                        {config.headwear.map((x) => (
                            <option key={x.id} value={x.id}>
                                {x.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <button
                    onClick={async () => {
                        await resetToken({ keepHat: false }); // this version also sets hat to 'none'
                    }}
                    type="button"
                >
                    Reset
                </button>

                <div className="flex flex-col gap-2">
                    <button onClick={() => download("png")}>Download PNG</button>
                    <button onClick={() => download("jpeg")}>Download JPEG</button>
                    {/* <button onClick={openImage}>Open Image</button> */}
                    {canNativeShare && (
                        <button onClick={shareImage} title="Share to Photos/Files">
                            Share / Save
                        </button>
                    )}
                </div>

                {isDrawing && <small>Rendering…</small>}
            </div>

            {/* Preview */}
            <div className="rounded-lg border p-3 max-h-[80vh] overflow-auto">
                {/* Desktop / precise-pointer preview (canvas) */}
                <canvas
                    ref={canvasRef}
                    className="hidden md:block max-w-full h-auto"
                    style={{
                        height: previewHeight,
                        width: (device.w / device.h) * previewHeight, // keep aspect ratio
                    }}
                />

                {/* Mobile preview (image) — enables long-press “Save Image” */}
                <img
                    id="mobile-preview"
                    className="block md:hidden max-w-full h-auto"
                    alt="Wallpaper preview"
                />
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-2">
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

function drawBottomOffsetNoScale(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    offset: number // distance up from bottom in px
) {
    const dw = Math.min(img.width, c.width);
    const dh = Math.min(img.height, c.height);

    const sx = Math.max(0, Math.floor((img.width - dw) / 2));
    const sy = Math.max(0, Math.floor((img.height - dh) / 2));

    const dx = Math.floor((c.width - dw) / 2);   // horizontally centered
    const dy = c.height - dh - offset;           // bottom-align + offset

    ctx.drawImage(img, sx, sy, dw, dh, dx, dy, dw, dh);
}

/**
 * Draws an image scaled by `scale`, horizontally centered,
 * and bottom-aligned (offset is optional).
 */
function drawBottomScaled(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    scale: number,
    offset = 0
) {
    // figure out the scaled size
    const dw = img.width * scale;
    const dh = img.height * scale;

    // horizontally center, stick to bottom with optional offset
    const dx = (c.width - dw) / 2;
    const dy = c.height - dh - offset;

    ctx.drawImage(img, dx, dy, dw, dh);
}


