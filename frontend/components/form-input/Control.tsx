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
import { FormattedMessage } from "react-intl";

import { displayText, TranslatableText } from "components/utils/i18n";

export interface ControlProps {
    id: string;
    label: TranslatableText;
    hint?: TranslatableText;
    children: React.ReactElement;
    /** Extra HTML/elements associated with this control, but not related to the main input itself */
    afterInput?: React.ReactNode;
    /** Is this field required? */
    isRequired?: boolean;
}

/**
 * Control: This wraps around a single input/control of some sort, and gives it a label.
 * Forms are built as a set of <Control> or <AutoControl> components inside a <Form>
 */
export const Control: React.FunctionComponent<ControlProps> = (props) => {
    const childInput = React.cloneElement(props.children, { id: props.id });
    const hasValue = childInput.props.value !== "" && childInput.props.value !== undefined;

    return (
        <div className={`mb-6`}>
            <label htmlFor={props.id} className="block w-max mb-1 text-sm font-semibold">
                {displayText(props.label)}
                {props.isRequired && (
                    <span
                        className={`text-xs p-1 mx-2 rounded-md  font-light ${
                            hasValue ? "text-gray-400" : "bg-amber-100 text-gray-800"
                        }`}
                    >
                        <FormattedMessage defaultMessage="Required" id="Seanpx" />
                    </span>
                )}
            </label>
            {props.afterInput ?
                <div className="flex flex-row">
                    {childInput}
                    {props.afterInput}
                </div>
            : childInput}
            {props.hint ? <span className="block text-sm text-gray-600">{displayText(props.hint)}</span> : null}
        </div>
    );
};
