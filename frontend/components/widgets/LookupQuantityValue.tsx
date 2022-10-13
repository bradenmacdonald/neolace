import React from "react";

import { api } from "lib/api";
import { Tooltip } from "components/widgets/Tooltip";

interface Props {
    value: api.QuantityValue;
    hideUnits?: boolean;
}

/**
 * Render a Quantity Value (a number with optional units)
 */
export const LookupQuantityValue: React.FunctionComponent<Props> = ({value, hideUnits}) => {

    if (value.conversions && Object.keys(value.conversions).length > 0) {
        // Display some helpful conversions in a tooltip
        return <>
            <Tooltip tooltipContent={<>
                {value.conversions.primary ? <>
                    {value.conversions.primary.magnitude.toPrecision(value.magnitude.toString().length + 1)} <DisplayUnits units={value.conversions.primary.units}/><br />
                </> : null}
                {value.conversions.base ? <>
                    {value.conversions.base.magnitude.toPrecision(value.magnitude.toString().length + 1)} <DisplayUnits units={value.conversions.base.units}/><br />
                </> : null}
                {value.conversions.uscs ? <>
                    {value.conversions.uscs.magnitude.toPrecision(value.magnitude.toString().length + 1)} <DisplayUnits units={value.conversions.uscs.units}/><br />
                </> : null}
            </>}>
                {attribs => <span {...attribs}>{value.magnitude} {hideUnits ? null : <DisplayUnits units={value.units}/>}</span>}
            </Tooltip>
            
        </>;
    }
    return <>{value.magnitude} {hideUnits ? null : value.units}</>
};

/**
 * Display units like "km" or "°C"
 */
 export const DisplayUnits: React.FunctionComponent<{units: string|undefined}> = ({units}) => {

    if (units === undefined) {
        return <></>;
    }

    let result = "";
    for (const fracPart of units.split("/")) {
        if (result) {
            result += "/";
        }

        const parts = fracPart.split("⋅").map((part) => (
            part === "degC" ? "°C" :
            part === "degF" ? "°F" :
            part
        ));
        result += parts.join("⋅");
    }
    return <>{result}</>;
};