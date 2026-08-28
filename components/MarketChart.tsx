'use client';

import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@/lib/market/types';

type Props = {
  candles: Candle[];
  dark: boolean;
  currency: string;
};

export default function MarketChart({ candles, dark, currency }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return;

    const background = dark ? '#0b1722' : '#ffffff';
    const text = dark ? '#9eb0bf' : '#5d6875';
    const grid = dark ? '#162634' : '#edf1f5';

    const chart = createChart(container, {
      width: container.clientWidth,
      height: Math.max(330, Math.min(520, window.innerHeight * 0.5)),
      layout: {
        background: { type: ColorType.Solid, color: background },
        textColor: text,
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      rightPriceScale: { borderColor: grid, scaleMargins: { top: 0.08, bottom: 0.25 } },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: {
        vertLine: { color: dark ? '#5b7182' : '#8c98a3', width: 1, labelBackgroundColor: dark ? '#24384a' : '#384b5a' },
        horzLine: { color: dark ? '#5b7182' : '#8c98a3', width: 1, labelBackgroundColor: dark ? '#24384a' : '#384b5a' },
      },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      localization: {
        priceFormatter: (price: number) => formatCompactPrice(price, currency),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#1db989',
      downColor: '#ef5b67',
      borderVisible: false,
      wickUpColor: '#1db989',
      wickDownColor: '#ef5b67',
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    candleSeries.setData(candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })));

    volumeSeries.setData(candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(29,185,137,0.34)' : 'rgba(239,91,103,0.34)',
    })));

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles, dark, currency]);

  return <div ref={containerRef} className="chart-canvas" aria-label="Biểu đồ nến" />;
}

function formatCompactPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '-';
  if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
  const digits = value >= 1000 ? 2 : value >= 1 ? 4 : 8;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}
