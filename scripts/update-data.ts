import {
    compact, compactUnit,
    DATA_DIR,
    fetchReport,
    listReportArtifacts,
    listRuns,
    readJson,
    runCommit,
    VERSIOSN, writeJson
} from "./common.ts";
import type {HistoryEntry, Index, Latest} from "../src/types.ts";

const UPSTREAM = process.env.UPSTREAM_REPO || "SomeJakeGuy/lm-decomp";
const BRANCH = "main";

async function main(): Promise<void> {
    const indexFile = `${DATA_DIR}index.json`
    const index = await readJson<Pick<Index, "lastRun">>(indexFile, { lastRun: 0 });
    const runs = await listRuns(UPSTREAM, index.lastRun);

    if (runs.length === 0) return;

    const histories: Record<string, HistoryEntry[]> = {};
    const latest: Record<string, Latest> = {};

    for (const v of VERSIOSN)
        histories[v.id] = await readJson<HistoryEntry[]>(`${DATA_DIR}${v.id}/history.json`, []);

    for (const run of runs) {
        const artifacts = await listReportArtifacts(UPSTREAM, run);
        for (const v of VERSIOSN) {
            const currentArtifactVersion = artifacts.find(a => a.name === `${v.id}_report`);
            if (!currentArtifactVersion) continue;

            const report = await fetchReport(UPSTREAM, currentArtifactVersion);
            const commit = runCommit(run);

            histories[v.id].push({
                ...commit,
                measures: compact(report.measures),
                categories: Object.fromEntries((report.categories ?? []).map(c => [c.id, compact(c.measures)]))
            });

            latest[v.id] = {
                ...commit,
                measures: compact(report.measures),
                categories: (report.categories ?? [])
                    .map(c => ({ id: c.id, name: c.name, measures: compact(c.measures)})),
                units: report.units.map(compactUnit).filter(u => u.totalCode > 0)
            };
        }
    }


    for (const v of VERSIOSN) {
        await writeJson(`${DATA_DIR}${v.id}/history.json`, histories[v.id]);
        if (latest[v.id]) await writeJson(`${DATA_DIR}${v.id}/latest.json`, latest[v.id]);
    }

    const newIndex: Index = {
        upstream: UPSTREAM,
        branch: BRANCH,
        lastRun: runs[runs.length - 1].id,
        versions: VERSIOSN.map(v => {
            const last = histories[v.id].at(-1);

            return { ...v, date: last?.date ?? null, sha: last?.sha ?? null, measures: last?.measures ?? null };
        }),
    };

    await writeJson(indexFile, newIndex);
}


await main();