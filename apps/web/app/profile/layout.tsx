import BottomNav from "@/components/ui/BottomNav";

export default function Layout({ children }: { children: React.ReactNode }) {
 return <><BottomNav /><main
         id="main-content"
         style={{
           marginLeft: "64px", // fijo — el nav se superpone al abrirse (overlay)
           minHeight: "100vh",
         }}
       >
       {children}
       </main></>;
 }