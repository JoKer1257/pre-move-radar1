import type { HistoryItem, ManualFeedback, RadarRow, TimelineEvent } from "./types";
import type { PriorSnap } from "./analyze";

type EventRow = TimelineEvent & {
  venue: string;
  feedback: ManualFeedback | null;
};

const snapshots = new Map<string, PriorSnap>();
const events: EventRow[] = [];
let seq = 1;

export function priorOf(symbol: string): PriorSnap | null {
  return snapshots.get(symbol) ?? null;
}

export function saveSnapshot(row: RadarRow): void {
  const prev = snapshots.get(row.symbol);
  snapshots.set(row.symbol, {
    price: row.last,
    oi: row.oiUsd,
    oiUsd: row.oiUsd,
    bidSize: row.bidSize,
    askSize: row.askSize,
    state: row.state,
    bias: row.bias,
    scannedAt: Date.parse(row.scannedAt) || Date.now(),
    tooLateUntil: prev?.tooLateUntil,
  });
}

export function recordTransition(row: RadarRow, prev: PriorSnap | null): TimelineEvent | null {
  if (!prev?.state || prev.state === row.state) return null;
  if (row.state === "IDLE") return null;
  const ev: EventRow = {
    id: seq++,
    symbol: row.symbol,
    venue: row.venue,
    bias: row.bias,
    state: row.state,
    score: row.score,
    price: row.last,
    headline: row.headline,
    actionNote: row.actionNote,
    reasons: row.reasons,
    createdAt: row.scannedAt,
    feedback: null,
  };
  events.unshift(ev);
  if (events.length > 500) events.length = 500;
  return ev;
}

export function listEvents(): EventRow[] {
  return events;
}

export function markFeedback(id: number, feedback: ManualFeedback | null): HistoryItem | null {
  const ev = events.find((e) => e.id === id);
  if (!ev) return null;
  ev.feedback = feedback;
  return toHistory(ev);
}

export function toHistory(ev: EventRow): HistoryItem {
  return {
    ...ev,
    outcome15m: null,
    outcome30m: null,
    outcome1h: null,
    mfe: null,
    mae: null,
    auto: "pending",
    verdict: "pending",
  };
}
