import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tagesreflexion – Frau",
  manifest: "/manifest-frau.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Tagesreflexion – Frau",
    statusBarStyle: "default"
  }
};

export default function FrauLayout({ children }: { children: React.ReactNode }) {
  return children;
}
