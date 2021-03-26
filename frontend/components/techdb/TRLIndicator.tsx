import React from 'react';

import classes from './TRLIndicator.module.scss';

// TRL type. X prefix = "Obsolete" or "Abandoned"
export type TRL = "1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9" | "X1"|"X2"|"X3"|"X4"|"X5"|"X6"|"X7"|"X8"|"X9" | "?";
/** Convert a string to the TRL type, reliably. */
export function TRL(value: string): TRL {
    if (value === undefined || value === null || value === "") {
        return "?";
    }
    if (value.length === 2) {
        if (value.charAt(0) !== "X") { throw new Error(`Invalid TRL value: "${value}"`); }
    } else if (value.length !== 1) { throw new Error(`Invalid TRL value: "${value}"`); }
    const number = parseInt(value.charAt(value.length - 1), 10);
    if (!isNaN(number) && number >= 1 && number <= 9) {
        return value as TRL;
    }
    throw new Error(`Invalid TRL value: "${value}"`);
}

interface Props {
    trl: TRL;
    small?: boolean;
}

/**
 * An indicator for the Technology Readiness Level of a given technology
 * @param props 
 */
export const TRLIndicator: React.FunctionComponent<Props> = (props) => {

    let statusDescription = "Unknown";
    const number = parseInt(props.trl.charAt(props.trl.length - 1), 10);
    if (props.trl.charAt(0) === "X") {
        statusDescription = "Obsolete";
    } else if (!isNaN(number) && number >= 1 && number <= 9) {
        statusDescription = 
            number < 3 ? "Speculative" :
            number < 8 ? "Emerging" :
            "Ready"
    }

    // TODO: turn icon part into an SVG ?
    // TODO: improve accessibility
    // TODO: i18n
    // TODO: explain the TRL when the user hovers over it

    // Node: the label/abbreviation "TRL" should NOT be translated; the abbreviation is universal.

    return <div className={`${classes.trl} ${props.small ? classes.small : ""}`} data-trl={props.trl}>
        <div className={classes.label}>
            {statusDescription}
        </div>
        <div className={classes.icon}>
            <span style={{fontSize: '8px'}}>TRL</span><br/>
            {props.trl}
        </div>
    </div>
};
