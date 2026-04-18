import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { ClientFlowObserver } from "@/components/observability/client-flow-observer";
import { ClientObserver } from "@/components/observability/client-observer";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Velor",
  description: "Personal finance platform",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sora.variable}`}>
        <AppProviders>{children}</AppProviders>
        <ClientFlowObserver />
        <ClientObserver />
      </body>
    </html>
  );
}
