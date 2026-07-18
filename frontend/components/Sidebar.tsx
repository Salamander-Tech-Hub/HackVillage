import {
  CalendarDays,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Hackers", icon: User },
  { label: "Judging", icon: ShieldCheck },
  { label: "Schedule", icon: CalendarDays },
  { label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden h-full w-[300px] shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 lg:flex">
      <div className="flex h-full flex-col justify-between px-6 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-soft">
              <CalendarDays className="h-6 w-6" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Global Hack 2024</p>
            <h1 className="text-2xl font-semibold text-white">ADMIN CONSOLE</h1>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-current={item.active ? "page" : undefined}
                  className={`menu-item flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    item.active
                      ? "bg-sky-500/15 text-sky-200 shadow-sm ring-1 ring-sky-500/20"
                      : "text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4">
          <button className="flex w-full items-center justify-between rounded-3xl bg-sky-600 px-4 py-4 text-sm font-semibold text-white shadow-soft transition hover:bg-sky-700">
            <span>New Announcement</span>
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <span>Support</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
