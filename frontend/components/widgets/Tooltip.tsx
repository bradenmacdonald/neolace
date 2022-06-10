import type { VirtualElement } from '@popperjs/core';
import { Portal } from 'components/utils/Portal';
import React from 'react';
import { usePopper } from 'react-popper';

interface TooltipProps {
    tooltipContent: React.ReactNode;
    forceVisible?: boolean;
    onClickOutsideTooltip?: () => void;
    children?: VirtualElement | ((attribsForElement: Record<string, unknown>) => React.ReactNode);
}

function isVirtualElement(obj: unknown): obj is VirtualElement {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof obj === "object" && obj !== null && typeof (obj as any).getBoundingClientRect === "function";
}

/**
 * Display a tooltip that contains HTML
 */
export const Tooltip: React.FunctionComponent<TooltipProps> = (props) => {
    const tooltipId = React.useId();
    const [isElementHovered, setElementHovered] = React.useState(false);
    const [referenceElement, setReferenceElement] = React.useState<HTMLElement|null>(null);
    const [popperElement, setPopperElement] = React.useState<HTMLSpanElement|null>(null);
    const showTooltip = isElementHovered || props.forceVisible || false;
    const { styles, attributes } = usePopper(isVirtualElement(props.children) ? props.children : referenceElement, popperElement, {
        placement: "bottom-start",
        modifiers: [
            { name: 'offset', options: { offset: [0, 8] } },
            // Optimize performance by only updating the tooltip position while it's visible:
            { name: 'eventListeners', enabled: showTooltip },
        ],
    });

    const makeVisible = React.useCallback(() => { setElementHovered(true) }, [setElementHovered]);
    const makeHidden = React.useCallback(() => { setElementHovered(false) }, [setElementHovered]);
    // A general click event handler to watch for "click outside of tooltip" events
    const {onClickOutsideTooltip} = props;
    const handleClickOutside = React.useCallback((event: MouseEvent) => {
        if (onClickOutsideTooltip && popperElement && !popperElement.contains(event.target as Node)) {
            onClickOutsideTooltip();
        }
    }, [onClickOutsideTooltip, popperElement]);

    React.useEffect(() => {
        if (showTooltip && props.onClickOutsideTooltip) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [popperElement, showTooltip, props.onClickOutsideTooltip, handleClickOutside]);

    return (
        <>
            {typeof props.children === "function" ? props.children({
                ref: setReferenceElement,
                onMouseEnter: makeVisible,
                onFocus: makeVisible,
                onMouseLeave: makeHidden,
                onBlur: makeHidden,
                "aria-describedby": tooltipId,
            }) : null}

            <Portal>
                <div
                    role="tooltip"
                    id={tooltipId}
                    ref={setPopperElement}
                    style={styles.popper}
                    {...attributes.popper}
                    className={`
                        max-w-[400px] border p-1 rounded border-gray-800 shadow bg-blue-50 z-tooltip
                        text-sm font-normal neo-typography
                        ${showTooltip ? "visible opacity-100" : "invisible opacity-0"}
                        transition-opacity duration-500
                    `}
                    aria-hidden={!showTooltip}
                >
                    {showTooltip ? props.tooltipContent : null}
                </div>
            </Portal>
        </>
    );
};
