import React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { api, useSchema } from "lib/api";
import { Spinner } from "components/widgets/Spinner";
import { AutoControl, Control, Form, MDTEditor, TextInput } from "components/form-input";
import { SelectEntryType } from "components/widgets/SelectEntryType";
import { defineMessage } from "components/utils/i18n";
import { EntryTypeModal } from "components/schema-editor/EntryTypeModal";
import { ToolbarButton } from "components/widgets/Button";

interface Props {
    entry?: api.EditableEntryData;
    isNewEntry: boolean;
    addUnsavedEdit: (newEdit: api.AnyEdit) => void;
}

const NEW_ENTRY_TYPE = Symbol("newET");

/**
 * This widget implements the "Main" tab of the "Edit Entry" page (set entry name, type, ID, and description)
 */
export const MainEditor: React.FunctionComponent<Props> = ({ entry, addUnsavedEdit, isNewEntry }) => {
    const intl = useIntl();
    /** The schema, including any schema changes which have been made within the current draft, if any. */
    const [schema] = useSchema();

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Here are the handlers for actually making edits, baed on what the user does.

    const updateEntryName = React.useCallback((name: string) => {
        if (!entry) return;
        addUnsavedEdit({ code: api.SetEntryName.code, data: { entryId: entry.id, name } });
    }, [entry, addUnsavedEdit]);

    const updateEntryType = React.useCallback((entryTypeKey: string) => {
        if (!entry) return;
        addUnsavedEdit({
            code: api.CreateEntry.code,
            data: {
                entryId: entry.id,
                entryTypeKey,
                name: entry.name,
                description: entry.description ?? "",
                key: entry.key,
            },
        });
    }, [entry, addUnsavedEdit]);

    const updateEntryKey = React.useCallback((key: string) => {
        if (!entry) return;
        addUnsavedEdit({ code: api.SetEntryKey.code, data: { entryId: entry.id, key } });
    }, [entry, addUnsavedEdit]);

    const updateEntryDescription = React.useCallback((description: string) => {
        if (!entry) return;
        addUnsavedEdit({ code: api.SetEntryDescription.code, data: { entryId: entry.id, description } });
    }, [entry, addUnsavedEdit]);

    // Show a modal (popup) that allows the user to create a new entry type
    const [showingEditEntryTypeModalWithKey, editEntryTypeWithKey] = React.useState(undefined as string|typeof NEW_ENTRY_TYPE|undefined);
    const showNewEntryTypeModal = React.useCallback(() => { editEntryTypeWithKey(NEW_ENTRY_TYPE); }, []);
    const showEditEntryTypeModal = React.useCallback(() => { editEntryTypeWithKey(entry?.entryType.key); }, [entry?.entryType.key]);
    const cancelEditEntryTypeModal = React.useCallback(() => { editEntryTypeWithKey(undefined); }, []);

    const doneEditingEntryType = React.useCallback((editedEntryTypeKey: string, edits: api.AnySchemaEdit[]) => {
        // Create the new entry type, by adding the edits to unsavedEdits:
        for (const edit of edits) { addUnsavedEdit(edit); }
        // Select the new entry type in the "Edit Entry" form:
        if (editedEntryTypeKey && entry?.entryType.key !== editedEntryTypeKey) {
            updateEntryType(editedEntryTypeKey);
        }
        // Close the modal:
        editEntryTypeWithKey(undefined);
    }, [addUnsavedEdit, entry?.entryType.key, updateEntryType]);

    const entryType = entry ? schema?.entryTypes[entry?.entryType.key] : undefined;

    if (!schema || !entry) {
        return <Spinner />;
    } else if (!entry.entryType) {
        return (
            <p>
                <FormattedMessage
                    defaultMessage="You need to choose an entry type for this entry before you can set properties."
                    id="SWt2PR"
                />
            </p>
        );
    }

    return (<>
        <Form>
            {/* Entry Name/Title */}
            <AutoControl
                value={entry?.name ?? ""}
                onChangeFinished={updateEntryName}
                id="title"
                label={defineMessage({ defaultMessage: "Name / Title", id: "j+aKkX" })}
                isRequired={true}
            >
                <TextInput />
            </AutoControl>

            {/* Entry Type */}
            <Control // SelectBoxes don't need "AutoControl" - changes apply immediately as the user makes a selection
                id="entryType"
                label={defineMessage({ id: 'fVyv5L', defaultMessage: "Entry Type" })}
                hint={{custom: (isNewEntry
                    ? intl.formatMessage({
                        id: 'uZW3Dr',
                        defaultMessage: "Cannot be changed after the entry has been created.",
                    })
                    : intl.formatMessage({
                        id: 'KIAjvA',
                        defaultMessage: "Cannot be changed.",
                    })
                )}}
                isRequired={isNewEntry}
                afterInput={
                    entry?.entryType.key ? (
                        /* A button that allows the user to make edits to this entry type (TODO: disable if they don't have permission) */
                        <ToolbarButton
                            icon="three-dots"
                            tooltip={defineMessage({defaultMessage: "Edit this entry type...", id: "fR7peU"})}
                            onClick={showEditEntryTypeModal}
                        /> 
                    ): null
                }
            >
                <SelectEntryType
                    value={entry?.entryType.key}
                    onChange={updateEntryType}
                    readOnly={!isNewEntry}
                    extraOption={defineMessage({ id: "f0R45x", defaultMessage: "+ Add a new entry type..." })}
                    onSelectExtraOption={showNewEntryTypeModal}
                />
            </Control>

            {/* Friendly ID */}
            <AutoControl
                value={entry?.key ?? ""}
                onChangeFinished={updateEntryKey}
                id="id"
                label={defineMessage({ defaultMessage: "ID",  id: 'qlcuNQ' })}
                hint={{custom: (intl.formatMessage({
                    id: '6hE8SS',
                    defaultMessage: "Shown in the URL.",
                }) + " " +
                    (entryType?.keyPrefix
                        ? intl.formatMessage({
                            id: 'DYGIhv',
                            defaultMessage: 'Must start with "{prefix}".',
                        }, { prefix: entryType.keyPrefix })
                        : "") +
                    " " +
                    intl.formatMessage({
                        id: 'FQi2nL',
                        defaultMessage: "Must be unique.",
                    }) + " " +
                    intl.formatMessage({
                        id: '05LayV',
                        defaultMessage: "You cannot re-use an ID that was previously used for a different entry.",
                    }))}}
                isRequired={true}
            >
                <TextInput />
            </AutoControl>

            {/* Description */}
            <AutoControl
                value={entry?.description ?? ""}
                onChangeFinished={updateEntryDescription}
                id="description"
                label={defineMessage({ defaultMessage: "Description", id: "Q8Qw5B" })}
            >
                <MDTEditor inlineOnly={true} />
            </AutoControl>
        </Form>

        {
            showingEditEntryTypeModalWithKey ?
                <EntryTypeModal
                    existingEntryTypeKey={showingEditEntryTypeModalWithKey === NEW_ENTRY_TYPE ? undefined : showingEditEntryTypeModalWithKey}
                    onSaveChanges={doneEditingEntryType}
                    onCancel={cancelEditEntryTypeModal}
                />
            : null
        }
    </>);
};
