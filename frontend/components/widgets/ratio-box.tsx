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

interface Props {
    ratio: number | undefined;
    children: React.ReactNode;
}

/**
 * Display a rectangle that fits to width of its parent element but maintains its height
 * proportional to some ratio
 */
export const RatioBox: React.FunctionComponent<Props> = (props) => {
    if (props.ratio === undefined || Number.isNaN(props.ratio)) {
        return (
            <div>
                {props.children}
            </div>
        );
    }

    return (
        <div className="relative h-0" style={{ paddingBottom: `${100.0 / props.ratio}%` }}>
            <div className="absolute top-0 left-0 w-full h-full">
                {props.children}
            </div>
        </div>
    );
};
