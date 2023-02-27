import React from "react";
import { FormattedMessage } from "react-intl";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import Link from "next/link";
import { ParsedUrlQuery } from "querystring";
import { SDK, client, getSiteData, RefCacheContext } from "lib/sdk";

import { SiteDataProvider, SitePage } from "components/SitePage";
import { LookupExpressionInput } from "components/form-input/LookupExpressionInput";
import { useRouter } from "next/router";
import { LookupEvaluatorWithPagination } from "components/widgets/LookupEvaluator";
import { MDTContext } from "components/markdown-mdt/mdt";
import { defineMessage } from "components/utils/i18n";

interface PageProps {
    entry: SDK.EntryData;
    sitePreloaded: SDK.SiteDetailsData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    entryId: string;
}

const EvaluateLookupPage: NextPage<PageProps> = function (props) {
    const router = useRouter();

    // The lookup expression that we're currently displaying, if any - comes from the URL or if the user types in a new one and presses ENTER
    const activeLookupExpression: string = Array.isArray(router.query.e) ? router.query.e[0] : (router.query.e ?? "");

    const [editingLookupExpression, setEditingLookupExpression] = React.useState(activeLookupExpression);
    const handleLookupExpressionChange = React.useCallback((value: string) => setEditingLookupExpression(value), [setEditingLookupExpression]);
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
    }, [router.isReady]);

    const hasProps = props.entry.propertiesSummary?.length ?? 0 > 0;

    const mdtContext = React.useMemo(() => new MDTContext({
        entryId: props.entry.id,
    }), [props.entry.id]);

    return (
        <SiteDataProvider sitePreloaded={props.sitePreloaded}>
            <RefCacheContext.Provider value={{refCache: props.entry.referenceCache}}>
                <SitePage
                    leftNavTopSlot={[
                        {id: "entryName", priority: 20, content: <>
                            <br/>
                            <strong>{props.entry.name}</strong>
                        </>},
                        {id: "entryId", priority: 21, content: <>
                            <code id="entry-id" data-entry-id={props.entry.id} className="font-mono font-light hidden">{props.entry.key}</code>
                        </>},
                        {id: "tableOfContents", priority: 50, content: <>
                            <ul id="left-toc-headings">
                                <li><Link  href={`/entry/${props.entry.key}#summary`}><FormattedMessage id="RrCui3" defaultMessage="Summary"/></Link></li>
                                <li className={`${hasProps || "hidden"}`}><Link href={`/entry/${props.entry.key}#properties`}><FormattedMessage id="aI80kg" defaultMessage="Properties"/></Link></li>
                                {
                                    props.entry.features?.Article?.headings.map(heading =>
                                        <li key={heading.id}><Link href={`/entry/${props.entry.key}#h-${heading.id}`}>{heading.title}</Link></li>
                                    )
                                }
                            </ul>
                        </>},
                    ]}
                    title={props.entry.name}
                >
                    <h1>{props.entry.name}</h1>

                    <LookupExpressionInput
                        value={editingLookupExpression}
                        onChange={handleLookupExpressionChange}
                        onFinishedEdits={handleFinishedChangingLookupExpression}
                        placeholder={defineMessage({id: 'Uowwem', defaultMessage: "Enter a lookup expression..."})}
                    />

                    <p><FormattedMessage id="vBiQpy" defaultMessage="Result:" /></p>
                    <div className={activeLookupExpression !== editingLookupExpression ? `opacity-50` : ``}>
                        {
                            activeLookupExpression ?
                                <LookupEvaluatorWithPagination expr={activeLookupExpression} mdtContext={mdtContext} />
                            :
                                <FormattedMessage id="++0Uwo" defaultMessage="Enter a lookup expression above to see the result." />
                        }
                    </div>
                </SitePage>
            </RefCacheContext.Provider>
        </SiteDataProvider>
    );
}

export default EvaluateLookupPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    if (!context.params) { throw new Error("Internal error - missing URL params."); }  // Make TypeScript happy

    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) { return {notFound: true}; }
    let entry: SDK.EntryData;
    try {
        entry = await client.getEntry(context.params.entryId, {siteKey: site.key, flags: [
            SDK.GetEntryFlags.IncludeFeatures,  // We need the article headings
            SDK.GetEntryFlags.IncludePropertiesSummary,  // To know if we show the "Properties" nav link or not
            SDK.GetEntryFlags.IncludeReferenceCache,
        ]});
    } catch (err) {
        if (err instanceof SDK.NotFound) {
            return {notFound: true};
        }
        throw err;
    }

    if (entry.key !== context.params.entryId) {
        // If the entry was looked up by an old key or VNID, redirect so the current key is in the URL:
        return {
            redirect: {
                destination: `/entry/${entry.key}/lookup`,
                permanent: true,
            },
        };
    }

    return {
        props: {
            entry,
            sitePreloaded: site,
        },
    };
}
