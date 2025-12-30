import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tagesreflexion – Mann",
  manifest: "/manifest-mann.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Tagesreflexion – Mann",
    statusBarStyle: "default"
  }
};

export default function MannLayout({ children }: { children: React.ReactNode }) {
  return children;
}
