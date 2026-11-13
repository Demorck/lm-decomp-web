import { type RefObject, useLayoutEffect, useState } from "react";

/**
 * Inner wifth of an element updated each time the element is resied
 * @param ref Ref attached to the element
 * @returns width in pixel
 */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;

        setWidth(element.clientWidth);

        const observer = new ResizeObserver(() => setWidth(element.clientWidth));
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);

    return width;
}
