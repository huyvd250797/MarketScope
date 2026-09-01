import type { Candle, Interval, MarketProvider, MarketSnapshot } from './types';
import { getForexMetadata } from './symbols';

const intervalMap: Record<Interval, { interval: string; range: string }> = {
  '15m': { interval: '15m', range: '1mo' },
  '1h': { interval: '1h', range: '3mo' },
  '4h': { interval: '1h', range: '6mo' },
  '1d': { interval: '1d', range: '5y' },
  '1w': { interval: '1wk', range: '10y' },
};

type YahooResult = { meta: Record<string, any>; timestamp?: number[]; indicators?: { quote?: Array<{ open?: Array<number|null>; high?: Array<number|null>; low?: Array<number|null>; close?: Array<number|null>; volume?: Array<number|null> }> } };

async function fetchChart(providerSymbol: string, interval: string, range: string): Promise<YahooResult> {
  let lastError: unknown;
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(providerSymbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 30 }, headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; MarketScope/0.11.0)' } });
      if (!response.ok) throw new Error(`Forex provider HTTP ${response.status}`);
      const data = await response.json() as any;
      const result = data.chart?.result?.[0];
      if (!result) throw new Error(data.chart?.error?.description || `Không có dữ liệu ${providerSymbol}`);
      return result;
    } catch (e) { lastError = e; }
  }
  throw lastError instanceof Error ? lastError : new Error(`Không thể lấy dữ liệu Forex ${providerSymbol}`);
}

function parse(result: YahooResult): Candle[] {
  const ts=result.timestamp||[]; const q=result.indicators?.quote?.[0]; if(!q) return [];
  const out:Candle[]=[];
  for(let i=0;i<ts.length;i++){ const o=q.open?.[i],h=q.high?.[i],l=q.low?.[i],c=q.close?.[i]; if([o,h,l,c].some(v=>v==null||!Number.isFinite(Number(v)))) continue; out.push({time:Number(ts[i]),open:Number(o),high:Number(h),low:Number(l),close:Number(c),volume:Number(q.volume?.[i]||0)}); }
  return out;
}

function aggregate4h(candles:Candle[]):Candle[]{
  const out:Candle[]=[]; for(let i=0;i<candles.length;i+=4){ const g=candles.slice(i,i+4); if(g.length<2) continue; out.push({time:g[0].time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g[g.length-1].close,volume:g.reduce((a,b)=>a+b.volume,0)}); } return out;
}

export class YahooForexProvider implements MarketProvider {
  readonly name='Yahoo FX/Metals';
  async getSnapshot(symbol:string, interval:Interval):Promise<MarketSnapshot>{
    const meta=getForexMetadata(symbol); if(!meta) throw new Error(`Không hỗ trợ mã Forex ${symbol}. Hãy chọn mã trong danh sách gợi ý.`);
    const cfg=intervalMap[interval]; const result=await fetchChart(meta.providerSymbol || `${symbol}=X`,cfg.interval,cfg.range);
    let candles=parse(result); if(interval==='4h') candles=aggregate4h(candles); if(candles.length<2) throw new Error(`Không đủ dữ liệu nến cho ${symbol}`);
    const last=candles[candles.length-1]; const m=result.meta||{}; const prev=Number(m.previousClose ?? m.chartPreviousClose ?? candles[candles.length-2].close);
    const current=Number(m.regularMarketPrice ?? last.close); const change=Number.isFinite(prev)?current-prev:null;
    return { market:'FOREX', symbol, displayName:meta.name, exchange:meta.exchange, provider:this.name, providerSymbol:meta.providerSymbol||symbol, interval, currency: meta.symbol.slice(-3), currentPrice:current, previousClose:prev||null, change, changePercent:change!=null&&prev?(change/prev)*100:null, dayHigh:Number(m.regularMarketDayHigh)||Math.max(...candles.slice(-24).map(x=>x.high)), dayLow:Number(m.regularMarketDayLow)||Math.min(...candles.slice(-24).map(x=>x.low)), volume:null, marketState:m.marketState||'24/5', dataAt:new Date((m.regularMarketTime||last.time)*1000).toISOString(), candles };
  }
}


export async function probeForexHealth() {
  const startedAt = Date.now();
  const result = await fetchChart('EURUSD=X', '1d', '5d');
  const candles = parse(result);
  if (!candles.length) throw new Error('Forex health probe không trả OHLC');
  return { latencyMs: Math.max(0, Date.now() - startedAt), message: 'Forex/Metals provider đang phản hồi dữ liệu.' };
}
