import React, { useId } from "react";
import { api } from "lib/api";

import { MDTContext } from "components/markdown-mdt/mdt";
import { LookupValue } from "./LookupValue";
import { Control, LookupExpressionInput } from "components/form-input";
import { defineMessage } from "components/utils/i18n";
import { Frame, FrameBody, FrameHeader } from "./Frame";

interface Props {
    expr: string;
    mdtContext: MDTContext;
    value: api.AnyLookupValue;
}

/**
 * A widget which shows a lookup expression and its value.
 */
export const LookupDemo: React.FunctionComponent<Props> = ({expr, value, ...props}) => {

    const id = useId();

    return (
        <Frame>
            <FrameHeader className="!p-2 [&_label]:text-gray-600 [&_div]:!mb-0">
                <Control
                    id={id}
                    label={defineMessage({ defaultMessage: "Lookup expression", id: '9ysq3k' })}
                >
                    <LookupExpressionInput
                        readOnly
                        value={expr}
                        className="bg-gray-50 !border-gray-200 !w-full"
                    />
                </Control>
            </FrameHeader>
            <FrameBody>
                <LookupValue value={value} mdtContext={props.mdtContext} />
            </FrameBody>
        </Frame>
    );
};
