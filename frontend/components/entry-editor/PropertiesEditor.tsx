import React from "react";
import { FormattedMessage } from "react-intl";
import { VNID } from "neolace-api";

import { defineMessage, noTranslationNeeded } from "components/utils/i18n";
import { api, usePermission, useSchema } from "lib/api";
import { Spinner } from "components/widgets/Spinner";
import { Control, SelectBox } from "components/form-input";
import { SinglePropertyEditor } from "./SinglePropertyEditor";
import { ToolbarButton } from "components/widgets/Button";
import { EditSchemaPropertiesModal } from "components/schema-editor/EditSchemaPropertiesModal";

// We have to declare this empty object outside of the function below so it doesn't change on every call.
const emptyPropsRawArray: api.EditableEntryData["propertiesRaw"] = [];

interface Props {
    entry: api.EditableEntryData | undefined;
    addUnsavedEdit: (newEdit: api.AnyEdit) => void;
}

/**
 * This widget implements the "Properties" tab of the "Edit Entry" page.
 */
export const PropertiesEditor: React.FunctionComponent<Props> = ({ entry, addUnsavedEdit, ...props }) => {
    const entryTypeKey = entry?.entryType.key;
    /** The schema, including any schema changes which have been made within the current draft, if any. */
    const [schema] = useSchema();

    const canEditSchema = usePermission(api.CorePerm.proposeEditToSchema);
    const [showingPropertiesSchemaEditor, setShowingPropertiesSchemaEditor] = React.useState(false);
    const showPropertiesSchemaEditor = React.useCallback(() => setShowingPropertiesSchemaEditor(true), []);
    const cancelPropertiesSchemaEditor = React.useCallback(() => setShowingPropertiesSchemaEditor(false), []);
    const doneEditingSchemaProperties = React.useCallback((edits: api.AnySchemaEdit[]) => {
        // Create the new entry type, by adding the edits to unsavedEdits:
        for (const edit of edits) { addUnsavedEdit(edit); }
        setShowingPropertiesSchemaEditor(false);
    }, [addUnsavedEdit]);

    // This list contains all the possible properties that can be applied to entries of this type:
    const applicableProperties = React.useMemo(() => {
        if (!schema || !entryTypeKey) return [];
        const props = Object.values(schema?.properties).filter((p) =>
            p.appliesTo.find((at) => at.entryTypeKey === entryTypeKey)
        );
        props.sort((a, b) => a.rank - b.rank);
        return props;
    }, [schema, entryTypeKey]);

    const propertiesRaw = entry?.propertiesRaw ?? emptyPropsRawArray;
    const [activeProps, unsetProps] = React.useMemo(() => {
        const activeProps: { prop: api.PropertyData; facts: api.RawPropertyData["facts"] }[] = [];
        const unsetProps: api.PropertyData[] = [];

        for (const p of applicableProperties) {
            // If this property is set, it will have one or more "facts":
            const facts = propertiesRaw.find((pr) => pr.propertyKey === p.key)?.facts ?? [];
            if (facts.length > 0 || p.mode !== api.PropertyMode.Optional) {
                activeProps.push({ prop: p, facts: facts });
            } else {
                unsetProps.push({ ...p });
            }
        }

        unsetProps.forEach((p) => {
            const parentPropKeys = p.isA;
            if (parentPropKeys && parentPropKeys.length === 1) {
                const parentProp = applicableProperties.find((pp) => pp.key === parentPropKeys[0]);
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
            code: api.AddPropertyFact.code,
            data: {
                entryId,
                propertyKey: propId,
                propertyFactId: VNID(),
                valueExpression: "",
            },
        });
    }, [addUnsavedEdit, entryId]);

    if (!schema || !entry) {
        return <Spinner />;
    } else if (!entry.entryType.key) {
        return (
            <p>
                <FormattedMessage
                    defaultMessage="Choose an entry type for this entry before you set properties."
                    id="RosBHH"
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
                        <tr key={p.prop.key} className="even:bg-gray-50 hover:bg-blue-50">
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
                label={defineMessage({ defaultMessage: "Add another property:", id: "wlyMMP" })}
                afterInput={
                    canEditSchema ?
                        <ToolbarButton
                            icon="three-dots"
                            tooltip={defineMessage({defaultMessage: "Edit the available properties", id: "H8dTHq"})}
                            onClick={showPropertiesSchemaEditor}
                        />
                    :
                        <ToolbarButton
                            icon="three-dots"
                            disabled={true}
                            tooltip={defineMessage({defaultMessage: "You don't have permission to edit the available properties.", id: "cMQwO2"})}
                        />
                }
            >
                <SelectBox
                    options={unsetProps.map((p) => ({ id: p.key, label: noTranslationNeeded(p.name) }))}
                    onChange={handleAddNewProperty}
                />
            </Control>

            {showingPropertiesSchemaEditor ?
                <EditSchemaPropertiesModal onSaveChanges={doneEditingSchemaProperties} onCancel={cancelPropertiesSchemaEditor} />
            : null}
        </>
    );
};
