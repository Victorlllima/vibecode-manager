import type { Metadata } from "next"
import { SessionProviderWrapper } from "@/components/session-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "RVM — RedPro Vibecoding Manager",
  description: "Gestão centralizada de projetos de vibecoding",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
