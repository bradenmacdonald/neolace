import React from "react";
import { NextPage } from "next";
import { FormattedMessage, useIntl } from "react-intl";
import {
    api,
    client,
    NEW,
    useSiteData,
    useSchema,
    DraftContextData,
    useEditableEntry,
    useDraft,
    DraftContext,
    UserStatus,
    useUser,
} from "lib/api";

import { SitePage } from "components/SitePage";
import FourOhFour from "pages/404";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import { Control, Form, TextInput } from "components/form-input";
import { Button } from "components/widgets/Button";
import { IN_BROWSER } from "lib/config";
import { Tab, TabBarRouter } from "components/widgets/Tabs";
import { defineMessage } from "components/utils/i18n";
import { PropertiesEditor } from "components/entry-editor/PropertiesEditor";
import { MainEditor } from "components/entry-editor/MainEditor";
import { HoverClickNote } from "components/widgets/HoverClickNote";
import { EditDescription } from "components/widgets/EditDescription";

interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    draftId: string;
    entryId: string;
}

const emptyArray: api.AnyEdit[] = []; // Declare this out here so it doesn't change on every render of DraftEntrypage

const DraftEntryEditPage: NextPage = function (_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const { site, siteError } = useSiteData();
    const router = useRouter();
    const user = useUser();
    const query = router.query as PageUrlQuery;
    const draftId = query.draftId as api.VNID | NEW;

    // *IF* we are creating a new entry from scratch, this will be its new VNID. Note that VNID() only works on the
    // client in this case, and generating it on the server wouldn't make sense anyways.
    const [newEntryId] = React.useState(() => IN_BROWSER ? api.VNID() : api.VNID("_tbd"));
    const isNewEntry = query.entryId === "_";
    const entryId: api.VNID = isNewEntry ? newEntryId : query.entryId as api.VNID;

    // Any edits that the user has made on this page now, but hasn't yet saved to a draft:
    const [unsavedEdits, setUnsavedEdits] = React.useState<api.AnyEdit[]>([]);
    const addUnsavedEdit = React.useCallback((newEdit: api.AnyEdit) => {
        setUnsavedEdits((existingEdits) => api.consolidateEdits([...existingEdits, newEdit]));
    }, []);

    const draftContext: DraftContextData = {
        draftId,
        unsavedEdits,
    };
    const [draft, _, draftError] = useDraft({draftContext});

    // This is the entry after all edits have been applied
    const [entry, entryError] = useEditableEntry(entryId, isNewEntry, {draftContext});

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Managing the draft (all edits are part of a draft)

    // If we'll be creating a new draft when the user saves these changes, this is the title for that new draft:
    const [newDraftTitle, setNewDraftTitle] = React.useState("");
    const defaultDraftTitle = intl.formatMessage({id: "aGZGjy", defaultMessage: `Edited "{title}"` }, { title: entry?.name ?? "" });
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
        if (draftId === NEW) {
            // We're creating a new draft:
            await client.createDraft({
                title: newDraftTitle.trim() || defaultDraftTitle,
                description: "",
                edits: unsavedEdits,
            }, { siteId: site.shortId }).then(
                (newDraft) => { // If successful:
                    if (applyImmediately) {
                        client.acceptDraft(newDraft.id, {siteId: site.shortId}).then(() => {
                            // The draft has been accepted immediately:
                            router.push(`/entry/${entry?.friendlyId}`);
                        }, (applyError) => {
                            console.error(applyError);
                            alert(
                                intl.formatMessage({
                                    id: "Y3wO1p",
                                    defaultMessage: `Failed to apply changes: {error}`,
                                }, { error: String((applyError instanceof Error ? applyError?.message : undefined) ?? applyError) }),
                            );
                            // The draft failed to apply. Go to the draft page.
                            router.push(`/draft/${newDraft.id}`);
                        });
                    } else {
                        router.push(`/draft/${newDraft.id}`);
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
                    await client.addEditToDraft(edit, {draftId, siteId: site.shortId});
                }
                setIsSaving(false);
                router.push(`/draft/${draftId}`);
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
    }, [draftError, draftId, newDraftTitle, defaultDraftTitle, unsavedEdits, site.shortId, router, intl, entry?.friendlyId]);

    const [schema] = useSchema({draftContext});
    const entryType = entry ? schema?.entryTypes[entry.entryType.id] : undefined;

    if (siteError instanceof api.NotFound) {
        return <FourOhFour />;
    } else if (siteError) {
        return <ErrorMessage>{String(siteError)}</ErrorMessage>;
    }

    let content: JSX.Element;
    // Are there any other errors?
    if (user.status === UserStatus.Anonymous) {
        content = <ErrorMessage>You need to log in before you can edit or create entries.</ErrorMessage>;
    } else if (entryError instanceof api.NotFound) {
        content = <FourOhFour />;
    } else if (draftError) {
        content = <ErrorMessage>Draft error: {String(draftError)}</ErrorMessage>;
    } else if (entryError) {
        content = <ErrorMessage>Entry error: {String(entryError)}</ErrorMessage>;
    } else if (draft?.status === api.DraftStatus.Accepted || draft?.status === api.DraftStatus.Cancelled) {
        content = <ErrorMessage>This draft is no longer editable.</ErrorMessage>;
    } else {
        content = (
            <DraftContext.Provider value={draftContext}>
                <Breadcrumbs>
                    <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                    <Breadcrumb href={`/draft/`}>
                        <FormattedMessage id="2atspc" defaultMessage="Drafts" />
                    </Breadcrumb>
                    <Breadcrumb href={draft ? `/draft/${draft.id}` : undefined}>
                        {draft ? draft.title : <FormattedMessage id="CaAyve" defaultMessage="New Draft" />}
                    </Breadcrumb>
                    <Breadcrumb>
                        {isNewEntry ? <FormattedMessage defaultMessage="New Entry" id="mgA3Ec" /> : (
                            <FormattedMessage
                                defaultMessage='Edit "{entryName}"'
                                id="JbG3yV"
                                values={{ entryName: entry?.name }}
                            />
                        )}
                    </Breadcrumb>
                </Breadcrumbs>

                {isNewEntry
                    ? (
                        <h1>
                            <FormattedMessage id="mgA3Ec" defaultMessage="New Entry" />
                        </h1>
                    )
                    : (
                        <h1>
                            <FormattedMessage id="2I11H+" defaultMessage="Edit Entry" />
                        </h1>
                    )}

                <TabBarRouter>
                    <Tab
                        id="main"
                        icon="info-circle"
                        name={defineMessage({ defaultMessage: "Main", id: "EFTSMc" })}
                    >
                        <MainEditor entry={entry} addUnsavedEdit={addUnsavedEdit} isNewEntry={isNewEntry} />
                        <h2><FormattedMessage defaultMessage="Properties" id="aI80kg" /></h2>
                        <PropertiesEditor entry={entry} addUnsavedEdit={addUnsavedEdit} />
                    </Tab>
                    {/*
                    <Tab
                        id="properties"
                        icon="diamond-fill"
                        name={defineMessage({ defaultMessage: "Properties", id: "aI80kg" })}
                    >
                    </Tab>
                    */}
                    <Tab
                        id="article"
                        icon="journal-text"
                        name={defineMessage({ defaultMessage: "Article", id: "jx7Hn3" })}
                        hidden={entryType === undefined || entryType.enabledFeatures.Article === undefined}
                    >
                        <code><pre>{entry?.features.Article?.articleMD}</pre></code>
                    </Tab>
                    <Tab
                        id="image"
                        icon="image"
                        name={defineMessage({ defaultMessage: "Image", id: "+0zv6g" })}
                        hidden={entryType === undefined || entryType.enabledFeatures.Image === undefined}
                    >
                        {
                            entry?.features.Image ? 
                                <>
                                    <a href={entry.features.Image.imageUrl}>{entry.features.Image.width}x{entry.features.Image.height} image</a>
                                </>
                            : "No image attached yet."
                        }
                    </Tab>
                    <Tab
                        id="files"
                        icon="files"
                        name={defineMessage({ defaultMessage: "Files", id: "m4vqJl" })}
                        hidden={entryType === undefined || entryType.enabledFeatures.Files === undefined}
                    >
                        {
                            entry?.features.Files ? 
                                <>
                                    {entry.features.Files.files.length} files.
                                </>
                            : "No files attached yet."
                        }
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
                                            id="im5E8q"
                                            defaultMessage="You haven't made any changes yet. Make some changes usign the other tabs and you'll be able to save the changes here."
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
            </DraftContext.Provider>
        );
    }

    return (
        <SitePage
            title={entry?.name
                ? intl.formatMessage({ id: "JQqknm", defaultMessage: `Edit "{name}"` }, {
                    name: entry.name,
                })
                : intl.formatMessage({ id: "wEQDC6", defaultMessage: `Edit` })}
            leftNavTopSlot={[]}
        >
            {content}
        </SitePage>
    );
};

export default DraftEntryEditPage;
