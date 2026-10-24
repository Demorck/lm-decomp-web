import {fileURLToPath} from "node:url";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {dirname} from "node:path";
import {inflateRawSync} from "node:zlib";
import type {Measures, Unit} from "../src/types.ts";

export const DATA_DIR: string = fileURLToPath(new URL("../public/data/", import.meta.url));

export const VERSIOSN = [
    { id: "GLME01", label: "USA" },
    { id: "GLMJ01", label: "Japan" },
    { id: "GLMP01_00", label: "PAL Rev 0" },
    { id: "GLMP01_01", label: "PAL Rev 1" },
];

export type ReportMeasures = Partial<Record<string, number | string>>;
type ReportCategorie = { id: string; name: string; measures: ReportMeasures };
type UnitMetadata = {
    source_path?: string,
    progress_categories?: string[],
    auto_generated?: boolean,
    complete?: boolean
};
type Commit = { timestamp: string; message: string; author: { name: string }};
type ReportUnit = { name: string; measures?: ReportMeasures, metadata?: UnitMetadata };

export interface Report {
    measures: ReportMeasures;
    categories?: ReportCategorie[];
    units: ReportUnit[];
}

export interface Run {
    id: number;
    head_sha: string;
    head_commit: Commit;
}

export interface Artifact {
    id: number;
    name: string;
    expired: boolean;
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error("GITHUB_TOKEN is required.")
    process.exit(1);
}

/**
 * Fetch from github API with the token and the 2022 API
 * @param path the api path
 */
export async function githubFetch(path: string): Promise<Response> {
    const res = await fetch(`https://api.github.com/${path}`, {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28" // I could use 2026-03-10, need to test though
        }
    });

    if (!res.ok) throw new Error(`Github API ${res.status} on ${path} ${await res.text()}`);

    return res;
}

/**
 * Read a json file and if the file is not found, return the fallback
 * @param file the json file to read and parse as T
 * @param fallback the fallback if the file is not found
 */
export async function readJson<T>(file: string, fallback: T): Promise<T> {
    try {
        return JSON.parse(await readFile(file, "utf8")) as T;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback

        throw error;
    }
}

/**
 * Write the ``value`` into the path: `pathFile` as JSON
 * @param pathFile the file to write
 * @param value the value to write
 */
export async function writeJson(pathFile: string, value: unknown): Promise<void> {
    await mkdir(dirname(pathFile), { recursive: true });
    await writeFile(pathFile, JSON.stringify(value) + "\n");
}


const END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50;
const END_OF_CENTRAL_DIR_MIN_SIZE = 22;

// Artifact have only one file so a dependancy might be overkill

export function readZipEntry(buf: Buffer, name: string): Buffer {
    // Find the EOCD (End of Central Directory) from the end
    let eocd_offset = buf.length - END_OF_CENTRAL_DIR_MIN_SIZE;
    while (eocd_offset >= 0 && buf.readUInt32LE(eocd_offset) !== END_OF_CENTRAL_DIR_SIGNATURE) {
        eocd_offset--;
    }

    if (eocd_offset < 0) {
        throw new Error("Invalid ZIP file: EOCD signature not found");
    }

    // Metadatas
    const entries_count = buf.readUInt16LE(eocd_offset + 10);
    let central_dir_offset = buf.readUInt32LE(eocd_offset + 16);

    // Loop in entries to find the file
    for (let i = 0; i < entries_count; i++) {
        const compression           = buf.readUInt16LE(central_dir_offset + 10);
        const size                  = buf.readUInt32LE(central_dir_offset + 20);
        const filename_length       = buf.readUInt16LE(central_dir_offset + 28);
        const extra_field_length    = buf.readUInt16LE(central_dir_offset + 30);
        const file_comment_length   = buf.readUInt16LE(central_dir_offset + 32);
        const local_header_offset   = buf.readUInt32LE(central_dir_offset + 42);

        const file_name_start = central_dir_offset + 46;
        const file_name = buf.toString("utf8", file_name_start, file_name_start + filename_length);

        // yeaaah, found the file
        if (file_name === name) {
            // Offset calcul
            const dataStart = local_header_offset + 30 +
                buf.readUInt16LE(local_header_offset + 26) +
                buf.readUInt16LE(local_header_offset + 28);

            const file_data = buf.subarray(dataStart, dataStart + size);

            // Return raw or compressed data
            return compression === 0 ? file_data : inflateRawSync(file_data);
        }

        // Next entry
        central_dir_offset += 46 + filename_length + extra_field_length + file_comment_length;
    }

    throw new Error(`File "${name}" not found in ZIP`);
}

