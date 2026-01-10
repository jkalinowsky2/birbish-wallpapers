// src/app/moonbirds/predictor/page.tsx
import React from "react";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

type CoinGeckoNftResponse = {
  id?: string;
  name?: string;
  symbol?: string;
  native_currency_symbol?: string;
  floor_price?: {
    native_currency?: number;
    usd?: number;
  };
  floor_price_24h_percentage_change?: {
    native_currency?: number;
    usd?: number;
  };
  floor_price_in_usd_24h_percentage_change?: number;
  [k: string]: unknown;
};

type ParsedStats = {
  floorEth: number | null;
  dailyPct: number | null;
  fetchedAt: string | null; // when the data was last fetched from CoinGecko
  sourceNotes: string[];
};

const COINGECKO_NFT_ID = "moonbirds";
const COINGECKO_URL = `https://api.coingecko.com/api/v3/nfts/${COINGECKO_NFT_ID}`;

type CachedCg = {
  floorEth: number | null;
  dailyPct: number | null;
  fetchedAt: string; // ISO
  expiresAt: number; // unix ms
};

const CACHE_TTL_SECONDS = 15 * 60; // 15 minutes
const CG_CACHE_KEY = `coingecko:nft:${COINGECKO_NFT_ID}`;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function todayInTimeZoneISO(tz: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function parseISODateToUTC(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00.000Z`);
}

function daysUntilEndOfYear(fromISO: string, year: number): number {
  const from = parseISODateToUTC(fromISO);
  const endExclusive = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const ms = endExclusive.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatPct(p: number) {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

function formatEth(n: number) {
  if (Math.abs(n) < 1) return n.toFixed(10);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: n >= 100 ? 2 : n >= 10 ? 3 : 4,
  }).format(n);
}

function writtenMagnitude(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1_000) return "hundreds";
  if (abs < 1_000_000) return "thousands";
  if (abs < 1_000_000_000) return "millions";
  if (abs < 1_000_000_000_000) return "billions";
  if (abs < 1_000_000_000_000_000) return "Trillions!";
  if (abs < 1_000_000_000_000_000_000) return "quadrillions";
  if (abs < 1_000_000_000_000_000_000_000) return "quintillions";
  if (abs < 1e24) return "sextillions";
  if (abs < 1e27) return "septillions";
  if (abs < 1e30) return "octillions";
  if (abs < 1e33) return "nonillions";
  if (abs < 1e36) return "decillions";
  return "🚀 truly stupidly large";
}

async function fetchCoinGeckoStatsLive(): Promise<ParsedStats> {
  const sourceNotes: string[] = [];

  const apiKey = process.env.COINGECKO_DEMO_API_KEY;
  if (!apiKey) {
    sourceNotes.push(
      "No COINGECKO_DEMO_API_KEY found. Add it to .env.local / Vercel env vars."
    );
    return { floorEth: null, dailyPct: null, fetchedAt: null, sourceNotes };
  }

  const res = await fetch(COINGECKO_URL, {
    headers: {
      Accept: "application/json",
      "x-cg-demo-api-key": apiKey,
    },
    cache: "no-store", // IMPORTANT: KV is the only cache layer
  });

  if (!res.ok) {
    sourceNotes.push(`CoinGecko request failed: HTTP ${res.status}`);
    return { floorEth: null, dailyPct: null, fetchedAt: null, sourceNotes };
  }

  const json = (await res.json()) as CoinGeckoNftResponse;

  const floorEth = isFiniteNumber(json?.floor_price?.native_currency)
    ? (json.floor_price!.native_currency as number)
    : null;

  let dailyPct: number | null = null;

  const nativePct = json?.floor_price_24h_percentage_change?.native_currency;
  const usdPctObj = json?.floor_price_24h_percentage_change?.usd;
  const usdPctFlat = json?.floor_price_in_usd_24h_percentage_change;

  if (isFiniteNumber(nativePct)) {
    dailyPct = nativePct;
    sourceNotes.push(
      "24h change source: CoinGecko floor_price_24h_percentage_change.native_currency."
    );
  } else if (isFiniteNumber(usdPctObj)) {
    dailyPct = usdPctObj;
    sourceNotes.push(
      "24h change source: CoinGecko floor_price_24h_percentage_change.usd (fallback)."
    );
  } else if (isFiniteNumber(usdPctFlat)) {
    dailyPct = usdPctFlat;
    sourceNotes.push(
      "24h change source: CoinGecko floor_price_in_usd_24h_percentage_change (fallback)."
    );
  } else {
    sourceNotes.push(
      "Could not find a 24h floor % change field in CoinGecko response."
    );
  }

  if (floorEth === null) {
    sourceNotes.push("Could not parse floor_price.native_currency from CoinGecko response.");
  }

  if (dailyPct !== null) {
    const clamped = clamp(dailyPct, -99, 500);
    if (clamped !== dailyPct) {
      sourceNotes.push(`Clamped daily change from ${dailyPct}% to ${clamped}% for sanity.`);
      dailyPct = clamped;
    }
  }

  // fetchedAt is assigned by the cache wrapper, not here
  return { floorEth, dailyPct, fetchedAt: null, sourceNotes };
}

async function fetchCoinGeckoStatsCached(): Promise<ParsedStats> {
  const now = Date.now();

  // 1) Try cache
  try {
    const cached = await kv.get<CachedCg>(CG_CACHE_KEY);
    if (cached && cached.expiresAt > now) {
      return {
        floorEth: cached.floorEth,
        dailyPct: cached.dailyPct,
        fetchedAt: cached.fetchedAt,
        sourceNotes: [], // no cache chatter
      };
    }
  } catch {
    // If KV read fails, fall through to live fetch (and show note)
  }

  // 2) Fetch live
  const live = await fetchCoinGeckoStatsLive();

  // 3) Store updated cache (even if live failed, we can cache nulls briefly if you want; here we still cache result)
  const fetchedAt = new Date().toISOString();
  const payload: CachedCg = {
    floorEth: live.floorEth,
    dailyPct: live.dailyPct,
    fetchedAt,
    expiresAt: now + CACHE_TTL_SECONDS * 1000,
  };

  try {
    await kv.set(CG_CACHE_KEY, payload, { ex: CACHE_TTL_SECONDS });
  } catch {
    // non-fatal; keep going
    return {
      ...live,
      fetchedAt,
      sourceNotes: [...live.sourceNotes, "KV write failed (non-fatal)."],
    };
  }

  return {
    ...live,
    fetchedAt,
    sourceNotes: live.sourceNotes,
  };
}

export default async function MoonbirdsPredictorPage() {
  const tz = "America/New_York";
  const todayISO = todayInTimeZoneISO(tz);
  const targetYear = 2026;

  const daysRemaining = daysUntilEndOfYear(todayISO, targetYear);

  const { floorEth, dailyPct, fetchedAt, sourceNotes } =
    await fetchCoinGeckoStatsCached();

  const canCompute = floorEth !== null && dailyPct !== null;

  let projected: number | null = null;
  if (canCompute) {
    const r = 1 + dailyPct / 100;
    projected = floorEth * Math.pow(r, daysRemaining);
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">
          Moonbirds Floor Predictor (Very Serious™)
        </h1>

        <p className="text-sm opacity-80">
          Uses current Moonbirds floor + 24h % change and applies that change every day until{" "}
          <span className="font-medium">Dec 31, {targetYear}</span>.
        </p>

        {/* <p className="text-xs opacity-70">
          Timezone for “days remaining”:{" "}
          <span className="font-medium">{tz}</span> (today is{" "}
          <span className="font-medium">{todayISO}</span>)
        </p> */}
      </div>

      {/* Inputs */}
      <div className="mt-6 rounded-xl border p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">Inputs (live from CoinGecko)</h2>
          {fetchedAt && (
            <div className="text-xs opacity-70">
              Last updated:{" "}
              <span className="font-mono">
                {new Date(fetchedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-xs opacity-70">Current floor (ETH)</div>
            <div className="mt-1 text-xl font-semibold">
              {floorEth === null ? "—" : `${formatEth(floorEth)} ETH`}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs opacity-70">Current 24h change</div>
            <div className="mt-1 text-xl font-semibold">
              {dailyPct === null ? "—" : formatPct(dailyPct)}
            </div>
          </div>
          {/* 
          <div className="rounded-lg border p-3">
            <div className="text-xs opacity-70">Days remaining in {targetYear}</div>
            <div className="mt-1 text-xl font-semibold">{daysRemaining}</div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs opacity-70">Math</div>
            <div className="mt-1 text-sm">
              {dailyPct === null ? (
                "—"
              ) : (
                <span>
                  floor × (1 {dailyPct >= 0 ? "+" : "−"} {Math.abs(dailyPct).toFixed(2)}%)^{daysRemaining}
                </span>
              )}
            </div>
          </div> */}
        </div>

        {/* Prediction */}
        <div className="mt-6 rounded-lg bg-black/5 p-4">
          <div className="text-xs uppercase tracking-wide opacity-70">
            Your Moonbird could be worth:
          </div>

          {canCompute && projected !== null && (
            <>
              <div className="mt-2 text-4xl font-extrabold tracking-tight">
                {formatEth(projected)} ETH
              </div>

              <div className="mt-2 text-sm opacity-80">
                by the end of the year.{" "}
                <span className="font-semibold">
                  {projected < 1 ? "It’s over" : writtenMagnitude(projected)}
                </span>
                
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 rounded-xl border p-4">
        <h2 className="text-lg font-medium">Notes</h2>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm opacity-90">
          <li>
            Data source: CoinGecko NFT endpoint for ID{" "}
            {/* <span className="font-mono">{COINGECKO_NFT_ID}</span>. */}
            <span>{COINGECKO_NFT_ID}</span>.
          </li>
          <li>
            Not financial advice. Compounding a single 24h % forever is intentionally absurd...right?
          </li>

          {/* Only show meaningful notes (no cache hit/miss/stale spam) */}
          {sourceNotes
            .filter(
              (n) =>
                !n.startsWith("24h change source:")
            )
            .map((n, i) => (
              <li key={i}>{n}</li>
            ))}
        </ul>
      </div>
    </main>
  );
}