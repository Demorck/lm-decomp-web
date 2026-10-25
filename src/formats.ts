/**
 * Get the percentage of part on total
 * @param part The matched amount
 * @param total The total amount
 * @returns Percentage between 0 and 100, `0` if total is 0 (avoid a `NaN`)
 */
export function percent(part: number, total: number): number {
    return total ? (part / total) * 100 : 0;
}

/**
 * Format a percentage for display (42.13%)
 * @param v The percentage already multiplied by 100
 * @param digits Number of decimals
 */
export function formatPercent(v: number, digits: number = 2): string {
    return `${v.toFixed(digits)}%`;
}

/**
 * Format a size in bytes with the right unit (B, KB or MB)
 * @param v Size in bytes
 */
export function formatBytes(v: number): string {
    if (v >= 1024 * 1024) return `${(v / 1024 / 1024).toFixed(2)} MB`;
    if (v >= 1024) return `${(v / 1024).toFixed(1)} KB`;
    return `${v} B`;
}

/**
 * Format an ISO date in a readable way (11 Sept 2001)
 * @param iso The ISO date string
 */
export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Each step is how many of the current unit we need before switching to the next one
// (60 seconds -> 1 minute, 24 hours -> 1 day...). Month is approximated to 30 days
const STEPS: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Infinity, "year"],
];

/**
 * Give a relative time from now
 * Divide the value by each step until it fits in the unit
 * @param iso The ISO date string
 * @returns The relative time or the raw `iso` if nothing matched
 */
export function timeAgo(iso: string): string {
    let value = (new Date(iso).getTime() - Date.now()) / 1000;

    for (const [size, unit] of STEPS) {
        if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);

        value /= size;
    }

    return iso;
}
