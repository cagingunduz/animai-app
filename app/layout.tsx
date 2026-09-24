import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import MobilePage from './mobile/page';

const geist = Inter({ subsets: ['latin'], variable: '--font-geist' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Animave — Create Animations',
  description: 'AI-powered prompt-to-cartoon-animation platform',
};

function isMobileUA(ua: string) {
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) &&
    !/iPad/i.test(ua);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const ua = headersList.get('user-agent') ?? '';
  const mobile = isMobileUA(ua);

  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body className="font-geist bg-black text-white">
        {mobile ? <MobilePage /> : children}
      </body>
    </html>
  );
}
