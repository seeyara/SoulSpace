import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";
import BottomNav from '@/components/BottomNav';
import Script from 'next/script';

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
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-MXM4FW8P');
          `}
        </Script>
      </head>
      <body className="font-harmonia">
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-MXM4FW8P"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <main className="pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
