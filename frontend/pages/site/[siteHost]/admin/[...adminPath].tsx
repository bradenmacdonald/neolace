import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { FormattedMessage, useIntl } from "react-intl";
import useSWR from "swr";

import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Redirect } from "components/utils/Redirect";
import { SiteDataProvider, SitePage } from "components/SitePage";
import { Spinner } from "components/widgets/Spinner";
import { client, getSiteData, SiteData, useSiteData } from "lib/api-client";
import { UserStatus, useUser } from "lib/authentication";
import { AdminComponentProps, AdminLinks, builtInAdminTools } from "components/site-admin/site-admin";
import { useRouter } from "next/router";
import FourOhFour from "pages/404";
import { displayString } from "components/utils/i18n";

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}


/**
 * This site admin page lists all of the users associated with the current site.
 * @param props
 * @returns
 */
const SiteAdminPage: NextPage<PageProps> = function (props) {
    const intl = useIntl();
    const user = useUser();
    const router = useRouter();

    if (user.status === UserStatus.Anonymous) {
        return <Redirect to="/account/login" />;
    }

    // If the current page is /admin/foo, this adminPath is 'foo'
    const adminPath = (router.query.adminPath as string[])[0];
    const adminTool = builtInAdminTools.find((t) => t.matchPath.test(adminPath));
    
    if (adminTool === undefined) {
        return <FourOhFour/>;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const matchedPath = adminPath.match(adminTool.matchPath)!;
    const titleTranslated = displayString(intl, adminTool.name);

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <SitePage
                title={titleTranslated}
                leftNavTopSlot={[{
                    id: "adminLinks",
                    priority: 20,
                    content: <AdminLinks/>,
                }]}
            >
                <Breadcrumbs>
                    <Breadcrumb href={`/`}>{props.site.name}</Breadcrumb>
                    <Breadcrumb href={`/admin`}>
                        <FormattedMessage id="iOBTBR" defaultMessage="Site Administration" />
                    </Breadcrumb>
                    <Breadcrumb>{titleTranslated}</Breadcrumb>
                </Breadcrumbs>
                <h1 className="text-3xl font-semibold">{titleTranslated}</h1>
                {React.createElement<AdminComponentProps>(adminTool.component, {matchedPath, })}
            </SitePage>
        </SiteDataProvider>
    );
};

export default SiteAdminPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    };
};

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    if (!context.params) throw new Error("Internal error - missing URL params."); // Make TypeScript happy
    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) return { notFound: true };
    return { props: { site } };
};
