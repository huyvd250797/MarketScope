export type MarketType = 'CRYPTO' | 'STOCK' | 'FOREX';

export type Interval = '15m' | '1h' | '4h' | '1d' | '1w';

export type StrategyProfileKey = 'AUTO' | 'SHORT_TERM' | 'SWING' | 'MEDIUM_TERM' | 'LONG_TERM';
export type EffectiveStrategyProfile = Exclude<StrategyProfileKey, 'AUTO'>;

export type StrategyProfileAnalysis = {
  requested: StrategyProfileKey;
  effective: EffectiveStrategyProfile;
  effectiveLabel: string;
  recommended: EffectiveStrategyProfile;
  recommendedLabel: string;
  autoApplied: boolean;
  confidence: number;
  timeframeFit: 'GOOD' | 'ACCEPTABLE' | 'MISMATCH';
  timeframeFitLabel: string;
  preferredIntervals: Interval[];
  holdingGuide: string;
  description: string;
  rationale: string[];
};

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
  strategy: { profile: EffectiveStrategyProfile; label: string; holdingGuide: string; buyThreshold: number };
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
  strategy: { profile: EffectiveStrategyProfile; label: string; holdingGuide: string };
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


export type BacktestTradeOutcome = 'WIN' | 'LOSS' | 'TIMEOUT';

export type BacktestTrade = {
  signalTime: number;
  fillTime: number;
  exitTime: number;
  setup: SignalSetup;
  regime: TechnicalAnalysis['regime']['key'];
  score: number;
  scoreBand: string;
  entryPrice: number;
  stopPrice: number;
  tp1Price: number;
  outcome: BacktestTradeOutcome;
  realizedR: number;
  returnPercent: number;
  barsHeld: number;
  barsToTp1: number | null;
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
};

export type BacktestMetrics = {
  filledTrades: number;
  resolvedTrades: number;
  wins: number;
  losses: number;
  timeouts: number;
  noFillSignals: number;
  winRate: number | null;
  calibratedWinRate: number | null;
  resolutionRate: number | null;
  expectancyR: number | null;
  profitFactor: number | null;
  maxDrawdownR: number;
  averageBarsHeld: number | null;
  medianBarsToTp1: number | null;
  tp1HitRate: number | null;
  tp2HitRate: number | null;
  tp3HitRate: number | null;
};

export type BacktestCalibration = {
  applicable: boolean;
  quality: 'INSUFFICIENT' | 'LOW' | 'MEDIUM' | 'HIGH';
  qualityLabel: string;
  matchedBy: string;
  sampleSize: number;
  resolvedTrades: number;
  winRate: number | null;
  calibratedWinRate: number | null;
  expectancyR: number | null;
  profitFactor: number | null;
  medianBarsToTp1: number | null;
  estimatedTimeToTp1: string | null;
  stabilityGapPercent: number | null;
  note: string;
};

export type BacktestResult = {
  generatedAt: string;
  status: 'READY' | 'LIMITED' | 'INSUFFICIENT_HISTORY';
  sampleCandles: number;
  warmupCandles: number;
  evaluatedSignals: number;
  buySignals: number;
  metrics: BacktestMetrics;
  validation: {
    splitPercent: number;
    startTime: number | null;
    metrics: BacktestMetrics;
  };
  calibration: BacktestCalibration;
  recentTrades: BacktestTrade[];
  methodology: string[];
  disclaimer: string;
  strategyProfile: EffectiveStrategyProfile;
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
  backtest?: BacktestResult;
  quality?: DataQualityReport;
  providerDiagnostics?: ProviderDiagnostics;
  strategy?: StrategyProfileAnalysis;
  forecast?: PriceForecast;
  forecastValidation?: ForecastValidationResult;
  fallbackUsed?: boolean;
  warning?: string;
};

export interface MarketProvider {
  readonly name: string;
  getSnapshot(symbol: string, interval: Interval): Promise<MarketSnapshot>;
}



export type ForecastHorizon = 'SHORT' | 'MEDIUM' | 'LONG';

export type PriceForecast = {
  generatedAt: string;
  originTime: number;
  originPrice: number;
  methodology: string;
  confidence: number;
  rawConfidence?: number;
  calibratedConfidence?: number;
  calibration?: {
    quality: ForecastValidationConfidence;
    qualityLabel: string;
    samples: number;
    historicalDirectionAccuracy: number | null;
    rangeHitRate: number | null;
  };
  overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  overallLabel: string;
  scenarios: Array<{
    horizon: ForecastHorizon;
    label: string;
    timeGuide: string;
    evaluationBars: number;
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    directionLabel: string;
    probability: number;
    rawProbability?: number;
    calibratedProbability?: number;
    historicalSamples?: number;
    historicalDirectionAccuracy?: number | null;
    historicalRangeHitRate?: number | null;
    historicalAvgErrorPercent?: number | null;
    expectedPrice: number;
    expectedChangePercent: number;
    rangeLow: number;
    rangeHigh: number;
    invalidationNote: string;
    drivers: string[];
  }>;
  disclaimer: string;
};

