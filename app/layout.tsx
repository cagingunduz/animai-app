import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const geist = Inter({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'AnimAI — Create Animations',
  description: 'AI-powered prompt-to-cartoon-animation platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-geist">{children}</body>
    </html>
  );
}
