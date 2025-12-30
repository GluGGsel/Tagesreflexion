import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tagesreflexion",
  description: "Tagesreflexion",
  // WICHTIG: kein globales manifest hier, damit /mann und /frau jeweils ihr eigenes setzen können
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "Tagesreflexion",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        {/* iOS / A2HS Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Tagesreflexion" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* absolute icon paths */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
