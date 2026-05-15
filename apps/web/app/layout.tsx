import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Turrinder — Debates, Ligues y Chat en Vivo",
    template: "%s | Turrinder",
  },
  description:
    "Turrinder es la alternativa a Omegle, OmeTV y Chatroulette en español. Conocé personas reales, debatí ideas, encontrá tu ligue y chateá en vivo con streamers y gente de todo el mundo.",
  keywords: [
    // Competencia directa
    "omegle alternativa", "ometv alternativa", "chatroulette alternativa",
    "omegle en español", "ometv en español", "alternativa omegle 2025",
    "sitios como omegle", "paginas como omegle", "omegle no funciona",
    // Citas y conocer gente  
    "pagina de citas", "app de citas", "conocer personas online",
    "chat con desconocidos", "hablar con desconocidos",
    "conocer gente por video", "ligar por internet",
    "encontrar pareja online", "chat para ligar",
    // Videochat
    "videochat aleatorio", "chat de video gratis",
    "videollamada con desconocidos", "random video chat",
    "chat por camara", "video chat en vivo",
    // Por país
    "omegle argentina", "ometv argentina", "chat argentina",
    "omegle mexico", "chat mexico", "conocer gente argentina",
    // Plataforma
    "turrinder", "debates online", "chat en vivo gratis",
    "streamers en vivo", "chat con camara",
  ],

  // ✅ Favicon via metadata API (Next.js lo inyecta automáticamente)
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },

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
        {/* Monetag */}
        <meta name="monetag" content="c6d46c91cf1717e2d3fce1ccb12559a8" />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9125937573344053"
          crossOrigin="anonymous"
        />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Turrinder",
              "url": "https://www.turrinder.com",
              "description": "Plataforma de videochat aleatorio y citas online en español. Alternativa a Omegle y OmeTV.",
              "applicationCategory": "SocialNetworkingApplication",
              "operatingSystem": "Web",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
              "inLanguage": "es",
              "audience": { "@type": "Audience", "audienceType": "Adults" },
            })
          }}
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