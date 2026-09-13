import type { Bias, HistoryItem, RadarState, ReviewStats, Verdict } from "./types";

export const EARLY_MS = 15 * 60 * 1000;
export const SETTLE_MS = 30 * 60 * 1000;
const THRESHOLD = 0.004;

export function gradeMove(bias: Bias, move: number | null, threshold = THRESHOLD): Verdict {
  if (move == null) return "pending";
  if (Math.abs(move) < threshold) return "chop";
  if (bias === "SHORT") return move < 0 ? "hit" : "miss";
  if (bias === "LONG") return move > 0 ? "hit" : "miss";
  return "pending";
}

export function ageMs(createdAt: string, now = Date.now()): number {
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) ? now - t : 0;
}

/** Official auto grade uses only the 30m window after settle. 15m is inspection-only. */
export function autoVerdict(
  item: Pick<HistoryItem, "bias" | "createdAt" | "outcome15m" | "outcome30m">,
  now = Date.now(),
): Verdict {
  const age = ageMs(item.createdAt, now);
  if (age < SETTLE_MS) return "pending";
  if (item.outcome30m != null) return gradeMove(item.bias, item.outcome30m);
  return "pending";
}

export function earlyObserve(
  item: Pick<HistoryItem, "bias" | "createdAt" | "outcome15m">,
  now = Date.now(),
): Verdict {
  const age = ageMs(item.createdAt, now);
  if (age < EARLY_MS) return "pending";
  if (item.outcome15m != null) return gradeMove(item.bias, item.outcome15m);
  return "pending";
}

export function finalVerdict(item: HistoryItem, now = Date.now()): Verdict {
  return autoVerdict(item, now);
}

export function buildReviewStats(items: HistoryItem[], now = Date.now()): ReviewStats {
  const tradeable = items.filter((it) => it.state === "ARMED" || it.state === "TRIGGERED");
  const autoCounts = { pending: 0, hit: 0, miss: 0, chop: 0, void: 0 };
  const manualCounts = { hit: 0, miss: 0, void: 0 };
  const byState: ReviewStats["byState"] = { ARMED: emptyBucket(), TRIGGERED: emptyBucket() };
  const byBias: ReviewStats["byBias"] = { LONG: emptyBucket(), SHORT: emptyBucket() };
  const reasonMap = new Map<string, { n: number; hit: number; miss: number; chop: number }>();

  for (const it of tradeable) {
    if (it.feedback === "hit" || it.feedback === "miss" || it.feedback === "void") {
      manualCounts[it.feedback] += 1;
    }
    const v = autoVerdict(it, now);
    autoCounts[v] += 1;
    if (it.state === "ARMED" || it.state === "TRIGGERED") bump(byState[it.state], v);
    if (it.bias === "LONG" || it.bias === "SHORT") bump(byBias[it.bias], v);
    if (v === "hit" || v === "miss" || v === "chop") {
      for (const reason of it.reasons) {
        const cur = reasonMap.get(reason) ?? { n: 0, hit: 0, miss: 0, chop: 0 };
        cur.n += 1;
        if (v === "hit") cur.hit += 1;
        else if (v === "miss") cur.miss += 1;
        else cur.chop += 1;
        reasonMap.set(reason, cur);
      }
    }
  }

  const decided = autoCounts.hit + autoCounts.miss;
  const autoSettled = decided + autoCounts.chop;
  const directionalRate = decided > 0 ? autoCounts.hit / decided : null;
  const hitRate = autoSettled > 0 ? autoCounts.hit / autoSettled : null;
  const reasons = [...reasonMap.entries()]
    .map(([reason, v]) => ({ reason, sample: v.n, hitRate: v.n > 0 ? v.hit / v.n : null }))
    .filter((r) => r.sample >= 2)
    .sort((a, b) => (b.hitRate ?? 0) - (a.hitRate ?? 0) || b.sample - a.sample)
    .slice(0, 8);

  return {
    sample: tradeable.length,
    settled: autoSettled,
    pending: autoCounts.pending,
    hit: autoCounts.hit,
    miss: autoCounts.miss,
    chop: autoCounts.chop,
    voided: autoCounts.void,
    hitRate,
    directionalRate,
    manualHit: manualCounts.hit,
    manualMiss: manualCounts.miss,
    manualVoid: manualCounts.void,
    byState,
    byBias,
    reasons,
    reliable: autoSettled >= 20,
  };
}

function emptyBucket() {
  return { sample: 0, hit: 0, miss: 0, pending: 0 };
}

function bump(bucket: { sample: number; hit: number; miss: number; pending: number }, v: Verdict) {
  bucket.sample += 1;
  if (v === "hit") bucket.hit += 1;
  else if (v === "miss") bucket.miss += 1;
  else if (v === "pending") bucket.pending += 1;
}

export function excursion(bias: Bias, entry: number, prices: number[]): { mfe: number | null; mae: number | null } {
  if (!entry || prices.length === 0) return { mfe: null, mae: null };
  let mfe = 0;
  let mae = 0;
  for (const p of prices) {
    const m = p / entry - 1;
    if (bias === "SHORT") {
      if (m < mfe) mfe = m;
      if (m > mae) mae = m;
    } else {
      if (m > mfe) mfe = m;
      if (m < mae) mae = m;
    }
  }
  return { mfe, mae };
}

export function isTradeable(state: RadarState): boolean {
  return state === "ARMED" || state === "TRIGGERED";
}
