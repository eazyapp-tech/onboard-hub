import "@/styles/globals.css";
import React from "react";
import { type Metadata } from "next";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export const metadata: Metadata = {
  title: "RentOk Onboarding Hub",
  description: "Manage client onboarding sessions",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="bg-background text-foreground antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}