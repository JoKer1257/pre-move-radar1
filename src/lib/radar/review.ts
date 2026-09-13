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

export function autoVerdict(item: Pick<HistoryItem, "bias" | "createdAt" | "outcome15m" | "outcome30m">, now = Date.now()): Verdict {
  const age = ageMs(item.createdAt, now);
  if (age < EARLY_MS) return "pending";
  if (age >= SETTLE_MS && item.outcome30m != null) return gradeMove(item.bias, item.outcome30m);
  if (item.outcome15m != null) return gradeMove(item.bias, item.outcome15m);
  if (item.outcome30m != null) return gradeMove(item.bias, item.outcome30m);
  return "pending";
}

export function finalVerdict(item: HistoryItem, now = Date.now()): Verdict {
  if (item.feedback === "void") return "void";
  if (item.feedback === "hit" || item.feedback === "miss") return item.feedback;
  return autoVerdict(item, now);
}

export function buildReviewStats(items: HistoryItem[], now = Date.now()): ReviewStats {
  const tradeable = items.filter((it) => it.state === "ARMED" || it.state === "TRIGGERED");
  const counts = { pending: 0, hit: 0, miss: 0, chop: 0, void: 0 };
  const byState: ReviewStats["byState"] = {
    ARMED: emptyBucket(),
    TRIGGERED: emptyBucket(),
  };
  const byBias: ReviewStats["byBias"] = {
    LONG: emptyBucket(),
    SHORT: emptyBucket(),
  };
  const reasonMap = new Map<string, { n: number; hit: number; miss: number }>();

  for (const it of tradeable) {
    const v = finalVerdict(it, now);
    counts[v] += 1;
    if (it.state === "ARMED" || it.state === "TRIGGERED") bump(byState[it.state], v);
    if (it.bias === "LONG" || it.bias === "SHORT") bump(byBias[it.bias], v);
    if (v === "hit" || v === "miss") {
      for (const reason of it.reasons) {
        const cur = reasonMap.get(reason) ?? { n: 0, hit: 0, miss: 0 };
        cur.n += 1;
        if (v === "hit") cur.hit += 1;
        else cur.miss += 1;
        reasonMap.set(reason, cur);
      }
    }
  }

  const settled = counts.hit + counts.miss;
  const hitRate = settled > 0 ? counts.hit / settled : null;
  const reasons = [...reasonMap.entries()]
    .map(([reason, v]) => ({
      reason,
      sample: v.n,
      hitRate: v.n > 0 ? v.hit / v.n : null,
    }))
    .filter((r) => r.sample >= 2)
    .sort((a, b) => (b.hitRate ?? 0) - (a.hitRate ?? 0) || b.sample - a.sample)
    .slice(0, 8);

  return {
    sample: tradeable.length,
    settled,
    pending: counts.pending,
    hit: counts.hit,
    miss: counts.miss,
    chop: counts.chop,
    voided: counts.void,
    hitRate,
    byState,
    byBias,
    reasons,
    reliable: settled >= 20,
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

export function excursion(
  bias: Bias,
  entry: number,
  prices: number[],
): { mfe: number | null; mae: number | null } {
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
