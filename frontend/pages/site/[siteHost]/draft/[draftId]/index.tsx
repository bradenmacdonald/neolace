import React from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { FormattedMessage, useIntl } from "react-intl";
import { api, client, NEW, useDraft, useSiteData } from "lib/api-client";

import { SitePage } from "components/SitePage";
import FourOhFour from "pages/404";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { ParsedUrlQuery } from "querystring";
import { Spinner } from "components/widgets/Spinner";
import { Button } from "components/widgets/Button";
import { UserStatus, useUser } from "lib/authentication";

interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    draftId: string;
}

const DraftDetailsPage: NextPage = function (_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const { site, siteError } = useSiteData();
    const user = useUser();
    const router = useRouter();
    const query = router.query as PageUrlQuery;
    const draftId = query.draftId as api.VNID | NEW;
    const [draft, draftError, mutateDraft] = useDraft(draftId);

    const [isUpdatingDraft, setUpdatingDraft] = React.useState(false);
    const acceptDraft = React.useCallback(async () => {
        if (!draft || !site || draft.status !== api.DraftStatus.Open) return;
        setUpdatingDraft(true);
        await client.acceptDraft(draft.id, { siteId: site.shortId });
        // Optimistically mark this as accepted:
        await mutateDraft({ ...draft, status: api.DraftStatus.Accepted });
        setUpdatingDraft(false);
    }, [draft, site, mutateDraft]);

    if (siteError instanceof api.NotFound) {
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
            <>
                <Breadcrumbs>
                    <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                    <Breadcrumb href={`/draft/`}>
                        <FormattedMessage id="2atspc" defaultMessage="Drafts" />
                    </Breadcrumb>
                    <Breadcrumb>{draft.title}</Breadcrumb>
                </Breadcrumbs>

                <h1>{draft.title}</h1>

                <p>Draft by {draft.author.fullName} ({draft.author.username})</p>

                <p>Created: {String(draft.created)}</p>

                <p>Description: {draft.description}</p>

                <p>
                    Status: {draft.status === api.DraftStatus.Open
                        ? "Open"
                        : draft.status === api.DraftStatus.Cancelled
                        ? "Cancelled"
                        : draft.status === api.DraftStatus.Accepted
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
                            {draft.edits.map((e, idx) => <li key={idx}>{api.getEditType(e.code).describe(e.data)}</li>)}
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
                            disabled={isUpdatingDraft || draft.edits.length === 0 || draft.status !== api.DraftStatus.Open}
                            onClick={acceptDraft}
                        >
                            <FormattedMessage id="T3NjTq" defaultMessage="Accept Draft (apply changes)" />
                        </Button>
                    </> : <p>You need to log in to accept a draft.</p>
                }

            </>
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
