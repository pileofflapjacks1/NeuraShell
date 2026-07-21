import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Shell" },
  { href: "/demo", label: "Demo" },
  { href: "/settings", label: "Settings" },
  { href: "/a11y", label: "A11y" },
];

export function ShellNav({ active }: { active?: string }) {
  return (
    <header className="border-b border-shell-border bg-shell-panel/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <Link href="/" className="group flex items-center gap-2 no-underline">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 text-sm font-bold text-cyan-300 ring-1 ring-cyan-500/40"
            aria-hidden
          >
            NS
          </span>
          <span className="text-lg font-bold tracking-tight text-shell-fg">
            Neura<span className="text-cyan-300">Shell</span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors min-h-10 inline-flex items-center",
                active === l.href
                  ? "bg-cyan-500/15 text-cyan-100"
                  : "text-shell-muted hover:bg-shell-bg hover:text-shell-fg"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
