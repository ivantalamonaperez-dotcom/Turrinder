import BottomNav from "@/components/ui/BottomNav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<BottomNav /></>;
}