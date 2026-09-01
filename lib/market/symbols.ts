import type { MarketType, SymbolItem } from './types';

export const cryptoSymbols: SymbolItem[] = [
  ['BTCUSDT', 'Bitcoin / Tether', 'Binance'],
  ['ETHUSDT', 'Ethereum / Tether', 'Binance'],
  ['BNBUSDT', 'BNB / Tether', 'Binance'],
  ['SOLUSDT', 'Solana / Tether', 'Binance'],
  ['XRPUSDT', 'XRP / Tether', 'Binance'],
  ['ADAUSDT', 'Cardano / Tether', 'Binance'],
  ['DOGEUSDT', 'Dogecoin / Tether', 'Binance'],
  ['AVAXUSDT', 'Avalanche / Tether', 'Binance'],
  ['LINKUSDT', 'Chainlink / Tether', 'Binance'],
  ['DOTUSDT', 'Polkadot / Tether', 'Binance'],
  ['TONUSDT', 'Toncoin / Tether', 'Binance'],
  ['SUIUSDT', 'Sui / Tether', 'Binance'],
  ['TRXUSDT', 'TRON / Tether', 'Binance'],
  ['LTCUSDT', 'Litecoin / Tether', 'Binance'],
  ['BCHUSDT', 'Bitcoin Cash / Tether', 'Binance'],
  ['NEARUSDT', 'NEAR / Tether', 'Binance'],
  ['APTUSDT', 'Aptos / Tether', 'Binance'],
  ['ARBUSDT', 'Arbitrum / Tether', 'Binance'],
  ['OPUSDT', 'Optimism / Tether', 'Binance'],
  ['PEPEUSDT', 'Pepe / Tether', 'Binance'],
].map(([symbol, name, exchange]) => ({
  symbol,
  name,
  exchange,
  market: 'CRYPTO' as const,
}));

export const stockSymbols: SymbolItem[] = [
  ['FPT', 'CTCP FPT', 'HOSE'],
  ['VNM', 'Vinamilk', 'HOSE'],
  ['VCB', 'Vietcombank', 'HOSE'],
  ['CTG', 'VietinBank', 'HOSE'],
  ['BID', 'BIDV', 'HOSE'],
  ['TCB', 'Techcombank', 'HOSE'],
  ['MBB', 'MB Bank', 'HOSE'],
  ['ACB', 'ACB', 'HOSE'],
  ['VPB', 'VPBank', 'HOSE'],
  ['HPG', 'Hòa Phát', 'HOSE'],
  ['VIC', 'Vingroup', 'HOSE'],
  ['VHM', 'Vinhomes', 'HOSE'],
  ['MSN', 'Masan Group', 'HOSE'],
  ['MWG', 'Thế Giới Di Động', 'HOSE'],
  ['PNJ', 'Vàng bạc Đá quý Phú Nhuận', 'HOSE'],
  ['SSI', 'Chứng khoán SSI', 'HOSE'],
  ['VND', 'Chứng khoán VNDirect', 'HOSE'],
  ['HCM', 'Chứng khoán TP.HCM', 'HOSE'],
  ['GAS', 'PV GAS', 'HOSE'],
  ['PLX', 'Petrolimex', 'HOSE'],
  ['DGC', 'Hóa chất Đức Giang', 'HOSE'],
  ['GVR', 'Tập đoàn Cao su Việt Nam', 'HOSE'],
  ['SHB', 'SHB', 'HOSE'],
  ['SHS', 'Chứng khoán Sài Gòn - Hà Nội', 'HNX'],
  ['PVS', 'Dịch vụ Kỹ thuật Dầu khí', 'HNX'],
  ['CEO', 'CEO Group', 'HNX'],
].map(([symbol, name, exchange]) => ({
  symbol,
  name,
  exchange,
  market: 'STOCK' as const,
}));


export const forexSymbols: SymbolItem[] = [
  ['EURUSD','Euro / US Dollar','FOREX','EURUSD=X'],
  ['GBPUSD','British Pound / US Dollar','FOREX','GBPUSD=X'],
  ['USDJPY','US Dollar / Japanese Yen','FOREX','JPY=X'],
  ['USDCHF','US Dollar / Swiss Franc','FOREX','CHF=X'],
  ['AUDUSD','Australian Dollar / US Dollar','FOREX','AUDUSD=X'],
  ['NZDUSD','New Zealand Dollar / US Dollar','FOREX','NZDUSD=X'],
  ['USDCAD','US Dollar / Canadian Dollar','FOREX','CAD=X'],
  ['EURJPY','Euro / Japanese Yen','FOREX','EURJPY=X'],
  ['EURGBP','Euro / British Pound','FOREX','EURGBP=X'],
  ['GBPJPY','British Pound / Japanese Yen','FOREX','GBPJPY=X'],
  ['AUDJPY','Australian Dollar / Japanese Yen','FOREX','AUDJPY=X'],
  ['XAUUSD','Gold / US Dollar','METALS','GC=F'],
  ['XAGUSD','Silver / US Dollar','METALS','SI=F'],
].map(([symbol,name,exchange,providerSymbol]) => ({ symbol, name, exchange, providerSymbol, market:'FOREX' as const }));

export function normalizeInputSymbol(market: MarketType, input: string): string {
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
  if (!clean) return '';
  if (market === 'CRYPTO') {
    if (clean.endsWith('USDT') || clean.endsWith('USDC') || clean.endsWith('BTC')) return clean;
    return `${clean}USDT`;
  }
  if (market === 'FOREX') return clean.replace(/=X$/i, '');
  return clean.replace(/\.(VN|HN)$/i, '');
}

export function searchLocalSymbols(market: MarketType, query: string, limit = 8): SymbolItem[] {
  const q = query.trim().toUpperCase();
  const source = market === 'CRYPTO' ? cryptoSymbols : market === 'FOREX' ? forexSymbols : stockSymbols;
  if (!q) return source.slice(0, limit);

  return source
    .filter((item) => item.symbol.includes(q) || item.name.toUpperCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.symbol.startsWith(q) ? 0 : 1;
      const bStarts = b.symbol.startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.symbol.localeCompare(b.symbol);
    })
    .slice(0, limit);
}

export function getStockMetadata(symbol: string): SymbolItem | undefined {
  return stockSymbols.find((item) => item.symbol === symbol.toUpperCase());
}

export function getForexMetadata(symbol: string): SymbolItem | undefined {
  return forexSymbols.find((item) => item.symbol === symbol.toUpperCase());
}
