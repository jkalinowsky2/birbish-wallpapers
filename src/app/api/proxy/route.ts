// src/app/api/proxy/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Fetch the remote asset
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return new NextResponse("Upstream error", { status: 502 });

  const blob = await res.blob();

  // Return with permissive CORS so canvas stays exportable
  return new NextResponse(blob, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}