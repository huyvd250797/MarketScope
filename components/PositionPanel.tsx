'use client';

import type { PositionExitAnalysis, MarketSnapshot } from '@/lib/market/types';

type Props = {
  snapshot: MarketSnapshot;
  entryDraft: string;
  analysis: PositionExitAnalysis | null;
  onEntryDraft: (value: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
};

export default function PositionPanel({ snapshot, entryDraft, analysis, onEntryDraft, onAnalyze, onClear }: Props) {
  const digits = snapshot.currency === 'VND' ? 0 : snapshot.currentPrice >= 1000 ? 2 : 6;
  const pnlTone = !analysis ? '' : analysis.pnlPercent > 0 ? 'profit' : analysis.pnlPercent < 0 ? 'loss' : 'flat';
  const actionTone = !analysis ? '' : analysis.action === 'EXIT_RISK' || analysis.action === 'REDUCE_RISK'
    ? 'risk'
    : analysis.action === 'TAKE_PARTIAL' || analysis.action === 'PROTECT_PROFIT'
      ? 'profit'
      : 'hold';

  return (
    <section className="position-card">
      <div className="position-title-row">
        <div>
          <h2>Position / Exit Planner</h2>
          <span>Nhập giá đã mua → theo dõi P/L • bảo vệ vốn • mục tiêu ngắn / trung / dài hạn</span>
        </div>
        <span className="position-version">V0.4</span>
      </div>

      <div className="position-input-box">
        <label htmlFor="entry-price">Giá đã vào lệnh</label>
        <div className="position-input-row">
          <input
            id="entry-price"
            inputMode="decimal"
            value={entryDraft}
            onChange={(event) => onEntryDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') onAnalyze(); }}
            placeholder={snapshot.currency === 'VND' ? 'Ví dụ: 120000' : 'Ví dụ: 62000'}
          />
          <button className="primary-button" onClick={onAnalyze}>Phân tích vị thế</button>
          {analysis && <button className="position-clear" onClick={onClear}>Xóa</button>}
        </div>
        <p>Giá vốn được lưu cục bộ trên thiết bị theo từng mã; MarketScope không gửi lịch sử vị thế sang dịch vụ bên thứ ba.</p>
      </div>

      {!analysis ? (
        <div className="position-empty">
          <span>◎</span>
          <div><strong>Chưa có giá vốn</strong><p>Nhập giá đã mua để tạo Exit Planner riêng cho vị thế đang nắm giữ.</p></div>
        </div>
      ) : (
        <>
          <div className={`position-hero ${pnlTone}`}>
            <div>
              <span className="position-eyebrow">TRẠNG THÁI VỊ THẾ</span>
              <strong>{analysis.statusLabel}</strong>
              <p>Giá vốn {formatPrice(analysis.entryPrice, digits)} → hiện tại {formatPrice(analysis.currentPrice, digits)}</p>
            </div>
            <div className={`position-pnl ${pnlTone}`}>
              <strong>{analysis.pnlPercent > 0 ? '+' : ''}{analysis.pnlPercent.toFixed(2)}%</strong>
              <span>{analysis.pnlPerUnit > 0 ? '+' : ''}{formatPrice(analysis.pnlPerUnit, digits)} / đơn vị</span>
            </div>
          </div>

          <div className={`position-action ${actionTone}`}>
            <span>HÀNH ĐỘNG RULE-BASED</span>
            <strong>{analysis.actionLabel}</strong>
            <p>{actionDescription(analysis)}</p>
          </div>

          <div className="position-protection-grid">
            <PositionMetric label="GIÁ VỐN" value={formatPrice(analysis.entryPrice, digits)} />
            <PositionMetric
              label={analysis.protection.lockedProfitPercent != null ? 'MỐC BẢO VỆ LÃI' : 'MỐC BẢO VỆ'}
              value={formatPrice(analysis.protection.defensiveStop, digits)}
              detail={analysis.protection.lockedProfitPercent != null ? `Khóa ~${analysis.protection.lockedProfitPercent.toFixed(2)}%` : `Risk ~${analysis.protection.riskFromEntryPercent.toFixed(2)}%`}
              tone={analysis.protection.breached ? 'risk' : 'protect'}
            />
            <PositionMetric label="TRAIL REF" value={formatNullable(analysis.protection.trailingReference, digits)} detail="EMA/VWAP/Support" />
            <PositionMetric label="REGIME" value={formatRegime(analysis.context.regime)} />
          </div>

          <div className="exit-plan-title">
            <div><strong>Các mốc thoát / chốt lời</strong><span>Theo timeframe đang xem • không phải ETA chắc chắn</span></div>
          </div>
          <div className="exit-plan-grid">
            {analysis.exits.map((plan) => (
              <article className={`exit-plan ${plan.key.toLowerCase()}`} key={plan.key}>
                <div className="exit-plan-head"><span>{plan.label}</span><em>{plan.horizon}</em></div>
                <strong>{formatPrice(plan.target, digits)}</strong>
                <div className="exit-plan-meta">
                  <span>{plan.profitPercent >= 0 ? '+' : ''}{plan.profitPercent.toFixed(2)}% từ giá vốn</span>
                  <span>{plan.distanceFromCurrentPercent >= 0 ? '+' : ''}{plan.distanceFromCurrentPercent.toFixed(2)}% từ hiện tại</span>
                </div>
                <p>{plan.note}</p>
              </article>
            ))}
          </div>

          <div className="position-horizon-note"><span>i</span><p>{analysis.horizonGuide.note}</p></div>

          {(analysis.reasons.length > 0 || analysis.warnings.length > 0) && (
            <div className="position-reason-grid">
              <div className="position-list positive">
                <strong>Yếu tố hỗ trợ giữ vị thế</strong>
                {analysis.reasons.length ? analysis.reasons.slice(0, 5).map((item) => <p key={item}>✓ {item}</p>) : <p>Chưa có yếu tố hỗ trợ nổi bật.</p>}
              </div>
              <div className="position-list warning">
                <strong>Rủi ro cần theo dõi</strong>
                {analysis.warnings.length ? analysis.warnings.slice(0, 6).map((item) => <p key={item}>! {item}</p>) : <p>Chưa có cảnh báo kỹ thuật lớn.</p>}
              </div>
            </div>
          )}

          <details className="position-details">
            <summary>Mốc kỹ thuật & guardrails</summary>
            <div className="position-details-body">
              <div className="position-context-grid">
                <ContextMetric label="Support" value={formatNullable(analysis.context.support, digits)} />
                <ContextMetric label="Resistance" value={formatNullable(analysis.context.resistance, digits)} />
                <ContextMetric label="EMA20" value={formatNullable(analysis.context.ema20, digits)} />
                <ContextMetric label="EMA50" value={formatNullable(analysis.context.ema50, digits)} />
                <ContextMetric label="VWAP" value={formatNullable(analysis.context.vwap, digits)} />
                <ContextMetric label="ATR" value={formatPrice(analysis.context.atr, digits)} />
              </div>
              <strong>Nguyên tắc V0.4.0</strong>
              {analysis.guardrails.map((item) => <p key={item}>• {item}</p>)}
            </div>
          </details>

          <div className="position-disclaimer"><span>i</span><p>{analysis.disclaimer}</p></div>
        </>
      )}
    </section>
  );
}

function actionDescription(analysis: PositionExitAnalysis) {
  if (analysis.action === 'EXIT_RISK') return 'Giá đã phá mốc bảo vệ kỹ thuật của vị thế. Engine đánh dấu rủi ro thay vì mặc định chờ giá hồi.';
  if (analysis.action === 'REDUCE_RISK') return 'Cấu trúc/range rủi ro hoặc mức âm theo ATR đang xấu đi. Cần đánh giá lại thesis và mức chịu rủi ro.';
  if (analysis.action === 'TAKE_PARTIAL') return 'Vị thế đang có lãi và giá tiến sát kháng cự gần. Có thể dùng mốc này để xem xét khóa một phần lợi nhuận.';
  if (analysis.action === 'PROTECT_PROFIT') return 'Vị thế đã có lãi đủ lớn để nâng mốc bảo vệ theo EMA/VWAP/support thay vì để toàn bộ lợi nhuận quay về âm.';
  return 'Chưa có trigger thoát mạnh. Theo dõi mốc bảo vệ và phản ứng giá tại các target kế tiếp.';
}

function PositionMetric({ label, value, detail, tone = '' }: { label: string; value: string; detail?: string; tone?: string }) {
  return <article className={`position-metric ${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return <div className="position-context"><span>{label}</span><strong>{value}</strong></div>;
}

function formatPrice(value: number, digits: number) {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: Math.max(0, digits) }).format(value);
}

function formatNullable(value: number | null, digits: number) {
  if (value == null || !Number.isFinite(value)) return '-';
  return formatPrice(value, digits);
}

function formatRegime(value: PositionExitAnalysis['context']['regime']) {
  return value.replaceAll('_', ' ');
}
