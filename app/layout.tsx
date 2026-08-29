import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketScope V0.8.0',
  description: 'Mobile-first Crypto Spot and Vietnam Stock analysis with Data Quality Guard, Observability, Portfolio Risk, Entry/SL/TP, Watchlist and Backtest Calibration.',
  manifest: '/manifest.webmanifest',
  applicationName: 'MarketScope',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MarketScope',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#071018' },
  ],
};

const themeScript = `
(() => {
  try {
    const pref = localStorage.getItem('marketscope-theme') || 'auto';
    const resolved = pref === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = pref;
  } catch (_) {}
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
