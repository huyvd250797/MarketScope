# Changelog

## V0.4.0 — Position / Exit Analysis

Nâng cấp trực tiếp từ V0.3.0 theo roadmap.

### Added

- Position / Exit Planner ngay trong Analyze.
- Nhập giá đã vào lệnh và tính P/L hiện tại.
- Position status: `PROFIT / NEAR_ENTRY / LOSS / RISK`.
- Rule-based action: HOLD / Protect Profit / Take Partial / Reduce Risk / Exit Risk.
- Defensive Stop / Protect level theo ATR + EMA/VWAP + support/structure.
- Break-even và trailing reference.
- Exit targets ngắn hạn / trung hạn / dài hạn.
- Horizon guide theo timeframe, ghi rõ không phải ETA.
- Reasons / warnings / guardrails riêng cho vị thế đang nắm giữ.
- `POSITION` overlay trên chart: Entry Actual, Protect/Stop, Exit S/M/L.
- Positions tab hoạt động thật, lưu tối đa 30 giá vốn bằng localStorage.
- Tự khôi phục giá vốn khi quay lại symbol đã lưu.

### Guardrails

- LONG-only, không SHORT.
- Không leverage recommendation.
- Không auto trade.
- Không tự đề xuất tỷ trọng bán theo target.
- Không win rate / probability / expectancy giả.
- Time horizon không phải time-to-target prediction.

### Preserved

- V0.1.0 Market Data & Mobile Shell.
- V0.2.0 Indicator & Market Regime Engine.
- V0.3.0 Entry / SL / TP Signal Engine.
- Standard Next.js deploy; không static export / không `out`.

### Next

- V0.5.0 — Backtest & Win-rate Calibration.
