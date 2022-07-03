import React from "react";
import { Tooltip } from "./Tooltip";

interface Props {
    displayText?: string;
    superscript?: boolean;
    children: React.ReactNode;
}

/**
 * Display a link that looks like (*) which will display a tooltip when hovered over, and which will stay open when
 * clicked.
 */
export const HoverClickNote: React.FunctionComponent<Props> = (props) => {
    const displayText = props.displayText ?? "(*)";
    const superscript = props.superscript ?? true;
    const [isClickedOpen, setOpen] = React.useState(false);
    const handleClick = React.useCallback(
        (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            setOpen(!isClickedOpen);
        },
        [isClickedOpen, setOpen],
    );
    const handleClickOutside = React.useCallback(
        () => {
            setOpen(false);
        },
        [setOpen],
    );

    return (
        <Tooltip
            tooltipContent={props.children}
            forceVisible={isClickedOpen}
            onClickOutsideTooltip={handleClickOutside}
        >
            {(attribs) => (
                <a
                    href="#"
                    {...attribs}
                    className="ml-[3px]"
                    style={isClickedOpen ? { color: "inherit", textDecoration: "none", cursor: "default" } : {}}
                    onClick={handleClick}
                >
                    {superscript ? <sup>{displayText}</sup> : displayText}
                </a>
            )}
        </Tooltip>
    );
};
