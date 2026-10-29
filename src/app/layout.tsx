import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// D33: Poppins. next/font downloads it at build time and serves it from our domain (SIL OFL).
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EduPlan",
  description: "La plateforme de l'enseignement et de l'apprentissage de l'école.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={poppins.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
