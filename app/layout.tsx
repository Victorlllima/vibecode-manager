import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Importando Inter
import "./globals.css";

// Configurando a fonte
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VibeCode Manager",
  description: "Gerencie seus projetos de vibecoding com estilo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark"> {/* Forçando Dark Mode */}
      <body className={`${inter.className} min-h-screen bg-[#09090b] text-white antialiased selection:bg-[#FF4D5A] selection:text-white`}>
        {/* Background Radial Fixo via Tailwind direto */}
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#cd0b2f]/20 via-[#09090b]/40 to-[#09090b]" />

        {children}
      </body>
    </html>
  );
}
