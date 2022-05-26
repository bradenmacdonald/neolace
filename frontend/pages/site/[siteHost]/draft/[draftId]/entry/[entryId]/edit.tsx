import React from 'react';
import { NextPage } from 'next';
import { FormattedMessage, useIntl } from 'react-intl';
import { api, client, NEW, useDraft, useEditableEntry, useSiteData, useSiteSchema } from 'lib/api-client';

import { DefaultSiteTitle, SitePage } from 'components/SitePage';
import FourOhFour from 'pages/404';
import { ErrorMessage } from 'components/widgets/ErrorMessage';
import { Breadcrumb, Breadcrumbs } from 'components/widgets/Breadcrumbs';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { Form, AutoControl, Control } from 'components/widgets/Form';
import { TextInput } from 'components/widgets/TextInput';
import { MDTEditor } from 'components/widgets/MDTEditor';
import { Button } from 'components/widgets/Button';
import { IN_BROWSER } from 'lib/config';

interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    draftId: string;
    entryId: string;
}

const emptyArray: api.AnyEdit[] = [];  // Declare this out here so it doesn't change on every render of DraftEntrypage

const DraftEntryEditPage: NextPage = function(_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const {site, siteError} = useSiteData();
    const [baseSchema] = useSiteSchema();
    const router = useRouter();
    const query = router.query as PageUrlQuery;
    const draftId = query.draftId as api.VNID|NEW;
    const [draft, draftError] = useDraft(draftId);
    // *IF* we are creating a new entry from scratch, this will be its new VNID. Note that VNID() only works on the
    // client in this case, and generating it on the server wouldn't make sense anyways.
    const [newEntryId] = React.useState(() => IN_BROWSER ? api.VNID() : api.VNID('_tbd'));
    const isNewEntry = query.entryId === "_";
    // The "base entry" is the unmodified entry, as published on the site, without any edits applied.
    const [baseEntry, entryError] = useEditableEntry(isNewEntry ? {newEntryWithId: newEntryId} : query.entryId as api.VNID);

    // Any edits that have previously been saved into the draft that we're editing, if any:
    const draftEdits = (draft?.edits ?? emptyArray) as api.AnyEdit[];
    // Any edits that the user has made on this page now, but hasn't yet saved to a draft:
    const [unsavedEdits, setUnsavedEdits] = React.useState<api.AnyContentEdit[]>([]);
    const addUnsavedEdit = React.useCallback((newEdit: api.AnyContentEdit) => {
        setUnsavedEdits((existingEdits) => [...existingEdits, newEdit]);
    }, []);

    const entry = React.useMemo(() => {
        // What the user is currently editing and should see on the screen is:
        // The previously published version of the entry (if any),
        // PLUS any edits previously made to it in the current draft (if any),
        // PLUS any edits currently made on this page now, but not yet saved to the draft (if any)
        return baseEntry && baseSchema ? api.applyEditsToEntry(baseEntry, baseSchema, [...draftEdits, ...unsavedEdits]) : undefined;
    }, [baseEntry, baseSchema, draftEdits, unsavedEdits]);
    const schema = React.useMemo(() => baseSchema ? api.applyEditsToSchema(baseSchema, unsavedEdits) : undefined, [baseSchema, unsavedEdits]);

    const entryType = schema?.entryTypes?.[entry?.entryType.id ?? ""];

    const updateEntryName = React.useCallback((name: string) => {
        if (!baseEntry) { return; }
        addUnsavedEdit({ code: api.SetEntryName.code, data: { entryId: baseEntry.id, name } });
    }, [baseEntry, addUnsavedEdit]);

    const updateEntryDescription = React.useCallback((description: string) => {
        if (!baseEntry) { return; }
        addUnsavedEdit({ code: api.SetEntryDescription.code, data: { entryId: baseEntry.id, description } });
    }, [baseEntry, addUnsavedEdit]);

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
                title: newDraftTitle.trim() || intl.formatMessage({id: "draft.edit.newDraftTitle", defaultMessage: `Edited ${baseEntry?.name}`}),
                description: "",
                edits: unsavedEdits,
            }, {siteId: site.shortId,}).then(
                (newDraft) => { // If successful:
                    // Redirect to let the user view/edit the new draft:
                    router.push(`/draft/${newDraft.id}`);
                },
                (error) => {
                    setIsSaving(false);
                    console.error(error);
                    alert(intl.formatMessage({id: "draft.entry.edit.errorSaving", defaultMessage: `Failed to save draft: {error}`}, {error: String(error?.message ?? error)}));
                },
            );
        } else {
            // We're updating an existing draft
            alert("Updating an existing draft is not yet implemented.");
        }
    }, [draftId, baseEntry?.name, unsavedEdits, newDraftTitle, draftError, intl, router, site.shortId]);

    if (siteError instanceof api.NotFound) {
        return <FourOhFour/>;
    } else if (siteError) {
        return <ErrorMessage>{String(siteError)}</ErrorMessage>;
    }

    let content: JSX.Element;
    // Are there any other errors?
    if (entryError instanceof api.NotFound) {
        content = <FourOhFour/>;
    } else if (draftError) {
        content = <ErrorMessage>{String(draftError)}</ErrorMessage>;
    } else if (entryError) {
        content = <ErrorMessage>{String(entryError)}</ErrorMessage>;
    } else if (draft?.status === api.DraftStatus.Accepted || draft?.status === api.DraftStatus.Cancelled) {
        content = <ErrorMessage>This draft is no longer editable.</ErrorMessage>;
    } else {
        content = <>
            {/*
                <Link href={`/draft/${query.draftId}/entry/${query.entryId}/preview`}><a className="float-right text-sm">Preview</a></Link>
            */}
            <Breadcrumbs>
                <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                <Breadcrumb href={`/draft/`}>
                    <FormattedMessage id="draft.allDrafts" defaultMessage={"Drafts"} />
                </Breadcrumb>
                <Breadcrumb href={draft ? `/draft/${draft.id}` : undefined}>
                    { draft ? draft.title : <FormattedMessage id="draft.new" defaultMessage="New Draft" /> }
                </Breadcrumb>
                <Breadcrumb>{entry?.name || (isNewEntry ? "New Entry" : "Entry")}</Breadcrumb>
                {!isNewEntry ? <Breadcrumb>Edit</Breadcrumb> : null}
            </Breadcrumbs>

            <br/>

            <Form>
                <AutoControl
                    value={entry?.name ?? ""}
                    onChangeFinished={updateEntryName}
                    id="title"
                    label={{id: "draft.entry.edit.name.label", defaultMessage: "Name / Title"}}
                >
                    <TextInput />
                </AutoControl>

                <AutoControl
                    value={entryType?.name ?? ""}
                    id="entryType"
                    label={{id: "draft.entry.edit.type.label", defaultMessage: "Entry Type"}}
                    hint={intl.formatMessage({id: "draft.entry.edit.type.hint", defaultMessage: "Cannot be changed."})}
                >
                    <TextInput readOnly={true} />
                </AutoControl>

                <AutoControl
                    value={entry?.friendlyId ?? ""}
                    id="id"
                    label={{id: "draft.entry.edit.id.label", defaultMessage: "ID"}}
                    hint={
                        intl.formatMessage({id: "draft.entry.edit.id.hint1", defaultMessage: "Shown in the URL."}) + " " +
                        (entryType?.friendlyIdPrefix ? intl.formatMessage({id: "draft.entry.edit.id.hint2", defaultMessage: "Must start with \"{prefix}\"."}, {prefix: entryType.friendlyIdPrefix}) : "") + " " +
                        intl.formatMessage({id: "draft.entry.edit.id.hint3", defaultMessage: "Must be unique."}) + " " +
                        intl.formatMessage({id: "draft.entry.edit.id.hint4", defaultMessage: "You cannot re-use an ID that was previously used for a different entry."})
                    }
                >
                    <TextInput />
                </AutoControl>

                <AutoControl
                    value={entry?.description ?? ""}
                    onChangeFinished={updateEntryDescription}
                    id="description"
                    label={{id: "draft.entry.edit.description.label", defaultMessage: "Description"}}
                >
                    <MDTEditor inlineOnly={true} />
                </AutoControl>
            </Form>

            <h2><FormattedMessage id="draft.entry.edit.newChanges" defaultMessage={"New changes"} /></h2>
            {
                unsavedEdits.length > 0 ?
                    <ul>
                        {unsavedEdits.map((e, idx) => 
                            <li key={idx}>{api.getEditType(e.code).describe(e.data)}</li>
                        )}
                    </ul>
                :
                    <p><FormattedMessage id="draft.entry.edit.noChangesYet" defaultMessage={"You haven't made any changes yet. Make some changes above and you'll be able to save the changes here."} /></p>
            }
            <h3><FormattedMessage id="draft.entry.edit.save" defaultMessage={"Save changes"} /></h3>
            {
                draft ?
                    <Button icon="file-earmark-diff" disabled={unsavedEdits.length === 0 || isSaving} onClick={saveChangesToDraft}>
                        <FormattedMessage id="draft.entry.edit.save" defaultMessage={"Save these changes (to draft \"{title}\")"} values={{title: draft.title}} />
                    </Button>
                :
                    <Form>
                        <Control id="draft-desc" label={{id: "draft.entry.edit.draft-title-instructions", defaultMessage: "Provide a brief description of what you changed:"}}>
                            <TextInput />
                        </Control>
                        <Button icon="file-earmark-diff" disabled={unsavedEdits.length === 0 || isSaving} onClick={saveChangesToDraft}>
                            <FormattedMessage id="draft.entry.edit.save" defaultMessage={"Save these changes (as draft)"} />
                        </Button>
                    </Form>
            }
        </>;
    }

    return (
        <SitePage
            title={entry ?
                intl.formatMessage({id: "draft.entry.edit.title", defaultMessage: `Edit "{name}"`}, {name: entry.name})
            :
                intl.formatMessage({id: "draft.entry.edit.titleNoEntry", defaultMessage: `Edit`},)
            }
            sitePreloaded={null}
            leftNavTopSlot={[]}
        >
            {content}
        </SitePage>
    );
}

export default DraftEntryEditPage;
