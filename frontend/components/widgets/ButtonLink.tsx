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

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

/**
 * A button that looks like a link.
 *
 * In general, any widget which goes to a new page should be a <Link>/<a>, while any widget that performs an action on
 * the current page should be a Button. This refers to the actual HTML, not necessarily the visual appearance - so use
 * this <ButtonLink> for any actions that don't change the URL but should look like a link.
 *
 * forwardRef is used so that if you need to get a reference to the inner <button> using ref={...}, you can.
 */
export const ButtonLink = React.forwardRef<HTMLButtonElement, Props>(function Button({onClick, children, ...props}, ref) {
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (onClick) {
            onClick(event);
        }
    }, [onClick]);

    return <button ref={ref} onClick={handleClick} {...props} className={`
        inline underline text-theme-link-color
    `}>
        {children}
    </button>
});
