import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";
import BottomNav from '@/components/BottomNav';
import GlobalAccessModal from '@/components/GlobalAccessModal';
import Script from 'next/script';
import Analytics from '@/components/Analytics';
import { GA_TRACKING_ID } from '@/lib/utils/gtag';

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
        {GA_TRACKING_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_TRACKING_ID}');
              `}
            </Script>
          </>
        )}
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
