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

import { defineMessage } from "components/utils/i18n";
import { SDK } from "lib/sdk";
import { LookupExpressionInput } from "components/form-input/LookupExpressionInput";
import { ToolbarButton } from "components/widgets/Button";
import { InlineMDT, MDTContext } from "components/markdown-mdt/mdt";

interface Props {
    prop: SDK.PropertyData;
    facts: SDK.RawPropertyData["facts"];
    entryId: SDK.VNID;
    addUnsavedEdit: (newEdit: SDK.AnyContentEdit) => void;
}

/**
 * This widget implements the edit wiget for each individual property (e.g. "Scientific Name" for a plant entry)
 * on the "Properties" tab of the "Edit Entry" page.
 */
export const SinglePropertyEditor: React.FunctionComponent<Props> = (
    { prop, facts, addUnsavedEdit, entryId },
) => {

    if (prop.mode === SDK.PropertyMode.Auto) {
        return (
            <em className="text-gray-600 text-sm">
                <FormattedMessage defaultMessage="(Automatically computed)" id="3Wb62d" />
            </em>
        );
    }

    if (facts.length === 0) {
        // There are no values yet for this property, but we're still showing it because it's a "recommended" property:
        return (
            <ToolbarButton
                icon="plus-lg"
                tooltip={{
                    msg: defineMessage({
                        defaultMessage: 'Add property value for "{propName}"',
                        id: "s7agyK",
                    }),
                    values: { propName: prop.name },
                }}
                onClick={() => {
                    addUnsavedEdit({
                        code: SDK.AddPropertyFact.code,
                        data: {
                            entryId,
                            propertyKey: prop.key,
                            propertyFactId: SDK.VNID(),
                            valueExpression: "",
                        },
                    });
                }}
            />
        );
    } else {
        return (
            <>
                {facts.map((fact) => {
                    return (
                        <div key={fact.id} className="flex w-full min-w-0 flex-wrap">
                            {
                                /*
                                In the future, for simple values we can show the actual computed value, and not show
                                the lookup editor unless you click on the displayed value to edit it.
                            */
                            }
                            <LookupExpressionInput
                                value={fact.valueExpression}
                                onChange={(newValue) => {
                                    addUnsavedEdit({
                                        code: SDK.UpdatePropertyFact.code,
                                        data: { entryId, propertyFactId: fact.id, valueExpression: newValue },
                                    });
                                }}
                                className="md:!min-w-[200px] flex-auto"
                            />
                            <ToolbarButton
                                icon="dash-lg"
                                tooltip={defineMessage({
                                    defaultMessage: "Remove this property value",
                                    id: 'mtBE/b',
                                })}
                                onClick={() => {
                                    addUnsavedEdit({
                                        code: SDK.DeletePropertyFact.code,
                                        data: { entryId, propertyFactId: fact.id },
                                    });
                                }}
                            />
                            <ToolbarButton
                                icon="plus-lg"
                                tooltip={defineMessage({
                                    defaultMessage: "Add another property value",
                                    id: "6d1F0k",
                                })}
                                onClick={() => {
                                    addUnsavedEdit({
                                        code: SDK.AddPropertyFact.code,
                                        data: { entryId, propertyKey: prop.key, propertyFactId: SDK.VNID(), valueExpression: "" },
                                    });
                                }}
                            />
                            {fact.note ?// TODO: We need an editor for notes and a better way to handle MDTContext here
                                <div className="w-full text-sm">
                                    Note: <InlineMDT mdt={fact.note} context={new MDTContext({})} />
                                </div>
                            :null}
                            {fact.slot ? <div className="w-full text-sm">Slot: {fact.slot}</div> :null}
                        </div>
                    );
                })}
                {prop.description ?
                    <div className="text-sm mt-2 text-gray-600"><InlineMDT mdt={prop.description} context={new MDTContext({})} /></div>
                : null}
                {prop.editNote ?
                    <div className="text-sm mt-2 text-gray-600"><InlineMDT mdt={prop.editNote} context={new MDTContext({})} /></div>
                : null}
            </>
        );
    }
};
