import React from 'react';
import { usePopper } from 'react-popper';

interface TooltipProps {
    tooltipContent: React.ReactNode;
    children?: (attribsForElement: Record<string, React.ReactNode>) => React.ReactNode;
}

let uniqueId = 0;

/**
 * Display a tooltip that contains HTML
 */
export const Tooltip: React.FunctionComponent<TooltipProps> = (props) => {
    const [tooltipId] = React.useState(() => `neo-tooltip${uniqueId++}`);
    const [isTooltipVisible, setTooltipVisibility] = React.useState(false);
    const [referenceElement, setReferenceElement] = React.useState(null);
    const [popperElement, setPopperElement] = React.useState(null);
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: "bottom-start",
        modifiers: [
            { name: 'offset', options: { offset: [0, 8] } },
            // Optimize performance by only updating the tooltip position while it's visible:
            { name: 'eventListeners', enabled: isTooltipVisible },
        ],
    });

    return (
        <>
            {props.children ? props.children({
                ref: setReferenceElement,
                onMouseEnter: () => setTooltipVisibility(true),
                onFocus: () => setTooltipVisibility(true),
                onMouseLeave: () => setTooltipVisibility(false),
                onBlur: () => setTooltipVisibility(false),
                "aria-describedby": tooltipId,
            }) : null}

            <span
                role="tooltip"
                id={tooltipId}
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}
                className={`max-w-[400px] border p-1 rounded border-gray-800 shadow bg-blue-50 text-sm ${isTooltipVisible ? "visible opacity-100" : "invisible opacity-0"} transition-opacity duration-500 font-normal`}
                aria-hidden={!isTooltipVisible}
            >
                {isTooltipVisible ? props.tooltipContent : null}
            </span>
        </>
    );
};
