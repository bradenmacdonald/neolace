import { Portal } from 'components/utils/Portal';
import React from 'react';

interface ModalProps {
    children?: React.ReactNode;
    className?: string;
    onClose?: () => void;
}

/**
 * Display a modal, which is a dialogue that pops up and overlaps with everything else.
 */
export const Modal: React.FunctionComponent<ModalProps> = (props) => {
    const modalElement = React.useRef<HTMLDivElement|null>(null);
    
    // A general click event handler to watch for "click outside of modal" events
    const handleClickOutside = React.useCallback((event: MouseEvent) => {
        if (props.onClose && modalElement.current && !modalElement.current.contains(event.target as Node)) {
            event.preventDefault();
            props.onClose();
        }
    }, [props.onClose]);

    React.useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside, {passive: false});
        return () => { // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [handleClickOutside]);

    // A listener to handle for ESC key press events
    const handleKeyPress = React.useCallback((event: KeyboardEvent) => {
        if (event.key === "Escape" && props.onClose) {
            event.preventDefault();
            props.onClose();
        }
    }, [props.onClose]);

    React.useEffect(() => {
        document.addEventListener("keydown", handleKeyPress, {passive: false});
        return () => { // Unbind the event listener on clean up
            document.removeEventListener("keydown", handleKeyPress);
        };
    }, [handleClickOutside]);

    return (
        <>
            <Portal>
                <div
                    ref={modalElement}
                    role="dialog"
                    aria-modal="true"
                    className={
                        // Modals are centered in the viewport, and not affected by scrolling (fixed):
                        `fixed left-[50vw] top-[50vh] -translate-x-1/2 -translate-y-1/2 ` +
                        // And this is the default appearance of our modals:
                        `border p-0 rounded bg-white border-gray-800 shadow font-normal z-50 ` +
                        (props.className ?? "")
                    }
                >
                    {props.children}
                </div>
            </Portal>
        </>
    );
};