export type ForecastValidationConfidence = 'INSUFFICIENT' | 'LOW' | 'MEDIUM' | 'HIGH';

export type ForecastValidationSample = {
  originTime: number;
  targetTime: number;
  horizon: ForecastHorizon;
  predictedDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  actualDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  directionCorrect: boolean;
  predictedPrice: number;
  actualPrice: number;
  rangeLow: number;
  rangeHigh: number;
  rangeHit: boolean;
  absoluteErrorPercent: number;
  rawProbability: number;
  profile: EffectiveStrategyProfile;
  regime: TechnicalAnalysis['regime']['key'];
};

export type ForecastValidationMetrics = {
  samples: number;
  directionCorrect: number;
  directionAccuracy: number | null;
  calibratedDirectionAccuracy: number | null;
  rangeHits: number;
  rangeHitRate: number | null;
  avgAbsoluteErrorPercent: number | null;
  medianAbsoluteErrorPercent: number | null;
  avgRawProbability: number | null;
  calibrationGap: number | null;
};

export type ForecastValidationResult = {
  generatedAt: string;
  status: 'READY' | 'LIMITED' | 'INSUFFICIENT_HISTORY';
  sampleOrigins: number;
  evaluatedScenarios: number;
  strategyProfile: EffectiveStrategyProfile;
  horizons: Record<ForecastHorizon, ForecastValidationMetrics>;
  overall: {
    directionAccuracy: number | null;
    calibratedDirectionAccuracy: number | null;
    rangeHitRate: number | null;
    avgAbsoluteErrorPercent: number | null;
    avgRawProbability: number | null;
    calibrationGap: number | null;
  };
  confidenceQuality: ForecastValidationConfidence;
  confidenceQualityLabel: string;
  recentSamples: ForecastValidationSample[];
  methodology: string[];
  disclaimer: string;
};

export type ForecastHistoryScenario = {
  horizon: ForecastHorizon;
  label: string;
  timeGuide: string;
  evaluationBars: number;
  predictedDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  directionLabel: string;
  rawProbability: number;
  calibratedProbability: number;
  expectedPrice: number;
  rangeLow: number;
  rangeHigh: number;
  status: 'PENDING' | 'RESOLVED';
  targetTime?: number;
  actualPrice?: number;
  actualDirection?: 'UP' | 'DOWN' | 'SIDEWAYS';
  directionCorrect?: boolean;
  rangeHit?: boolean;
  absoluteErrorPercent?: number;
};

export type ForecastHistoryRecord = {
  id: string;
  market: MarketType;
  symbol: string;
  displayName: string;
  interval: Interval;
  strategyProfile: EffectiveStrategyProfile;
  strategyLabel: string;
  provider: string;
  generatedAt: string;
  originTime: number;
  originPrice: number;
  rawConfidence: number;
  calibratedConfidence: number;
  overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  overallLabel: string;
  scenarios: ForecastHistoryScenario[];
};

export type DataHealthStatus = 'HEALTHY' | 'DEGRADED' | 'STALE_DATA' | 'INVALID_DATA' | 'PROVIDER_ERROR';

export type DataQualityReport = {
  checkedAt: string;
  status: DataHealthStatus;
  statusLabel: string;
  score: number;
  signalAllowed: boolean;
  analysisAllowed: boolean;
  backtestAllowed: boolean;
  freshness: {
    ageSeconds: number;
    maxAgeSeconds: number;
    status: 'FRESH' | 'AGING' | 'STALE' | 'FUTURE_TIMESTAMP';
    label: string;
  };
  candles: {
    count: number;
    minimumForSignal: number;
    duplicateTimestamps: number;
    nonMonotonicTimestamps: number;
    invalidOhlc: number;
    largeGaps: number;
    zeroVolumeRatio: number;
  };
  priceConsistency: {
    lastCandleClose: number | null;
    differencePercent: number | null;
  };
  warnings: string[];
  blockers: string[];
};

export type ProviderDiagnostics = {
  requestedMode: string;
  selectedProvider: string;
  route: 'PRIMARY' | 'FALLBACK' | 'DIRECT';
  configured: boolean;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  latencyMs: number;
};

export type HealthCheckItem = {
  key: string;
  label: string;
  status: 'HEALTHY' | 'DEGRADED' | 'PROVIDER_ERROR';
  latencyMs: number | null;
  message: string;
  selected?: boolean;
  configured?: boolean;
};

export type SystemHealthSnapshot = {
  generatedAt: string;
  version: string;
  overall: 'HEALTHY' | 'DEGRADED' | 'PROVIDER_ERROR';
  overallLabel: string;
  stockProviderMode: string;
  stockFallbackEnabled: boolean;
  providers: HealthCheckItem[];
  engines: HealthCheckItem[];
  cachePolicies: Array<{ endpoint: string; policy: string; note: string }>;
  notes: string[];
};

