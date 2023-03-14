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
import { NextPage } from "next";
import { FormattedMessage, useIntl } from "react-intl";
import {
    SDK,
    client,
    NEW,
    useSiteData,
    useSchema,
    DraftContextData,
    useDraft,
    DraftContext,
    UserStatus,
    useUser,
} from "lib/sdk";

import { SitePage } from "components/SitePage";
import FourOhFour from "pages/404";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import { Control, Form } from "components/form-input/Form";
import { Button, ToolbarButton } from "components/widgets/Button";
import { Tab, TabBarRouter } from "components/widgets/Tabs";
import { defineMessage } from "components/utils/i18n";
import { EditDescription } from "components/widgets/EditDescription";
import { TextInput } from "components/form-input/TextInput";
import { Table, TableRow } from "components/widgets/Table";
import { Icon } from "components/widgets/Icon";
import { EntryTypeModal } from "components/schema-editor/EntryTypeModal";
import { EditSchemaPropertiesModal } from "components/schema-editor/EditSchemaPropertiesModal";

interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    draftNum: string;
}

const emptyArray: SDK.AnyEdit[] = []; // Declare this out here so it doesn't change on every render of this page
const NEW_ENTRY_TYPE = Symbol("newET");

const DraftSchemaEditPage: NextPage = function (_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const { site, siteError } = useSiteData();
    const router = useRouter();
    const user = useUser();
    const query = router.query as PageUrlQuery;
    const draftNum = query.draftNum === "_" ? "_" : parseInt(query.draftNum);

    // Any edits that the user has made on this page now, but hasn't yet saved to a draft:
    const [unsavedEdits, setUnsavedEdits] = React.useState<SDK.AnyEdit[]>([]);
    const addUnsavedEdit = React.useCallback((newEdit: SDK.AnyEdit) => {
        setUnsavedEdits((existingEdits) => SDK.consolidateEdits([...existingEdits, newEdit]));
    }, []);

    const draftContext: DraftContextData = {
        draftNum,
        unsavedEdits,
    };
    const [draft, _, draftError] = useDraft({draftContext});

    // This is the entry after all edits have been applied
    const [schema, schemaError] = useSchema({draftContext});

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Managing the draft (all edits are part of a draft)

    // If we'll be creating a new draft when the user saves these changes, this is the title for that new draft:
    const [newDraftTitle, setNewDraftTitle] = React.useState("");
    const defaultDraftTitle = intl.formatMessage({id: '2smKb9', defaultMessage: `Edited Schema` });
    const newDraftTitleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setNewDraftTitle(event.target.value);
    }, []);
    const [isSaving, setIsSaving] = React.useState(false);
    const saveChangesToDraft = React.useCallback(async (applyImmediately = false) => {
        if (draftError) {
            // This shouldn't happen because if there's a draft error, the save button won't be shown. But just in case:
            return alert("Inconsistent state: cannot save changes to a draft with errors.");
        }
        setIsSaving(true);
        if (draftNum === NEW) {
            // We're creating a new draft:
            await client.createDraft({
                title: newDraftTitle.trim() || defaultDraftTitle,
                description: "",
                edits: unsavedEdits,
            }, { siteKey: site.key }).then(
                (newDraft) => { // If successful:
                    if (applyImmediately) {
                        client.acceptDraft(newDraft.num, {siteKey: site.key}).then(() => {
                            // The draft has been accepted immediately:
                            router.push(`/draft?status=accepted`);
                        }, (applyError) => {
                            console.error(applyError);
                            alert(
                                intl.formatMessage({
                                    id: "Y3wO1p",
                                    defaultMessage: `Failed to apply changes: {error}`,
                                }, { error: String((applyError instanceof Error ? applyError?.message : undefined) ?? applyError) }),
                            );
                            // The draft failed to apply. Go to the draft page.
                            router.push(`/draft/${newDraft.num}`);
                        });
                    } else {
                        router.push(`/draft/${newDraft.num}`);
                    }
                },
                (error) => {
                    setIsSaving(false);
                    console.error(error);
                    alert(
                        intl.formatMessage({
                            id: "uAFusW",
                            defaultMessage: `Failed to save draft: {error}`,
                        }, { error: String(error?.message ?? error) }),
                    );
                },
            );
        } else {
            try {
                for (const edit of unsavedEdits) {
                    await client.addEditToDraft(edit, {draftNum, siteKey: site.key});
                }
                setIsSaving(false);
                router.push(`/draft/${draftNum}`);
            } catch (error) {
                setIsSaving(false);
                console.error(error);
                alert(
                    intl.formatMessage({
                        id: "uAFusW",
                        defaultMessage: `Failed to save draft: {error}`,
                    }, { error: String((error instanceof Error ? error?.message : undefined) ?? error) }),
                );
            }
        }
    }, [draftError, draftNum, newDraftTitle, defaultDraftTitle, unsavedEdits, site.key, router, intl]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Editing an entry type:

    // Show a modal (popup) that allows the user to create a new entry type
    const [showingEditEntryTypeModalWithKey, editEntryTypeWithKey] = React.useState(undefined as string|typeof NEW_ENTRY_TYPE|undefined);
    const showNewEntryTypeModal = React.useCallback(() => { editEntryTypeWithKey(NEW_ENTRY_TYPE); }, []);
    const cancelEditEntryTypeModal = React.useCallback(() => { editEntryTypeWithKey(undefined); }, []);

    const doneEditingEntryType = React.useCallback((editedEntryTypeKey: string, edits: SDK.AnySchemaEdit[]) => {
        for (const edit of edits) { addUnsavedEdit(edit); }
        editEntryTypeWithKey(undefined); // close the modal
    }, [addUnsavedEdit]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Editing properties

    const [showingPropertiesSchemaEditor, setShowingPropertiesSchemaEditor] = React.useState(false);
    const showPropertiesSchemaEditor = React.useCallback(() => setShowingPropertiesSchemaEditor(true), []);
    const cancelPropertiesSchemaEditor = React.useCallback(() => setShowingPropertiesSchemaEditor(false), []);
    const doneEditingSchemaProperties = React.useCallback((edits: SDK.AnySchemaEdit[]) => {
        // Create the new entry type, by adding the edits to unsavedEdits:
        for (const edit of edits) { addUnsavedEdit(edit); }
        setShowingPropertiesSchemaEditor(false);
    }, [addUnsavedEdit]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    if (siteError instanceof SDK.NotFound) {
        return <FourOhFour />;
    } else if (siteError) {
        return <ErrorMessage>{String(siteError)}</ErrorMessage>;
    }

    let content: JSX.Element;
    // Are there any other errors?
    if (user.status === UserStatus.Anonymous) {
        content = <ErrorMessage>You need to log in before you can edit or create entries.</ErrorMessage>;
    } else if (draftError) {
        content = <ErrorMessage>Draft error: {String(draftError)}</ErrorMessage>;
    } else if (schemaError) {
        content = <ErrorMessage>Schema error: {String(schemaError)}</ErrorMessage>;
    } else if (draft?.status === SDK.DraftStatus.Accepted || draft?.status === SDK.DraftStatus.Cancelled) {
        content = <ErrorMessage>This draft is no longer editable.</ErrorMessage>;
    } else {
        content = (
            <DraftContext.Provider value={draftContext}>
                <Breadcrumbs>
                    <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                    <Breadcrumb href={`/draft/`}>
                        <FormattedMessage id="2atspc" defaultMessage="Drafts" />
                    </Breadcrumb>
                    <Breadcrumb href={draft ? `/draft/${draft.num}` : undefined}>
                        {draft ? draft.title : <FormattedMessage id="CaAyve" defaultMessage="New Draft" />}
                    </Breadcrumb>
                    <Breadcrumb>
                        <FormattedMessage defaultMessage="Edit schema" id="gZGnMw" />
                    </Breadcrumb>
                </Breadcrumbs>

                <h1><FormattedMessage id="oYlGfx" defaultMessage="Edit Schema" /></h1>

                <TabBarRouter>
                    <Tab
                        id="entry-types"
                        icon="info-circle"
                        name={defineMessage({ defaultMessage: "Entry Types", id: 'xrP950' })}
                    >
                        <Table headings={[
                            {heading: defineMessage({defaultMessage: "Entry Type", id: 'fVyv5L'})},
                            {heading: defineMessage({defaultMessage: "Description", id: 'Q8Qw5B'})},
                            {heading: defineMessage({defaultMessage: "Actions", id: 'wL7VAE'}), right: true},
                        ]}>
                            {
                                // Show a row for each file.
                                Object.values(schema?.entryTypes ?? {}).map((entryType) => <TableRow key={entryType.key}>
                                    <td className="min-w-[11em]">
                                        <strong className="align-middle">
                                            <span
                                                style={{color: SDK.getEntryTypeColor(entryType).darkerBackgroundColor}}
                                                className="text-xs inline-block pr-1"
                                            >
                                                <Icon icon="square-fill"/>
                                            </span>
                                            {entryType.name}
                                        </strong><br />
                                        <code className="ml-4 whitespace-nowrap">{entryType.key}</code>
                                    </td>
                                    <td>{entryType.description}</td>
                                    <td className="text-right">
                                        <ToolbarButton
                                            icon="three-dots" tooltip={defineMessage({defaultMessage: "Edit", id: 'wEQDC6'})}
                                            onClick={() => editEntryTypeWithKey(entryType.key)}
                                        />
                                    </td>
                                </TableRow>)
                            }
                            <TableRow>
                                <td colSpan={3}>
                                    <Button onClick={showNewEntryTypeModal}>
                                        <Icon icon="plus-lg"/>
                                        <FormattedMessage defaultMessage="Add new entry type" id="r99oE2" />
                                    </Button>
                                </td>
                            </TableRow>
                        </Table>
                    </Tab>
                    <Tab
                        id="properties"
                        icon="diamond-fill"
                        name={defineMessage({ defaultMessage: "Properties", id: "aI80kg" })}
                    >
                        <Button onClick={showPropertiesSchemaEditor}>
                            <FormattedMessage defaultMessage="Edit properties..." id="f2/zyG" />
                        </Button>
                    </Tab>
                    <Tab
                        id="save"
                        icon="check-circle-fill"
                        name={defineMessage({ defaultMessage: "Save Changes", id: "3VI9mt" })}
                        badge={unsavedEdits.length ? unsavedEdits.length.toString() : undefined}
                    >
                        <h3><FormattedMessage id="dgqhUM" defaultMessage="Changes" /></h3>
                            {unsavedEdits.length > 0
                                ? (
                                    <ul>
                                        {unsavedEdits.map((e, idx) => (
                                            <li key={idx}>
                                                <EditDescription edit={e} />
                                            </li>
                                        ))}
                                    </ul>
                                )
                                : (
                                    <p>
                                        <FormattedMessage
                                            id="by5rU2"
                                            defaultMessage="You haven't made any changes yet. Make some changes using the other tabs and you'll be able to save the changes here."
                                        />
                                    </p>
                                )
                            }

                        <h3><FormattedMessage id="H/DODr" defaultMessage="Save these changes" /></h3>
                        {draft
                            ? (
                                <Button
                                    icon="file-earmark-diff"
                                    disabled={unsavedEdits.length === 0 || isSaving}
                                    onClick={() => saveChangesToDraft()}
                                >
                                    <FormattedMessage
                                        id="S/a7rH"
                                        defaultMessage='Save these changes (to draft "{title}")'
                                        values={{ title: draft.title }}
                                    />
                                </Button>
                            )
                            : (
                                <Form>
                                    <Control
                                        id="draft-desc"
                                        label={defineMessage({
                                            id: "uRwjl1",
                                            defaultMessage: "Provide a brief description of what you changed (optional):",
                                        })}
                                    >
                                        <TextInput value={newDraftTitle} onChange={newDraftTitleChange} placeholder={defaultDraftTitle} />
                                    </Control>
                                    <Button
                                        icon="file-earmark-diff"
                                        disabled={unsavedEdits.length === 0 || isSaving}
                                        onClick={() => saveChangesToDraft()}
                                        bold={true}
                                    >
                                        <FormattedMessage
                                            id="TpheOq"
                                            defaultMessage="Save these changes (as draft)"
                                        />
                                    </Button>
                                    <Button
                                        disabled={unsavedEdits.length === 0 || isSaving}
                                        onClick={() => saveChangesToDraft(true)}
                                    >
                                        <FormattedMessage
                                            id="zUjePC"
                                            defaultMessage="Save immediately"
                                        />
                                    </Button>
                                </Form>
                            )}
                    </Tab>
                </TabBarRouter>

                {
                    showingEditEntryTypeModalWithKey ?
                        <EntryTypeModal
                            existingEntryTypeKey={showingEditEntryTypeModalWithKey === NEW_ENTRY_TYPE ? undefined : showingEditEntryTypeModalWithKey}
                            onSaveChanges={doneEditingEntryType}
                            onCancel={cancelEditEntryTypeModal}
                        />
                    : null
                }
                {showingPropertiesSchemaEditor ?
                    <EditSchemaPropertiesModal onSaveChanges={doneEditingSchemaProperties} onCancel={cancelPropertiesSchemaEditor} />
                : null}
            </DraftContext.Provider>
        );
    }

    return (
        <SitePage
            title={intl.formatMessage({ id: 'oYlGfx', defaultMessage: `Edit Schema` })}
            leftNavTopSlot={[]}
        >
            {content}
        </SitePage>
    );
};

export default DraftSchemaEditPage;
