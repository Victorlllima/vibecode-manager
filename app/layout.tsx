import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Configuração da fonte conforme relatório (Pesos 400, 500, 600)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "VibeCode Manager",
  description: "Gerencie seus projetos com estilo Sage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark"> {/* Força Dark Mode */}
      <body className={`${inter.variable} min-h-screen bg-background text-foreground antialiased selection:bg-white selection:text-black`}>
        {children}
      </body>
    </html>
  );
}
