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
  // ---------------- State ----------------
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [deviceId, setDeviceId] = useState(config.devices[0].id);

  const device = useMemo(
    () => config.devices.find((d) => d.id === deviceId)!,
    [deviceId, config.devices]
  );

  const [bg, setBg] = useState(config.backgrounds[0].id);
  const [text, setText] = useState(config.texts[0].id);
  const [bird, setBird] = useState(config.birds[0].id);
  const [hat, setHat] = useState(config.headwear[0].id);

  const [previewHeight, setPreviewHeight] = useState<number>(0);

  // ---------------- Refs ----------------
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ---------------- Helpers ----------------
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
      // keep full resolution for downloads
      c.width = device.w;
      c.height = device.h;

      const ctx = c.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, c.width, c.height);

      const [bgImg, textImg, birdImg, hatImg] = await Promise.all([
        load(get(config.backgrounds, bg).src),
        load(get(config.texts, text).src),
        load(get(config.birds, bird).src),
        load(get(config.headwear, hat).src),
      ]);

      ctx.drawImage(bgImg, 0, 0, c.width, c.height);
      ctx.drawImage(textImg, 0, 0, c.width, c.height);
      ctx.drawImage(birdImg, 0, 0, c.width, c.height);
      ctx.drawImage(hatImg, 0, 0, c.width, c.height);

      const dataUrl = c.toDataURL("image/png");
      setPreviewUrl(dataUrl);

      const imgEl = document.getElementById("mobile-preview") as HTMLImageElement | null;
      if (imgEl) imgEl.src = dataUrl;
    } finally {
      setIsDrawing(false);
    }
  };

  // redraw when selections or device change
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg, text, bird, hat, deviceId]);

  // keep preview scaled to viewport
  useEffect(() => {
    const updateScale = () => {
      const maxHeight = window.innerHeight * 0.8; // never exceed 80% viewport
      const scale = Math.min(maxHeight / device.h, 1);
      setPreviewHeight(device.h * scale);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [device]);

  // ---------------- Actions ----------------
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
      window.open(previewUrl, "_blank", "noopener,noreferrer");
      return;
    }
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
    typeof (navigator as any).canShare === "function";

  const shareImage = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `wallpaper-${device.id}.png`, { type: "image/png" });

      if (
        (navigator as any).canShare &&
        (navigator as any).canShare({ files: [file] })
      ) {
        try {
          await (navigator as any).share({
            files: [file],
            title: "Moonbirds Wallpaper",
            text: "Custom wallpaper",
          });
        } catch {
          /* user cancelled */
        }
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    }, "image/png");
  };

  // ---------------- UI ----------------
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
          <select value={bird} onChange={(e) => setBird(e.target.value)}>
            {config.birds.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Headwear">
          <select value={hat} onChange={(e) => setHat(e.target.value)}>
            {config.headwear.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </Field>

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
            width: (device.w / device.h) * previewHeight,
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

// Simple label wrapper
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

// "use client";
// import { useEffect, useMemo, useRef, useState } from "react";

// type Layer = { id: string; label: string; src: string };
// type Device = { id: string; w: number; h: number; name: string };

// export type Config = {
//   devices: Device[];
//   backgrounds: Layer[];
//   texts: Layer[];
//   birds: Layer[];
//   headwear: Layer[];
// };

// export default function Composer({ config }: { config: Config }) {
//   // --- State ---
//   const [previewUrl, setPreviewUrl] = useState<string>("");
//   const [isDrawing, setIsDrawing] = useState<boolean>(false);

//   const [deviceId, setDeviceId] = useState<string>(config.devices[0].id);
//   const device = useMemo(
//     () => config.devices.find((d) => d.id === deviceId)!,
//     [deviceId, config.devices]
//   );

//   const [bg, setBg] = useState<string>(config.backgrounds[0].id);
//   const [text, setText] = useState<string>(config.texts[0].id);
//   const [bird, setBird] = useState<string>(config.birds[0].id);
//   const [hat, setHat] = useState<string>(config.headwear[0].id);

//   // --- Refs ---
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   // --- Helpers ---
//   const get = (arr: Layer[], id: string) => arr.find((x) => x.id === id)!;

//   const load = (src: string) =>
//     new Promise<HTMLImageElement>((resolve, reject) => {
//       const img = new Image();
//       img.crossOrigin = "anonymous";
//       img.onload = () => resolve(img);
//       img.onerror = reject;
//       img.src = src;
//     });

//   const draw = async () => {
//     const c = canvasRef.current;
//     if (!c) return;

//     setIsDrawing(true);
//     try {
//       // Ensure target size for pixel-perfect exports
//       c.width = device.w;
//       c.height = device.h;

//       const ctx = c.getContext("2d");
//       if (!ctx) return;

//       ctx.clearRect(0, 0, c.width, c.height);

//       // Load all layers in parallel
//       const [bgImg, textImg, birdImg, hatImg] = await Promise.all([
//         load(get(config.backgrounds, bg).src),
//         load(get(config.texts, text).src),
//         load(get(config.birds, bird).src),
//         load(get(config.headwear, hat).src),
//       ]);

//       // Draw in order: background -> text -> bird -> headwear
//       ctx.drawImage(bgImg, 0, 0, c.width, c.height);
//       ctx.drawImage(textImg, 0, 0, c.width, c.height);
//       ctx.drawImage(birdImg, 0, 0, c.width, c.height);
//       ctx.drawImage(hatImg, 0, 0, c.width, c.height);

//       // Mirror to <img> for mobile long-press save
//       const dataUrl = c.toDataURL("image/png");
//       setPreviewUrl(dataUrl);
//       const imgEl = document.getElementById("mobile-preview") as HTMLImageElement | null;
//       if (imgEl) imgEl.src = dataUrl;
//     } finally {
//       setIsDrawing(false);
//     }
//   };

//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       if (cancelled) return;
//       await draw();
//     })();
//     return () => {
//       cancelled = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [bg, text, bird, hat, deviceId]); // redraw on any selection change

//   const download = (format: "png" | "jpeg" = "png") => {
//     const c = canvasRef.current;
//     if (!c) return;
//     const mime = format === "png" ? "image/png" : "image/jpeg";
//     c.toBlob(
//       (blob) => {
//         if (!blob) return;
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = `wallpaper-${device.id}.${format}`;
//         a.click();
//         URL.revokeObjectURL(url);
//       },
//       mime,
//       0.95
//     );
//   };

//   const openImage = () => {
//     if (previewUrl) {
//       // Data URL path (fastest)
//       window.open(previewUrl, "_blank", "noopener,noreferrer");
//       return;
//     }
//     // Fallback: create on-the-fly blob from canvas
//     const c = canvasRef.current;
//     if (!c) return;
//     c.toBlob((blob) => {
//       if (!blob) return;
//       const url = URL.createObjectURL(blob);
//       window.open(url, "_blank", "noopener,noreferrer");
//       setTimeout(() => URL.revokeObjectURL(url), 60_000);
//     }, "image/png");
//   };

//   const canNativeShare =
//   typeof navigator !== "undefined" &&
//   typeof navigator.canShare === "function";

//   const shareImage = () => {
//     const c = canvasRef.current;
//     if (!c) return;
//     c.toBlob(async (blob) => {
//       if (!blob) return;
//       const file = new File([blob], `wallpaper-${device.id}.png`, { type: "image/png" });


//       if (navigator.canShare && navigator.canShare({ files: [file] })) {
//         try {
//           await navigator.share({
//             files: [file],
//             title: "Moonbirds Wallpaper",
//             text: "Custom wallpaper",
//           });
//         } catch {
//           // user canceled or share failed; silently ignore
//         }
//       } else {
//         // Fallback: open in new tab for manual save
//         const url = URL.createObjectURL(blob);
//         window.open(url, "_blank", "noopener,noreferrer");
//         setTimeout(() => URL.revokeObjectURL(url), 60_000);
//       }
//     }, "image/png");
//   };

//   // --- UI ---
//   return (
//     <div className="grid gap-6 md:grid-cols-[360px_minmax(0,1fr)]">
//       {/* Controls */}
//       <div className="space-y-4">
//         <Field label="Device">
//           <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
//             {config.devices.map((d) => (
//               <option key={d.id} value={d.id}>
//                 {d.name}
//               </option>
//             ))}
//           </select>
//         </Field>

//         <Field label="Background">
//           <select value={bg} onChange={(e) => setBg(e.target.value)}>
//             {config.backgrounds.map((x) => (
//               <option key={x.id} value={x.id}>
//                 {x.label}
//               </option>
//             ))}
//           </select>
//         </Field>

//         <Field label="Text">
//           <select value={text} onChange={(e) => setText(e.target.value)}>
//             {config.texts.map((x) => (
//               <option key={x.id} value={x.id}>
//                 {x.label}
//               </option>
//             ))}
//           </select>
//         </Field>

//         <Field label="Birb">
//           <select value={bird} onChange={(e) => setBird(e.target.value)}>
//             {config.birds.map((x) => (
//               <option key={x.id} value={x.id}>
//                 {x.label}
//               </option>
//             ))}
//           </select>
//         </Field>

//         <Field label="Headwear">
//           <select value={hat} onChange={(e) => setHat(e.target.value)}>
//             {config.headwear.map((x) => (
//               <option key={x.id} value={x.id}>
//                 {x.label}
//               </option>
//             ))}
//           </select>
//         </Field>

//         <div className="flex flex-col gap-2">
//         <button onClick={() => download("png")}>Download PNG</button>
//         <button onClick={() => download("jpeg")}>Download JPEG</button>
//         {/* <button onClick={openImage}>Open Image</button> */}
//         {canNativeShare && (
//             <button onClick={shareImage} title="Share to Photos/Files">
//             Share / Save
//             </button>
//         )}
//         </div>

//         {isDrawing && <small>Rendering…</small>}
//       </div>

//       {/* Preview */}
//       <div className="rounded-lg border p-3">
//         {/* Desktop / precise-pointer preview (canvas) */}
//         <canvas
//           ref={canvasRef}
//           className="hidden md:block"
//           style={{ width: Math.round(device.w / 3), height: Math.round(device.h / 3) }}
//         />

//         {/* Mobile preview (image) — enables long-press “Save Image” */}
//         <img
//           id="mobile-preview"
//           className="block md:hidden"
//           alt="Wallpaper preview"
//           style={{ width: "100%", height: "auto" }}
//           // `src` is set by the effect; leave empty initially
//         />
//       </div>
//     </div>
//   );
// }

// function Field({ label, children }: { label: string; children: React.ReactNode }) {
//   return (
//     <label className="flex flex-col gap-2">
//       <span className="text-sm font-medium">{label}</span>
//       {children}
//     </label>
//   );
// }