/**
 * Rectangle placed by the squarify function
 */
export interface Rect<T> {
    item: T;
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Worst aspect ration of a row of rectangles. 1 is a square
 * @param sum Total area of the row
 * @param max Biggest area in the row
 * @param min Smallest area in the row
 * @param side Length of the side the row
 */
function worstRatio(sum: number, max: number, min: number, side: number): number {
    return Math.max(
        (side * side * max) / (sum * sum),
        (sum * sum) / (side * side * min)
    );
}

export function squarify<T extends { value: number }>(
    items: T[], x: number, y: number, w: number, h: number
): Rect<T>[] {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const result: Rect<T>[] = [];

    if (total === 0 || w <= 0 || h <= 0) return result;

    const areas = items.map((item) => (item.value / total) * w * h);

    let i = 0;
    while (i < items.length) {
        const side = Math.min(w, h);

        let sum = areas[i];
        let ratio = worstRatio(sum, areas[i], areas[i], side);
        let end = i + 1;
        while (end < items.length) {
            const next = worstRatio(sum + areas[end], areas[i], areas[end], side);
            if (next > ratio) break;

            sum += areas[end];
            ratio = next;
            end++;
        }

        const thickness = sum / side;
        let offset = 0;
        for (let j = i; j < end; j++) {
            const length = areas[j] / thickness;
            if (w >= h) result.push({item: items[j], x, y: y + offset, w: thickness, h: length});
            else result.push({item: items[j], x: x + offset, y, w: length, h: thickness});

            offset += length;
        }

        if (w >= h) {
            x += thickness;
            w -= thickness;
        } else {
            y += thickness;
            h -= thickness;
        }
        i = end;
    }

    return result;
}