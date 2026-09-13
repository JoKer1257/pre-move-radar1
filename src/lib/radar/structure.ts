import type { Candle, StructureLabel, Swing } from "./types";
import { atr, body, range, sma } from "./math";

export function findSwings(candles: Candle[], left = 2, right = 2): Swing[] {
  const out: Swing[] = [];
  if (candles.length < left + right + 3) return out;
  const end = candles.length - right;
  for (let i = left; i < end; i++) {
    const h = candles[i]!.h;
    const l = candles[i]!.l;
    let isH = true;
    let isL = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (candles[j]!.h >= h) isH = false;
      if (candles[j]!.l <= l) isL = false;
    }
    const confirmBar = candles[i + right]!;
    if (isH) {
      out.push({ index: i, t: candles[i]!.t, confirmedAt: confirmBar.t, price: h, kind: "H" });
    } else if (isL) {
      out.push({ index: i, t: candles[i]!.t, confirmedAt: confirmBar.t, price: l, kind: "L" });
    }
  }
  return out;
}

function lastOf(swings: Swing[], kind: "H" | "L", n: number): Swing[] {
  return swings.filter((s) => s.kind === kind).slice(-n);
}

export function classifyStructure(
  candles: Candle[],
  swing = 2,
): { label: StructureLabel | null; bosLevel: number | null; swings: Swing[] } {
  const swings = findSwings(candles, swing, swing);
  const highs = lastOf(swings, "H", 3);
  const lows = lastOf(swings, "L", 3);
  if (highs.length < 2 || lows.length < 2) {
    return { label: candles.length >= 20 ? "range" : null, bosLevel: null, swings };
  }

  const hh = highs[highs.length - 1]!.price > highs[highs.length - 2]!.price;
  const lh = highs[highs.length - 1]!.price < highs[highs.length - 2]!.price;
  const hl = lows[lows.length - 1]!.price > lows[lows.length - 2]!.price;
  const ll = lows[lows.length - 1]!.price < lows[lows.length - 2]!.price;

  let trend: "up" | "down" | "range" = "range";
  if (hh && hl) trend = "up";
  else if (lh && ll) trend = "down";

  const last = candles[candles.length - 1]!;
  const lastLow = lows[lows.length - 1]!;
  const lastHigh = highs[highs.length - 1]!;
  const brokeDown = last.c < lastLow.price && lastLow.index < candles.length - 1;
  const brokeUp = last.c > lastHigh.price && lastHigh.index < candles.length - 1;

  if (trend === "up" && brokeDown) return { label: "MSS-down", bosLevel: lastLow.price, swings };
  if (trend === "down" && brokeUp) return { label: "MSS-up", bosLevel: lastHigh.price, swings };
  if (brokeDown) return { label: "BOS-down", bosLevel: lastLow.price, swings };
  if (brokeUp) return { label: "BOS-up", bosLevel: lastHigh.price, swings };
  if (trend === "up") return { label: "HH-HL", bosLevel: lastLow.price, swings };
  if (trend === "down") return { label: "LH-LL", bosLevel: lastHigh.price, swings };
  return { label: "range", bosLevel: null, swings };
}

export function detectSweep(candles: Candle[], swings: Swing[], atrVal: number | null): "high" | "low" | null {
  if (candles.length < 8 || !atrVal) return null;
  const last = candles[candles.length - 1]!;
  const recentH = swings.filter((s) => s.kind === "H").slice(-4);
  const recentL = swings.filter((s) => s.kind === "L").slice(-4);
  const eqTol = atrVal * 0.18;
  const eqh = clusterLevel(recentH.map((s) => s.price), eqTol);
  const eql = clusterLevel(recentL.map((s) => s.price), eqTol);
  if (eqh && last.h > eqh + atrVal * 0.08 && last.c < eqh && last.c < last.o) return "high";
  if (eql && last.l < eql - atrVal * 0.08 && last.c > eql && last.c > last.o) return "low";
  const priorHigh = Math.max(...candles.slice(-12, -1).map((c) => c.h));
  const priorLow = Math.min(...candles.slice(-12, -1).map((c) => c.l));
  if (last.h > priorHigh && last.c < priorHigh && last.c < last.o) return "high";
  if (last.l < priorLow && last.c > priorLow && last.c > last.o) return "low";
  return null;
}

