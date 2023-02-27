import React from "react";
import Link from "next/link";
import { FormattedListParts, FormattedMessage } from "react-intl";

import { api, useRefCache } from "lib/api";
import { Tooltip } from "components/widgets/Tooltip";
import { InlineMDT, MDTContext } from "../markdown-mdt/mdt";
import { LookupImage } from "./LookupImage";
import { FormattedFileSize } from "./FormattedFileSize";
import { HoverClickNote } from "./HoverClickNote";
import { ErrorMessage } from "./ErrorMessage";
import { LookupGraph } from "../graph/GraphLoader";
import { EntryValue } from "./EntryValue";
import { UiPluginsContext } from "../utils/ui-plugins";
import { Icon } from "./Icon";
import { LookupQuantityValue } from "./LookupQuantityValue";
import { LookupExpressionInput } from "components/form-input/LookupExpressionInput";
import { LookupDemo } from "./LookupDemo";

interface LookupValueProps {
    value: api.AnyLookupValue;
    mdtContext: MDTContext;
    /**
     * By default, for any paginated values, we'll show the first few values and link to a results page where more
     * values can be seen. To disable that "show more" link (e.g. because a parent component is handling pagination),
     * set this to true. Usually it should be false.
     *
     * This value will not be applied child values, only to this value itself (though if this is an AnnotatedValue, it
     * does apply to the inner value.)
     */
    hideShowMoreLink?: boolean;
    /**
     * Should lists (e.g. of entries) be displayed in compact form ("a, b, c" on one line) or in rows (one per line)?
     * Compact generally looks better in the "Properties" section, while "rows" looks better on the lookup query page
     * or inline in markdown documents.
     */
    defaultListMode?: "compact" | "rows";
    children?: never;
}

/**
 * Render a Lookup Value (computed/query value, such as all the "properties" shown on an entry's page)
 */
