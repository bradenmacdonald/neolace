import { Portal } from 'components/utils/Portal';
import React from 'react';

interface ModalProps {
    children?: React.ReactNode;
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
                    className={`m-2 border p-1 rounded bg-white border-gray-800 shadow font-normal z-50`}
                >
                    {props.children}
                </div>
            </Portal>
        </>
    );
};
