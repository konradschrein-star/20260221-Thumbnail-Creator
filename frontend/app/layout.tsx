import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Thumbnail Rendering Farm",
  description: "Enterprise AI-powered YouTube thumbnail generation system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
