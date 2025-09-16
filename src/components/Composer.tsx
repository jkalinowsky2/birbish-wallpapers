"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Layer = { id: string; label: string; src: string };
type Device = { id: string; w: number; h: number; name: string };
type Config = {
  devices: Device[];
  backgrounds: Layer[];
  birds: Layer[];
  headwear: Layer[];
};

export default function Composer({ config }: { config: Config }) {
  const [deviceId, setDeviceId] = useState(config.devices[0].id);
  const device = useMemo(
    () => config.devices.find((d) => d.id === deviceId)!,
    [deviceId, config.devices]
  );

  const [bg, setBg] = useState(config.backgrounds[0].id);
  const [bird, setBird] = useState(config.birds[0].id);
  const [hat, setHat] = useState(config.headwear[0].id);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const get = (arr: Layer[], id: string) => arr.find((x) => x.id === id)!;
  const load = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  useEffect(() => {
    let canceled = false;
    (async () => {
      const c = canvasRef.current!;
      c.width = device.w;
      c.height = device.h;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);

      const [bgImg, birdImg, hatImg] = await Promise.all([
        load(get(config.backgrounds, bg).src),
        load(get(config.birds, bird).src),
        load(get(config.headwear, hat).src),
      ]);
      if (canceled) return;

      // Draw in order: background -> bird -> headwear
      ctx.drawImage(bgImg, 0, 0, c.width, c.height);
      ctx.drawImage(birdImg, 0, 0, c.width, c.height);
      ctx.drawImage(hatImg, 0, 0, c.width, c.height);
    })();
    return () => {
      canceled = true;
    };
  }, [bg, bird, hat, device, config]);

  const download = (format: "png" | "jpeg" = "png") => {
    const c = canvasRef.current!;
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

  return (
    <div className="grid gap-6 md:grid-cols-[360px_minmax(0,1fr)]">
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

        <Field label="Bird color">
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

        <div className="flex gap-2">
          <button onClick={() => download("png")}>Download PNG</button>
          <button onClick={() => download("jpeg")}>Download JPEG</button>
        </div>

        <small>
          Tip: Export all layers at the same canvas size so alignment is pixel-perfect.
        </small>
      </div>

      <div className="rounded-lg border p-3">
        {/* Scaled preview so it fits on desktop */}
        <canvas
          ref={canvasRef}
          style={{ width: Math.round(device.w / 3), height: Math.round(device.h / 3) }}
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