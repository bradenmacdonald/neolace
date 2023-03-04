import React from "react";

import { SDK } from "lib/sdk";
import { Tooltip } from "components/widgets/Tooltip";
import { FormattedMessage } from "react-intl";
import { defineMessage, displayText, TranslatableText } from "components/utils/i18n";

interface Props {
    value: SDK.QuantityValue;
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
    return <>{value.magnitude} {hideUnits ? null : <DisplayUnits units={value.units}/>}</>
};

/**
 * Display units like "km" or "°C"
 */
 export const DisplayUnits: React.FunctionComponent<{units: string|undefined}> = ({units}) => {

    if (units === undefined) {
        return <></>;
    }

    let explanation: TranslatableText|undefined;
    if (units === "pphpd") {
        explanation = defineMessage({defaultMessage: "Passengers Per Hour Per Direction", id: "cHykpV"});
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

    if (explanation) {
        // Display this unit with a tooltip that explains what it is.
        return (
            <Tooltip tooltipContent={displayText(explanation)}>
                {attribs => <span {...attribs}>{units}</span>}
            </Tooltip>
        );
    } else {
        return <>{result}</>;
    }
};
