import React from 'react';

/**
 * This React hook can be used to watch a particular HTML element, and call a callback function if the element's size
 * has changed.
 * @param ref A React 'ref' object for the HTML element that we want to observe for size changes.
 * @param callback The function to call when the element's size has changed.
 */
export const useResizeObserver = (ref: React.RefObject<Element>, callback: () => void) => {

    // Use a ref to wrap the callback so that our ref never changes:
    const callbackRef = React.useRef<() => void>(callback);
    if (callbackRef.current !== callback) {
        callbackRef.current = callback;
    }
    // Since this handler uses the ref to call the callback, this handler never changes:
    const handleSizeChange = React.useCallback(() => {
        if (callbackRef.current) { callbackRef.current(); }
    }, []);

    const [observer] = React.useState<ResizeObserver>(
        typeof ResizeObserver === "undefined" ?
            // When pre-rendering on the server, or in browsers that don't support ResizeObserver, use a dummy object:
            { observe: () => null, disconnect: () => null } as unknown as ResizeObserver
        : new ResizeObserver(handleSizeChange)
    );

    React.useEffect(() => {
        if (ref.current) {
            observer.observe(ref.current);
        }
        // Cleanup:
        return () => {
            observer.disconnect();
        };
    }, [ref.current]);

}
