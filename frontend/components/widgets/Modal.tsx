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
    const [modalElement, setModalElement] = React.useState<HTMLDivElement|null>(null);
    
    // A general click event handler to watch for "click outside of modal" events
    const handleClickOutside = React.useCallback((event: MouseEvent) => {
        if (props.onClose && modalElement && !modalElement.contains(event.target as Node)) {
            props.onClose();
        }
    }, [props.onClose, modalElement]);

    React.useEffect(() => {
        if (props.onClose) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [modalElement, props.onClose, handleClickOutside]);

    return (
        <>
            <Portal>
                <div
                    ref={setModalElement}
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
