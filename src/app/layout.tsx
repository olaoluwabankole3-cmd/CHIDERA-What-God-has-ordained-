import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academic AI — Your University Learning Companion",
  description: "Personalized AI tutoring, course materials, exam preparation and academic progress tracking for university students.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
