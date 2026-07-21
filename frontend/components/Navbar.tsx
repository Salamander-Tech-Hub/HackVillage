import { useState } from "react";

const navItems = [
  { label: "Dashboard", active: true },
  { label: "Hackers", active: false },
  { label: "Judging", active: false },
  { label: "Schedule", active: false },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white px-6 shadow-sm backdrop-blur-lg sm:px-10 lg:px-12">
      <div className="mx-auto flex h-[80px] max-w-[1440px] items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden h-12 w-12 items-center justify-center rounded-3xl bg-slate-950 text-white lg:flex">
            <span className="text-lg font-semibold">GH</span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Global Hack</p>
            <p className="text-sm font-semibold text-slate-900">Admin console</p>
          </div>
        </div>

        <nav className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-8 text-sm font-semibold text-slate-600">
            {navItems.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  aria-current={item.active ? "page" : undefined}
                  className={`transition ${
                    item.active
                      ? "text-sky-600 border-b-2 border-sky-500 pb-1"
                      : "hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 md:hidden"
          >
            Menu
          </button>
          <button type="button" className="inline-flex h-11 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
            Alerts
          </button>
          <button type="button" className="inline-flex h-11 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
            Help
          </button>
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-sm font-semibold text-slate-950 profile-ring">
            <span>AV</span>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-950/50 px-4 py-6 sm:px-6" aria-modal="true" role="dialog">
          <div className="relative mx-auto max-w-[360px] rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Global Hack</p>
                <p className="text-lg font-semibold text-slate-900">Mobile menu</p>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-current={item.active ? "page" : undefined}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  {item.label}
                </button>
              ))}
              <button className="flex w-full items-center justify-center rounded-3xl bg-sky-600 px-4 py-4 text-sm font-semibold text-white transition hover:bg-sky-700">
                New Announcement
              </button>
              <button className="flex w-full items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Support
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
