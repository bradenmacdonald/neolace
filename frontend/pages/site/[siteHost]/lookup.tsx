import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { api, getSiteData } from "lib/api-client";

import { SiteDataProvider, SitePage } from "components/SitePage";
import { LookupExpressionInput } from "components/widgets/LookupExpressionInput";
import { useRouter } from "next/router";
import { LookupEvaluatorWithPagination } from "components/LookupEvaluator";
import { MDTContext } from "components/markdown-mdt/mdt";
import { defineMessage } from "components/utils/i18n";

interface PageProps {
    sitePreloaded: api.SiteDetailsData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const EvaluateLookupPage: NextPage<PageProps> = function (props) {
    const router = useRouter();
    const intl = useIntl();

    // The lookup expression that we're currently displaying, if any - comes from the URL or if the user types in a new one and presses ENTER
    const activeLookupExpression: string = Array.isArray(router.query.e) ? router.query.e[0] : (router.query.e ?? "");

    const [editingLookupExpression, setEditingLookupExpression] = React.useState(activeLookupExpression);
    const handleLookupExpressionChange = React.useCallback((value: string) => setEditingLookupExpression(value), [
        setEditingLookupExpression,
    ]);
    const handleFinishedChangingLookupExpression = React.useCallback((value: string) => {
        const newPath = location.pathname + `?e=${encodeURIComponent(value)}`;
        router.replace(newPath);
    }, [router]);

    // When the router first loads (on a full page load), it won't have the query.
    // Once it has been initialized we may need to change editingLookupExpression
    React.useEffect(() => {
        if (router.isReady) {
            setEditingLookupExpression(activeLookupExpression);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady]);

    const mdtContext = React.useMemo(() => new MDTContext({ entryId: undefined, refCache: undefined }), []);

    const title = intl.formatMessage({ defaultMessage: "Lookup", id: "VzW9jr" });

    return (
        <SiteDataProvider sitePreloaded={props.sitePreloaded}>
            <SitePage title={title}>
                <h1>{title}</h1>

                <LookupExpressionInput
                    value={editingLookupExpression}
                    onChange={handleLookupExpressionChange}
                    onFinishedEdits={handleFinishedChangingLookupExpression}
                    placeholder={defineMessage({ id: "Uowwem", defaultMessage: "Enter a lookup expression..." })}
                />

                <p>
                    <FormattedMessage id="vBiQpy" defaultMessage="Result:" />
                </p>
                <div className={activeLookupExpression !== editingLookupExpression ? `opacity-50` : ``}>
                    {activeLookupExpression
                        ? <LookupEvaluatorWithPagination expr={activeLookupExpression} mdtContext={mdtContext} />
                        : (
                            <FormattedMessage
                                id="++0Uwo"
                                defaultMessage="Enter a lookup expression above to see the result."
                            />
                        )}
                </div>
            </SitePage>
        </SiteDataProvider>
    );
};

export default EvaluateLookupPage;

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

    return { props: { sitePreloaded: site } };
};
