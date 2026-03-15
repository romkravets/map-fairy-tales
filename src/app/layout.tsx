import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

const SITE_NAME = "Map Fairy Tales";
const SITE_DESCRIPTION =
  "Explore AI-generated fairy tales and folk stories from every corner of the world. Read, create, and share stories inspired by different cultures, countries, and legends.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "fairy tales",
    "folk stories",
    "AI stories",
    "world map",
    "mythology",
    "folklore",
    "legends",
    "cultural stories",
  ],
  authors: [{ name: SITE_NAME }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* JSON-LD: WebSite schema — helps AI crawlers and Google understand site context */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              description: SITE_DESCRIPTION,
              inLanguage: "en",
              url: process.env.NEXT_PUBLIC_SITE_URL ?? "",
            }),
          }}
        />
      </head>
      <body>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
