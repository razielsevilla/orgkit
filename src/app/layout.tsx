import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrgKit - Student Organization Management System",
  description:
    "Organize. Collaborate. Lead. A modern platform for student organizations to connect, manage, and grow together.",
  icons: {
    icon: "/orgkit-logo.png",
  },
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
