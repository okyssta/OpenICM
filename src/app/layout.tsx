import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenICM — Open-source Incentive Compensation Management",
  description:
    "Calculate, audit, and pay out commissions with an open-source, self-hostable ICM engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
