/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import React from "react";

export enum Breakpoint {
    sm = 640,
    md = 768,
    lg = 1024,
    xl = 1280,
    "2xl" = 1536,
}

const calculateBreakpoint = (): Breakpoint => {
    if (typeof window === "undefined") {
        return Breakpoint.md; // On the server, just assume desktop
    }
    const width: number = window.innerWidth;
    if (width < Breakpoint.sm) {
        return Breakpoint.sm;
    } else if (width < Breakpoint.md) {
        return Breakpoint.md;
    } else if (width < Breakpoint.lg) {
        return Breakpoint.lg;
    } else if (width < Breakpoint.xl) {
        return Breakpoint.xl;
    }
    return Breakpoint["2xl"];
};

export const useBreakpoint = () => {
    const [breakpoint, setBreakpoint] = React.useState(() => calculateBreakpoint());

    React.useEffect(() => {
        const listener = () => {
            const newBreakpoint = calculateBreakpoint();
            setBreakpoint(newBreakpoint);
        };
        addEventListener("resize", listener);
        // Cleanup when we don't need to monitor the breakpoint anymore:
        return () => removeEventListener("resize", listener);
    }, []);

    return breakpoint;
};
