import { Link, useLocation } from "wouter";
import { MessageSquare, History, Settings } from "lucide-react";
import { EveMask } from "../chat/eve-mask";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: MessageSquare, label: "Chat" },
    { href: "/history", icon: History, label: "History" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleNewChat = () => {
    sessionStorage.removeItem("eve-active-conv");
    if (location === "/") {
      window.location.reload();
    }
  };

  return (
    <aside className="flex h-full w-20 flex-col items-center justify-between border-r border-border bg-card py-8" data-testid="sidebar">
      <Link href="/" className="group flex flex-col items-center gap-2">
        <div className="h-12 w-12 rounded-full overflow-hidden border border-primary/20 transition-all group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(200,160,80,0.3)]">
          <img src="/logo.png" alt="EVE Logo" className="h-full w-full object-cover" />
        </div>
      </Link>

      <nav className="flex flex-col gap-6 w-full px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl p-3 transition-colors ${
                isActive
                  ? "text-primary bg-primary/10 shadow-[inset_0_0_10px_rgba(200,160,80,0.1)] border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
              data-testid={`nav-link-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="h-12 w-12" /> {/* Spacer */}
    </aside>
  );
}
