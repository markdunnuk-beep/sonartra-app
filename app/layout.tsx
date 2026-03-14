import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonartra | Performance Intelligence Platform",
  description:
    "Sonartra maps behavioural signals, leadership dynamics, and organisational patterns to build higher-performing teams.",
  icons: {
    icon: "/assets/Sonartra_S_Mark.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