function clusterLevel(prices: number[], tol: number): number | null {
  if (prices.length < 2) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (Math.abs(sorted[j]! - sorted[i]!) <= tol) return (sorted[i]! + sorted[j]!) / 2;
    }
  }
  return null;
}

export function detectDisplacement(candles: Candle[], atrVal: number | null): "up" | "down" | null {
  if (candles.length < 20 || !atrVal) return null;
  const vols = candles.map((c) => c.v);
  const volAvg = sma(vols, 20);
  const last = candles[candles.length - 1]!;
  const prev = candles[candles.length - 2]!;
  for (const c of [last, prev]) {
    const r = range(c);
    const b = body(c);
    const volOk = !volAvg || c.v >= volAvg * 1.55;
    if (r > atrVal * 1.5 && b > r * 0.62 && volOk) return c.c > c.o ? "up" : "down";
  }
  return null;
}

export function countImpulses(candles: Candle[], atrVal: number | null, dir: "up" | "down"): number {
  if (!atrVal || candles.length < 10) return 0;
  let count = 0;
  let cooling = 0;
  for (const c of candles.slice(-18)) {
    const r = range(c);
    const b = body(c);
    const hit = r > atrVal * 1.35 && b > r * 0.55 && (dir === "up" ? c.c > c.o : c.c < c.o);
    if (hit && cooling === 0) {
      count += 1;
      cooling = 2;
    } else if (cooling > 0) cooling -= 1;
  }
  return count;
}

export function bollingerSqueeze(candles: Candle[]): { squeeze: boolean; expanding: boolean; widthRatio: number | null } {
  const closes = candles.map((c) => c.c);
  if (closes.length < 40) return { squeeze: false, expanding: false, widthRatio: null };
  const widths: number[] = [];
  for (let i = 20; i <= closes.length; i++) {
    const slice = closes.slice(i - 20, i);
    const mean = slice.reduce((a, b) => a + b, 0) / 20;
    const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20);
    widths.push((sd * 4) / Math.max(mean, 1e-12));
  }
  const last = widths[widths.length - 1]!;
  const avg = sma(widths, Math.min(30, widths.length));
  if (!avg) return { squeeze: false, expanding: false, widthRatio: null };
  const ratio = last / avg;
  const prev = widths[widths.length - 3] ?? last;
  return {
    squeeze: ratio < 0.72,
    expanding: ratio > 0.85 && last > prev && (widths[widths.length - 8] ?? last) < avg * 0.85,
    widthRatio: ratio,
  };
}

export function volumeProfile(candles: Candle[]): { ratio: number | null; expansion: boolean; exhaustion: boolean } {
  const vols = candles.map((c) => c.v);
  const avg = sma(vols, Math.min(20, vols.length));
  const last = vols[vols.length - 1];
  if (!avg || last == null) return { ratio: null, expansion: false, exhaustion: false };
  const ratio = last / Math.max(avg, 1e-9);
  const recent = vols.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const prior = sma(vols.slice(0, -3), Math.min(10, Math.max(vols.length - 3, 1)));
  return {
    ratio,
    expansion: ratio > 1.8 || (prior != null && recent > prior * 1.7),
    exhaustion: ratio < 0.55 && candles.length > 8 && range(candles[candles.length - 1]!) < range(candles[candles.length - 2]!),
  };
}

export function emaExtension(candles: Candle[], atrVal: number | null): number | null {
  if (!atrVal || atrVal <= 0) return null;
  const closes = candles.map((c) => c.c);
  const e20 = emaFrom(closes, 20);
  if (e20 == null) return null;
  return (closes[closes.length - 1]! - e20) / atrVal;
}

function emaFrom(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) prev = values[i]! * k + prev * (1 - k);
  return prev;
}

export { atr };
