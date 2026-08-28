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
  fallbackUsed?: boolean;
  warning?: string;
};

export interface MarketProvider {
  readonly name: string;
  getSnapshot(symbol: string, interval: Interval): Promise<MarketSnapshot>;
}
