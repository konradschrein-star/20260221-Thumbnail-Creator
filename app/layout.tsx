import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thumbnail Creator V2",
  description: "YouTube thumbnail generation engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
