import type { Metadata } from "next";
import { Work_Sans, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "katex/dist/katex.min.css";

const apocSans = localFont({
  src: "../fonts/ApocSans-Light.otf",
  variable: "--font-apoc-sans",
  display: "swap",
});

const apocRevelationsUltraBold = localFont({
  src: "../fonts/ApocRevelations-UltraBold.otf",
  variable: "--font-apoc-revelations-ultrabold",
  display: "swap",
});

const jolyTextRegular = localFont({
  src: "../fonts/JolyText-Regular.otf",
  variable: "--font-joly-text-regular",
  display: "swap",
});

const jolyTextMedium = localFont({
  src: "../fonts/JolyText-Medium.otf",
  variable: "--font-joly-text-medium",
  display: "swap",
});

const jolyTextBold = localFont({
  src: "../fonts/JolyText-Bold.otf",
  variable: "--font-joly-text-bold",
  display: "swap",
});

const jolyDisplayRegular = localFont({
  src: "../fonts/JolyDisplay-Regular.otf",
  variable: "--font-joly-display-regular",
  display: "swap",
});

const jolyDisplayMedium = localFont({
  src: "../fonts/JolyDisplay-Medium.otf",
  variable: "--font-joly-display-medium",
  display: "swap",
});

const jolyDisplayBold = localFont({
  src: "../fonts/JolyDisplay-Bold.otf",
  variable: "--font-joly-display-bold",
  display: "swap",
});



const surtRegular = localFont({
  src: "../fonts/Surt-Normal-Regular.otf",
  variable: "--font-surt-regular",
  display: "swap",
});

const surtMedium = localFont({
  src: "../fonts/Surt-Normal-Medium.otf",
  variable: "--font-surt-medium",
  display: "swap",
});

const surtBold = localFont({
  src: "../fonts/Surt-Normal-Bold.otf",
  variable: "--font-surt-bold",
  display: "swap",
});

const surtSemibold = localFont({
  src: "../fonts/Surt-Normal-Semibold.otf",
  variable: "--font-surt-semibold",
  display: "swap",
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${workSans.variable} ${geistMono.variable} ${apocSans.variable} ${apocRevelationsUltraBold.variable} ${jolyTextRegular.variable} ${jolyTextMedium.variable} ${jolyTextBold.variable} ${jolyDisplayRegular.variable} ${jolyDisplayMedium.variable} ${jolyDisplayBold.variable} ${surtRegular.variable} ${surtMedium.variable} ${surtBold.variable} ${surtSemibold.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
