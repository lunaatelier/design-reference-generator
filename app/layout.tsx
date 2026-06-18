import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Reference Generator",
  description: "Generate design reference plans from planning documents",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
