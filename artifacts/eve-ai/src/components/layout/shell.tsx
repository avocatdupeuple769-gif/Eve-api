import { Sidebar } from "./sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-20 mix-blend-screen">
        <div className="h-[800px] w-[800px] rounded-full bg-gradient-radial from-primary/10 via-primary/5 to-transparent blur-[100px]" />
      </div>
      
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
