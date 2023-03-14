/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import React from "react";

/**
 * This is a React hook to help determine if a specific element has the focus or not.
 *
 * Given the complex UI of MDTEditor, the concept of whether or not the user is actively "focused" on the editor is a
 * little vague, so this attempts to clarify it.
 *
 * Trying naively to use focus/blur to test whether the focused element is within the editor's overall DIV does not work
 * for example, because if you are currently editing text in the editor and then click a button on the toolbar, we want
 * to think of that as one continuous editing workflow (you're not blurring focus entirely out of the editor), but the
 * browser will actually send events to say (1) you've blurred the editor, (2) the active focus is the body (none), then
 * (3) the active focus is the toolbar button. When (2) happens we don't want to send an "onBlur" event to our parent
 * because the user's focus never intentionally left the overall editor.
 */
export function useSmartFocusAwareness(rootElement: HTMLDivElement | null, onFocusChange?: (isFocused: boolean) => void) {
    const [isFocused, setIsFocusedInternal] = React.useState(false);

    // This seems to be the most reliable way to be able to send onFocusChange events without causing unecessary state
    // changes and weird bugs in Firefox when used with Slate.js
    const setIsFocused = React.useCallback((newValue: boolean) => {
        let changed = false;
        setIsFocusedInternal((oldValue) => {
            if (oldValue !== newValue) {
                changed = true;
            }
            return newValue;
        });
        if (changed && onFocusChange) {
            onFocusChange(newValue);
        }
    }, [onFocusChange]);

    const handleClick = React.useCallback((event: MouseEvent) => {
        // The user has clicked somewhere. If the click was inside the element, we are active.
        // If the click was outside, we are definitely inactive.
        setIsFocused(rootElement ? rootElement.contains(event.target as Node) : false);
    }, [rootElement, setIsFocused]);

    React.useEffect(() => {
        document.addEventListener("mousedown", handleClick);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClick);
        };
    }, [handleClick]);

    const handleFocus = React.useCallback((event: FocusEvent) => {
        // The user has focused on something. If it's document.body or NULL, we may still be "active" but if it's an
        // actual element and it's outside this element, we are no longer active.
        if (document.activeElement === null || document.activeElement === document.body) {
            return; // Inconclusive
        }
        setIsFocused(rootElement?.contains(document.activeElement) ?? false);
    }, [rootElement, setIsFocused]);

    React.useEffect(() => {
        document.addEventListener("focusin", handleFocus);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("focusin", handleFocus);
        };
    }, [handleFocus]);

    return isFocused;
}
