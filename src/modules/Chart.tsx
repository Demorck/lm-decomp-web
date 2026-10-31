import type {HistoryEntry, Measures} from "../types.ts";
import { type MouseEvent, useMemo, useRef, useState } from "react";
import {useWidth} from "../hooks/useWidth.ts";
import { formatDate, formatPercent, formatShortDate, percent } from "../formats.ts";
import { Tooltip, TooltipRow, TooltipTitle } from "./Tooltip.tsx";

interface Series {
    label: string;
    color: string;
    get: (m: Measures) => number;
}

const SERIES: Series[] = [
    {label: "Code", color: "text-green-500", get: (m) => percent(m.matchedCode, m.totalCode)},
    {label: "Data", color: "text-sky-400", get: (m) => percent(m.matchedData, m.totalData)},
    {label: "Functions", color: "text-violet-400", get: (m) => percent(m.matchedFunctions, m.totalFunctions)},
];

const HEIGHT = 300;
const PAD_CHART = { top: 10, right: 15, bottom: 25, left: 40 }

function scales(history: HistoryEntry[], width: number) {
    const times = history.map(entry => new Date(entry.date).getTime());
    const first = times[0];
    const last = times[times.length -1];
    const plotWidth = width - PAD_CHART.left - PAD_CHART.right;
    const plotHeight = HEIGHT - PAD_CHART.top - PAD_CHART.bottom;

    // Function that convert timestamp into a point. If only one build = in the middle of the chart
    const x = (t: number) =>
        last === first ?
            PAD_CHART.left + plotWidth / 2 :
            PAD_CHART.left + ((t - first) / (last - first)) * plotWidth;

    // Calcul max for y axis (round to 10%, clamped to 100)
    const max = Math.max(...history.flatMap(entry => SERIES.map(s => s.get(entry.measures))));
    const yMax = Math.min(100, Math.max(10, Math.ceil((max + 2) / 10) * 10 ));

    // Inverted SVG, y starts at the bottom
    const y = (v: number) => PAD_CHART.top + (1 - v / yMax) * plotHeight;

    // Ticks
    const yStep = yMax > 50 ? 20 : 10;
    const yTicks: number[] = [];
    for (let v = 0; v <= yMax; v += yStep) yTicks.push(v);


    const xCount = Math.max(2, Math.min(6, Math.floor(width / 140)));
    const xTicks = last === first ?
        [first] :
        Array.from({ length: xCount }, (_, i) => first + ((last - first) * i) / (xCount - 1));

    return { times, x, y, yTicks, xTicks };
}

export function ChartLegend() {
    return (
        <div className="flex gap-x-5 text-sm text-primary-accent">
            {SERIES.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-2">
                    <i className={`h-0.5 w-4 bg-current ${s.color}`}/>
                    {s.label}
                </span>
            ))}
        </div>
    );
}

function BuildTooltip({entry, x, y}: {entry: HistoryEntry; x: number; y: number}) {
    return (
        <Tooltip x={x} y={y} >
            <TooltipTitle>{entry.message}</TooltipTitle>
            <div className="mb-1 text-xs text-primary-accent">{entry.author}, {formatDate(entry.date)}</div>
            {SERIES.map(s => (
                <TooltipRow
                    key={s.label}
                    label={<><span className={s.color}>•</span> {s.label} </>}
                    value={formatPercent(s.get(entry.measures))} />
            ))}
        </Tooltip>
    )
}

export function Chart({ history }: { history: HistoryEntry[] }) {
    const ref = useRef<HTMLDivElement>(null);
    const width = useWidth(ref);
    const {times, x, y, yTicks, xTicks} = useMemo(() => scales(history, width), [history, width]);
    const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

    const points = (s: Series) =>
        history.map((entry, i) => `${x(times[i])},${y(s.get(entry.measures))}`).join(" ");

    const anchor = (i: number) => {
        if (xTicks.length === 1) return "middle";
        if (i === 0) return "start";
        if (i === xTicks.length - 1) return "end";
        return "middle";
    };

    function onMove(ev: MouseEvent<SVGRectElement>) {
        const mouseX = ev.clientX - ref.current!.getBoundingClientRect().left;
        let closest = 0;
        for (let i = 1; i < times.length; i++) {
            if (Math.abs(x(times[i]) - mouseX) < Math.abs(x(times[closest]) - mouseX)) closest = i;
        }

        setHover({index: closest, x: ev.clientX, y: ev.clientY});
    }

    return (
        <div ref={ref} style={{ height: HEIGHT }}>
            {history.length === 0 ? (
                <div className="grid h-full place-items-center text-primary-accent">
                    No builds recorded for this version
                </div>
            ) : width > 0 && (
                <>
                    <svg width={width} height={HEIGHT} className="block overflow-visible">
                        <g className="stroke-primary/15">
                            {yTicks.map((v) => (
                                <line key={v} x1={PAD_CHART.left} x2={width - PAD_CHART.right} y1={y(v)} y2={y(v)}/>
                            ))}
                        </g>

                        <g className="fill-primary-accent text-xs">
                            {yTicks.map((v) => (
                                <text key={v} x={PAD_CHART.left - 8} y={y(v) + 4} textAnchor="end">{v}%</text>
                            ))}
                            {xTicks.map((t, i) => (
                                <text key={t} x={x(t)} y={HEIGHT - 6} textAnchor={anchor(i)}>
                                    {formatShortDate(t)}
                                </text>
                            ))}
                        </g>

                        {SERIES.map((s) => (
                            <g key={s.label} className={s.color}>
                                <polyline points={points(s)} fill="none" stroke="currentColor" strokeWidth={2}
                                          strokeLinejoin="round"/>
                                {history.length <= 40 && history.map((entry, i) => (
                                    <circle key={i} cx={x(times[i])} cy={y(s.get(entry.measures))} r={2.5}
                                            fill="currentColor"/>
                                ))}
                            </g>
                        ))}

                        {hover && (
                            <line x1={x(times[hover.index])} x2={x(times[hover.index])}
                                  y1={PAD_CHART.top} y2={HEIGHT - PAD_CHART.bottom}
                                  strokeDasharray="3 3" className="stroke-primary-accent"/>
                        )}

                        <rect x={PAD_CHART.left} y={0} width={width - PAD_CHART.left - PAD_CHART.right} height={HEIGHT}
                        fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
                    </svg>
                    {hover && <BuildTooltip entry={history[hover.index]} x={hover.x} y={hover.y}/>}
                </>
            )}
        </div>
    );
}