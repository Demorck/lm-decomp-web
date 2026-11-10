import { type Rect, squarify } from "../squarify.ts";
import type { Latest, Unit } from "../types.ts";
import { Fragment, useMemo, useRef } from "react";
import { useWidth } from "../hooks/useWidth.ts";

const WALL = 1;
const WING_WALL = 3;

const LEGEND = [
    {label: "Linked", swatch: "size-3.5 bg-green-200"},
    {label: "Matched", swatch: "size-3.5 bg-green-500"},
    {label: "Partly matched", swatch: "h-3.5 w-10 bg-linear-to-r from-night to-amber-400"},
    {label: "Not split yet", swatch: "size-3.5 bg-red-400"},
];

interface Wing {
    key: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rooms: Rect<{ unit: Unit; value: number }>[];
}

/**
 * Color of a room, same as the legend
 * @param unit The source file
 */
function roomColor(unit: Unit): string {
    if (unit.auto) return "var(--color-red-400)";
    if (unit.complete) return "var(--color-green-200)";
    if (unit.matchedCode >= unit.totalCode) return "var(--color-green-500)";

    return `color-mix(in oklab, var(--color-amber-400) ${unit.fuzzy.toFixed(0)}%, var(--color-night))`;
}

/**
 * Place the wings in the whole plan, then the rooms inside each wing
 * @param latest Data from `latest.json`
 * @param width Width of the plan in pixels
 * @param height Height of the plan in pixels
 */
function layout(latest: Latest, width: number, height: number): Wing[] {
    const names = new Map(latest.categories.map((c) => [c.id, c.name]));

    const groups = new Map<string, Unit[]>();
    for (const unit of latest.units) {
        if (unit.totalCode === 0) continue;
        const key = unit.auto ? "auto" : (unit.category ?? "other");
        if (!groups.has(key)) groups.set(key, []);

        groups.get(key)!.push(unit);
    }

    const items = [...groups]
        .map(([key, units]) => ({
            key,
            units: units.sort((a, b) => b.totalCode - a.totalCode),
            value: units.reduce((sum, u) => sum + u.totalCode, 0),
        }))
        .sort((a, b) => b.value - a.value);

    const half = WING_WALL / 2;
    return squarify(items, 0, 0, width, height).map(({item, x, y, w, h}) => {
        const inner = {x: x + half, y: y + half, w: w - WING_WALL, h: h - WING_WALL};
        return {
            key: item.key,
            label: item.key === "auto" ? "Not split yet" : (names.get(item.key) ?? "Uncategorized"),
            ...inner,
            rooms: squarify(item.units.map((unit) => ({unit, value: unit.totalCode})), inner.x, inner.y, inner.w,
                inner.h),
        };
    });
}

/**
 * Colors of the plan, to put above it
 */
export function TreemapLegend() {
    return (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-accent">
            {LEGEND.map(({label, swatch}) => (
                <span key={label} className="inline-flex items-center gap-2">
                    <i className={swatch}/>
                    {label}
                </span>
            ))}
        </div>
    );
}

/**
 * Plan of the game code: one wing per library and one room per source file, sized by its code and colored by how
 * well it matches
 * @param latest Data from `latest.json` of the selected version
 */
export function Treemap({ latest }: { latest: Latest }) {
    const ref = useRef<HTMLDivElement>(null);
    const width = useWidth(ref);
    // never under 360px so the small rooms stay visible
    const height = Math.max(360, Math.round(width * 0.55));
    const wings = useMemo(() => layout(latest, width, height), [latest, width, height]);

    return (
        <div ref={ref} className="relative overflow-hidden bg-primary/20" style={{ height }}>
            {wings.map((wing) => (
                <Fragment key={wing.key}>
                    {wing.rooms.map(({item: {unit}, x, y, w, h}) => (
                        <div key={unit.name} className="absolute"
                             style={{
                                 left: x,
                                 top: y,
                                 width: Math.max(0, w - WALL),
                                 height: Math.max(0, h - WALL),
                                 backgroundColor: roomColor(unit),
                             }}/>
                    ))}
                    {wing.w > 90 && wing.h > 30 && (
                        <span className="pointer-events-none absolute truncate bg-night/85 px-2 py-0.5 font-display
                            text-sm"
                              style={{ left: wing.x + 4, top: wing.y + 4, maxWidth: wing.w - 16 }}>
                            {wing.label}
                        </span>
                    )}
                </Fragment>
            ))}
        </div>
    );
}