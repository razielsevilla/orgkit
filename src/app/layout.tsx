import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrgKit",
  description:
    "Organize. Collaborate. Lead. A modern platform for student organizations to connect, manage, and grow together.",
  // The tab and home-screen icons come from icon.png and apple-icon.png in this
  // folder: small versions of the logo, so browsers don't download the 1.1 MB original.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-base text-ink">
        {children}
      </body>
    </html>
  );
}
