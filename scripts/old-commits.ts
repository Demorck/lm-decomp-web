import {
    type Artifact,
    compact, DATA_DIR,
    fetchReport,
    githubFetch, readJson,
    type ReportMeasures,
    type Run,
    runCommit,
    VERSIOSN, writeJson
} from "./common.ts";
import type {HistoryEntry, Measures} from "../src/types.ts";

const OLD_REPO = "ThePlayerRolo/lm-decomp";
const NEW_REPO = "SomeJakeGuy/lm-decomp";

interface DecompDevPoint {
    timestamp: string;
    commit_sha: string;
    commit_message: string;
    measures: ReportMeasures;
}

/**
 * Fetch from decomp dev
 * @param path the api path (like `<version>.json?mode=history`)
 * @returns the parsed json
 */
export async function decompDev<T>(path: string): Promise<T> {
    const res = await fetch(`https://decomp.dev/${OLD_REPO}/${path}`);

    if (!res.ok) throw new Error(`Decomp dev ${res.status} on ${path} ${await res.text()}`);

    return await res.json() as Promise<T>;
}

/**
 * Map each commit sha to its author name
 * decomp.dev history has no author so we take them from the GitHub api
 * @returns sha -> author name
 */
async function commitAuthors(): Promise<Map<string, string>> {
    const authors = new Map<string, string>();

    for (const repo of [NEW_REPO, OLD_REPO]) {
        for (let page = 1; ; page++) {
            const query_url = `repos/${repo}/commits?per_page=100&page=${page}`;
            const res = await githubFetch(query_url);
            const results = (await res.json()) as { sha: string; commit: { author: { name: string } } }[];

            for (const r of results)
                if (!authors.has(r.sha))
                    authors.set(r.sha, r.commit.author.name)

            if (results.length < 100) break;
        }
    }

    return authors;
}

/**
 * Build the history of a version from decomp.dev
 * @param version The version id (same name as on decomp.dev)
 * @param authors sha -> author, see {@linkcode commitAuthors}
 * @returns
 */
async function fromDecompDev(version: string, authors: Map<string, string>): Promise<HistoryEntry[]> {
    const points = await decompDev<DecompDevPoint[]>(`${version}.json?mode=history`);
    const project = await decompDev<{ report_categories?: { id: string }[] }>(`${version}.json`);

    const categories = new Map<string, Record<string, Measures>>();
    for (const { id } of project.report_categories ?? []) {
        for (const p of await decompDev<DecompDevPoint[]>(`${version}.json?mode=history&category=${id}`)) {
            const byCategory = categories.get(p.commit_sha) ?? {};
            byCategory[id] = compact(p.measures);
            categories.set(p.commit_sha, byCategory);
        }
    }

    return points.map(p => ({
        run: null, // Not from a workflow run
        sha: p.commit_sha,
        date: p.timestamp,
        message: p.commit_message.split("\n")[0], // Only the title of the commit
        author: authors.get(p.commit_sha) ?? "unknown",
        measures: compact(p.measures),
        categories: categories.get(p.commit_sha) ?? {},
    }));
}

async function fromOldArtifacts(): Promise<Record<string, HistoryEntry[]>> {
    const out: Record<string, HistoryEntry[]> = Object.fromEntries(VERSIOSN.map(v => [v.id, []]));
    const artifacts: (Artifact & { workflow_run: { id: number } })[] = [];

    for (let page = 1; ; page++) {
        const query_url = `repos/${OLD_REPO}/actions/artifacts?per_page=100&page=${page}`;
        const res = await githubFetch(query_url);
        const { artifacts: batch } = (await res.json()) as { artifacts: typeof artifacts };

        artifacts.push(...batch.filter((a) => a.name.endsWith("_report") && !a.expired));

        if (batch.length < 100) break;
    }

    const runIds = [...new Set(artifacts.map(a => a.workflow_run.id))];
    for (const id of runIds) {
        const query_url = `repos/${OLD_REPO}/actions/runs/${id}`;
        const run = (await (await githubFetch(query_url)).json()) as Run & {
            event: string;
            head_branch: string;
        };

        // Only pushes on main, PR and other branches are not "real" progress
        if (run.event !== "push" || run.head_branch !== "main") continue;

        for (const v of VERSIOSN) {
            const artifact = artifacts.find(a => a.workflow_run.id === id && a.name === `${v.id}_report`);
            if (!artifact) continue;

            const report = await fetchReport(OLD_REPO, artifact);
            out[v.id].push({
                ...runCommit(run),
                measures: compact(report.measures),
                categories: Object.fromEntries((report.categories ?? []).map(c => [c.id, compact(c.measures)])),
            });
        }
    }

    return out;
}

/**
 * Merge several history into one without duplicated commit
 * @param lists The history
 * @returns Sorted by date, oldest first
 */
function merge(...lists: HistoryEntry[][]): HistoryEntry[] {
    const bySha = new Map<string, HistoryEntry>();

    for (const list of lists)
        for (const e of list)
            if (!bySha.has(e.sha))
                bySha.set(e.sha, e);


    return [...bySha.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function main(): Promise<void> {
    const authors = await commitAuthors();
    const oldArtifacts = await fromOldArtifacts();

    for (const v of VERSIOSN) {
        const file = `${DATA_DIR}${v.id}/history.json`;

        const current = await readJson<HistoryEntry[]>(file, []);
        const old = await fromDecompDev(v.id, authors);
        const merged = merge(current, oldArtifacts[v.id], old);

        await writeJson(file, merged);
    }
}

await main();
