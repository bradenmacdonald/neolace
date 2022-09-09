import React from "react";

// A listener to handle for Pressing a certain button, usually ESC key press events
export function useKeyHandler(key: string, handler: (event: KeyboardEvent) => void) {
    const handleKeyPress = React.useCallback((event: KeyboardEvent) => {
        if (event.key === key) {
            handler(event);
        }
    }, [key, handler]);

    React.useEffect(() => {
        document.addEventListener("keydown", handleKeyPress, { passive: false });
        return () => { // Unbind the event listener on clean up
            document.removeEventListener("keydown", handleKeyPress);
        };
    }, [handleKeyPress]);
}
