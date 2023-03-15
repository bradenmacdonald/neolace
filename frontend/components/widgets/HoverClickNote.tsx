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
