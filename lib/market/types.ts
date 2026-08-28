export type MarketType = 'CRYPTO' | 'STOCK';

export type Interval = '15m' | '1h' | '4h' | '1d' | '1w';

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TechnicalPoint = {
  time: number;
  value: number;
};

export type TechnicalAnalysis = {
  computedAt: string;
  sampleSize: number;
  regime: {
    key: 'STRONG_UPTREND' | 'UPTREND' | 'RANGE' | 'DOWNTREND' | 'STRONG_DOWNTREND' | 'VOLATILE';
    label: string;
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    structure: 'HH_HL' | 'LH_LL' | 'RANGE' | 'UNCONFIRMED';
    description: string;
  };
  indicators: {
    ema: { ema20: number | null; ema50: number | null; ema200: number | null; slope20Percent: number | null; status: string };
    rsi14: { value: number | null; status: string };
    macd: { value: number | null; signal: number | null; histogram: number | null; status: string };
    adx14: { value: number | null; plusDI: number | null; minusDI: number | null; status: string };
    atr14: { value: number | null; percent: number | null; status: string };
    vwap: { value: number | null; distancePercent: number | null; status: string };
  };
  series: {
    ema20: TechnicalPoint[];
    ema50: TechnicalPoint[];
    ema200: TechnicalPoint[];
    vwap: TechnicalPoint[];
    rsi14: TechnicalPoint[];
    macd: TechnicalPoint[];
    macdSignal: TechnicalPoint[];
    macdHistogram: TechnicalPoint[];
    adx14: TechnicalPoint[];
  };
};


export type SignalDecision = 'BUY' | 'WAIT' | 'AVOID';

export type SignalSetup = 'TREND_PULLBACK' | 'BREAKOUT' | 'RANGE_REBOUND' | 'NO_SETUP';

export type TradeSignal = {
  generatedAt: string;
  side: 'LONG';
  decision: SignalDecision;
  decisionLabel: string;
  setup: SignalSetup;
  setupLabel: string;
  score: number;
  scoreLabel: string;
  dataSufficient: boolean;
  entryZone: { low: number; high: number; midpoint: number; note: string } | null;
  stopLoss: { price: number; riskPercent: number; note: string } | null;
  invalidation: string[];
  targets: Array<{
    key: 'TP1' | 'TP2' | 'TP3';
    price: number;
    profitPercent: number;
    rewardRisk: number;
    note: string;
  }>;
  riskReward: { toTP1: number | null; toTP2: number | null; toTP3: number | null };
  context: {
    support: number | null;
    resistance: number | null;
    atr: number | null;
    atrPercent: number | null;
    volumeRatio: number | null;
    distanceFromEntryAtr: number | null;
  };
  breakdown: { trend: number; momentum: number; structure: number; location: number; risk: number };
  positiveFactors: string[];
  warnings: string[];
  guardrails: string[];
  disclaimer: string;
};

export type PositionStatus = 'PROFIT' | 'NEAR_ENTRY' | 'LOSS' | 'RISK';

export type PositionAction = 'HOLD' | 'PROTECT_PROFIT' | 'TAKE_PARTIAL' | 'REDUCE_RISK' | 'EXIT_RISK';

export type PositionExitAnalysis = {
  calculatedAt: string;
  entryPrice: number;
  currentPrice: number;
  pnlPercent: number;
  pnlPerUnit: number;
  status: PositionStatus;
  statusLabel: string;
  action: PositionAction;
  actionLabel: string;
  horizonGuide: { short: string; medium: string; long: string; note: string };
  protection: {
    defensiveStop: number;
    trailingReference: number | null;
    breakEven: number;
    riskFromEntryPercent: number;
    lockedProfitPercent: number | null;
    breached: boolean;
    note: string;
  };
  exits: Array<{
    key: 'SHORT' | 'MEDIUM' | 'LONG';
    label: string;
    target: number;
    profitPercent: number;
    distanceFromCurrentPercent: number;
    horizon: string;
    note: string;
  }>;
  context: {
    atr: number;
    atrPercent: number | null;
    support: number | null;
    resistance: number | null;
    ema20: number | null;
    ema50: number | null;
    vwap: number | null;
    regime: TechnicalAnalysis['regime']['key'];
  };
  reasons: string[];
  warnings: string[];
  guardrails: string[];
  disclaimer: string;
};

export type SymbolItem = {
  symbol: string;
  name: string;
  market: MarketType;
  exchange: string;
  providerSymbol?: string;
};

export type MarketSnapshot = {
  market: MarketType;
  symbol: string;
  displayName: string;
  exchange: string;
  provider: string;
  providerSymbol: string;
  interval: Interval;
  currency: string;
  currentPrice: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketState: string;
  dataAt: string;
  candles: Candle[];
  analysis?: TechnicalAnalysis;
  signal?: TradeSignal;
  fallbackUsed?: boolean;
  warning?: string;
};

export interface MarketProvider {
  readonly name: string;
  getSnapshot(symbol: string, interval: Interval): Promise<MarketSnapshot>;
}
