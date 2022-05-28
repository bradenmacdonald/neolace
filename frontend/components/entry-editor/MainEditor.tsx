import React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { api, useSiteSchema } from "lib/api-client";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Spinner } from "components/widgets/Spinner";
import { AutoControl, Control, Form } from "components/widgets/Form";
import { TextInput } from "components/widgets/TextInput";
import { MDTEditor } from "components/widgets/MDTEditor";
import { SelectEntryType } from "components/widgets/SelectEntryType";

interface Props {
    entry?: api.EditableEntryData;
    /** The schema, including any schema changes which have been made within the current draft, if any. */
    schema: api.SiteSchemaData|undefined;
    isNewEntry: boolean;
    addUnsavedEdit: (newEdit: api.AnyContentEdit) => void;
}

/**
 * This widget implements the "Main" tab of the "Edit Entry" page (set entry name, type, ID, and description)
 */
export const MainEditor: React.FunctionComponent<Props> = ({ entry, schema, addUnsavedEdit, isNewEntry }) => {
    const intl = useIntl();

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Here are the handlers for actually making edits, baed on what the user does.

    const updateEntryName = React.useCallback((name: string) => {
        if (!entry) return;
        addUnsavedEdit({ code: api.SetEntryName.code, data: { entryId: entry.id, name } });
    }, [entry, addUnsavedEdit]);

    const updateEntryType = React.useCallback((type: string) => {
        if (!entry) return;
        addUnsavedEdit({
            code: api.CreateEntry.code,
            data: {
                id: entry.id,
                type: api.VNID(type),
                name: entry.name,
                description: entry.description ?? "",
                friendlyId: entry.friendlyId,
            },
        });
    }, [entry, addUnsavedEdit]);

    const updateEntryFriendlyId = React.useCallback((friendlyId: string) => {
        if (!entry) return;
        addUnsavedEdit({ code: api.SetEntryFriendlyId.code, data: { entryId: entry.id, friendlyId } });
    }, [entry, addUnsavedEdit]);

    const updateEntryDescription = React.useCallback((description: string) => {
        if (!entry) return;
        addUnsavedEdit({ code: api.SetEntryDescription.code, data: { entryId: entry.id, description } });
    }, [entry, addUnsavedEdit]);

    const entryType = entry ? schema?.entryTypes[entry?.entryType.id] : undefined;

    if (!schema || !entry) {
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
        <Form>
            {/* Entry Name/Title */}
            <AutoControl
                value={entry?.name ?? ""}
                onChangeFinished={updateEntryName}
                id="title"
                label={{ id: "draft.entry.edit.name.label", defaultMessage: "Name / Title" }}
                isRequired={true}
            >
                <TextInput />
            </AutoControl>

            {/* Entry Type */}
            <Control // SelectBoxes don't need "AutoControl" - changes apply immediately as the user makes a selection
                id="entryType"
                label={{ id: "draft.entry.edit.type.label", defaultMessage: "Entry Type" }}
                hint={isNewEntry
                    ? intl.formatMessage({
                        id: "draft.entry.edit.type.hint",
                        defaultMessage: "Cannot be changed after the entry has been created.",
                    })
                    : intl.formatMessage({
                        id: "draft.entry.edit.type.hintExisting",
                        defaultMessage: "Cannot be changed.",
                    })}
                isRequired={isNewEntry}
            >
                <SelectEntryType
                    // TODO: This should have any schema changes that are part of the same draft; currently it loads the
                    // "published" version of the schema only.
                    value={entry?.entryType.id}
                    onChange={updateEntryType}
                    readOnly={!isNewEntry}
                />
            </Control>

            {/* Friendly ID */}
            <AutoControl
                value={entry?.friendlyId ?? ""}
                onChangeFinished={updateEntryFriendlyId}
                id="id"
                label={{ id: "draft.entry.edit.id.label", defaultMessage: "ID" }}
                hint={intl.formatMessage({
                    id: "draft.entry.edit.id.hint1",
                    defaultMessage: "Shown in the URL.",
                }) + " " +
                    (entryType?.friendlyIdPrefix
                        ? intl.formatMessage({
                            id: "draft.entry.edit.id.hint2",
                            defaultMessage: 'Must start with "{prefix}".',
                        }, { prefix: entryType.friendlyIdPrefix })
                        : "") +
                    " " +
                    intl.formatMessage({
                        id: "draft.entry.edit.id.hint3",
                        defaultMessage: "Must be unique.",
                    }) + " " +
                    intl.formatMessage({
                        id: "draft.entry.edit.id.hint4",
                        defaultMessage: "You cannot re-use an ID that was previously used for a different entry.",
                    })}
                isRequired={true}
            >
                <TextInput />
            </AutoControl>

            {/* Description */}
            <AutoControl
                value={entry?.description ?? ""}
                onChangeFinished={updateEntryDescription}
                id="description"
                label={{ id: "draft.entry.edit.description.label", defaultMessage: "Description" }}
            >
                <MDTEditor inlineOnly={true} />
            </AutoControl>
        </Form>
    );
};