export type WatchlistMonitorSnapshot = {
  market: MarketType;
  symbol: string;
  displayName: string;
  exchange: string;
  provider: string;
  interval: Interval;
  currency: string;
  currentPrice: number;
  changePercent: number | null;
  marketState: string;
  dataAt: string;
  strategy: StrategyProfileAnalysis;
  regime: {
    key: TechnicalAnalysis['regime']['key'];
    label: string;
    direction: TechnicalAnalysis['regime']['direction'];
    confidence: number;
  };
  signal: {
    decision: SignalDecision;
    decisionLabel: string;
    setup: SignalSetup;
    setupLabel: string;
    score: number;
    scoreLabel: string;
    entryZone: TradeSignal['entryZone'];
    stopLoss: TradeSignal['stopLoss'];
    targets: TradeSignal['targets'];
  };
  calibration: {
    applicable: boolean;
    quality: BacktestCalibration['quality'];
    qualityLabel: string;
    calibratedWinRate: number | null;
    resolvedTrades: number;
    expectancyR: number | null;
    profitFactor: number | null;
    estimatedTimeToTp1: string | null;
    matchedBy: string;
  };
  forecast?: {
    overallBias: PriceForecast['overallBias'];
    overallLabel: string;
    confidence: number;
    directionProbability: number;
  };
  quality: DataQualityReport;
  providerDiagnostics?: ProviderDiagnostics;
  warning?: string;
};


export type ScannerMarketFilter = 'ALL' | MarketType;
export type ScannerScope = 'QUICK' | 'WIDE';
export type OpportunityPreset = 'TOP' | 'NEAR_ENTRY' | 'FORECAST' | 'ACCURACY' | 'RISK_REWARD' | 'NEW_BUY';
export type OpportunityGrade = 'A' | 'B' | 'C' | 'WATCH' | 'BLOCKED';

export type OpportunityScannerItem = {
  market: MarketType;
  symbol: string;
  displayName: string;
  exchange: string;
  provider: string;
  interval: Interval;
  currency: string;
  currentPrice: number;
  changePercent: number | null;
  dataAt: string;
  strategy: StrategyProfileAnalysis;
  regime: WatchlistMonitorSnapshot['regime'];
  signal: WatchlistMonitorSnapshot['signal'];
  calibration: WatchlistMonitorSnapshot['calibration'];
  quality: DataQualityReport;
  forecast: {
    overallBias: PriceForecast['overallBias'];
    overallLabel: string;
    rawConfidence: number;
    calibratedConfidence: number;
    directionProbability: number;
    horizon: ForecastHorizon;
    historicalDirectionAccuracy: number | null;
    historicalRangeHitRate: number | null;
    historicalSamples: number;
  };
  opportunity: {
    score: number;
    grade: OpportunityGrade;
    label: string;
    riskReward: number | null;
    nearEntry: boolean;
    distanceFromEntryPercent: number | null;
    components: {
      signal: number;
      forecast: number;
      historical: number;
      riskReward: number;
      dataQuality: number;
    };
    reasons: string[];
    blockers: string[];
  };
  warning?: string;
};

export type OpportunityScannerResponse = {
  generatedAt: string;
  marketFilter: ScannerMarketFilter;
  requestedProfile: StrategyProfileKey;
  scope: ScannerScope;
  universeSize: number;
  scannedCount: number;
  failedCount: number;
  durationMs: number;
  items: OpportunityScannerItem[];
  errors: Array<{ market: MarketType; symbol: string; message: string }>;
  methodology: string[];
};

export type SavedPosition = {
  market: MarketType;
  symbol: string;
  entryPrice: number;
  quantity?: number;
  interval: Interval;
  strategyProfile?: EffectiveStrategyProfile;
  savedAt: string;
};

export type PortfolioPositionSnapshot = {
  market: MarketType;
  symbol: string;
  interval: Interval;
  currency: string;
  quantity: number;
  entryPrice: number;
  strategyProfile: EffectiveStrategyProfile;
  currentPrice: number;
  costBasis: number;
  currentValue: number;
  pnlValue: number;
  pnlPercent: number;
  defensiveStop: number;
  riskFromEntryValue: number;
  downsideToStopValue: number;
  action: PositionAction;
  actionLabel: string;
  status: PositionStatus;
  statusLabel: string;
  regime: TechnicalAnalysis['regime']['key'];
  dataQualityStatus?: DataHealthStatus;
  dataQualityScore?: number;
  warning?: string;
};

export type PortfolioCurrencyBucket = {
  currency: string;
  positionCount: number;
  invested: number;
  currentValue: number;
  pnlValue: number;
  pnlPercent: number;
  riskFromEntryValue: number;
  downsideToStopValue: number;
  largestPositionWeight: number;
  largestPositionSymbol: string | null;
};

export type PortfolioRiskSnapshot = {
  generatedAt: string;
  status: 'HEALTHY' | 'WATCH' | 'HIGH_RISK';
  statusLabel: string;
  positions: PortfolioPositionSnapshot[];
  buckets: PortfolioCurrencyBucket[];
  profitablePositions: number;
  losingPositions: number;
  riskPositions: number;
  warnings: string[];
  notes: string[];
};
