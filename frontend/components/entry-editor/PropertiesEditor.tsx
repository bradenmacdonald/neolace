import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { VNID } from "neolace-api";

import { defineMessage, noTranslationNeeded } from "components/utils/i18n";
import { api, useSiteSchema } from "lib/api-client";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Spinner } from "components/widgets/Spinner";
import { entryNode } from "components/graph/Node";
import { Control } from "components/widgets/Form";
import { SelectBox } from "components/widgets/SelectBox";
import { LookupExpressionInput } from "components/widgets/LookupExpressionInput";
import { Icon } from "components/widgets/Icon";
import { Button, ToolbarButton } from "components/widgets/Button";
import { Tooltip } from "components/widgets/Tooltip";
import { InlineMDT, MDTContext } from "components/markdown-mdt/mdt";

// We have to declare this empty object outside of the function below so it doesn't change on every call.
const emptyPropsRawArray: api.EditableEntryData["propertiesRaw"] = [];

interface Props {
    entry: api.EditableEntryData | undefined;
    /** The schema, including any schema changes which have been made within the current draft, if any. */
    schema: api.SiteSchemaData | undefined;
    addUnsavedEdit: (newEdit: api.AnyContentEdit) => void;
}

/**
 * This widget implements the "Properties" tab of the "Edit Entry" page.
 */
export const PropertiesEditor: React.FunctionComponent<Props> = ({ entry, schema, addUnsavedEdit, ...props }) => {
    const entryType = entry?.entryType.id;

    // This list contains all the possible properties that can be applied to entries of this type:
    const applicableProperties = React.useMemo(() => {
        if (!schema || !entryType) return [];
        const props = Object.values(schema?.properties).filter((p) =>
            p.appliesTo.find((at) => at.entryType === entryType)
        );
        props.sort((a, b) => a.rank - b.rank);
        return props;
    }, [schema, entryType]);

    const propertiesRaw = entry?.propertiesRaw ?? emptyPropsRawArray;
    const [activeProps, unsetProps] = React.useMemo(() => {
        const activeProps: { prop: api.PropertyData; facts: api.RawPropertyData["facts"] }[] = [];
        const unsetProps: api.PropertyData[] = [];

        for (const p of applicableProperties) {
            // If this property is set, it will have one or more "facts":
            const facts = propertiesRaw.find((pr) => pr.propertyId === p.id)?.facts ?? [];
            if (facts.length > 0 || p.mode !== api.PropertyMode.Optional) {
                activeProps.push({ prop: p, facts: facts });
            } else {
                unsetProps.push({ ...p });
            }
        }

        unsetProps.forEach((p) => {
            const parentPropIds = p.isA;
            if (parentPropIds && parentPropIds.length === 1) {
                const parentProp = applicableProperties.find((pp) => pp.id === parentPropIds[0]);
                if (parentProp) {
                    p.name = `${parentProp.name} > ${p.name}`;
                }
            }
        });
        unsetProps.sort((a, b) => a.name.localeCompare(b.name));

        return [activeProps, unsetProps];
    }, [applicableProperties, propertiesRaw]);

    // Handler for the menu at the bottom, to add a value for one of the "unsetProps" that has no value yet:
    const entryId = entry?.id;
    const handleAddNewProperty = React.useCallback((propId: string) => {
        if (!entryId) return;
        addUnsavedEdit({
            code: api.AddPropertyValue.code,
            data: {
                entryId,
                propertyId: VNID(propId),
                propertyFactId: VNID(),
                valueExpression: "",
            },
        });
    }, [addUnsavedEdit, entryId]);

    if (!schema || !entry) {
        return <Spinner />;
    } else if (!entry.entryType.id) {
        return (
            <p>
                <FormattedMessage
                    defaultMessage='Use the "Main" tab to choose an entry type for this entry before you set properties.'
                    id="qfzF5C"
                />
            </p>
        );
    }

    return (
        <>
            <table className="w-full table-fixed">
                <colgroup>
                    <col className="w-full md:w-1/4" />
                    <col />
                </colgroup>
                <tbody>
                    {activeProps.map((p) => (
                        <tr key={p.prop.id} className="even:bg-gray-50 hover:bg-blue-50">
                            <th className="block md:table-cell text-xs md:text-base -mb-1 md:mb-0 pt-1 md:py-1 pr-2 align-top text-left font-normal text-gray-500 md:text-gray-700 min-w-[120px]">
                                {p.prop.name}
                            </th>
                            <td className="block md:table-cell pr-2 pb-1 md:py-1 text-sm md:text-base">
                                <SinglePropertyEditor {...p} entryId={entry.id} addUnsavedEdit={addUnsavedEdit} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Control
                id="addOtherProperty"
                label={defineMessage({ defaultMessage: "Add another property:", id: 'wlyMMP' })}
            >
                <SelectBox
                    options={unsetProps.map((p) => ({ id: p.id, label: noTranslationNeeded(p.name) }))}
                    onChange={handleAddNewProperty}
                />
            </Control>
        </>
    );
};

interface SinglePropertyEditorProps {
    prop: api.PropertyData;
    facts: api.RawPropertyData["facts"];
    entryId: VNID;
    addUnsavedEdit: (newEdit: api.AnyContentEdit) => void;
}

const SinglePropertyEditor: React.FunctionComponent<SinglePropertyEditorProps> = (
    { prop, facts, addUnsavedEdit, entryId },
) => {
    const intl = useIntl();

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
                        id: 's7agyK',
                    }),
                    values: { propName: prop.name },
                }}
                onClick={() => {
                    addUnsavedEdit({
                        code: api.AddPropertyValue.code,
                        data: {
                            entryId,
                            propertyId: prop.id,
                            propertyFactId: VNID(),
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
                                    if (newValue !== currentValue) {
                                        addUnsavedEdit({
                                            code: api.UpdatePropertyValue.code,
                                            data: { entryId, propertyFactId: fact.id, valueExpression: newValue },
                                        });
                                    }
                                }}
                                className="md:!min-w-[200px] flex-auto"
                            />
                            <ToolbarButton
                                icon="plus-lg"
                                tooltip={defineMessage({
                                    defaultMessage: "Add another property value",
                                    id: '6d1F0k',
                                })}
                            />
                            {fact.note ?// TODO: We need an editor for notes and a better way to handle MDTContext here
                                <div className="w-full text-sm">
                                    Note: <InlineMDT mdt={fact.note} context={new MDTContext({})} />
                                </div>
                            :null}
                        </div>
                    );
                })}
            </>
        );
    }
};
