/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";
import { useKeyHandler } from "lib/hooks/useKeyHandler";
import { Portal } from "components/utils/Portal";
import { useZIndex, IncreaseZIndex, ZIndexContext } from "lib/hooks/useZIndex";
import { TranslatableString, displayText } from "components/utils/i18n";

interface ModalProps {
    children?: React.ReactNode;
    className?: string;
    onClose?: () => void;
    /** The title to display on the modal. Providing this or actionBar changes the layout of the modal. */
    title?: TranslatableString;
    /** React node containing buttons to display at the bottom of the modal. */
    actionBar?: React.ReactNode;

    /** Optional ref to the scrollable <div> inside the modal, if title or actionBar was used. */
    scrollableRef?: React.Ref<HTMLDivElement>;
}

/**
 * Display a modal, which is a dialogue that pops up and overlaps with everything else.
 */
export const Modal: React.FunctionComponent<ModalProps> = ({ onClose, ...props }) => {
    // A general click event handler to watch for "click outside of modal" events
    const handleClickOutside = React.useCallback((event: React.MouseEvent | KeyboardEvent) => {
        if (onClose) {
            event.preventDefault();
            onClose();
        }
    }, [onClose]);

    useKeyHandler("Escape", handleClickOutside);

    const zIndex = useZIndex({increaseBy: IncreaseZIndex.ForModal});

    return (
        <Portal>
            <ZIndexContext.Provider value={zIndex}>
                <div
                    className={`fixed left-0 top-0 right-0 bottom-0 bg-slate-500 bg-opacity-20`}
                    style={{zIndex: zIndex - 1}}
                    onClick={handleClickOutside}
                >{/* This <div> darkens the background behind the modal and detects when the user clicks outside. */}</div>
                <div
                    role="dialog"
                    aria-modal="true"
                    className={
                        // Modals are centered in the viewport, and not affected by scrolling (fixed):
                        `fixed left-[50vw] top-[50vh] -translate-x-1/2 -translate-y-1/2 ` +
                        // And this is the default appearance of our modals:
                        `border p-0 rounded bg-white border-slate-400 shadow font-normal ` +
                        (props.className ?? "")
                    }
                    style={{zIndex}}
                >
                    {
                        (props.actionBar || props.title) ?
                            <div className="flex flex-col h-full">
                                {props.title ? <div className="flex-none bg-slate-100 border-b rounded-t border-slate-400"><h1 className="m-0 p-2 font-bold">{displayText(props.title)}</h1></div> : null}
                                <div ref={props.scrollableRef} className="flex-auto p-2 overflow-y-auto overscroll-contain neo-typography">{props.children}</div>
                                {props.actionBar ? <div className="flex-none bg-slate-100 border-t rounded-b border-slate-400">{props.actionBar}</div> : null}
                            </div>
                        : props.children
                    }
                </div>
            </ZIndexContext.Provider>
        </Portal>
    );
};
