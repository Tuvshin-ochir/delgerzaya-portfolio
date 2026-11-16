import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted (latin, variable weight) so the build never has to reach Google Fonts.
const display = localFont({ src: './fonts/unbounded-latin.woff2', weight: '200 900', variable: '--font-display', display: 'swap' });
const body = localFont({ src: './fonts/manrope-latin.woff2', weight: '200 800', variable: '--font-body', display: 'swap' });
const mono = localFont({ src: './fonts/jetbrains-mono-latin.woff2', weight: '100 800', variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = { title: 'Portfolio', robots: { index: true, follow: true } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#020806' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
