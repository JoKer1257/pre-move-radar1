export function formatPrice(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs >= 100) return n.toFixed(2);
  if (abs >= 1) return n.toFixed(4);
  if (abs >= 0.01) return n.toFixed(5);
  return n.toPrecision(4);
}

export function formatPct(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

export function formatUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatOiDelta(n: number | null): string {
  if (n == null) return "OI —";
  const sign = n >= 0 ? "↑" : "↓";
  return `OI ${sign} ${Math.abs(n * 100).toFixed(1)}%`;
}

export function displaySymbol(symbol: string): string {
  return symbol.replace(/-USDT-SWAP$/, "").replace(/USDT$/, "").replace(/_USDT$/, "");
}
