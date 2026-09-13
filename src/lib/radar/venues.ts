import type { Candle, TickerRow, Venue } from "./types";

export const VENUE_CHAIN: Venue[] = ["bybit", "okx", "binance"];

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export function toBybitSymbol(base: string): string {
  return `${base.replace(/USDT$/, "")}USDT`;
}

export async function fetchBybitTickers(): Promise<TickerRow[]> {
  const data = (await fetchJson("https://api.bybit.com/v5/market/tickers?category=linear")) as {
    result?: { list?: Record<string, string>[] };
  };
  const list = data.result?.list ?? [];
  return list
    .filter((r) => String(r.symbol).endsWith("USDT") && !String(r.symbol).includes("-"))
    .map((r) => {
      const symbol = String(r.symbol);
      const last = num(r.lastPrice);
      return {
        symbol,
        venueSymbol: symbol,
        base: symbol.replace(/USDT$/, ""),
        last,
        bid: num(r.bid1Price),
        ask: num(r.ask1Price),
        bidSize: num(r.bid1Size),
        askSize: num(r.ask1Size),
        change24h: num(r.price24hPcnt),
        high24h: num(r.highPrice24h),
        low24h: num(r.lowPrice24h),
        turnoverUsd: num(r.turnover24h),
        volume24h: num(r.volume24h),
        oi: r.openInterest ? num(r.openInterest) : null,
        oiUsd: r.openInterestValue ? num(r.openInterestValue) : null,
        fundingRate: r.fundingRate ? num(r.fundingRate) : null,
      } satisfies TickerRow;
    })
    .sort((a, b) => b.turnoverUsd - a.turnoverUsd);
}

export async function fetchBybitKlines(symbol: string, interval: "1" | "3" | "5" | "15" | "60", limit = 200): Promise<Candle[]> {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const data = (await fetchJson(url)) as { result?: { list?: string[][] } };
  const list = (data.result?.list ?? []).slice().reverse();
  const intervalMs = Number(interval) * 60_000;
  const now = Date.now();
  return list.map((row) => {
    const t = num(row[0]);
    return {
      t,
      o: num(row[1]),
      h: num(row[2]),
      l: num(row[3]),
      c: num(row[4]),
      v: num(row[5]),
      turnover: num(row[6]),
      confirmed: t + intervalMs <= now,
    } satisfies Candle;
  });
}
