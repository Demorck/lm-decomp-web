export interface Measures {
    fuzzy: number;
    matchedCode: number;
    completeCode: number;
    totalCode: number;
    matchedData: number;
    completeData: number;
    totalData: number;
    matchedFunctions: number;
    totalFunctions: number;
    completeUnits: number;
    totalUnits: number;
}

export interface Commit {
    run: number | null;
    sha: string;
    date: string;
    message: string;
    author: string;
}

export interface HistoryEntry extends Commit {
    measures: Measures;
    categories: Record<string, Measures>;
}

export interface Unit {
    name: string;
    source: string | null;
    category: string | null;
    auto: boolean;
    complete: boolean;
    fuzzy: number;
    matchedCode: number;
    totalCode: number;
    matchedFunctions: number;
    totalFunctions: number;
}

export interface Latest extends Commit {
    measures: Measures;
    categories: { id: string; name: string; measures: Measures }[];
    units: Unit[];
}

export interface VersionSummary {
    id: string;
    label: string;
    date: string | null;
    sha: string | null;
    measures: Measures | null;
}

export interface Index {
    upstream: string;
    branch: string;
    lastRun: number;
    versions: VersionSummary[];
}
