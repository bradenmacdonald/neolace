import React from 'react';
import { NextPage } from 'next';
import { useIntl } from 'react-intl';
import { api, useEditableEntry, useSiteData, useSiteSchema } from 'lib/api-client';

import { SitePage } from 'components/SitePage';
import FourOhFour from 'pages/404';
import { ErrorMessage } from 'components/widgets/ErrorMessage';
import { Breadcrumb, Breadcrumbs } from 'components/widgets/Breadcrumbs';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { Form, AutoControl } from 'components/widgets/Form';
import { TextInput } from 'components/widgets/TextInput';
import Link from 'next/link';
import { MDTEditor } from 'components/widgets/MDTEditor';

interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    draftId: string;
    entryId: string;
}

const DraftEntryEditPage: NextPage = function(_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const {site, siteError} = useSiteData();
    const [schema] = useSiteSchema();
    const router = useRouter();
    const query = router.query as PageUrlQuery;
    // The "base entry" is the unmodified entry, as published on the site, without any edits applied.
    const [baseEntry, entryError] = useEditableEntry(query.entryId as api.VNID);

    // edits = useState getDraftEdits();
    // entryResult = applyEdits(entry, edits)

    const entryType = schema?.entryTypes?.[baseEntry?.entryType.id ?? ""];

    if (siteError instanceof api.NotFound) {
        return <FourOhFour/>;
    } else if (siteError) {
        return <ErrorMessage>{String(siteError)}</ErrorMessage>;
    } else if (entryError instanceof api.NotFound) {
        return <FourOhFour/>
    } else if (entryError) {
        return <ErrorMessage>{String(siteError)}</ErrorMessage>;
    }

    return (
        <SitePage
            title={`Edit`}
            sitePreloaded={null}
            leftNavTopSlot={[]}
        >

            <Link href={`/draft/${query.draftId}/entry/${query.entryId}/preview`}><a className="float-right text-sm">Preview</a></Link>
            <Breadcrumbs>
                <Breadcrumb href={"/"}>New Draft</Breadcrumb>
                <Breadcrumb href={baseEntry ? `/entry/${baseEntry.friendlyId}` : undefined}>{baseEntry?.name ?? "Entry"}</Breadcrumb>
                <Breadcrumb>Edit</Breadcrumb>
            </Breadcrumbs>

            <Form>
                <AutoControl
                    value={entry?.name ?? ""}
                    onChangeFinished={updateEntryName}
                    id="title"
                    label={{id: "draft.entry.edit.title.label", defaultMessage: "Title"}}
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
                    id="description"
                    label={{id: "draft.entry.edit.description.label", defaultMessage: "Description"}}
                >
                    <MDTEditor inlineOnly={true} />
                </AutoControl>
            </Form>
        </SitePage>
    );
}

export default DraftEntryEditPage;
