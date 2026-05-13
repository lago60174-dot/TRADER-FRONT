import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Terminal, Search, X, Trash2 } from "lucide-react";

export interface LogEntry {
  id: string;
  ts: string;
  level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "DEBUG";
  message: string;
}

const LEVEL_COLORS: Record<string, string> = {
  INFO:    "text-blue-400",
  SUCCESS: "text-emerald-400",
  WARNING: "text-yellow-400",
  ERROR:   "text-red-400",
  DEBUG:   "text-slate-500",
};

const LEVEL_BG: Record<string, string> = {
  INFO:    "bg-blue-500/10",
  SUCCESS: "bg-emerald-500/10",
  WARNING: "bg-yellow-500/10",
  ERROR:   "bg-red-500/10",
  DEBUG:   "bg-slate-500/5",
};

const LEVELS = ["ALL", "INFO", "SUCCESS", "WARNING", "ERROR"] as const;

interface LiveLogTerminalProps {
  logs: LogEntry[];
  onClear?: () => void;
}

export function LiveLogTerminal({ logs, onClear }: LiveLogTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let out = logs;
    if (filter !== "ALL") out = out.filter((l) => l.level === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((l) => l.message.toLowerCase().includes(q));
    }
    return out;
  }, [logs, filter, search]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered, autoScroll]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  }, []);

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#040a12] overflow-hidden font-mono">
      {/* HEADER */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8 bg-[#060e1a]">
        <Terminal className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Live Logs</span>
        <span className="text-[10px] text-slate-600 bg-white/5 rounded px-1.5 py-0.5">{logs.length}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Level filters */}
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                filter === l
                  ? (l === "ALL" ? "bg-white/10 text-white" : `${LEVEL_BG[l]} ${LEVEL_COLORS[l]} border border-current/30`)
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              {l}
            </button>
          ))}

          <div className="mx-1 h-3 w-px bg-white/10" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search…"
              className="pl-6 pr-2 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-white/20 w-32"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-slate-500" />
              </button>
            )}
          </div>

          {onClear && (
            <button onClick={onClear} className="p-1 rounded text-slate-600 hover:text-red-400 transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* LOG BODY */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="h-48 overflow-y-auto overscroll-contain"
        style={{ scrollbarWidth: "thin" }}
      >
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-700">
            No logs to display
          </div>
        ) : (
          <div className="p-2 space-y-px">
            {filtered.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 rounded px-2 py-1 text-[11px] ${LEVEL_BG[log.level]} hover:bg-white/5 transition-colors`}
              >
                <span className="text-slate-700 shrink-0 tabular-nums mt-0.5">
                  {new Date(log.ts).toLocaleTimeString("en-US", { hour12: false })}
                </span>
                <span className={`shrink-0 w-16 font-bold ${LEVEL_COLORS[log.level]}`}>{log.level}</span>
                <span className="text-slate-300 break-all leading-relaxed">{log.message}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5 bg-[#060e1a]">
        <span className="text-[10px] text-slate-700">
          {filtered.length} entries
          {filter !== "ALL" && ` · filtered by ${filter}`}
        </span>
        <button
          onClick={() => setAutoScroll((v) => !v)}
          className={`text-[10px] transition ${autoScroll ? "text-emerald-500" : "text-slate-600 hover:text-slate-400"}`}
        >
          {autoScroll ? "● auto-scroll on" : "○ auto-scroll off"}
        </button>
      </div>
    </div>
  );
}
