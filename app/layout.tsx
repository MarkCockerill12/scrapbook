import type { Metadata, Viewport } from "next";
import { ChromeRoot } from "@/chrome/ChromeRoot";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScrapBook",
  description:
    "An ultimate collage of aesthetics. Every channel is a different decade, a different design language, and a different set of things to play with.",
};

export const viewport: Viewport = {
  // Pages are a fixed canvas scaled to fit, so pinch-zoom fights the layout rather
  // than helping it. themeColor keeps mobile browser chrome from breaking letterboxing.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        {children}
        <ChromeRoot />
      </body>
    </html>
  );
}
