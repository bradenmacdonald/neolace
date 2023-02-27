import React from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { FormattedMessage, FormattedRelativeTime, useIntl } from "react-intl";
import { SDK, client, DraftContextData, NEW, useDraft, useSiteData, UserStatus, useUser, DraftContext, usePermission } from "lib/sdk";

import { SitePage } from "components/SitePage";
import FourOhFour from "pages/404";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { ParsedUrlQuery } from "querystring";
import { Spinner } from "components/widgets/Spinner";
import { Button } from "components/widgets/Button";
import { EditDescription } from "components/widgets/EditDescription";
import { CorePerm } from "neolace-sdk";

// Define a consistent empty array so that React doesn't think a value changes if we use a different '[]' on each render
const noEdits = [] as const;

interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    draftNum: string;
}

const DraftDetailsPage: NextPage = function (_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const { site, siteError } = useSiteData();
    const user = useUser();
    const router = useRouter();
    const query = router.query as PageUrlQuery;
    const draftNum = query.draftNum === "_" ? "_" : parseInt(query.draftNum);
    const draftContext: DraftContextData = { draftNum, unsavedEdits: noEdits, };
    const [draft, _unsavedChanges, draftError, mutateDraft] = useDraft({draftContext});
    const canEditDraft = usePermission(CorePerm.editDraft, {draftContext});
    const canProposeNewEntry = usePermission(CorePerm.proposeNewEntry, {draftContext});

    const [isUpdatingDraft, setUpdatingDraft] = React.useState(false);
    const acceptDraft = React.useCallback(async () => {
        if (!draft || !site || draft.status !== SDK.DraftStatus.Open) return;
        setUpdatingDraft(true);
        await client.acceptDraft(draft.num, { siteKey: site.key });
        // Optimistically mark this as accepted:
        await mutateDraft({ ...draft, status: SDK.DraftStatus.Accepted });
        setUpdatingDraft(false);
    }, [draft, site, mutateDraft]);

    if (siteError instanceof SDK.NotFound) {
        return <FourOhFour />;
    } else if (siteError) {
        return <ErrorMessage>{String(siteError)}</ErrorMessage>;
    }

    let content: JSX.Element;
    if (draftError) {
        content = <ErrorMessage>{String(draftError)}</ErrorMessage>;
    } else if (draft === undefined) {
        content = <Spinner />;
    } else {
        content = (
            <DraftContext.Provider value={draftContext}>
                <Breadcrumbs>
                    <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                    <Breadcrumb href={`/draft/`}>
                        <FormattedMessage id="2atspc" defaultMessage="Drafts" />
                    </Breadcrumb>
                    <Breadcrumb>{draft.title}</Breadcrumb>
                </Breadcrumbs>

                <h1>{draft.title}</h1>

                <p>Draft by {draft.author.fullName} ({draft.author.username}), created <span><FormattedRelativeTime value={(draft.created.getTime() - new Date().getTime())/1000} updateIntervalInSeconds={1} /></span>.</p>

                <p>Description: {draft.description}</p>

                <p>
                    Status: {draft.status === SDK.DraftStatus.Open
                        ? "Open"
                        : draft.status === SDK.DraftStatus.Cancelled
                        ? "Cancelled"
                        : draft.status === SDK.DraftStatus.Accepted
                        ? "Accepted"
                        : "Unknown"}
                </p>

                <br />

                <h2>
                    <FormattedMessage id="m929Io" defaultMessage="Edits" />
                </h2>
                {draft.edits.length > 0
                    ? (
                        <ul>
                            {draft.edits.map((e, idx) => (
                                <li key={idx}> <EditDescription edit={e} /> </li>
                            ))}
                        </ul>
                    )
                    : (
                        <p>
                            <FormattedMessage id="vt7mne" defaultMessage="This draft has no edits yet." />
                        </p>
                    )}
                <h2>
                    <FormattedMessage id="wL7VAE" defaultMessage="Actions" />
                </h2>

                {
                    user.status === UserStatus.LoggedIn ? <>
                        <Button
                            icon="check-circle-fill"
                            disabled={isUpdatingDraft || draft.edits.length === 0 || draft.status !== SDK.DraftStatus.Open}
                            onClick={acceptDraft}
                        >
                            <FormattedMessage id="T3NjTq" defaultMessage="Accept Draft (apply changes)" />
                        </Button>
                    </> : <p>You need to log in to accept a draft.</p>
                }

                {
                    user.status === UserStatus.LoggedIn ? <>
                        <Button
                            icon="plus-lg"
                            disabled={draft.status !== SDK.DraftStatus.Open || !canEditDraft || !canProposeNewEntry}
                            onClick={() => router.push(`/draft/${draftNum}/entry/_/edit`)}
                        >
                            <FormattedMessage id="lE5OgU" defaultMessage="Create a new entry (in this draft)" />
                        </Button>
                    </> : <p>You need to log in to edit this draft.</p>
                }

            </DraftContext.Provider>
        );
    }

    return (
        <SitePage
            title={draft
                ? intl.formatMessage({ id: "Z2/PbO", defaultMessage: `Draft: {title}` }, { title: draft.title })
                : intl.formatMessage({ id: "f4NTf1", defaultMessage: `Loading draft` })}
            leftNavTopSlot={[]}
        >
            {content}
        </SitePage>
    );
};

export default DraftDetailsPage;
