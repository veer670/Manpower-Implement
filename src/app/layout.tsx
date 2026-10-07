import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Manpower Implementation Dashboard",
  description:
    "Daily contractor manpower against commitment: enter today's figures against a pre-filled roster, and read fill rate by contractor type and contractor.",
};

/**
 * Stamps the saved theme on <html> before first paint, so the page never
 * flashes the wrong surface. It has to run ahead of hydration, hence
 * beforeInteractive rather than an inline tag in <head> — React 19 treats a
 * raw <script> element as part of the component tree and will not execute it
 * on the client.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('manpower.theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <Script id="theme-stamp" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
