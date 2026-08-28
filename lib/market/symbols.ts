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

export function normalizeInputSymbol(market: MarketType, input: string): string {
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
  if (!clean) return '';
  if (market === 'CRYPTO') {
    if (clean.endsWith('USDT') || clean.endsWith('USDC') || clean.endsWith('BTC')) return clean;
    return `${clean}USDT`;
  }
  return clean.replace(/\.(VN|HN)$/i, '');
}

export function searchLocalSymbols(market: MarketType, query: string, limit = 8): SymbolItem[] {
  const q = query.trim().toUpperCase();
  const source = market === 'CRYPTO' ? cryptoSymbols : stockSymbols;
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
