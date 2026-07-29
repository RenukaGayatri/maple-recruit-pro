import { Link } from "@tanstack/react-router";

export function BrandHeader({ showAdmin = false }: { showAdmin?: boolean }) {
  return (
    <header className="relative z-10 border-b border-border/40 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground shadow-lg transition-transform group-hover:scale-105">
            <span className="font-display text-lg font-extrabold text-[color:var(--accent-green)]">M</span>
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-[15px] font-bold text-brand">Maple Learning Solutions</span>
            <span className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Recruitment Portal
            </span>
          </div>
        </Link>
        {showAdmin && (
          <Link to="/admin" className="text-xs font-medium text-muted-foreground hover:text-brand transition">
            Admin
          </Link>
        )}
      </div>
    </header>
  );
}

export function BrandFooter() {
  return (
    <footer className="border-t border-border/40 bg-white/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Maple Learning Solutions · Confidential Recruitment Portal
      </div>
    </footer>
  );
}
