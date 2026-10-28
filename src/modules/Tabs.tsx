import type {VersionSummary} from "../types.ts";
import {formatPercent, percent} from "../formats.ts";


/**
 * Tabs to switch between game versions each one show its code progress
 * @param versions All the versions from `index.json`
 * @param selected Id of the active version
 */
export function Tabs({ versions, selected } : { versions: VersionSummary[]; selected?: string }) {
    return (
        <div className="grid grid-cols-2 border-b sm:flex sm:gap-x-1">
            {versions.map(version => (
                <button
                    key={version.id}
                    aria-selected={version.id === selected}
                    className="cursor-pointer px-4 py-3 text-left
                    text-primary hover:text-primary-accent aria-selected:text-primary-accent
                     border-0 border-b-2 border-transparent aria-selected:border-light"
                    onClick={() => location.hash = version.id}
                >
                    <span className="block font-semibold whitespace-nowrap">
                        {version.label}
                        <span className="ml-1.5 font-medium tabular-nums">
                            {formatPercent(version.measures ?
                                percent(version.measures.matchedCode, version.measures.totalCode) :
                                0, 1)}
                        </span>
                    </span>
                    <span className="block text-xs text-primary">{version.id}</span>
                </button>
            ))}
        </div>
    );
}