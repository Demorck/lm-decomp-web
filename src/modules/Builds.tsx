import type {HistoryEntry} from "../types.ts";
import {formatShortDate, percent} from "../formats.ts";

const EPSILON = 0.0005;

/**
 * Percentage of matched code of one build
 * @param entry One build of the history
 */
function codePercent(entry: HistoryEntry): number {
    return percent(entry.measures.matchedCode, entry.measures.totalCode);
}

/**
 * One build: date, commit message, author and what changed since the build before
 * @param entry build to show
 * @param prev precent build `undefined` for the first one
 * @param repo url of the upstream github repo used for the commit link
 */
function BuildRow({entry, prev, repo}: { entry: HistoryEntry, prev?: HistoryEntry, repo: string }) {
    const delta = prev ? codePercent(entry) - codePercent(prev) : 0;
    const fnDelta = prev ? entry.measures.matchedFunctions - prev.measures.matchedFunctions : 0;
    const plural = Math.abs(fnDelta) === 1 ? "" : "s";
    const fnLabel = fnDelta ? `${fnDelta > 0 ? "+" : ""}${fnDelta} function${plural}` : "";

    let label: string;
    let color: string;

    if (!prev) {
        label = "First build";
        color = "text-primary-accent";
    } else if (delta > EPSILON) {
        label = `+${delta.toFixed(3)}%`;
        color = "text-green-500";
    } else if (delta < -EPSILON) {
        label = `${delta.toFixed(3)}%`;
        color = "text-red-400";
    } else {
        label = "No change";
        color = "text-primary-accent";
    }

    return (
        <li className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1 border-b border-primary/20 py-3">
            <time dateTime={entry.date}
                  className="pt-0.5 text-sm text-primary-accent tabular-nums"
            >
                {formatShortDate(entry.date)}
            </time>
            <div className="min-w-0">
                <a
                    className="block truncate text-primary hover:underline"
                    href={`${repo}/commit/${entry.sha}`}
                >
                    {entry.message}
                </a>
                <span className="text-sm text-primary-accent">{entry.author}</span>
            </div>
            <div className="col-start-2 flex items-baseline gap-3 tabular-nums">
                <span className={`block font-semibold ${color}`}>{label}</span>
                <span className="text-sm text-primary-accent">{fnLabel}</span>
            </div>
        </li>
    )
}

/**
 * The last builds of the version newest first
 * @param history Data from `history.json` oldest first
 * @param repo Url of the upstream github repo used for the commit links
 */
export function Builds({history, repo}: { history: HistoryEntry[]; repo: string }) {
    const rows = history
        .map((entry, i) => ({entry, prev: history[i - 1]}))
        .slice(-13)
        .reverse();

    return (
        <ol className="mt-0 list-none border-t border-primary/20 p-0">
            {rows.map(({entry, prev}) => (
                <BuildRow key={`${entry.sha}-${entry.run}`} entry={entry} prev={prev} repo={repo}/>
            ))}
        </ol>
    )
}