const num = (v: number | string | undefined) => Number(v ?? 0);
const round = (v: number | string | undefined) => Math.round(num(v) * 100) / 100;

/**
 * Basically an adaptor
 * @param m the report measures
 */
export function compact(m: ReportMeasures = {}): Measures {
    return {
        fuzzy: round(m.fuzzy_match_percent),
        matchedCode: num(m.matched_code),
        completeCode: num(m.complete_code),
        totalCode: num(m.total_code),
        matchedData: num(m.matched_data),
        completeData: num(m.complete_data),
        totalData: num(m.total_data),
        matchedFunctions: num(m.matched_functions),
        totalFunctions: num(m.total_functions),
        completeUnits: num(m.complete_units),
        totalUnits: num(m.total_units),
    };
}

/**
 * An adaptor but for unit
 * @param u units measurements
 */
export function compactUnit(u: Report["units"][number]): Unit {
    return {
        name: u.name.replace(/^main\//, ""),
        source: u.metadata?.source_path ?? null,
        category: u.metadata?.progress_categories?.[0] ?? null,
        auto: Boolean(u.metadata?.auto_generated),
        complete: Boolean(u.metadata?.complete),
        fuzzy: round(u.measures?.fuzzy_match_percent),
        matchedCode: num(u.measures?.matched_code),
        totalCode: num(u.measures?.total_code),
        matchedFunctions: num(u.measures?.matched_functions),
        totalFunctions: num(u.measures?.total_functions),
    };
}

export async function listRuns(repo: string, afterRun = 0): Promise<Run[]> {
    const runs: Run[] = [];
    for (let page = 1; ; page++) {
        const query_params = `branch=main&event=push&status=completed&per_page=100&page=${page}`;
        const res = await githubFetch(`repos/${repo}/actions/workflows/build.yml/runs?${query_params}`);
        const { workflow_runs: batch } = (await res.json()) as { workflow_runs: Run[] };

        const fresh = batch.filter(r => r.id > afterRun);
        runs.push(...fresh);

        if (batch.length < 100 || fresh.length < batch.length) break;
    }

    return runs.sort((a, b) => a.id - b.id);
}

export async function listReportArtifacts(repo: string, run: Run): Promise<Artifact[]> {
    const query_url = `repos/${repo}/actions/runs/${run.id}/artifacts?per_page=100`;
    const res = await githubFetch(query_url);
    const { artifacts } = (await res.json()) as { artifacts: Artifact[] };

    return artifacts.filter((a) => a.name.endsWith("_report") && !a.expired);
}

export async function fetchReport(repo: string, artifact: Artifact): Promise<Report> {
    const query_url = `repos/${repo}/actions/artifacts/${artifact.id}/zip`;
    const res = await githubFetch(query_url);
    const zip = Buffer.from(await res.arrayBuffer());

    return JSON.parse(readZipEntry(zip, "report.json").toString("utf8")) as Report;
}

export function runCommit(run: Run) {
    return {
        run: run.id,
        sha: run.head_sha,
        date: run.head_commit.timestamp,
        message: run.head_commit.message.split("\n")[0],
        author: run.head_commit.author?.name ?? "unknown",
    };
}
