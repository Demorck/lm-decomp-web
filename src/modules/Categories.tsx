import type { Latest, Measures } from "../types.ts";
import { formatBytes, formatInt, formatPercent, percent } from "../formats.ts";

const GHOST_COLORS = [
  "text-green-500/55",
  "text-violet-500/55",
  "text-sky-500/55",
  "text-emerald-500",
  "text-orange-400",
  "text-fuchsia-500",
];

/**
 * Small ghost drawn in the current text color
 * @param className Size and color classes
 */
function GhostIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M32 6
                     c -12 0 -21 9 -21 21
                     v 27
                     l 6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5
                     V 27
                     C 53 15 44 6 32 6
                     z"
        fill="currentColor"
      />
      <ellipse cx="25" cy="27" rx="3.5" ry="5" fill="white" />
      <ellipse cx="39" cy="27" rx="3.5" ry="5" fill="white" />
      <path d="M26 38 q 6 -5 12 0" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Very simple poltergust Nozzle in svg
 * @param active if the bar is active (ie not completed)
 * @constructor
 */
export function PoltergustNozzle({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 44 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`size-9 shrink-0 select-none ${active ? "motion-safe:animate-vibrate" : "opacity-50 grayscale-40"}`}
    >
      {/* Left pipe */}
      <rect x="1" y="13" width="5" height="10" rx="2" fill="#4B5563" />
      <rect x="5" y="12" width="5" height="12" rx="2" fill="#6B7280" />
      <rect x="9" y="13" width="5" height="10" rx="2" fill="#4B5563" />

      {/* Red thing and its reflection */}
      <rect x="12" y="9" width="15" height="18" rx="3" fill="#EF4444" />
      <rect x="14" y="11" width="12" height="3" rx="1.5" fill="#FCA5A5" opacity="0.6" />

      {/* The vacuum part and its shadow */}
      <path d="M25 12L38 4V32L25 24V12Z" fill="#D1D5DB" />
      <path d="M25 18L38 22V32L25 24V18Z" fill="#9CA3AF" />

      {/* The upper/bottom part of the nozzle  */}
      <rect x="36" y="2" width="5" height="32" rx="2.5" fill="#E5E7EB" />
      <ellipse cx="39" cy="18" rx="2.5" ry="12" fill="#111827" />

      {/* The LED and its light */}
      <circle cx="19.5" cy="6" r="2.5" fill={active ? "#FBBF24" : "#34D399"} />
      <circle cx="19.5" cy="6" r="4.5" fill={active ? "#FBBF24" : "#34D399"} opacity="0.35" />
    </svg>
  );
}

/**
 * Adding a legend
 * @param color Default color
 * @constructor
 */
export function HpLegend({ color = "text-cyan-400" }: { color?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-primary-accent">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2.5 w-6 overflow-hidden rounded-full bg-primary/10">
          <span className={`ecto-tail block ${color} h-full w-full rounded-r-full`} />
        </span>
        <span>
          <strong className="font-medium">HP Left</strong> (Not decompiled)
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex h-2.5 w-6 overflow-hidden rounded-full bg-primary/10">
          <span className={`ecto-drain block h-full w-full animate-none ${color} opacity-75`} />
        </span>
        <span>
          <strong className="font-medium">Being vacuumed</strong> (Partly / Fuzzy)
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-6 rounded-full bg-primary/10 ring-1 ring-light/15 ring-inset" />
        <span>
          <strong className="font-medium">Vacuumed</strong> (Matched)
        </span>
      </div>
    </div>
  );
}

/**
 * HP of a ghost: what is left, what is being drained (partly matched) and what is lost (matched)
 * @param m Measures of one library
 * @param color Color class of the ghost
 */
function HpBar({ m, color }: { m: Measures; color: string }) {
  const matched = percent(m.matchedCode, m.totalCode);
  const fuzzy = Math.max(m.fuzzy, matched);
  const solidHp = 100 - fuzzy;
  const drainHp = fuzzy - matched;
  const isCaptured = matched === 100;

  return (
    <div className="flex items-center gap-1">
      <PoltergustNozzle active={!isCaptured} />

      <div className="relative flex h-3.5 w-full items-center rounded-full bg-primary/10">
        {drainHp > 0 && <span className={`ecto-drain h-full ${color} opacity-60`} style={{ width: `${drainHp}%` }} />}

        {!isCaptured && (
          <span className={`ecto-glow relative flex h-full items-center ${color}`} style={{ width: `${solidHp}%` }}>
            <span className="ecto-tail block h-full w-full animate-ecto-shake rounded-r-full" />

            <GhostIcon
              className="-ml-1.5 size-5 scale-y-150 rotate-90 animate-[ghost-struggle_0.3s_ease-in-out_infinite]"
            />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * One ghost per library (game, SDK, JSystem, etc.), its HP go down as its code gets matched
 * @param latest Data from `latest.json` of the selected version
 */
export function Categories({ latest }: { latest: Latest }) {
  const categories = latest.categories.filter((c) => c.measures.totalCode > 0);

  if (categories.length === 0) {
    return <p className="text-primary-accent">This version has no files sorted into libraries yet</p>;
  }

  return (
    <div className="space-y-6">
      <HpLegend />
      {categories.map(({ id, name, measures: m }, i) => {
        const color = GHOST_COLORS[i % GHOST_COLORS.length];
        const hp = 100 - percent(m.matchedCode, m.totalCode);
        const captured = m.matchedCode >= m.totalCode;

        return (
          <div key={id} className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-4">
                <span className="font-semibold">{name}</span>
                <span className="tabular-nums">{captured ? "Captured !" : `HP ${formatPercent(hp, 0)}`}</span>
              </div>
              <HpBar m={m} color={color} />
              <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 text-sm text-primary-accent tabular-nums">
                <span>
                  {formatBytes(m.matchedCode)} of {formatBytes(m.totalCode)}
                </span>
                <span>
                  {formatInt(m.matchedFunctions)} of {formatInt(m.totalFunctions)} functions
                </span>
                <span>{formatPercent(percent(m.matchedCode, m.totalCode))} matched</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
