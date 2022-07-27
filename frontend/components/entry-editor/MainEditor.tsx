import React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { api, useSchema } from "lib/api-client";
import { Spinner } from "components/widgets/Spinner";
import { AutoControl, Control, Form } from "components/widgets/Form";
import { TextInput } from "components/widgets/TextInput";
import { MDTEditor } from "components/widgets/MDTEditor";
import { SelectEntryType } from "components/widgets/SelectEntryType";
import { defineMessage } from "components/utils/i18n";

interface Props {
    entry?: api.EditableEntryData;
    isNewEntry: boolean;
    addUnsavedEdit: (newEdit: api.AnyContentEdit) => void;
}

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
                    id="SWt2PR"
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
            >
                <SelectEntryType
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
                label={defineMessage({ defaultMessage: "ID",  id: 'qlcuNQ' })}
                hint={{custom: (intl.formatMessage({
                    id: '6hE8SS',
                    defaultMessage: "Shown in the URL.",
                }) + " " +
                    (entryType?.friendlyIdPrefix
                        ? intl.formatMessage({
                            id: 'DYGIhv',
                            defaultMessage: 'Must start with "{prefix}".',
                        }, { prefix: entryType.friendlyIdPrefix })
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
    );
};
