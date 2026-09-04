import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Hart";
const description =
  "A from-scratch RV32I RISC-V CPU core in Verilog, verified against 42 real official riscv-tests conformance tests, cross-validated against an independent TypeScript model, and visualized live in your browser.";
const url = "https://hart-drab.vercel.app";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(url),
  openGraph: { title, description, url, siteName: title, type: "website" },
  twitter: { card: "summary", title, description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
