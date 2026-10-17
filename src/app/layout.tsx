import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
import { Inter, Oswald, Playfair_Display, Source_Serif_4, UnifrakturMaguntia } from "next/font/google";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });
const display = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-display" });
const condensed = Oswald({ subsets: ["latin"], variable: "--font-condensed" });
const blackletter = UnifrakturMaguntia({ subsets: ["latin"], weight: "400", variable: "--font-blackletter" });

export const metadata: Metadata = {
  title: "The Morning Paper",
  description: "Your personal daily newspaper.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
        <html lang="en" className={`${sans.variable} ${serif.variable} ${display.variable} ${condensed.variable} ${blackletter.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}