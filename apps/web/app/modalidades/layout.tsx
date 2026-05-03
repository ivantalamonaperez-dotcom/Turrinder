import BottomNav from "@/components/ui/BottomNav";

export default function Layout({ children }: { children: React.ReactNode }) {
  // BottomNav is now a side panel — it renders a toggle + slide-out drawer,
  // no bottom bar, so no spacer div needed and children take full viewport height.
  return (
    <>
      <BottomNav />
      <main
        id="main-content"
        style={{
          marginLeft: "64px", // fijo — el nav se superpone al abrirse (overlay)
          minHeight: "100vh",
        }}
      >
      {children}
      </main>
    </>
  );
}