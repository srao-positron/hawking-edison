import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';
import "./globals.css";
import { theme } from './theme';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hawking Edison",
  description: "LLM-Orchestrated Multi-Agent Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body className={inter.className}>
        <MantineProvider theme={theme}>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}