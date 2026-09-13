# 筛选三刀（已落地）

## 1. ARMED 确3认必须有资金面

以前：扫荡 **或** OI **或** Taker **或** 布林扩张 → 就能 ARMED  
现在：扫荡 **或** OI **或** Taker。扩张只加分，不能单独放行。

## 2. 深扫优先预启动，不优先已走完

`preScore()`：

- IDLE / WATCH +16～22
- 压缩、OI 异动、5m 相对 BTC/ETH 强弱加分
- 24h 大涨大跌减分
- 纯 BOS、TOO_LATE 大幅减分，不占深扫名额

BOS 打分从 6 降到 2。24h 相对强弱不再给方向分。

## 3. 高周期没结构 = NONE

`pickHtfBias()` 只看 15m / 1h 结构。  
不再用相对 BTC/ETH 强弱发明 LONG/SHORT。强弱只做过滤。

## ARMED 窗口

离结构水位从 1.55 ATR 放到 2.1 ATR，避免刚 MSS 就被判“不够近”而直接 TRIGGERED。
