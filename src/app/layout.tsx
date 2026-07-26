import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenICM — Open-source Incentive Compensation Management",
  description:
    "Calculate, audit, and pay out commissions with an open-source, self-hostable ICM engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
