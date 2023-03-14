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
import { SDK, client, useSiteData } from "lib/sdk";
import { Spinner } from "components/widgets/Spinner";
import { ToolbarButton } from "components/widgets/Button";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { FormattedFileSize } from "components/widgets/FormattedFileSize";
import { Table, TableRow } from "components/widgets/Table";
import { FileDropzone } from "components/widgets/Dropzone";

// We have to declare this empty object outside of the function below so it doesn't change on every call.
const emptyPropsRawArray: SDK.EditableEntryData["propertiesRaw"] = [];

interface Props {
    entry: SDK.EditableEntryData | undefined;
    addUnsavedEdit: (newEdit: SDK.AnyEdit) => void;
}

/**
 * This widget implements the "Properties" tab of the "Edit Entry" page.
 */
export const FilesEditor: React.FunctionComponent<Props> = ({ entry, addUnsavedEdit, ...props }) => {
    const {site} = useSiteData();
    const entryId = entry?.id;
    const files = entry?.features?.Files?.files ?? [];

    const [numUploadsInProgress, setNumUploadsInProgress] = React.useState(0);

    const handleAddFiles = React.useCallback(async (files: File[]) => {
        if (entryId === undefined) return; // Make TypeScript happy.
        for (const file of files) {
            setNumUploadsInProgress(n => n + 1);
            try {
                const {tempFileId} = await client.uploadFile(file, { siteKey: site.key })
                addUnsavedEdit({code: "UpdateEntryFeature", data: {
                    entryId,
                    feature: {
                        featureType: "Files",
                        changeType: "addFile",
                        filename: file.name,
                        tempFileId,
                    }
                }});
            } finally {
                setNumUploadsInProgress(n => n - 1);
            }
        }
    }, [entryId, site.key, addUnsavedEdit]);

    if (!entry) {
        return <Spinner />;
    } else if (files === undefined) {
        return <ErrorMessage>Expected Files feature.</ErrorMessage>
    }

    return (<>
            {
            files.length === 0 && numUploadsInProgress === 0 ?
                <p><FormattedMessage defaultMessage="There are no files attached to this entry yet." id="NidLZa" /></p>
            :
                <Table headings={[
                    {heading: defineMessage({defaultMessage: "Filename", id: "UaS6dK"})},
                    {heading: defineMessage({defaultMessage: "Size", id: 'agOXPD'})},
                    {heading: defineMessage({defaultMessage: "Actions", id: 'wL7VAE'}), right: true},
                ]}>
                    {
                        // Show a row for each file.
                        files.map((f, idx) => <TableRow key={f.filename}>
                            <td>{f.url ? <a href={f.url}>{f.filename}</a> : f.filename}</td>
                            <td>{f.url ? <FormattedFileSize sizeInBytes={f.size} /> : "(new)"}</td>
                            <td className="text-right">
                                <ToolbarButton
                                    icon="x-lg" tooltip={defineMessage({defaultMessage: "Delete file", id: '9ZoFpI'})}
                                    onClick={() => addUnsavedEdit({code: "UpdateEntryFeature", data: {
                                        entryId: entry.id,
                                        feature: { featureType: "Files", changeType: "removeFile", filename: f.filename },
                                    }})}
                                />
                            </td>
                        </TableRow>)
                    }
                    {new Array(numUploadsInProgress).fill(undefined).map((_, idx) => 
                        <TableRow key={`upload${idx}`}>
                            <td colSpan={3}><Spinner /></td>
                        </TableRow>
                    )}
                </Table>
            }

            <h2><FormattedMessage defaultMessage="Attach a new file" id="CK9nPY" /></h2>
            <FileDropzone onDrop={handleAddFiles} />
    </>);
};
