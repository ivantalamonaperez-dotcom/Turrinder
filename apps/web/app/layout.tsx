import "../styles/globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="monetag" content="c6d46c91cf1717e2d3fce1ccb12559a8" />
      </head>
      <body style={{ margin: 0, background: "#080810" }}>
        {children}
      </body>
    </html>
  );
}