import { getCreditSvg } from "@/lib/creditcheck";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));

  if (!Number.isInteger(id) || id < 1 || id > 122153) {
    return new Response("Invalid token ID", { status: 400 });
  }

  try {
    return new Response(await getCreditSvg(id), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("Credit artwork not found", { status: 404 });
  }
}
