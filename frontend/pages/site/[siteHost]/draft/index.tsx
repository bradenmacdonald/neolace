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
import { FormattedMessage, FormattedRelativeTime, useIntl } from "react-intl";
import { SDK, client, useSiteData, useUser, usePermission, UserStatus } from "lib/sdk";

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
    const user = useUser();

    const title = intl.formatMessage({ id: "2atspc", defaultMessage: `Drafts` });

    const canEditSchema = usePermission(SDK.CorePerm.proposeEditToSchema);
    const canCreateEntries = usePermission(SDK.CorePerm.proposeNewEntry);

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
                    <ListOfDrafts status={SDK.DraftStatus.Open} />
                </Tab>
                <Tab id="accepted" name={defineMessage({ defaultMessage: "Accepted", id: "aFyFm0" })}>
                    <ListOfDrafts status={SDK.DraftStatus.Accepted} />
                </Tab>
                <Tab id="cancelled" name={defineMessage({ defaultMessage: "Cancelled", id: "3wsVWF" })}>
                    <ListOfDrafts status={SDK.DraftStatus.Cancelled} />
                </Tab>
            </TabBarRouter>

            <h2><FormattedMessage defaultMessage="Create a new draft" id="HTzod6" /></h2>
            {
                canCreateEntries ?
                    <FormattedMessage
                        defaultMessage="You can open a new draft by <link>creating a new entry</link>, or by browsing to any existing entry and clicking &quot;Edit&quot;."
                        id="6ZlReH"
                        values={{link: (str) => <Link href="/draft/_/entry/_/edit">{str}</Link> }}
                    />
                : user.status === UserStatus.LoggedIn ?
                    <FormattedMessage defaultMessage="You don't have permission to create a new entry, but you may have permission to propose edits to some existing entries." id="6RKiUV" />
                :
                    <FormattedMessage defaultMessage="Log in to create a draft." id="nWea5q" />
            }
            {" "}
            {
                canEditSchema ?
                    <FormattedMessage
                        defaultMessage="You can also <link>edit the schema</link>, which will open a new draft with your proposed changes."
                        id="iO9KyN"
                        values={{link: (str) => <Link href="/draft/_/schema/edit">{str}</Link> }}
                    />
                : null
            }
        </SitePage>
    );
};

const ListOfDrafts: React.FunctionComponent<{ status: SDK.DraftStatus }> = ({ status }) => {
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
        <ol className="min-h-[300px]">
            {(data?.values || []).map((draft) => (
                <li key={draft.num}>
                    <Link href={`/draft/${draft.num}`}>
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
