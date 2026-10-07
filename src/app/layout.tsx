import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Manpower Implementation Dashboard",
  description:
    "Daily contractor manpower against commitment: enter today's figures against a pre-filled roster, and read fill rate by contractor type and contractor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Stamp the saved theme before first paint so there is no flash of
            the wrong surface. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('manpower.theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