export const LookupValue: React.FunctionComponent<LookupValueProps> = (props) => {
    const refCache = useRefCache();

    // When the entry loads, the data gets refreshed from the server but is often identical. This will cause a useless
    // update of the whole React tree. We can avoid this by using JSON.stringify to check if the value has actually
    // changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const value = React.useMemo(() => props.value, [JSON.stringify(props.value)]);

    // Some plugins may override the rendering of some lookup values, so we need to be aware of enabled plugins.
    const pluginsData = React.useContext(UiPluginsContext);

    if (typeof value !== "object" || value === null || !("type" in value)) {
        return <p>[ERROR INVALID VALUE, NO TYPE INFORMATION]</p>; // Doesn't need i18n, internal error message shouldn't be seen
    }

    if (value.annotations?.displayAsEditableDemoFromExpression && value.annotations.displayAsEditableDemoFromExpression.type === "String") {
        const {displayAsEditableDemoFromExpression: expr, ...otherAnnotations} = value.annotations;
        const innerValue = {...value, annotations: otherAnnotations};
        // Display this value as an editable expression:
        return <LookupDemo value={innerValue} expr={expr.value} mdtContext={props.mdtContext} />
    }

    if (value.annotations?.note || value.annotations?.detail) {
        const {note, detail, ...otherAnnotations} = value.annotations;
        const valueWithoutNoteOrDetails = {...value, annotations: otherAnnotations};
        return <>
            <LookupValue
                value={valueWithoutNoteOrDetails}
                mdtContext={props.mdtContext}
                hideShowMoreLink={props.hideShowMoreLink}
            />
            {
                detail && detail.type !== "Page" && detail.type !== "Graph" && detail.type !== "Image" ?
                    <div className="text-sm inline mx-1">
                        (<LookupValue value={detail} mdtContext={props.mdtContext} hideShowMoreLink={props.hideShowMoreLink} />)
                    </div>
                : detail ? <span>[invalid detail annotation]</span>
                : null
            }
            {
                note ?
                    <HoverClickNote>
                        <p className="text-sm">
                            <LookupValue value={note} mdtContext={props.mdtContext} hideShowMoreLink={props.hideShowMoreLink} />
                        </p>
                    </HoverClickNote>
                : null
            }
        </>;
    }

    if (value.type === "String") {
        for (const plugin of pluginsData.plugins) {
            const override = plugin.overrideLookupValue?.(plugin.siteConfig, value);
            if (override) {
                return override;
            }
        }
    }

    switch (value.type) {
        case "Page": {
            const numRemaining = value.totalCount - value.startedAt - value.values.length;
            let moreLink: JSX.Element|undefined;
            const hideShowMoreLink = props.hideShowMoreLink || value.annotations?.showMore?.type === "Boolean" && value.annotations.showMore.value === false;
            if (numRemaining > 0 && !hideShowMoreLink) {
                moreLink = <FormattedMessage
                    key="more"
                    id="hAv0cA"
                    defaultMessage="{extraCount, plural, one {# more…} other {# more…}}"
                    values={{extraCount: numRemaining}}
                    description="How many more items there are (at the end of a list)"
                />;
                if (value.source) {
                    if (value.source.entryId) {
                        const entryKey = refCache.entries[value.source.entryId]?.key ?? props.mdtContext.entryId;
                        moreLink = <Link key="more" href={`/entry/${entryKey}/lookup?e=${encodeURIComponent(value.source.expr)}`}>{moreLink}</Link>;
                    } else {
                        moreLink = <Link key="more" href={`/lookup?e=${encodeURIComponent(value.source.expr)}`}>{moreLink}</Link>;
                    }
                }
            }

            // TODO: Need to support controlling this mode via annotations in the future.
            if (props.mdtContext.inParagraph || props.defaultListMode === "compact") {
                const listValues = value.values.map((v, idx) => 
                    <LookupValue key={idx} value={v} mdtContext={props.mdtContext} />
                );
                if (moreLink) {
                    listValues.push(moreLink);
                }
                return <span className="neo-lookup-paged-values">
                    <FormattedListParts type="unit" value={listValues}>
                        {parts => <>{parts.map(p => p.value)}</>}
                    </FormattedListParts>
                </span>;
            } else if (value.values.every((v) => v.type === "Image")) {
                // This is a list of images. Display them in a larger, more useful way:
                const images = value.values as api.ImageValue[];
                return (
                    <ul className="unstyled flex flex-row flex-wrap">
                        {images.map((v, idx) => (
                            <LookupImage key={v.entryId} value={v} mdtContext={props.mdtContext} overrideFormat="ListItemFormat" />
                        ))}
                        {moreLink && <li>{moreLink}</li>}
                    </ul>
                );
            } else {
                return (
                    <ul>
                        {value.values.map((v, idx) => <li key={idx}>
                            <LookupValue key={idx} value={v} mdtContext={props.mdtContext} />
                        </li>)}
                        {moreLink && <li>{moreLink}</li>}
                    </ul>
                );
            }
        }
        case "Entry": {
            return <EntryValue entryId={value.id} mdtContext={props.mdtContext} />;
        }
        case "EntryType": {
            const entryTypeName = refCache.entryTypes[value.key]?.name ?? value.key;
            const entryTypeColor = api.getEntryTypeColor(refCache.entryTypes[value.key]);
            return <span className="text-sm font-medium font-sans">
                <span className={`rounded-l-md py-[3px] px-2 bg-gray-200`} style={{color: entryTypeColor.textColor, backgroundColor: entryTypeColor.backgroundColor}}>
                    <span className="text-xs inline-block min-w-[1.4em] text-center"><Icon icon="square-fill"/></span>
                </span>
                <span className={`rounded-r-md py-[3px] px-2 bg-gray-100 text-gray-700`}>{entryTypeName}</span>
            </span>;
        }
        case "Image": {
            return <LookupImage value={value} mdtContext={props.mdtContext} />;
        }
        case "Graph": {
            return <LookupGraph value={value} mdtContext={props.mdtContext} />;
        }
        case "File": {
            return (
                <>
                    <a href={value.url} target="_blank" rel="noreferrer">{value.filename}</a> (<FormattedFileSize sizeInBytes={value.size} />)
                </>
            );
        }
        case "Property": {
            const prop = refCache.properties[value.key];
            if (prop === undefined) {
                // return <Link href={`/prop/${value.id}`}><a className="text-red-700 font-bold">{value.key}</a></Link>
                return <span className="text-red-700 font-bold">{value.key}</span>;
            }
            return <Tooltip tooltipContent={<>
                <strong>{prop.name}</strong><br/>
                <p className="text-sm"><InlineMDT mdt={prop.description} context={props.mdtContext} /></p>
            </>}>
                {/* attribs => <Link href={`/prop/${prop.id}`}><a {...attribs}>{prop.name}</a></Link> */}
                {attribs => <span {...attribs}>{prop.name}</span>}
            </Tooltip>
        }
        case "Boolean":
            return <>{
                value.value
                ? <FormattedMessage id="KKkUks" defaultMessage="True"/>
                : <FormattedMessage id="rxqs5U" defaultMessage="False"/>
            }</>
        case "Integer":
            return <>{BigInt(value.value).toLocaleString()}</>
        case "Quantity":
            return <LookupQuantityValue value={value} />
        case "Range":
            if (value.min.type === "Quantity" && value.max.type === "Quantity" && value.min.units === value.max.units) {
                // Special case:
                return <><LookupQuantityValue value={value.min} hideUnits={true} /> - <LookupQuantityValue value={value.max} /></>
            }
            return <><LookupValue value={value.min} mdtContext={props.mdtContext} /> - <LookupValue value={value.max} mdtContext={props.mdtContext} /></>
        case "String":
            // Temporary special case hack for the TechNotes homepage until we support video:
            if (value.value === "$TN_HOME_VIDEO$") {
                return <div className="max-h-[400px]">
                    <video src="https://f000.backblazeb2.com/file/technotes/technotes-home.mp4" muted autoPlay loop playsInline className="block mx-auto w-full h-full max-h-[400px] max-w-none "></video>
                </div>;
            }
            return <>{value.value}</>;
        case "InlineMarkdownString":
            return <InlineMDT mdt={value.value} context={props.mdtContext} />;
        case "Date":
            return <>{value.value}</>;
        case "Error":
            return (
                <ErrorMessage>
                    <FormattedMessage
                        id="I9OUIM"
                        defaultMessage="Error ({errorType}): {errorMessage}"
                        values={{ errorType: value.errorClass, errorMessage: value.message }}
                    />
                </ErrorMessage>
            );
        case "Null":
            return <></>;
        default: {
            return <code>{JSON.stringify(value)}</code>;
        }
    }
};
