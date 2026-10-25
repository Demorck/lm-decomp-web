import type {HistoryEntry, Index, Latest, VersionSummary} from "./types.ts";
import {type ReactElement, useEffect, useState, useSyncExternalStore} from "react";
import {Tabs} from "./Tabs.tsx";
import {MeasureList} from "./MeasureList.tsx";

interface Loaded {
    version: VersionSummary;
    latest: Latest;
    history: HistoryEntry[];
}

// One promise per version id so switching back to a tab don't fetch again
const cache = new Map<string, Promise<[Latest, HistoryEntry[]]>>();

/**
 * Fetch a JSON file without using the browser cache
 * @param path Path of the file
 */
async function getJson<T>(path: string): Promise<T> {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} on ${path}`);

    return await res.json() as Promise<T>;
}

// The version id will be in the url so we can gather it with this function
function subscribeHash(onChange: () => void): () => void {
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
}

/**
 * Load `latest.json` and `history.json` of a version only once thanks to {@linkcode cache}
 * @param id The version id
 */
function loadVersion(id: string): Promise<[Latest, HistoryEntry[]]> {
    if (!cache.has(id)) {
        cache.set(
            id,
            Promise.all([getJson<Latest>(`data/${id}/latest.json`), getJson<HistoryEntry[]>(`data/${id}/history.json`)])
        );
    }

    return cache.get(id)!;
}

/**
 * Main page
 */
export function App(): ReactElement {
    const [index, setIndex] = useState<Index | null>(null);
    const [data, setData] = useState<Loaded | null>(null);

    const hash = useSyncExternalStore(subscribeHash, () => location.hash.slice(1));
    const version = index && (index.versions.find((v) => v.id === hash) ?? index.versions[0]);

    useEffect(() => {
        getJson<Index>("data/index.json").then(setIndex);
    }, []);

    useEffect(() => {
        if (!version) return;

        // If the version changed before the fetch is done we ignore the old result
        let stale = false;
        loadVersion(version.id).then(([latest, history]) => {
                if (stale) return;
                setData({version, latest, history});
            }
        );
        return () => {
            stale = true;
        }
    }, [version]);

    const upstream = index?.upstream ?? "SomeJakeGuy/lm-decomp";
    const repo = `https://github.com/${upstream}`;

    return (
        <>
            <header className="mx-auto flex flex-wrap items-end justify-between gap-x-8 gapy-y-4 px-4 pt-10 pb-8">
                <div>
                    <h1 className="m-0 leading-none font-display  font-normal text-5xl sm:text-6xl">Luigi's Mansion</h1>
                    <p className="mt-3 mb-0 max-w-[50ch] text-moon-dim">Progress of the Gamecube decompilation. Rebuilt
                        from the upstream CI after every merge</p>
                </div>
                <nav className="flex gap-5 text-sm font-semibold">
                    <a id="repo-link" href="https://github.com/SomeJakeGuy/lm-decomp">Source on github</a>
                    <a href="https://decomp.dev/SomeJakeGuy/lm-decomp">decomp.dev</a>
                </nav>
            </header>

            <div>
                <Tabs versions={index?.versions ?? []} selected={version?.id}/>

                <section className="pt-8">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                        <div id="legend" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-moon-dim">
                            <span className="inline-flex items-center gap-2"><i className="size-3.5 bg-green-200"></i>Linked</span>
                            <span className="inline-flex items-center gap-2"><i className="size-3.5 bg-green-500"></i>Matched</span>
                            <span className="inline-flex items-center gap-2"><i className="size-3.5 bg-amber-400"></i>Partly matched</span>
                            <span className="inline-flex items-center gap-2"><i className="size-3.5 bg-red-400"></i>Not split yet</span>
                        </div>
                    </div>

                    <div id="treemap" className="overflow-hidden relative border-4"></div>

                    { data && <MeasureList latest={data.latest} repo={repo} />}
                </section>
            </div>


            <footer className="mx-auto mt-16 border-t px-4 py-6 text-sm text-primary">
                <p className="my-1">
                    Numbers come from the progress reports of the upstream{" "}
                    <a className="underline text-primary hover:text-primary-accent" href={`${repo}/actions/workflows/build.yml`}>
                        CI builds
                    </a>
                    , checked every hour (when the website and the CI are done).
                    Fan project, not affiliated with Nintendo.
                </p>
            </footer>
        </>
    )
}