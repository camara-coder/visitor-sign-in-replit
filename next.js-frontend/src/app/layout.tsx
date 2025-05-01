import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visitor Sign-In System",
  description: "A system for visitor sign-in at events",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
