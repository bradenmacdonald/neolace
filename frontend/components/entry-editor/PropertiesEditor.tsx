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

// We have to declare this empty object outside of the function below so it doesn't change on every call.
const emptyPropsRawArray: api.EditableEntryData["propertiesRaw"] = [];

interface Props {
    entry?: api.EditableEntryData;
}

/**
 * This widget implements the "Properties" tab of the "Edit Entry" page.
 */
export const PropertiesEditor: React.FunctionComponent<Props> = ({ entry, ...props }) => {
    const [schema, schemaError] = useSiteSchema();

    const entryType = entry?.entryType.id;

    // This list contains all the possible properties that can be applied to entries of this type:
    const applicableProperties = React.useMemo(() => {
        if (!schema || !entryType) return [];
        const props = Object.values(schema?.properties).filter((p) =>
            p.appliesTo.find((at) => at.entryType === entryType)
        );
        props.sort((a, b) => a.importance - b.importance);
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

    if (schemaError) {
        return (
            <ErrorMessage>
                <FormattedMessage defaultMessage="Unable to load schema" id="propertiesEditor.error.schema" />
            </ErrorMessage>
        );
    } else if (!schema || !entry) {
        return <Spinner />;
    } else if (!entry.entryType) {
        return (
            <p>
                <FormattedMessage
                    defaultMessage="You need to choose an entry type for this entry before you can set properties."
                    id="propertiesEditor.error.noEntryType"
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
                                <SinglePropertyEditor {...p} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Control
                id="addOtherProperty"
                label={{ defaultMessage: "Add another property:", id: "propertiesEditor.addAnother" }}
            >
                <SelectBox options={unsetProps.map((p) => ({ id: p.id, label: noTranslationNeeded(p.name) }))} />
            </Control>
        </>
    );
};

interface SinglePropertyEditorProps {
    prop: api.PropertyData;
    facts: api.RawPropertyData["facts"];
}

const SinglePropertyEditor: React.FunctionComponent<SinglePropertyEditorProps> = ({ prop, facts }) => {
    const intl = useIntl();

    if (prop.mode === api.PropertyMode.Auto) {
        return (
            <em className="text-gray-600 text-sm">
                <FormattedMessage defaultMessage="(Automatically computed)" id="propertiesEditor.autoProp" />
            </em>
        );
    }

    if (facts.length === 0) {
        // There are no values yet for this property, but we're still showing it because it's a "recommended" property:
        const message = defineMessage({
            defaultMessage: 'Add property value for "{propName}"',
            id: "propertiesEditor.autoProp",
        });
        return (
            <ToolbarButton icon="plus-lg" title={intl.formatMessage(message, {propName: prop.name})} />
        );
    } else {
        return <>
            {
                facts.map((fact, idx) => {
                    const isLast = (idx === facts.length - 1);
                    return (
                        <div key={idx} className="flex w-full min-w-0">
                            <LookupExpressionInput value={fact.valueExpression} onChange={() => {}} className="md:!min-w-[200px] flex-auto" />
                            <ToolbarButton icon="plus-lg" title={intl.formatMessage(defineMessage({
                                defaultMessage: "Add another property value",
                                id: "propertiesEditor.addAnother",
                            }))} />
                        </div>
                    );
                })
            }
        </>
    }
};
