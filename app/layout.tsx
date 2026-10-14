import type { Metadata } from "next"
import { Header } from "./components/common/header"
import { Menu } from "./components/common/menu"
import { PreLoader } from "./components/common/pre-loader"
import "./globals.css"
import { Footer } from "./components/common/footer"

export const metadata: Metadata = {
  title: "Mingdao Gong | Personal Website",
  description: "The personal website of Mingdao Gong.",
  icons: { icon: "/icon.svg" }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <Header />
        <Menu />
        <PreLoader />
        {children}
        <Footer />
      </body>
    </html>
  )
}
