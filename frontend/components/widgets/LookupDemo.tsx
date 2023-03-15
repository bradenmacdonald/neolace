/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React, { useId } from "react";
import { SDK } from "lib/sdk";

import { MDTContext } from "components/markdown-mdt/mdt";
import { LookupValue } from "./LookupValue";
import { Control } from "components/form-input/Form";
import { LookupExpressionInput } from "components/form-input/LookupExpressionInput";
import { defineMessage } from "components/utils/i18n";
import { Frame, FrameBody, FrameHeader } from "./Frame";

interface Props {
    expr: string;
    mdtContext: MDTContext;
    value: SDK.AnyLookupValue;
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
