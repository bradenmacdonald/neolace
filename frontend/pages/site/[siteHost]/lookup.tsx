import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { SDK, getSiteData } from "lib/sdk";

import { SiteDataProvider, SitePage } from "components/SitePage";
import { LookupExpressionInput } from "components/form-input/LookupExpressionInput";
import { useRouter } from "next/router";
import { LookupEvaluatorWithPagination } from "components/widgets/LookupEvaluator";
import { MDTContext } from "components/markdown-mdt/mdt";
import { defineMessage } from "components/utils/i18n";
import Link from "next/link";

interface PageProps {
    sitePreloaded: SDK.SiteDetailsData;
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
    // Once it has been initialized we may need to change editingLookupExpression.
    // Likewise whenever the path/query changes changes.
    React.useEffect(() => {
        if (router.isReady) {
            setEditingLookupExpression(activeLookupExpression);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady, router.asPath]);

    const mdtContext = React.useMemo(() => new MDTContext({ entryId: undefined }), []);

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

                {activeLookupExpression
                    ? <>
                        <p>
                            <FormattedMessage id="vBiQpy" defaultMessage="Result:" />
                        </p>
                        <div className={activeLookupExpression !== editingLookupExpression ? `opacity-50` : ``}>
                            <LookupEvaluatorWithPagination expr={activeLookupExpression} mdtContext={mdtContext} />
                        </div>
                    </>
                    : <>
                        <div className="mt-5">
                            <p>
                                <FormattedMessage
                                    defaultMessage="Enter a <link>lookup expression</link> above and press ⏎ Enter to see the result."
                                    id="jK8qYd"
                                    values={{link: (str) => <Link href="https://junction.neolace.com/entry/term-lookup" target="_blank">{str}</Link> }}
                                />
                            </p>

                            <p><FormattedMessage defaultMessage="Examples:" id="6M8P0C" /></p>
                            <ul>
                                <li>
                                    <Link href={`/lookup?e=${encodeURIComponent(`allEntries()`)}`}><code>allEntries()</code></Link>
                                    {" "}- <FormattedMessage defaultMessage="See a list of all entries." id="LY6fJN" />
                                </li>
                                <li>
                                    <Link href={`/lookup?e=${encodeURIComponent(`allEntries().count()`)}`}><code>allEntries().count()</code></Link>
                                    {" "}- <FormattedMessage defaultMessage="See how many entries exist on this site." id="7M1PBy" />
                                </li>
                                <li>
                                    <code>allEntries().filter(entryType=Species).graph()</code>
                                    {" "}- <FormattedMessage defaultMessage='A graph of all "Species" entries (hypothetical example)' id="4lyAlD" />
                                </li>
                                <li>
                                    <code>entry("lion").andRelated(depth=2).graph()</code>
                                    {" "}- <FormattedMessage defaultMessage='A graph of animals related to lions (hypothetical example)' id="uWMcKo" />
                                </li>
                            </ul>
                            <p><FormattedMessage defaultMessage="Tip: in the box above, press @ and start typing to see available entries, entry types, and properties." id="xdrfAV" /></p>
                        </div>
                    </>}
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
