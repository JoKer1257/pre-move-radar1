import type { Candle } from "./types";

export function sma(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i]!;
  return sum / period;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i]!;
  prev /= period;
  for (let i = period; i < values.length; i++) prev = values[i]! * k + prev * (1 - k);
  return prev;
}

export function stdev(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(values.length - period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const varSum = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  return Math.sqrt(varSum);
}

export function trueRange(prev: Candle, cur: Candle): number {
  return Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
}

export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) trs.push(trueRange(candles[i - 1]!, candles[i]!));
  return sma(trs, period);
}

export function lastReturn(candles: Candle[], bars: number): number | null {
  if (candles.length < bars + 1) return null;
  const a = candles[candles.length - 1 - bars]!.c;
  const b = candles[candles.length - 1]!.c;
  if (a === 0) return null;
  return (b - a) / a;
}

export function body(c: Candle): number {
  return Math.abs(c.c - c.o);
}

export function range(c: Candle): number {
  return Math.max(c.h - c.l, 1e-12);
}

export function signedBody(c: Candle): number {
  return c.c - c.o;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function nz(n: number | null | undefined, fallback = 0): number {
  return n == null || Number.isNaN(n) ? fallback : n;
}

export const INTERVAL_MS = {
  "1": 60_000,
  "3": 180_000,
  "5": 300_000,
  "15": 900_000,
  "60": 3_600_000,
} as const;

export function closedBars(candles: Candle[] | undefined, intervalMs: number, now = Date.now()): Candle[] {
  if (!candles?.length) return [];
  return candles.filter((c) => {
    if (!c.confirmed) return false;
    if (!Number.isFinite(c.t) || c.t <= 0) return false;
    return c.t + intervalMs <= now;
  });
}

/** @deprecated use closedBars */
export function confirmed(candles: Candle[]): Candle[] {
  return closedBars(candles, 0, Number.POSITIVE_INFINITY);
}
