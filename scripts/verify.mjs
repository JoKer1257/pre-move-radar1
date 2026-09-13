import assert from "node:assert/strict";

function classifyStructure(candles, swing = 2) {
  const swings = findSwings(candles, swing, swing);
  const highs = swings.filter((s) => s.kind === "H").slice(-3);
  const lows = swings.filter((s) => s.kind === "L").slice(-3);
  if (highs.length < 2 || lows.length < 2) {
    return { label: candles.length >= 20 ? "range" : null, bosLevel: null, swings };
  }
  const last = candles[candles.length - 1];
  const lastLow = lows[lows.length - 1];
  const lastHigh = highs[highs.length - 1];
  const hh = lastHigh.price > highs[highs.length - 2].price;
  const hl = lastLow.price > lows[lows.length - 2].price;
  const lh = lastHigh.price < highs[highs.length - 2].price;
  const ll = lastLow.price < lows[lows.length - 2].price;
  let trend = "range";
  if (hh && hl) trend = "up";
  else if (lh && ll) trend = "down";
  const brokeDown = last.c < lastLow.price && lastLow.index < candles.length - 1;
  const brokeUp = last.c > lastHigh.price && lastHigh.index < candles.length - 1;
  if (trend === "up" && brokeDown) return { label: "MSS-down", bosLevel: lastLow.price, swings };
  if (trend === "down" && brokeUp) return { label: "MSS-up", bosLevel: lastHigh.price, swings };
  if (brokeDown) return { label: "BOS-down", bosLevel: lastLow.price, swings };
  if (brokeUp) return { label: "BOS-up", bosLevel: lastHigh.price, swings };
  return { label: trend === "up" ? "HH-HL" : trend === "down" ? "LH-LL" : "range", bosLevel: null, swings };
}

function findSwings(candles, left = 2, right = 2) {
  const out = [];
  const end = candles.length - right;
  for (let i = left; i < end; i++) {
    const h = candles[i].h;
    const l = candles[i].l;
    let isH = true;
    let isL = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (candles[j].h >= h) isH = false;
      if (candles[j].l <= l) isL = false;
    }
    if (isH) out.push({ index: i, t: candles[i].t, confirmedAt: candles[i + right].t, price: h, kind: "H" });
    else if (isL) out.push({ index: i, t: candles[i].t, confirmedAt: candles[i + right].t, price: l, kind: "L" });
  }
  return out;
}

function bar(t, o, h, l, c) {
  return { t, o, h, l, c, v: 1, turnover: 1, confirmed: true };
}

function closedBars(candles, intervalMs, now) {
  return candles.filter((c) => c.confirmed && c.t + intervalMs <= now);
}

{
  const candles = [];
  let t = 1_000_000;
  const push = (o, h, l, c) => {
    candles.push(bar(t, o, h, l, c));
    t += 60_000;
  };
  push(100, 101, 99.5, 100.4);
  push(100.4, 101.2, 99.8, 100.8);
  push(100.8, 110.5, 100.6, 108.0);
  push(108.0, 108.8, 107.2, 107.6);
  push(107.6, 108.2, 106.8, 107.4);
  push(107.4, 108.0, 103.0, 104.2);
  push(104.2, 106.0, 103.6, 105.5);
  push(105.5, 107.0, 104.8, 106.2);
  push(106.2, 120.5, 106.0, 118.0);
  push(118.0, 118.8, 116.5, 117.0);
  push(117.0, 117.6, 115.8, 116.4);
  push(116.4, 117.2, 108.5, 110.0);
  push(110.0, 112.0, 109.2, 111.0);
  push(111.0, 113.0, 110.4, 112.2);
  push(121.0, 123.0, 120.8, 122.0);
  const st = classifyStructure(candles, 2);
  assert.equal(st.label, "BOS-up");
  assert.equal(st.bosLevel, 120.5);
  assert.notEqual(st.bosLevel, 110.5);
  const lastH = st.swings.filter((s) => s.kind === "H").at(-1);
  assert.ok(lastH.confirmedAt > lastH.t);
  console.log("ok structure bosLevel uses latest high 120.5");
}

{
  const interval = 60_000;
  const open = 1_700_000_000_000;
  const candle = { t: open, o: 1, h: 1, l: 1, c: 1, v: 1, turnover: 1, confirmed: true };
  assert.equal(closedBars([candle], interval, open + interval - 1000).length, 0);
  assert.equal(closedBars([candle], interval, open + interval).length, 1);
  console.log("ok closedBars rejects 1s before close");
}

{
  const SETTLE = 30 * 60 * 1000;
  const grade = (bias, move) => {
    if (move == null) return "pending";
    if (Math.abs(move) < 0.004) return "chop";
    return bias === "LONG" ? (move > 0 ? "hit" : "miss") : move < 0 ? "hit" : "miss";
  };
  const autoVerdict = (item, now) => {
    const age = now - Date.parse(item.createdAt);
    if (age < SETTLE) return "pending";
    return grade(item.bias, item.outcome30m);
  };
  const t0 = Date.parse("2026-09-13T00:00:00Z");
  const item = {
    bias: "LONG",
    createdAt: new Date(t0).toISOString(),
    outcome15m: 0.01,
    outcome30m: -0.01,
    feedback: "hit",
    state: "ARMED",
  };
  assert.equal(autoVerdict(item, t0 + 20 * 60 * 1000), "pending");
  assert.equal(autoVerdict(item, t0 + 35 * 60 * 1000), "miss");
  const rows = [{ ...item, outcome30m: 0.01, feedback: "hit" }, ...Array.from({ length: 19 }, () => ({ ...item, outcome30m: 0.001, feedback: "hit" }))];
  const now = t0 + 35 * 60 * 1000;
  let hit = 0, miss = 0, chop = 0;
  for (const r of rows) {
    const v = autoVerdict(r, now);
    if (v === "hit") hit += 1;
    else if (v === "miss") miss += 1;
    else if (v === "chop") chop += 1;
  }
  assert.equal(hit, 1);
  assert.equal(chop, 19);
  assert.ok(Math.abs(hit / (hit + miss + chop) - 0.05) < 1e-9);
  console.log("ok review: manual mark ignored; 1 hit + 19 chop => candidate 5% not 100%");
}

console.log("all verification passed");
