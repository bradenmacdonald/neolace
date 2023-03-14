/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import React from "react";

/** A general click event handler to watch for "click outside of an element" events */
export function useClickOutsideHandler(elementRef: React.RefObject<HTMLElement>, handler: (event: MouseEvent) => void) {
    const handleClickOutside = React.useCallback((event: MouseEvent) => {
        if (elementRef.current && !elementRef.current.contains(event.target as Node)) {
            // handler should call event.preventDefault() if it wants to.
            handler(event);
        }
    }, [handler, elementRef]);

    React.useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside, { passive: false });
        return () => { // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [handleClickOutside]);
}
