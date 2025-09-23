// src/app/api/pixelproxy/route.ts
export const runtime = "nodejs";         // avoid Edge quirks while debugging
export const dynamic = "force-dynamic";  // never cache during dev

export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  const n = Number(id);

  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    return new Response("Invalid id", { status: 400 });
  }

  // CDN source
  const src = `https://cdn.jsdelivr.net/gh/jkalinowsky2/birb-assets@main/pixel_clean/${n}.png`;

  try {
    // no-store to be sure we see problems live
    const upstream = await fetch(src, { cache: "no-store" });

    if (!upstream.ok || !upstream.body) {
      // try to read a bit of the error body for logging
      let extra = "";
      try {
        const text = await upstream.text();
        extra = ` body[0..120]=${text.slice(0, 120)}`;
      } catch {}
      console.error(`[pixelproxy] upstream not ok: ${upstream.status} ${upstream.statusText} for ${src}${extra}`);
      return new Response("Upstream not ok", { status: 404 });
    }

    // Stream straight through (no buffering), with explicit headers
    const headers = new Headers(upstream.headers);
    headers.set("Content-Type", "image/png");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, { headers });
  } catch (err) {
    console.error("[pixelproxy] fetch error:", err);
    return new Response("Proxy failure", { status: 500 });
  }
}