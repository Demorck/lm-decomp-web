// is it better to create type just for this ?
import {formatBytes, formatDate, formatInt, formatPercent, percent, timeAgo} from "../formats.ts";
import type {Latest} from "../types.ts";

/**
 * One stat block: a label, the percentage and a detail under it
 * @param label Name of the measure (Code, Data...)
 * @param part Matched amount
 * @param total Total amount
 * @param detail Small text under the percentage ("12 KB of 69 KB")
 */
function Measure({ label, part, total, detail }: { label: string; part: number; total: number; detail: string }) {
    return (
        <div>
            <div className="text-sm text-primary-accent">{ label }</div>
            <div className="m-0 mt-0 5">
                <span className="text-2xl font-semibold tabular-nums">{ formatPercent(percent(part, total)) }</span>
                <span className="block text-sm text-primary-accent tabular-nums">{ detail }</span>
            </div>
        </div>
    );
}

/**
 * Grid with all the measures of the latest build and the commit where it come from
 * @param latest Data from `latest.json` of the selected version
 * @param repo Url of the upstream github repo used for the commit link
 */
export function MeasureList({ latest, repo }: { latest: Latest; repo: string }) {
    const m = latest.measures;
    return (
        <>
            <div className="mt-6 mb-0 grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
                <Measure label="Code" part={m.matchedCode} total={m.totalCode}
                         detail={`${formatBytes(m.matchedCode)} of ${formatBytes(m.totalCode)}`} />
                <Measure label="Data" part={m.matchedData} total={m.totalData}
                         detail={`${formatBytes(m.matchedData)} of ${formatBytes(m.totalData)}`} />
                <Measure label="Functions" part={m.matchedFunctions} total={m.totalFunctions}
                         detail={`${formatInt(m.matchedFunctions)} of ${formatInt(m.totalFunctions)}`} />
                <Measure label="Linked files" part={m.completeUnits} total={m.totalUnits}
                         detail={`${formatInt(m.completeUnits)} of ${formatInt(m.totalUnits)}`} />
            </div>
            <p className="mt-6 mb-0 text-sm text-primary-accent">
                Built from {" "}
                <a className="underline text-primary hover:text-primary-accent"
                   href={`${repo}/commit/${latest.sha}`}>
                    {latest.sha.slice(0, 7)}
                </a> {" "}
                <time dateTime={latest.date} title={formatDate(latest.date)}>
                    {timeAgo(latest.date)}
                </time>
            </p>
        </>
    )
}