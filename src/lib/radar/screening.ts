import type { Bias, RadarState, StructureLabel } from "./types";

export function dirFromLabel(s: StructureLabel | null): Bias {
  if (s === "HH-HL" || s === "MSS-up" || s === "BOS-up") return "LONG";
  if (s === "LH-LL" || s === "MSS-down" || s === "BOS-down") return "SHORT";
  return "NONE";
}

/** Only 15m / 1h structure may set bias. RS must not invent a direction. */
export function pickHtfBias(input: {
  s15: StructureLabel | null;
  s1h: StructureLabel | null;
}): { htf: Bias; conflict: boolean } {
  const a = dirFromLabel(input.s15);
  const b = dirFromLabel(input.s1h);
  if (a !== "NONE" && b !== "NONE" && a !== b) return { htf: "NONE", conflict: true };
  if (a !== "NONE") return { htf: a, conflict: false };
  if (b !== "NONE") return { htf: b, conflict: false };
  return { htf: "NONE", conflict: false };
}

export function pickUniqueBias(input: {
  htf: Bias;
  htfConflict: boolean;
  longScore: number;
  shortScore: number;
}): { bias: Bias; conflict: boolean } {
  if (input.htfConflict) return { bias: "NONE", conflict: true };
  const bothHot =
    input.longScore >= 48 && input.shortScore >= 48 && Math.abs(input.longScore - input.shortScore) < 8;
  if (input.htf === "LONG" && input.shortScore >= input.longScore + 10 && input.shortScore >= 52) {
    return { bias: "NONE", conflict: true };
  }
  if (input.htf === "SHORT" && input.longScore >= input.shortScore + 10 && input.longScore >= 52) {
    return { bias: "NONE", conflict: true };
  }
  if (input.htf === "NONE" && bothHot) return { bias: "NONE", conflict: true };
  if (input.htf === "LONG" || input.htf === "SHORT") return { bias: input.htf, conflict: false };
  return { bias: "NONE", conflict: false };
}

/** Deep-scan rank: premovers first, spent continuation last. */
export function preScore(input: {
  state?: RadarState | null;
  structure5m?: StructureLabel | null;
  squeeze?: boolean;
  oiDeltaPct?: number | null;
  rsBtc5m?: number | null;
  rsEth5m?: number | null;
  change24h?: number;
  volExpansion?: boolean;
}): number {
  let s = 0;
  const st = input.state ?? "IDLE";
  if (st === "IDLE" || st === "WATCH") s += 22;
  else if (st === "ARMED") s += 8;
  else if (st === "TRIGGERED") s += 1;
  else if (st === "TOO_LATE") s -= 28;

  if (input.squeeze) s += 16;
  if (Math.abs(input.oiDeltaPct ?? 0) > 0.012) s += 14;
  if (Math.abs(input.rsBtc5m ?? 0) > 0.006) s += 10;
  if (Math.abs(input.rsEth5m ?? 0) > 0.006) s += 6;

  const abs24 = Math.abs(input.change24h ?? 0);
  if (abs24 > 0.08) s -= 14;
  else if (abs24 > 0.05) s -= 7;

  const bos = input.structure5m === "BOS-up" || input.structure5m === "BOS-down";
  if (bos) s -= 12;
  if (input.volExpansion && bos) s -= 8;
  return s;
}

/** ARMED passport: structure + real flow. Expansion is not enough. */
export function hasArmedConfirm(input: {
  bias: Bias;
  sweep: "high" | "low" | null;
  oiPriceDiverge: boolean;
  oiDeltaPct: number | null;
  priceDeltaPct: number | null;
  takerSellPct: number | null;
}): boolean {
  const sweepOk = input.bias === "SHORT" ? input.sweep === "high" : input.sweep === "low";
  const takerOk =
    input.bias === "SHORT"
      ? (input.takerSellPct ?? 0) > 0.62
      : input.takerSellPct != null && input.takerSellPct < 0.38;
  const oiOk =
    input.bias === "SHORT"
      ? input.oiPriceDiverge
      : (input.oiDeltaPct ?? 0) > 0.012 && (input.priceDeltaPct ?? 0) > 0.003;
  return sweepOk || oiOk || takerOk;
}
