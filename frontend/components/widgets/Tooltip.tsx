import { Portal } from 'components/utils/Portal';
import React from 'react';
import { usePopper } from 'react-popper';

interface TooltipProps {
    tooltipContent: React.ReactNode;
    forceVisible?: boolean;
    onClickOutsideTooltip?: () => void;
    children?: (attribsForElement: Record<string, React.ReactNode>) => React.ReactNode;
}

let uniqueId = 0;

/**
 * Display a tooltip that contains HTML
 */
export const Tooltip: React.FunctionComponent<TooltipProps> = (props) => {
    // TODO: change this to useId() hook in React 18 : https://reactjs.org/docs/hooks-reference.html#useid
    const [tooltipId] = React.useState(() => `neo-tooltip${uniqueId++}`);
    const [isElementHovered, setElementHovered] = React.useState(false);
    const [referenceElement, setReferenceElement] = React.useState<HTMLElement|null>(null);
    const [popperElement, setPopperElement] = React.useState<HTMLSpanElement|null>(null);
    const showTooltip = isElementHovered || props.forceVisible || false;
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
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
    const handleClickOutside = React.useCallback((event: MouseEvent) => {
        if (props.onClickOutsideTooltip && popperElement && !popperElement.contains(event.target as Node)) {
            props.onClickOutsideTooltip();
        }
    }, [props.onClickOutsideTooltip, popperElement]);

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
            {props.children ? props.children({
                ref: setReferenceElement,
                onMouseEnter: makeVisible,
                onFocus: makeVisible,
                onMouseLeave: makeHidden,
                onBlur: makeHidden,
                "aria-describedby": tooltipId,
            }) : null}

            <Portal>
                <span
                    role="tooltip"
                    id={tooltipId}
                    ref={setPopperElement}
                    style={styles.popper}
                    {...attributes.popper}
                    className={`max-w-[400px] border p-1 rounded border-gray-800 shadow bg-blue-50 text-sm ${showTooltip ? "visible opacity-100" : "invisible opacity-0"} transition-opacity duration-500 font-normal z-10`}
                    aria-hidden={!showTooltip}
                >
                    {showTooltip ? props.tooltipContent : null}
                </span>
            </Portal>
        </>
    );
};
