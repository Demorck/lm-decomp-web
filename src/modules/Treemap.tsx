import { type Rect, squarify } from "../squarify.ts";
import type { Latest, Unit } from "../types.ts";
import { type CSSProperties, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useWidth } from "../hooks/useWidth.ts";
import { Tooltip } from "./Tooltip.tsx";
import { formatBytes, formatInt, formatPercent, percent } from "../formats.ts";
import { MARIO_SOUNDS } from "../assets/sounds.ts";

const WALL = 1;
const WING_WALL = 3;

const LEGEND = [
    { label: "Linked", swatch: "lamp-cleared size-3.5 bg-light-bright" },
    { label: "Matched", swatch: "size-3.5 bg-light" },
    { label: "Partly matched", swatch: "h-3.5 w-10 bg-linear-to-r from-room to-light/55" },
    { label: "Not split yet", swatch: "dots size-3.5 border border-wall bg-night" },
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
    if (unit.auto) return "var(--color-night)";
    if (unit.complete) return "var(--color-light-bright)";
    if (unit.matchedCode >= unit.totalCode) return "var(--color-light)";

    return `color-mix(in oklab, var(--color-light) ${(unit.fuzzy * 0.55).toFixed(0)}%, var(--color-room))`;
}

function lampClass(unit: Unit): string {
    if (unit.auto) return "dots";

    return unit.complete ? "lamp lamp-cleared" : "lamp";
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
    return squarify(items, 0, 0, width, height).map(({ item, x, y, w, h }) => {
        const inner = { x: x + half, y: y + half, w: w - WING_WALL, h: h - WING_WALL };
        return {
            key: item.key,
            label: item.key === "auto" ? "Not split yet" : (names.get(item.key) ?? "Uncategorized"),
            ...inner,
            rooms: squarify(
                item.units.map((unit) => ({ unit, value: unit.totalCode })),
                inner.x,
                inner.y,
                inner.w,
                inner.h,
            ),
        };
    });
}

/**
 * One line on the screen of the Game Boy Horror
 * @param label Name of the value
 * @param value Value already formatted
 */
function LcdRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-3">
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

/**
 * Status of a file in the words of the legend
 * @param unit The source file
 */
function unitStatus(unit: Unit): string {
    if (unit.auto) return "Not split yet";
    if (unit.complete) return "Linked";
    if (unit.matchedCode >= unit.totalCode) return "Matched";

    return `Partly Matched`;
}

/**
 * Tooltip of one room with file name, status, percent and how much of it matches
 * @param unit The file under the cursor
 * @param x Cursor x in the viewport
 * @param y Cursor y in the viewport
 */
function UnitTooltip({ unit, x, y }: { unit: Unit; x: number; y: number }) {
    const matched = percent(unit.matchedCode, unit.totalCode);
    const currentStatus = unitStatus(unit);
    let ledColor: string;

    if (currentStatus == "Not split yet") ledColor = "bg-red-500 shadow-red-500";
    else if (currentStatus == "Linked") ledColor = "bg-green-500 shadow-green-500";
    else if (currentStatus == "Matched") ledColor = "bg-blue-500 shadow-blue-500";
    else ledColor = "bg-amber-500 shadow-amber-500";

    return (
        <Tooltip x={x} y={y} className="w-64 rounded-[12px_12px_36px_12px] bg-gbh p-3 pb-4">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold tracking-[0.2] text-primary/70">
                <span className={`${ledColor} size-2 animate-pulse rounded-full shadow-[0_0_10px]`} />
                GameBoy Horror
            </div>

            <div className="rounded-md bg-gbh-bezel p-1">
                <div className="lcd px-2 py-1.5 font-pixel text-lg leading-tight text-lcd-ink">
                    <div className={"text-xl font-normal wrap-break-word"}>{unit.name}</div>
                    <div className="text-lcd-dim">&gt; {currentStatus}</div>
                    <div className="my-2 h-4 border border-lcd-ink p-0.5">
                        <div className="h-full bg-lcd-ink" style={{ width: `${matched}%` }}></div>
                    </div>
                    <LcdRow label="Match" value={formatPercent(matched)} />
                    {!unit.auto && <LcdRow label="Fuzzy" value={formatPercent(unit.fuzzy)} />}
                    <LcdRow label="Code" value={`${formatBytes(unit.matchedCode)}/${formatBytes(unit.totalCode)}`} />
                    <LcdRow
                        label="Func"
                        value={`${formatInt(unit.matchedFunctions)}/${formatInt(unit.totalFunctions)}`}
                    />
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between px-2">
                <div className="relative size-8">
                    <span className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-sm bg-gbh-bezel" />
                    <span className="absolute inset-y-0 left-1/2 w-2.5 -translate-x-1/2 rounded-sm bg-gbh-bezel" />
                </div>
                <div className="flex -rotate-25 gap-2">
                    <span className="size-4 rounded-full bg-gbh-button shadow-inner" />
                    <span className="size-4 rounded-full bg-gbh-button shadow-inner" />
                </div>
            </div>
        </Tooltip>
    );
}

