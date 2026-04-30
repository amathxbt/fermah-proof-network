import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, FilePlus2, Search, BookOpen, ShieldCheck } from "lucide-react";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/submit", label: "Submit Proof", icon: FilePlus2 },
    { href: "/proofs", label: "Explorer", icon: Search },
    { href: "/docs", label: "Documentation", icon: BookOpen },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground font-mono">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight">FERMAH</span>
          </Link>
          <div className="text-xs text-muted-foreground mt-1">Proof Network</div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Network Status: Operational
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-border bg-card flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-bold">FERMAH</span>
          </Link>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted-foreground">
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
          </nav>
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
