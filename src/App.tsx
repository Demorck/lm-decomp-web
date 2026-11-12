import type {HistoryEntry, Index, Latest, VersionSummary} from "./types.ts";
import {type ReactElement, useEffect, useState, useSyncExternalStore} from "react";
import {Tabs} from "./modules/Tabs.tsx";
import {MeasureList} from "./modules/MeasureList.tsx";
import {formatPercent, percent} from "./formats.ts";
import {Categories} from "./modules/Categories.tsx";
import {Builds} from "./modules/Builds.tsx";
import {Chart, ChartLegend} from "./modules/Chart.tsx";
import { Treemap, TreemapLegend } from "./modules/Treemap.tsx";

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
    const res = await fetch(path, {cache: "no-cache"});
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
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    const hash = useSyncExternalStore(subscribeHash, () => location.hash.slice(1));
    const version = index && (index.versions.find((v) => v.id === hash) ?? index.versions[0]);

    useEffect(() => {
        getJson<Index>("data/index.json").then(setIndex, () =>
            setError("No progress data yet. Run the update workflow to fetch builds")
        )
    }, []);

    useEffect(() => {
        if (!version) return;

        // If the version changed before the fetch is done we ignore the old result
        let stale = false;
        loadVersion(version.id).then(([latest, history]) => {
                if (stale) return;
                setData({version, latest, history});
                setError(null);
            },
            () => !stale && setError(`The ${version.label} data could not be loaded. Try reloading the page.`),
        );
        return () => {
            stale = true;
        }
    }, [version]);

    const upstream = index?.upstream ?? "SomeJakeGuy/lm-decomp";
    const repo = `https://github.com/${upstream}`;
    const decompLink = `https://decomp.dev/${upstream}`;
    const webrepo= "https://github.com/Demorck/lm-decomp-web";

    const m = data?.latest.measures;
    const headline =
        error ??
        (!data || !m
            ? "Loading..."
            : m.matchedCode
                ? `${formatPercent(percent(m.matchedCode, m.totalCode))} of the ${data.version.label} code is matched`
                : `No ${data.version.label} code has been matched yet`);

    return (
        <>
            <header className="mx-auto flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-4 pt-10 p-8">
                <div>
                    <h1 className="m-0 leading-none font-display  font-normal text-5xl sm:text-6xl">Luigi's Mansion</h1>
                    <p className="mt-3 mb-0 max-w-[50ch] text-moon-dim">Progress of the Gamecube decompilation. Rebuilt
                        from the upstream CI after every merge</p>
                </div>
                <nav className="flex gap-5 text-sm font-semibold">
                    <a href={webrepo}>Source for this site</a>
                    <a id="repo-link" href={repo}>Decomp source on github</a>
                    <a href={decompLink}>decomp.dev</a>
                </nav>
            </header>

            <div>
                <Tabs versions={index?.versions ?? []} selected={version?.id}/>

                <section className="p-8">
                    <h2 id="headline"
                        className="m-0 font-display text-xl sm:text-2xl">
                        {headline}
                    </h2>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                        <TreemapLegend />
                        <input
                            type="search"
                            placeholder={"Find a file"}
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            className={"w-full max-w-60 border-0 border-b-2 border-primary/20 " +
                                "bg-transparent px-0 py-1 text-sm placeholder:text-primary-accent " +
                                "focus:border-light focus:outline-none"}
                        />
                    </div>

                    {data && index &&
                        <>
                            <Treemap
                                key={data.version.id}
                                latest={data.latest}
                                query={query}
                                sourceBase={`${repo}/blob/${index.branch}/`}
                            />
                            <MeasureList latest={data.latest} repo={repo}/>
                        </>
                    }
                </section>

                { data &&
                    <div className={"mt-16 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"}>
                        <section className="p-8">
                            <h2 className="mt-0 mb-5 text-2xl">By Library</h2>
                            <Categories latest={data.latest} />
                        </section>

                        <section className="p-8">
                            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                                <h2 className="mt-0 text-2xl">Over time</h2>
                                <ChartLegend />
                            </div>
                            <Chart key={data.version.id} history={data.history} />
                        </section>
                    </div>
                }

                { data &&
                    <section className="mt-16 p-8">
                        <h2 className="mt-0 mb-5 text-2xl">Recent builds</h2>
                        <Builds history={data.history} repo={repo} />
                    </section>
                }
            </div>


            <footer className="mx-auto mt-16 border-t px-4 py-6 text-sm text-primary">
                <p className="my-1">
                    Numbers come from the progress reports of the upstream{" "}
                    <a className="underline text-primary hover:text-primary-accent"
                       href={`${repo}/actions/workflows/build.yml`}>
                        CI builds
                    </a>
                    , checked every hour (when the website and the CI are done).
                    Fan project, not affiliated with Nintendo.
                </p>
            </footer>
        </>
    )
}