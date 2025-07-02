import type { Metadata } from "next";
import { Work_Sans, Geist_Mono, DM_Sans } from "next/font/google";
import { Eczar } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const eczar = Eczar({
  subsets: ["latin"],
  variable: "--font-eczar",
});

export const metadata: Metadata = {
  title: "Temenos",
  description: "A secure, encrypted environment for deep psychological work and narrative exploration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${workSans.variable} ${geistMono.variable} ${dmSans.variable} ${eczar.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
