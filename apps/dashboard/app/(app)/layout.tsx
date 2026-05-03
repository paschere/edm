import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 overflow-auto min-h-screen" style={{ background: "var(--background)" }}>{children}</main>
    </div>
  );
}
