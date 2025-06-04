import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";
import BottomNav from '@/components/BottomNav';

const harmoniaSans = localFont({
  src: [
    {
      path: '../../public/assets/fonts/HarmoniaSans.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/assets/fonts/HarmoniaSans.woff2',
      weight: '600',
      style: 'normal',
    }
  ],
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
      <body className="font-harmonia">
        <main className="pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
