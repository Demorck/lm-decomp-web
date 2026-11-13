import type { HistoryEntry } from "../types.ts";
import { formatShortDate, percent } from "../formats.ts";

const EPSILON = 0.0005;
type Trend = "first" | "up" | "down" | "flat";

const QUOTES: Record<Trend, string[]> = {
  first: ["Let the ghost hunt begin !"],
  up: [
    "Seems you caught some ghosts. Awesome !",
    "Splendid work ! Another ghost weakened !",
    "Great work. Take a Teeheespresso to relax !",
    "Yellow Luigi is proud of you. You earned some money in this mansion",
    "Red Luigi is proud of you",
  ],
  down: [
    "Your brother would be disappointed Luigi...",
    "You'll never save you brother like the way you're carrying on",
    "I don't think you got that quite right Luigi",
    "F.L.U.D.D is more useful than you",
  ],
  flat: [
    "You should better suck some ghosts...",
    "A quiet night in the mansion. Too quiet...",
    "No change. Do something useful",
  ],
};

const TREND_COLOR: Record<Trend, string> = {
  first: "text-primary-accent",
  up: "text-green-500",
  down: "text-red-400",
  flat: "text-primary-accent",
};

/**
 * Professor in SVG
 * @param className Size and layout classes
 */
function Professor({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 800 1000" className={className} aria-hidden="true" fill="#232B36">
      <defs>
        <mask id="head-cutout">
          <rect width="800" height="1000" fill="white" />
          <circle cx="400" cy="340" r="158" fill="black" />
        </mask>
      </defs>

      <path
        d="M 400,468
                   C 310,468 255,390 275,315
                   C 290,260 330,220 315,120
                   C 305,60 280,45 290,22
                   C 300,2 325,8 355,28
                   C 455,95 530,210 530,335
                   C 530,415 475,468 400,468 Z"
      />

      <ellipse cx="400" cy="680" rx="385" ry="290" mask="url(#head-cutout)" />

      <g transform="translate(225, 610)">
        <polygon
          points="0,-120 104,-60 104,60 0,120 -104,60 -104,-60"
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth="16"
          strokeLinejoin="round"
        />
        <polygon
          points="0,-82 71,-41 71,41 0,82 -71,41 -71,-41"
          className={className}
          strokeWidth="12"
          strokeLinejoin="round"
        />
      </g>

      <g transform="translate(575, 610)">
        <polygon
          points="0,-120 104,-60 104,60 0,120 -104,60 -104,-60"
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth="16"
          strokeLinejoin="round"
        />
        <polygon points="0,-82 71,-41 71,41 0,82 -71,41 -71,-41" strokeWidth="12" strokeLinejoin="round" />
      </g>

      <ellipse cx="400" cy="785" rx="98" ry="74" fill="#ffffff" />
    </svg>
  );
}

/**
 * Percentage of matched code of one build
 * @param entry One build of the history
 */
function codePercent(entry: HistoryEntry): number {
  return percent(entry.measures.matchedCode, entry.measures.totalCode);
}

/**
 * Line of the professor for a build
 * @param entry The build
 * @param trend How the code changed since the build before
 */
function quote(entry: HistoryEntry, trend: Trend): string {
  const lines = QUOTES[trend];
  return lines[parseInt(entry.sha.slice(0, 8), 16) % lines.length];
}

/**
 * What changed between a build and the one before it
 * @param entry The build
 * @param prev Build just before, `undefined` for the first one
 */
function buildChange(entry: HistoryEntry, prev?: HistoryEntry) {
  const delta = prev ? codePercent(entry) - codePercent(prev) : 0;
  const fnDelta = prev ? entry.measures.matchedFunctions - prev.measures.matchedFunctions : 0;
  const plural = Math.abs(fnDelta) === 1 ? "" : "s";
  const fnLabel = fnDelta ? `${fnDelta > 0 ? "+" : ""}${fnDelta} function${plural}` : "";

  let trend: Trend;
  let label: string;

  if (!prev) {
    trend = "first";
    label = "First build";
  } else if (delta > EPSILON) {
    trend = "up";
    label = `+${delta.toFixed(3)}%`;
  } else if (delta < -EPSILON) {
    trend = "down";
    label = `${delta.toFixed(3)}%`;
  } else {
    trend = "flat";
    label = "No change";
  }

  return { trend, label, fnLabel };
}

