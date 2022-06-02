import React from "react";
import { NextPage } from "next";
import { FormattedMessage, useIntl } from "react-intl";
import { api, client, NEW, useDraft, useEditableEntry, useSiteData, useSiteSchema } from "lib/api-client";

import { SitePage } from "components/SitePage";
import FourOhFour from "pages/404";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import { Control, Form } from "components/widgets/Form";
import { TextInput } from "components/widgets/TextInput";
import { Button } from "components/widgets/Button";
import { IN_BROWSER } from "lib/config";
import { UserContext, UserStatus } from "components/user/UserContext";
import { Tab, TabBarRouter } from "components/widgets/Tabs";
import { defineMessage } from "components/utils/i18n";
import { PropertiesEditor } from "components/entry-editor/PropertiesEditor";
import { MainEditor } from "components/entry-editor/MainEditor";
import { Tooltip } from "components/widgets/Tooltip";
import { HoverClickNote } from "components/widgets/HoverClickNote";

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
    const [baseSchema] = useSiteSchema();
    const router = useRouter();
    const user = React.useContext(UserContext);
    const query = router.query as PageUrlQuery;
    const draftId = query.draftId as api.VNID | NEW;
    const [draft, draftError] = useDraft(draftId);
    // *IF* we are creating a new entry from scratch, this will be its new VNID. Note that VNID() only works on the
    // client in this case, and generating it on the server wouldn't make sense anyways.
    const [newEntryId] = React.useState(() => IN_BROWSER ? api.VNID() : api.VNID("_tbd"));
    const isNewEntry = query.entryId === "_";
    // The "base entry" is the unmodified entry, as published on the site, without any edits applied.
    const [baseEntry, entryError] = useEditableEntry(
        isNewEntry ? { newEntryWithId: newEntryId } : query.entryId as api.VNID,
    );

    // Any edits that have previously been saved into the draft that we're editing, if any:
    const draftEdits = (draft?.edits ?? emptyArray) as api.AnyEdit[];
    // Any edits that the user has made on this page now, but hasn't yet saved to a draft:
    const [unsavedEdits, setUnsavedEdits] = React.useState<api.AnyContentEdit[]>([]);
    const addUnsavedEdit = React.useCallback((newEdit: api.AnyContentEdit) => {
        setUnsavedEdits((existingEdits) => api.consolidateEdits([...existingEdits, newEdit]));
    }, []);

    const entry = React.useMemo(() => {
        // What the user is currently editing and should see on the screen is:
        // The previously published version of the entry (if any),
        // PLUS any edits previously made to it in the current draft (if any),
        // PLUS any edits currently made on this page now, but not yet saved to the draft (if any)
        return baseEntry && baseSchema
            ? api.applyEditsToEntry(baseEntry, baseSchema, [...draftEdits, ...unsavedEdits])
            : undefined;
    }, [baseEntry, baseSchema, draftEdits, unsavedEdits]);
    const schema = React.useMemo(() => baseSchema ? api.applyEditsToSchema(baseSchema, unsavedEdits) : undefined, [
        baseSchema,
        unsavedEdits,
    ]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Managing the draft (all edits are part of a draft)

    // If we'll be creating a new draft when the user saves these changes, this is the title for that new draft:
    const [newDraftTitle, setNewDraftTitle] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);
    const saveChangesToDraft = React.useCallback(async () => {
        if (draftError) {
            // This shouldn't happen because if there's a draft error, the save button won't be shown. But just in case:
            return alert("Inconsistent state: cannot save changes to a draft with errors.");
        }
        setIsSaving(true);
        if (draftId === NEW) {
            // We're creating a new draft:
            await client.createDraft({
                title: newDraftTitle.trim() ||
                    intl.formatMessage({ id: 'TUzKsg', defaultMessage: `Edited {title}` }, {title: baseEntry?.name ?? ""}),
                description: "",
                edits: unsavedEdits,
            }, { siteId: site.shortId }).then(
                (newDraft) => { // If successful:
                    // Redirect to let the user view/edit the new draft:
                    router.push(`/draft/${newDraft.id}`);
                },
                (error) => {
                    setIsSaving(false);
                    console.error(error);
                    alert(
                        intl.formatMessage({
                            id: 'uAFusW',
                            defaultMessage: `Failed to save draft: {error}`,
                        }, { error: String(error?.message ?? error) }),
                    );
                },
            );
        } else {
            // We're updating an existing draft
            alert("Updating an existing draft is not yet implemented.");
        }
    }, [draftId, baseEntry?.name, unsavedEdits, newDraftTitle, draftError, intl, router, site.shortId]);

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
        content = <ErrorMessage>{String(draftError)}</ErrorMessage>;
    } else if (entryError) {
        content = <ErrorMessage>{String(entryError)}</ErrorMessage>;
    } else if (draft?.status === api.DraftStatus.Accepted || draft?.status === api.DraftStatus.Cancelled) {
        content = <ErrorMessage>This draft is no longer editable.</ErrorMessage>;
    } else {
        content = (
            <>
                <Breadcrumbs>
                    <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                    <Breadcrumb href={`/draft/`}>
                        <FormattedMessage id="2atspc" defaultMessage="Drafts" />
                    </Breadcrumb>
                    <Breadcrumb href={draft ? `/draft/${draft.id}` : undefined}>
                        {draft ? draft.title : <FormattedMessage id="CaAyve" defaultMessage="New Draft" />}
                    </Breadcrumb>
                    <Breadcrumb>
                        {isNewEntry
                            ? <FormattedMessage defaultMessage="New Entry" id="mgA3Ec" />
                            : (
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
                        name={defineMessage({ defaultMessage: "Main", id: 'EFTSMc' })}
                    >
                        <MainEditor entry={entry} schema={schema} addUnsavedEdit={addUnsavedEdit} isNewEntry={isNewEntry} />
                    </Tab>
                    <Tab
                        id="properties"
                        icon="diamond-fill"
                        name={defineMessage({ defaultMessage: "Properties", id: 'aI80kg' })}
                    >
                        <PropertiesEditor entry={entry} schema={schema} addUnsavedEdit={addUnsavedEdit} />
                    </Tab>
                    <Tab
                        id="changes"
                        icon="list"
                        badge={unsavedEdits.length ? unsavedEdits.length.toString() : undefined}
                        name={defineMessage({ defaultMessage: "Changes", id: 'dgqhUM' })}
                    >
                        {unsavedEdits.length > 0
                            ? (
                                <ul>
                                    {unsavedEdits.map((e, idx) => (
                                        <li key={idx}>
                                            <p>
                                                <strong>{e.code}</strong>{" "}
                                                {
                                                    e.code === api.SetEntryName.code ?
                                                        <FormattedMessage
                                                            defaultMessage='Renamed this entry to "{newName}"'
                                                            id="Psr/Zc"
                                                            values={{newName: e.data.name}}
                                                        />
                                                    : null
                                                }
                                                <HoverClickNote superscript={false} displayText="(...)">
                                                    <p>Data for this edit:</p>
                                                    <pre className="whitespace-pre-wrap">{JSON.stringify(e.data, undefined, 4)}</pre>
                                                </HoverClickNote>
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )
                            : (
                                <p>
                                    <FormattedMessage
                                        id="VtwXmq"
                                        defaultMessage="You haven't made any changes yet. Make some changes above and you'll be able to save the changes here."
                                    />
                                </p>
                            )}
                    </Tab>
                    <Tab
                        id="save"
                        icon="check-circle-fill"
                        name={defineMessage({ defaultMessage: "Save", id: 'jvo0vs' })}
                    >
                        <h3>
                            <FormattedMessage id="X0ha1a" defaultMessage="Save changes" />
                        </h3>
                        {draft
                            ? (
                                <Button
                                    icon="file-earmark-diff"
                                    disabled={unsavedEdits.length === 0 || isSaving}
                                    onClick={saveChangesToDraft}
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
                                            id: 'I72/UY',
                                            defaultMessage: "Provide a brief description of what you changed:",
                                        })}
                                    >
                                        <TextInput />
                                    </Control>
                                    <Button
                                        icon="file-earmark-diff"
                                        disabled={unsavedEdits.length === 0 || isSaving}
                                        onClick={saveChangesToDraft}
                                    >
                                        <FormattedMessage
                                            id="TpheOq"
                                            defaultMessage="Save these changes (as draft)"
                                        />
                                    </Button>
                                </Form>
                            )}
                    </Tab>
                </TabBarRouter>
            </>
        );
    }

    return (
        <SitePage
            title={entry?.name
                ? intl.formatMessage({ id: 'JQqknm', defaultMessage: `Edit "{name}"` }, {
                    name: entry.name,
                })
                : intl.formatMessage({ id: 'wEQDC6', defaultMessage: `Edit` })}
            sitePreloaded={null}
            leftNavTopSlot={[]}
        >
            {content}
        </SitePage>
    );
};

export default DraftEntryEditPage;
