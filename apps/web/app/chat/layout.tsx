import BottomNav from "@/components/ui/BottomNav";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <head>
        {/* MONETAG */}
        <meta
          name="monetag"
          content="c6d46c91cf1717e2d3fce1ccb12559a8"
        />

        {/* GOOGLE ADSENSE */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9125937573344053"
          crossOrigin="anonymous"
        ></script>
      </head>

      <BottomNav />

      <main
        id="main-content"
        style={{
          marginLeft: "64px",
          minHeight: "100vh",
        }}
      >
        {children}
      </main>
    </>
  );
}