# Pre-Move Radar

筛选逻辑库 + 市场接口片段。这不是完整可部署的 Web App：缺少 `scan.server.ts` 调度循环和 UI。

## 先验证你报的三个 bug 是否已修

```bash
node scripts/verify.mjs
```

预期：

```
ok structure bosLevel uses latest high 120.5
ok closedBars rejects 1s before close
ok review: manual mark ignored; 1 hit + 19 chop => candidate 5% not 100%
all verification passed
```

## 已有

- `src/lib/radar/structure.ts`  突破位 = 最近 swing，含 `confirmedAt`
- `src/lib/radar/math.ts`  收盘检查无 +2s 毛边
- `src/lib/radar/review.ts`  自动 30m 统计与人工标记分开
- `src/lib/radar/screening.ts`  HTF 唯一方向 + preScore + 资金面确认
- `src/lib/radar/venues.ts`  Bybit ticker / kline

## 仍缺

完整 `scan.server.ts` 深扫循环、OKX/Binance 走底、看板 UI。`npm run dev` 还不能直接把这个仓库当成完整应用启动。