/**
 * Colors of the plan, to put above it
 */
export function TreemapLegend() {
    return (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-accent">
            {LEGEND.map(({ label, swatch }) => (
                <span key={label} className="inline-flex items-center gap-2">
                    <i className={swatch} />
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
 * @param query Text of the search field
 * @param sourceBase Url prefix of the source files on GitHub, each room links to its file
 */
export function Treemap({ latest, query, sourceBase }: { latest: Latest; query: string; sourceBase: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const width = useWidth(ref);
    // never under 360px so the small rooms stay visible
    const height = Math.max(360, Math.round(width * 0.55));
    const wings = useMemo(() => layout(latest, width, height), [latest, width, height]);
    const [hover, setHover] = useState<{ unit: Unit; x: number; y: number; left: number; top: number } | null>(null);

    const search = query.trim().toLowerCase();
    const matches = (unit: Unit) => !search || unit.name.toLowerCase().includes(search);
    const callingMario = search === "mario";

    useEffect(() => {
        if (!callingMario) return;

        const randomInt = Math.floor(Math.random() * MARIO_SOUNDS.length);
        const audio = new Audio(MARIO_SOUNDS[randomInt]);
        audio.play().catch(() => {});
        return () => audio.pause();
    }, [callingMario]);

    return (
        <div
            ref={ref}
            className="relative overflow-hidden bg-wall"
            style={{ height }}
            onMouseLeave={() => setHover(null)}
        >
            {wings.map((wing) => (
                <Fragment key={wing.key}>
                    {wing.rooms.map(({ item: { unit }, x, y, w, h }) => (
                        <a
                            key={unit.name}
                            href={unit.source ? sourceBase + unit.source : undefined}
                            target="_blank"
                            rel="noreferrer"
                            className={`absolute transition-opacity ${lampClass(unit)} hover:z-10 hover:outline-2 hover:-outline-offset-2 hover:outline-primary ${matches(unit) ? "" : "opacity-15"}`}
                            onMouseMove={(ev) => {
                                const box = ref.current!.getBoundingClientRect();
                                setHover({
                                    unit,
                                    x: ev.clientX,
                                    y: ev.clientY,
                                    left: ev.clientX - box.left,
                                    top: ev.clientY - box.top,
                                });
                            }}
                            style={{
                                left: x,
                                top: y,
                                width: Math.max(0, w - WALL),
                                height: Math.max(0, h - WALL),
                                backgroundColor: roomColor(unit),
                                animationDelay: `${((x + y) / (width + height)) * 1.2}s`,
                            }}
                        />
                    ))}
                    {wing.w > 90 && wing.h > 30 && (
                        <span
                            className="pointer-events-none absolute truncate bg-night/85 px-2 py-0.5 font-display text-sm"
                            style={{ left: wing.x + 4, top: wing.y + 4, maxWidth: wing.w - 16 }}
                        >
                            {wing.label}
                        </span>
                    )}
                </Fragment>
            ))}
            {hover && (
                <div
                    className="flashlight pointer-events-none absolute inset-0"
                    style={{ "--x": `${hover.left}px`, "--y": `${hover.top}px` } as CSSProperties}
                />
            )}
            {hover && <UnitTooltip unit={hover.unit} x={hover.x} y={hover.y} />}
            {callingMario && (
                <p className="pointer-events-none absolute inset-0 m-0 grid animate-pulse place-items-center font-display text-5xl text-light-bright">
                    Mario... ?
                </p>
            )}
        </div>
    );
}
