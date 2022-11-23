import React from "react";
import { NextPage } from "next";
import { FormattedMessage, FormattedRelativeTime, useIntl } from "react-intl";
import { api, client, useSiteData, useUser } from "lib/api";

import { SitePage } from "components/SitePage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { Tab, TabBarRouter } from "components/widgets/Tabs";
import { defineMessage } from "components/utils/i18n";
import useSWR from "swr";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import Link from "next/link";
import { useRouter } from "next/router";

const DraftDetailsPage: NextPage = function (_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const { site } = useSiteData();

    const title = intl.formatMessage({ id: "2atspc", defaultMessage: `Drafts` });

    return (
        <SitePage title={title} leftNavTopSlot={[]}>
            <Breadcrumbs>
                <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                <Breadcrumb>
                    <FormattedMessage id="2atspc" defaultMessage="Drafts" />
                </Breadcrumb>
            </Breadcrumbs>

            <h1>{title}</h1>

            <TabBarRouter queryParam="status">
                <Tab id="open" name={defineMessage({ defaultMessage: "Open", id: "JfG49w" })}>
                    <ListOfDrafts status={api.DraftStatus.Open} />
                </Tab>
                <Tab id="accepted" name={defineMessage({ defaultMessage: "Accepted", id: "aFyFm0" })}>
                    <ListOfDrafts status={api.DraftStatus.Accepted} />
                </Tab>
                <Tab id="cancelled" name={defineMessage({ defaultMessage: "Cancelled", id: "3wsVWF" })}>
                    <ListOfDrafts status={api.DraftStatus.Cancelled} />
                </Tab>
            </TabBarRouter>
        </SitePage>
    );
};

const ListOfDrafts: React.FunctionComponent<{ status: api.DraftStatus }> = ({ status }) => {
    const { site } = useSiteData();
    const user = useUser();
    const userKey = user.username ?? "";
    const router = useRouter();
    const page = typeof router.query?.page === "string" ? parseInt(router.query?.page, 10) : 1;

    const key = `draftsList:${site.key}:${userKey}:${status}:${page}`; // We include the user since different users may have different permissions to view drafts
    const { data, error } = useSWR(key, async () => {
        if (!site.key) {
            return { values: [], totalCount: 0 };
        }
        return await client.listDrafts({ siteKey: site.key, status, page });
    });

    if (error) {
        return <ErrorMessage>Unable to load drafts: {String(error)}</ErrorMessage>;
    }

    return (
        <ol>
            {(data?.values || []).map((draft) => (
                <li key={draft.idNum}>
                    <Link href={`/draft/${draft.idNum}`}>
                        <span className="font-semibold">{draft.title}</span>
                    </Link>{" "}
                    | {draft.author.fullName} |{" "}
                    <FormattedRelativeTime
                        value={(draft.created.getTime() - new Date().getTime()) / 1000}
                        updateIntervalInSeconds={1}
                    />
                </li>
            ))}
        </ol>
    );
};

export default DraftDetailsPage;
