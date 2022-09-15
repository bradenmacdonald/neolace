import React from "react";
import { FormattedMessage } from "react-intl";

import { defineMessage } from "components/utils/i18n";
import { api } from "lib/api";
import { LookupExpressionInput } from "components/form-input";
import { ToolbarButton } from "components/widgets/Button";
import { InlineMDT, MDTContext } from "components/markdown-mdt/mdt";

interface Props {
    prop: api.PropertyData;
    facts: api.RawPropertyData["facts"];
    entryId: api.VNID;
    addUnsavedEdit: (newEdit: api.AnyContentEdit) => void;
}

/**
 * This widget implements the edit wiget for each individual property (e.g. "Scientific Name" for a plant entry)
 * on the "Properties" tab of the "Edit Entry" page.
 */
export const SinglePropertyEditor: React.FunctionComponent<Props> = (
    { prop, facts, addUnsavedEdit, entryId },
) => {

    if (prop.mode === api.PropertyMode.Auto) {
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
                        code: api.AddPropertyValue.code,
                        data: {
                            entryId,
                            propertyId: prop.id,
                            propertyFactId: api.VNID(),
                            valueExpression: "",
                        },
                    });
                }}
            />
        );
    } else {
        return (
            <>
                {facts.map((fact, idx) => {
                    // const isLast = (idx === facts.length - 1);
                    const currentValue = fact.valueExpression;
                    return (
                        <div key={idx} className="flex w-full min-w-0 flex-wrap">
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
                                        code: api.UpdatePropertyValue.code,
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
                                        code: api.DeletePropertyValue.code,
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
                                        code: api.AddPropertyValue.code,
                                        data: { entryId, propertyId: prop.id, propertyFactId: api.VNID(), valueExpression: "" },
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
            </>
        );
    }
};
