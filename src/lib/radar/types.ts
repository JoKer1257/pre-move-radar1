export type RadarState = "IDLE" | "WATCH" | "ARMED" | "TRIGGERED" | "TOO_LATE";
export type Bias = "LONG" | "SHORT" | "NONE";
export type Venue = "bybit" | "okx" | "binance";
export type Phase = "idle" | "building" | "impulse" | "retest";

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  turnover: number;
  confirmed: boolean;
};

export type TradePrint = {
  t: number;
  px: number;
  sz: number;
  side: "buy" | "sell";
};

export type Swing = {
  index: number;
  t: number;
  price: number;
  kind: "H" | "L";
};

export type TickerRow = {
  symbol: string;
  venueSymbol: string;
  base: string;
  last: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  change24h: number;
  high24h: number;
  low24h: number;
  turnoverUsd: number;
  volume24h: number;
  oi: number | null;
  oiUsd: number | null;
  fundingRate: number | null;
};

export type StructureLabel =
  | "HH-HL"
  | "LH-LL"
  | "range"
  | "BOS-up"
  | "BOS-down"
  | "MSS-up"
  | "MSS-down";

export type FactorSet = {
  structure5m: StructureLabel | null;
  structure3m: StructureLabel | null;
  structure1m: StructureLabel | null;
  structure15m: StructureLabel | null;
  structure1h: StructureLabel | null;
  volRatio: number | null;
  volExpansion: boolean;
  volExhaustion: boolean;
  oiDeltaPct: number | null;
  oiPriceDiverge: boolean;
  takerSellPct: number | null;
  bookImbalance: number;
  bookWeakening: boolean;
  rsBtc: number | null;
  rsEth: number | null;
  rsBtc5m: number | null;
  rsEth5m: number | null;
  htfBias: Bias;
  conflict: boolean;
  squeeze: boolean;
  expanding: boolean;
  atrRatio: number | null;
  emaExtAtr: number | null;
  sweep: "high" | "low" | null;
  displacement: "up" | "down" | null;
  moveFromBosAtr: number | null;
  bosLevel: number | null;
  retestLow: number | null;
  retestHigh: number | null;
  impulseCount: number;
  priceDeltaPct: number | null;
};

export type RadarRow = {
  symbol: string;
  venueSymbol: string;
  venue: Venue;
  last: number;
  change24h: number;
  turnoverUsd: number;
  oiUsd: number | null;
  fundingRate: number | null;
  bidSize: number;
  askSize: number;
  bias: Bias;
  conflict: boolean;
  state: RadarState;
  phase: Phase;
  score: number;
  longScore: number;
  shortScore: number;
  headline: string;
  reasons: string[];
  actionNote: string;
  factors: FactorSet;
  candles5m: Candle[];
  scannedAt: string;
};

export type TimelineEvent = {
  id: number;
  symbol: string;
  bias: Bias;
  state: RadarState;
  score: number;
  price: number;
  headline: string;
  actionNote: string;
  reasons: string[];
  createdAt: string;
};

export type Verdict = "pending" | "hit" | "miss" | "chop" | "void";
export type ManualFeedback = "hit" | "miss" | "void";

export type HistoryItem = TimelineEvent & {
  venue: string;
  outcome15m: number | null;
  outcome30m: number | null;
  outcome1h: number | null;
  mfe: number | null;
  mae: number | null;
  feedback: ManualFeedback | null;
  auto: Verdict;
  verdict: Verdict;
};

export type ReviewBucket = {
  sample: number;
  hit: number;
  miss: number;
  pending: number;
};

export type ReviewStats = {
  sample: number;
  settled: number;
  pending: number;
  hit: number;
  miss: number;
  chop: number;
  voided: number;
  hitRate: number | null;
  byState: { ARMED: ReviewBucket; TRIGGERED: ReviewBucket };
  byBias: { LONG: ReviewBucket; SHORT: ReviewBucket };
  reasons: { reason: string; sample: number; hitRate: number | null }[];
  reliable: boolean;
};

export type ReviewPayload = {
  items: HistoryItem[];
  stats: ReviewStats;
  error?: string | null;
};

export type ScanPayload = {
  venue: Venue;
  venueLabel: string;
  scannedAt: string;
  nextScanSec: number;
  universe: number;
  deepCount: number;
  counts: Record<RadarState, number>;
  rows: RadarRow[];
  warning: string | null;
};

export type SymbolDetail = {
  row: RadarRow;
  candles1m: Candle[];
  candles3m: Candle[];
  candles5m: Candle[];
  timeline: TimelineEvent[];
};