/**
 * The professor talking about the latest build in a speech bubble
 * @param entry Latest build
 * @param prev Build just before it, `undefined` if it is the first one
 * @param repo Url of the upstream github repo used for the commit link
 */
function ProfessorSays({ entry, prev, repo }: { entry: HistoryEntry; prev?: HistoryEntry; repo: string }) {
  const { trend, label, fnLabel } = buildChange(entry, prev);

  return (
    <div className="grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-3">
      <Professor className="w-24 self-start sm:w-full" />

      <div
        className="relative self-start rounded-2xl border border-wall bg-room px-5 py-4 sm:mt-21 sm:before:absolute
          sm:before:top-8 sm:before:-left-12 sm:before:h-5 sm:before:w-12 sm:before:bg-wall
          sm:before:[clip-path:polygon(100%_15%,0_50%,100%_85%)]"
      >
        <p className="m-0 font-display text-2xl">“{quote(entry, trend)}”</p>
        <p className="mt-3 mb-0 text-sm text-primary-accent">
          <a className="text-primary underline hover:text-primary-accent" href={`${repo}/commit/${entry.sha}`}>
            {entry.message}
          </a>{" "}
          by {entry.author}, <time dateTime={entry.date}>{formatShortDate(entry.date)}</time>
        </p>
        <p className="mt-1 mb-0 text-sm tabular-nums">
          <span className={`font-semibold ${TREND_COLOR[trend]}`}>{label}</span>
          {fnLabel && <span className="ml-3 text-primary-accent">{fnLabel}</span>}
        </p>
      </div>
    </div>
  );
}

/**
 * One older build: date, commit message, author and what changed since the build before
 * @param entry Build to show
 * @param prev Build just before, `undefined` for the first one
 * @param repo Url of the upstream github repo used for the commit link
 */
function BuildRow({ entry, prev, repo }: { entry: HistoryEntry; prev?: HistoryEntry; repo: string }) {
  const { trend, label, fnLabel } = buildChange(entry, prev);

  return (
    <li
      className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-wall py-2.5 text-sm"
    >
      <time dateTime={entry.date} className="text-primary-accent tabular-nums">
        {formatShortDate(entry.date)}
      </time>
      <div className="min-w-0">
        <a
          className="block truncate text-primary hover:underline"
          href={`${repo}/commit/${entry.sha}`}
          title={entry.message}
        >
          {entry.message}
        </a>
        <span className="text-xs text-primary-accent">{entry.author}</span>
      </div>
      <div className="text-right tabular-nums">
        <span className={`block font-semibold ${TREND_COLOR[trend]}`}>{label}</span>
        <span className="text-xs text-primary-accent">{fnLabel}</span>
      </div>
    </li>
  );
}

/**
 * The professor reports the latest build, the older ones are listed under him
 * @param history Data from `history.json` oldest first
 * @param repo Url of the upstream github repo used for the commit links
 */
export function Builds({ history, repo }: { history: HistoryEntry[]; repo: string }) {
  const rows = history
    .map((entry, i) => ({ entry, prev: history[i - 1] }))
    .slice(-13)
    .reverse();

  if (rows.length === 0) return null;
  const [latest, ...older] = rows;

  return (
    <>
      <ProfessorSays entry={latest.entry} prev={latest.prev} repo={repo} />
      {older.length > 0 && (
        <>
          <h3 className="mt-10 mb-2 text-lg">Earlier builds</h3>
          <ol className="m-0 list-none border-t border-wall p-0">
            {older.map(({ entry, prev }) => (
              <BuildRow key={`${entry.sha}-${entry.run}`} entry={entry} prev={prev} repo={repo} />
            ))}
          </ol>
        </>
      )}
    </>
  );
}
