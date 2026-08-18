import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HackVillage",
    template: "%s · HackVillage",
  },
  description:
    "Trust-as-a-Service for developers. Innovation-as-a-Service for organizations. Open-source infrastructure for high-impact tech events.",
  applicationName: "HackVillage",
  icons: {
    icon: "/images/hackvillage-logo-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HackVillage",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#00041a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
