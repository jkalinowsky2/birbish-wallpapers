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
    const pixelBirdImgRef = useRef<HTMLImageElement | null>(null);    // pixel
    const [artStyle, setArtStyle] = useState<"illustrated" | "pixel">("illustrated");
    const PIXEL_DEFAULT_SCALE = 3.0; // tweak to taste



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
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = buildTokenUrl(id);
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
        });
        return img;
    }
    // async function loadMoonbirdById(id: string) {
    //     // --- Easter egg for your friend ---
    //     // Compare numerically to avoid any string/whitespace issues.
    //     if (Number(id) === 6421) {
    //         const img = new Image();
    //         img.crossOrigin = "anonymous";

    //         // Make sure this path matches your real file location under /public
    //         // If the file is at: public/traits/birds/spida.png  -> use "/traits/birds/spida.png"
    //         // If it's at:        public/birds/spida.png        -> use "/birds/spida.png"
    //         img.src = "/birds/spida.png";

    //         await new Promise<void>((resolve, reject) => {
    //             img.onload = () => resolve();
    //             img.onerror = reject;
    //         });

    //         moonbirdImgRef.current = img;
    //         return; // IMPORTANT: stop here so we don't fetch the Proof URL
    //     }

    //     // --- normal token loading (unchanged) ---
    //     const n = Number(id);
    //     if (!Number.isInteger(n) || n < 1 || n > 10000) throw new Error("Invalid token ID");

    //     const img = new Image();
    //     img.crossOrigin = "anonymous";
    //     img.src = buildTokenUrl(id); // hits your /api/proxy?... for other IDs

    //     await new Promise<void>((resolve, reject) => {
    //         img.onload = () => resolve();
    //         img.onerror = reject;
    //     });

    //     moonbirdImgRef.current = img;
    // }

    //NEW
    async function loadPixelBirdById(id: string): Promise<HTMLImageElement> {
        const apiUrl = new URL("/api/pixelbird", window.location.origin);
        apiUrl.searchParams.set("id", id);
        apiUrl.searchParams.set("v", String(Date.now()));

        const res = await fetch(apiUrl.toString(), { cache: "no-store" });
        const svgText = await res.text();
        const blob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
        });
        return img;
    }
    // async function loadPixelBirdById(id: string) {
    //     const n = parseInt(id.trim(), 10);
    //     if (!Number.isFinite(n) || n < 1 || n > 10000) throw new Error("Invalid token ID");

    //     const apiUrl = new URL("/api/pixelbird", window.location.origin);
    //     apiUrl.searchParams.set("id", String(n));
    //     apiUrl.searchParams.set("v", String(Date.now()));

    //     console.log("[pixel] fetching:", apiUrl.toString());

    //     const res = await fetch(apiUrl.toString(), { cache: "no-store" });
    //     console.log("[pixel] fetch done:", res.ok, res.status, res.statusText);
    //     if (!res.ok) {
    //         const t = await res.text().catch(() => "");
    //         console.error("[pixel] route not ok:", res.status, t.slice(0, 200));
    //         throw new Error("Pixel route failed");
    //     }

    //     const svgText = await res.text();
    //     const blob = new Blob([svgText], { type: "image/svg+xml" });
    //     const objUrl = URL.createObjectURL(blob);

    //     const img = new Image();
    //     img.onload = () => {
    //         console.log("[pixel] img loaded:", img.naturalWidth, "x", img.naturalHeight);
    //         URL.revokeObjectURL(objUrl);
    //     };
    //     img.onerror = (e) => console.error("[pixel] img load error:", e);
    //     img.src = objUrl;

    //     await new Promise<void>((resolve, reject) => {
    //         img.onload = () => resolve();
    //         img.onerror = (e) => reject(e);
    //     });

    //     moonbirdImgRef.current = img;
    // }

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

            // Token is considered "active" if there’s a tokenId AND at least one cached image (illustrated or pixel)
            const useToken = Boolean(
                tokenId.trim() && (moonbirdImgRef.current || pixelBirdImgRef.current)
            );

            // Load static layers in parallel; skip bird layer when using token art
            const [bgImg, textImg, birdImgOrNull, hatImg] = await Promise.all([
                load(get(config.backgrounds, bg).src),
                load(get(config.texts, text).src),
                useToken ? Promise.resolve(null) : load(get(config.birds, bird).src),
                load(get(config.headwear, hat).src),
            ] as const);

            // --- Background (center-crop if larger than canvas) ---
            if (bgImg.width >= c.width && bgImg.height >= c.height) {
                const sx = Math.floor((bgImg.width - c.width) / 2);
                const sy = Math.floor((bgImg.height - c.height) / 2);
                const sw = c.width;
                const sh = c.height;
                ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, sw, sh);
            } else {
                // Fallback: scale to cover if smaller
                ctx.drawImage(bgImg, 0, 0, c.width, c.height);
            }

            // --- Text ---
            drawCenteredNoScale(ctx, textImg, c);

            // --- Bird / Token art ---
            if (useToken) {
                // Pick which cached token image to draw based on current artStyle (with fallback)
                const tokenImg =
                    artStyle === "pixel"
                        ? (pixelBirdImgRef.current ?? moonbirdImgRef.current)
                        : (moonbirdImgRef.current ?? pixelBirdImgRef.current);

                if (tokenImg) {
                    if (artStyle === "pixel") {
                        // Pixels: use your pixel scale
                        //drawBottomScaled(ctx, tokenImg, c, PIXEL_DEFAULT_SCALE, 0);
                        const s = getIntegerPixelScale(tokenImg, c, /*targetWidthRatio=*/1);
                        drawBottomScaledCrisp(ctx, tokenImg, c, s, 0);
                    } else {
                        // Illustrated: special-case Spida (no scale), otherwise scale to 0.4
                        const isSpida = parseInt(tokenId, 10) === 6421;
                        if (isSpida) {
                            drawBottomOffsetNoScale(ctx, tokenImg, c, 0);
                        } else {
                            drawBottomScaled(ctx, tokenImg, c, 0.4, 0);
                        }
                    }
                }
            } else if (birdImgOrNull) {
                // Regular built-in bird (no scaling, bottom-center)
                drawBottomOffsetNoScale(ctx, birdImgOrNull, c, 0);
            }

            // --- Headwear ---
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

    //OLD DRAW LOGIC
    // const draw = async () => {
    //     const c = canvasRef.current;
    //     if (!c) return;

    //     setIsDrawing(true);
    //     try {
    //         // Ensure target size for pixel-perfect exports
    //         c.width = device.w;
    //         c.height = device.h;

    //         const ctx = c.getContext("2d");
    //         if (!ctx) return;

    //         ctx.clearRect(0, 0, c.width, c.height);

    //         const useToken = Boolean(tokenId.trim() && moonbirdImgRef.current);

    //         // Load layers in parallel; skip bird when using token art
    //         const [bgImg, textImg, birdImgOrNull, hatImg] = await Promise.all([
    //             load(get(config.backgrounds, bg).src),
    //             load(get(config.texts, text).src),
    //             useToken ? Promise.resolve(null) : load(get(config.birds, bird).src),
    //             load(get(config.headwear, hat).src),
    //         ] as const);

    //         // Draw in order: background -> text -> bird -> headwear
    //         if (bgImg.width >= c.width && bgImg.height >= c.height) {
    //             // Crop the center area of the big background to match the canvas size
    //             const sx = Math.floor((bgImg.width - c.width) / 2);
    //             const sy = Math.floor((bgImg.height - c.height) / 2);
    //             const sw = c.width;
    //             const sh = c.height;

    //             // draw at 1:1 pixels (no scaling)
    //             ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, sw, sh);
    //         } else {
    //             // Failsafe: if somehow the bg is smaller than the canvas, scale to cover
    //             ctx.drawImage(bgImg, 0, 0, c.width, c.height);
    //         }

    //         drawCenteredNoScale(ctx, textImg, c);
    //         // AFTER:
    //         // draw token bird OR normal bird
    //         if (useToken && moonbirdImgRef.current) {
    //             const isSpida = parseInt(tokenId, 10) === 6421;

    //             if (artStyle === "pixel") {
    //                 // Pixel birds use their own scale
    //                 drawBottomScaled(ctx, moonbirdImgRef.current, c, PIXEL_DEFAULT_SCALE, 0);
    //             } else {
    //                 // Illustrated flow
    //                 if (isSpida) {
    //                     drawBottomOffsetNoScale(ctx, moonbirdImgRef.current, c, 0);
    //                 } else {
    //                     drawBottomScaled(ctx, moonbirdImgRef.current, c, 0.4, 0);
    //                 }
    //             }
    //         }

    //         else if (birdImgOrNull) {
    //             // Regular birds: no scaling, bottom-center
    //             drawBottomOffsetNoScale(ctx, birdImgOrNull, c, 0);
    //         }
    //         // (no else — if neither, we simply don't draw a bird layer)
    //         drawBottomOffsetNoScale(ctx, hatImg, c, 35);

    //         // Mirror to <img> for mobile long-press save
    //         const dataUrl = c.toDataURL("image/png");
    //         setPreviewUrl(dataUrl);
    //         const imgEl = document.getElementById("mobile-preview") as HTMLImageElement | null;
    //         if (imgEl) imgEl.src = dataUrl;
    //     } finally {
    //         setIsDrawing(false);
    //     }
    // };

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

                                        // always clear previous
                                        moonbirdImgRef.current = null;
                                        pixelBirdImgRef.current = null;

                                        // load illustrated
                                        const illu = await loadMoonbirdById(id);
                                        moonbirdImgRef.current = illu;

                                        // load pixel
                                        try {
                                            const pix = await loadPixelBirdById(id);
                                            pixelBirdImgRef.current = pix;
                                        } catch {
                                            console.warn("Pixel version not available for this token.");
                                        }

                                        setHat("none");
                                        setTokenVersion(v => v + 1);
                                        await draw();
                                    } catch {
                                        alert("Could not load that token image. Double-check the ID.");
                                    }
                                }}
                                // className="btn btn-primary"
                                // onClick={async () => {
                                //     try {
                                //         const id = tokenId.trim();
                                //         if (!id) return;
                                //         if (artStyle === "pixel") {
                                //             await loadPixelBirdById(id);
                                //         } else {
                                //             await loadMoonbirdById(id);
                                //         }
                                //         setHat("none");
                                //         setTokenVersion((v) => v + 1);
                                //         await draw();
                                //     } catch {
                                //         alert("Could not load that token image. Double-check the ID.");
                                //     }
                                // }}
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
    targetWidthRatio = 0.6
) {
    const { w, h } = getImgSize(img);
    const maxByWidth = (c.width * targetWidthRatio) / w;
    const maxByHeight = (c.height * .9) / h; // keep it from getting too tall; tweak if you like
    const raw = Math.min(maxByWidth, maxByHeight);
    // force a minimum of 1, and make it an integer to avoid seams
    return Math.max(1, Math.floor(raw));
}

// Draw with nearest-neighbor and integer positioning to avoid gaps.
function drawBottomScaledCrisp(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    scale: number,
    offset = 0
) {
    const { w: iw, h: ih } = getImgSize(img);
    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);

    const dx = Math.round((c.width - dw) / 2);  // center on whole pixels
    const dy = Math.round(c.height - dh - offset);

    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;          // nearest-neighbor
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = prev;
}
