import { Search, CheckCircle2, Command, Terminal, ShieldCheck } from "lucide-react"

/**
 * Modern Linear/Vercel Aesthetic UI Preview Component for Auth Pages.
 * Replaces cartoon stickers with an authentic, ultra-sleek Command Palette & Verification Bar preview.
 */
export function TechIllustration() {
  return (
    <div className="relative w-full my-6 font-sans">
      {/* Sleek Glass Window Card */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl shadow-2xl overflow-hidden p-5 space-y-4">
        {/* Command Bar Header */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 shadow-inner">
          <Search className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="flex-1 text-slate-400 font-mono">Triage bug: &quot;Cannot read properties of null (auth.service.ts)&quot;</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </div>

        {/* Verification Pipeline Steps */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/50">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-300">Codebase Scan & Ripgrep Trace</span>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">auth.service.ts:42</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Docker Verification Sandbox</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> PASSED
            </span>
          </div>
        </div>

        {/* Clean Unified Diff Preview */}
        <div className="rounded-lg bg-slate-950 p-3 text-[11px] font-mono leading-relaxed space-y-1 text-slate-400 border border-slate-800/80">
          <div className="text-slate-500 text-[10px] border-b border-slate-800/80 pb-1 mb-1.5 flex items-center justify-between">
            <span>backend/src/domains/auth/auth.service.ts</span>
            <span className="text-emerald-400">+1 -1 line</span>
          </div>
          <p className="text-rose-400/90 bg-rose-500/10 px-2 py-0.5 rounded">- const user = await authRepo.findUser(id)</p>
          <p className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">+ const user = await authRepo.findUser(id) ?? null</p>
        </div>
      </div>
    </div>
  )
}
