'use client';

import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, TechnicalAnalysis } from '@/lib/market/types';

export type ChartOverlays = {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  vwap: boolean;
};

type Props = {
  candles: Candle[];
  analysis?: TechnicalAnalysis;
  overlays: ChartOverlays;
  dark: boolean;
  currency: string;
};

export default function MarketChart({ candles, analysis, overlays, dark, currency }: Props) {
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

    const addLine = (enabled: boolean, data: TechnicalAnalysis['series']['ema20'] | undefined, color: string, width = 2) => {
      if (!enabled || !data?.length) return;
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: width as 1 | 2 | 3 | 4,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData(data.map((point) => ({ time: point.time as UTCTimestamp, value: point.value })));
    };

    addLine(overlays.ema20, analysis?.series.ema20, '#21a67a', 2);
    addLine(overlays.ema50, analysis?.series.ema50, '#e1a52b', 2);
    addLine(overlays.ema200, analysis?.series.ema200, '#8c6de8', 2);
    addLine(overlays.vwap, analysis?.series.vwap, '#2f8de4', 1);

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
  }, [candles, analysis, overlays, dark, currency]);

  return <div ref={containerRef} className="chart-canvas" aria-label="Biểu đồ nến với EMA và VWAP" />;
}

function formatCompactPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '-';
  if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
  const digits = value >= 1000 ? 2 : value >= 1 ? 4 : 8;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}
