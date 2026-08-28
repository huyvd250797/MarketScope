# Changelog

## V0.3.0 — Entry / SL / TP Signal Engine

Nâng cấp trực tiếp từ V0.2.0 theo roadmap.

### Added

- Server-side LONG-only Signal Engine.
- Decision: `BUY / WAIT / AVOID`.
- Setup classification: Trend Pullback / Breakout / Range Rebound / No Setup.
- Signal Score 0–100 với breakdown Trend, Momentum, Structure, Entry Location, Risk Quality.
- Entry Zone Low / High / Midpoint.
- Technical Stop Loss + risk %.
- Invalidation conditions.
- TP1 / TP2 / TP3 + profit % + R:R.
- Pivot support/resistance và 20-bar volume ratio context.
- Positive factors, warnings và guardrails.
- Signal card tối ưu mobile.
- Entry/SL/TP price lines và BUY/WAIT/AVOID marker trên Lightweight Charts.
- Toggle `ENTRY/SL/TP` trên chart.

### Guardrails

- LONG-only, không SHORT.
- Không leverage recommendation.
- Không auto trade.
- Signal Score không phải win rate.
- Win probability / expectancy / time-to-target để V0.5.0 sau backtest/calibration.

### Preserved

- Market Data & Mobile Shell V0.1.0.
- Indicator & Market Regime Engine V0.2.0.
- Standard Next.js deploy; không static export / không `out`.

### Next

- V0.4.0 — Position / Exit Analysis: nhập điểm đã mua và phân tích chốt lời/thoát vị thế theo ngắn, trung, dài hạn.
