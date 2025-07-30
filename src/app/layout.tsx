import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";
import BottomNav from '@/components/BottomNav';
import GlobalAccessModal from '@/components/GlobalAccessModal';
import Script from 'next/script';
import Analytics from '@/components/Analytics';

const harmoniaSans = localFont({
  src: '../../public/assets/fonts/HarmoniaSans.woff2',
  variable: '--font-harmonia-sans',
});

export const metadata: Metadata = {
  title: "Journal with Your Cuddle | Soul",
  description: "A cozy space to reflect, breathe, and grow—one entry at a time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={harmoniaSans.variable}>
      <head>
        <link rel="icon" type="image/png" href="/assets/bookmark.png" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZN7E2WZ42B"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZN7E2WZ42B');
          `}
        </Script>
      </head>
      <body className="font-harmonia">
        <Analytics />
        <GlobalAccessModal />
        <main className="pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
