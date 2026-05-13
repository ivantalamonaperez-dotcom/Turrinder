import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Turrinder Video Chat — Random Cam, Dating & Live Debates Platform 2026",
    template: "%s | Turrinder",
  },
  description:
    "Turrinder es la alternativa a Omegle, OmeTV y Chatroulette en español. Conocé personas reales, debatí ideas, encontrá tu ligue y chateá en vivo con streamers y gente de todo el mundo.",
  keywords: [
    "turrinder",
    "chat con desconocidos",
    "omegle alternativa",
    "ometv alternativa",
    "chatroulette alternativa",
    "chat en vivo",
    "debates online",
    "ligues",
    "conocer personas",
    "streamers",
    "videochat aleatorio",
    "chat random",
    "hablar con desconocidos",
    "chat español",
    "omegle español",
    "ometv español",
  ],

  openGraph: {
    title: "Turrinder — Debates, Ligues y Chat en Vivo",
    description:
      "La alternativa a Omegle y OmeTV en español. Debates, ligues, modalidades y chat en vivo con personas reales de todo el mundo.",
    url: "https://www.turrinder.com",
    siteName: "Turrinder",
    images: [
      {
        url: "https://www.turrinder.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Turrinder — Chat, Debates y Ligues",
      },
    ],
    locale: "es_AR",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Turrinder — Debates, Ligues y Chat en Vivo",
    description:
      "La alternativa a Omegle y OmeTV en español. Debates, ligues y chat aleatorio con personas reales.",
    images: ["https://www.turrinder.com/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  alternates: {
    canonical: "https://www.turrinder.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Favicon desde Images/logo.png */}
        <link rel="icon" href="../Images/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="../Images/logo.png" />

        {/* Monetag */}
        <meta name="monetag" content="c6d46c91cf1717e2d3fce1ccb12559a8" />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9125937573344053"
          crossOrigin="anonymous"
        />
      </head>
      <body
        style={{ margin: 0, background: "#080810" }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}