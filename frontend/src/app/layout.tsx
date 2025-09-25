import "@/styles/globals.css";
import React from "react";
import { type Metadata } from "next";
import { DevtoolsProvider } from 'creatr-devtools';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};
export const metadata: Metadata = {
  title: {
    default: "Onboarding Hub",
    template: "%s | Onboarding Hub"
  },
  description: "Sales Slot Booking + Onboarding Dashboard for Client Integration",
  applicationName: "Onboarding Hub",
  keywords: ["onboarding", "booking", "sales", "client integration", "scheduling"],
  authors: [{
    name: "EazyApp Team"
  }],
  creator: "EazyApp Team",
  publisher: "EazyApp Team",
  icons: {
    icon: [{
      url: "/favicon-16x16.png",
      sizes: "16x16",
      type: "image/png"
    }, {
      url: "/favicon-32x32.png",
      sizes: "32x32",
      type: "image/png"
    }, {
      url: "/favicon.ico",
      sizes: "48x48",
      type: "image/x-icon"
    }],
    apple: [{
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png"
    }]
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Onboarding Hub"
  },
  formatDetection: {
    telephone: false
  }
};
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <html suppressHydrationWarning lang="en" data-unique-id="ad8ff0b4-68ea-4328-9560-d299833c2ca7" data-file-name="app/layout.tsx">
      <body className="bg-background text-foreground antialiased" data-unique-id="b157c3ee-3f35-4a3b-a2da-e81ab7dcc4f8" data-file-name="app/layout.tsx">
        <SessionProvider>
          <ThemeProvider attribute='class'>
            <DevtoolsProvider hideBranding={true}>
              {children}
            </DevtoolsProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>;
}