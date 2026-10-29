import type {Latest, Measures} from "../types.ts";
import {formatBytes, formatInt, formatPercent, percent} from "../formats.ts";

/**
 * Bar with 3 level of the legend stacked: linked, matched then partialy matched
 * @param m Measures of one library
 */
function LightBar({m}: { m: Measures }) {
    const linked = percent(m.completeCode, m.totalCode);
    const matched = percent(m.matchedCode, m.totalCode);
    const fuzzy = Math.max(m.fuzzy, matched);

    return (
        <div className="flex h-1.5 bg-primary/10">
            <span className="bg-green-200" style={{ width: `${linked}%` }}></span>
            <span className="bg-green-500" style={{ width: `${matched - linked}%` }}></span>
            <span className="bg-amber-400" style={{ width: `${fuzzy - matched}%` }}></span>
        </div>
    )
}

/**
 * One line per library (game, SDK, JSystem, etc.) with its code progress
 * @param latest data from `latest.json` of the selected version
 */
export function Categories({ latest }: { latest: Latest }) {
    const categories = latest.categories.filter(c => c.measures.totalCode > 0);

    if (categories.length === 0) {
        return (
            <p className="text-primary-accent">
                This version has no files sortes into libraries yet
            </p>
        );
    }

    return (
        <div className="space-y-5">
            {categories.map(({ id, name, measures: m }) => (
                <div key={id}>
                    <div className="mb-2 flex items-baseline justify-between gap-4">
                        <span className="font-semibold">{name}</span>
                        <span className="tabular-nums">{formatPercent(percent(m.matchedCode, m.totalCode))}</span>
                    </div>
                    <LightBar m={m}/>
                    <div className="mt-1.5 text-sm text-primary-accent tabular-nums">
                        {formatBytes(m.matchedCode)} of {formatBytes(m.totalCode)},{" "}
                        {formatInt(m.matchedFunctions)} of {formatInt(m.totalFunctions)} functions
                    </div>
                </div>
            ))}
        </div>
    )
}