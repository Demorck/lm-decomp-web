import { type ReactNode, useLayoutEffect, useRef } from "react";

const GAP = 15;
const MARGIN = 8;
const BOX = "max-w-[320px] border border-primary/20 bg-night/95 px-3 py-2.5 text-sm shadow-lg";

export function TooltipTitle({ children }: { children: ReactNode }) {
    return <strong className="mb-1 block font-semibold wrap-break-word">{children}</strong>
}

export function TooltipRow({ label, value }: { label: ReactNode; value: ReactNode }) {
    return (
        <div className="flex justify-between gap-4 tabular-nums">
            <span className="text-primary-accent">{label}</span>
            <span>{value}</span>
        </div>
    )
}

/**
 * Small box that follows the cursor. It goes to the other side of the cursor if it leaves the window
 * @param x Cursor x in the Viewport
 * @param y Cursor y in the viewport
 * @param className
 * @param children Content on the tooltip
 */
export function Tooltip({ x, y, className = BOX, children }: { x: number; y: number; className?: string; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);


    useLayoutEffect(() => {
        const element = ref.current!;
        const {width, height} = element.getBoundingClientRect();

        let left = x + GAP;
        let top = y + GAP;
        if (left + width > window.innerWidth - MARGIN) left = x - width - GAP;
        if (top + height > window.innerHeight - MARGIN) top = y - height - GAP;

        element.style.left = `${Math.max(MARGIN, left)}px`;
        element.style.top = `${Math.max(MARGIN, top)}px`;
    });

    return (
        <div ref={ref} className={`pointer-events-none fixed z-10 ${className}`}>
            {children}
        </div>
    );
}