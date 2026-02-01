import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TXray | MEV Transaction Analyzer",
  description: "Advanced Ethereum Transaction & MEV Analysis Agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(112,0,255,0.1),_transparent)] pointer-events-none" />
          <div className="relative z-10">{children}</div>
          <Toaster richColors position="top-right" theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
