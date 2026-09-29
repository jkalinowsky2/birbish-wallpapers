import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getCreditSvg } from "@/lib/creditcheck";

export const runtime = "nodejs";

const CHECK_SIZE = 47.5;

function attribute(source: string, name: string) {
  return source.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] ?? "";
}

function isWhite(fill: string) {
  return ["#fff", "#ffffff", "white", "rgb(255,255,255)"].includes(
    fill.toLowerCase().replace(/\s/g, ""),
  );
}

function validFill(fill: string) {
  return /^(#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z]+)$/i.test(fill);
}

async function composeCreditCheckSvg(creditSvg: string, background: "white" | "black") {
  const svgTag = creditSvg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const viewBox = attribute(svgTag, "viewBox") || "0 0 320 320";
  const checkSvg = await readFile(path.join(process.cwd(), "public/creditcheck/check.svg"), "utf8");
  const checkPath = checkSvg.match(/<path\b[^>]*\bd=["']([^"']+)["']/i)?.[1];
  if (!checkPath) throw new Error("Check artwork has no path");

  const checks = [...creditSvg.matchAll(/<rect\b[^>]*\/?\s*>/gi)].flatMap(([rect]) => {
    const fill = attribute(rect, "fill");
    const x = Number(attribute(rect, "x") || 0);
    const y = Number(attribute(rect, "y") || 0);
    const width = Number(attribute(rect, "width"));
    const height = Number(attribute(rect, "height"));
    if (!validFill(fill) || isWhite(fill) || width <= 0 || height <= 0) return [];
    return `<path d="${checkPath}" fill="${fill}" transform="translate(${x} ${y}) scale(${width / CHECK_SIZE} ${height / CHECK_SIZE})"/>`;
  });
  if (checks.length === 0) throw new Error("Credit contains no colored cells");

  const backgroundFill = background === "black" ? "#111111" : "#fff";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1200" height="1200"><rect width="100%" height="100%" fill="${backgroundFill}"/>${checks.join("")}</svg>`;
}

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  const background = new URL(request.url).searchParams.get("background") === "black" ? "black" : "white";
  if (!Number.isInteger(id) || id < 1 || id > 122153) {
    return new Response("Invalid token ID", { status: 400 });
  }

  try {
    const composedSvg = await composeCreditCheckSvg(await getCreditSvg(id), background);
    const png = await sharp(Buffer.from(composedSvg)).png().toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("Credit Check image not found", { status: 404 });
  }
}
