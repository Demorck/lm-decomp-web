import type {HistoryEntry} from "../types.ts";
import {useRef} from "react";
import {useWidth} from "../hooks/useWidth.ts";

const HEIGHT = 300;

export function Chart({ history }: { history: HistoryEntry[] }) {
    const ref = useRef(null);
    const width = useWidth(ref);

    return (
        <div ref={ref} style={{ height: HEIGHT }}>
            {history.length === 0 ? (
                <div className="grid h-full text-primary-accent place-items-center">
                    No builds recorded for this version
                </div>
            ) : width > 0 && (
                <svg width={width} height={HEIGHT} className="block">
                    { }
                    <text x={width / 2} y={HEIGHT / 2} textAnchor={"middle"}
                        className={"fill-primary-accent text-sm"}>
                        { width } px
                    </text>
                </svg>
            )}
        </div>
    );
}