import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";
import BottomNav from '@/components/BottomNav';

const harmoniaSans = localFont({
  src: '../assets/fonts/HarmoniaSans.woff2',
  variable: '--font-harmonia-sans',
  display: 'swap',
  preload: true,
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
      <body className="font-harmonia">
        <main className="pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
