import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/toaster";

// Self-hosted (ITF Free Font License). The file is gitignored and fetched by `bun run fonts`.
const ranade = localFont({
  src: "./fonts/ranade-variable.woff2",
  variable: "--font-ranade",
  weight: "100 700",
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
    <html lang="fr" className={ranade.variable}>
      <body>
        <AuthSessionProvider>
          {children}
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
