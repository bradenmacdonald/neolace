import { useClickOutsideHandler, useKeyHandler } from "components/utils/events";
import { Portal } from "components/utils/Portal";
import React from "react";

interface ModalProps {
    children?: React.ReactNode;
    className?: string;
    onClose?: () => void;
}

/**
 * Display a modal, which is a dialogue that pops up and overlaps with everything else.
 */
export const Modal: React.FunctionComponent<ModalProps> = ({onClose, ...props}) => {
    const modalElement = React.useRef<HTMLDivElement | null>(null);

    // A general click event handler to watch for "click outside of modal" events
    const handleClickOutside = React.useCallback((event: MouseEvent|KeyboardEvent) => {
        if (onClose) {
            event.preventDefault();
            onClose();
        }
    }, [onClose]);

    useClickOutsideHandler(modalElement, handleClickOutside);
    useKeyHandler("Escape", handleClickOutside);

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
                        `border p-0 rounded bg-white border-gray-800 shadow font-normal z-modal ` +
                        (props.className ?? "")
                    }
                >
                    {props.children}
                </div>
            </Portal>
        </>
    );
};
