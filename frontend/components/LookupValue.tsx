import React from 'react';
import { api } from 'lib/api-client';
import { FormattedListParts, FormattedMessage } from 'react-intl';

import { Tooltip } from 'components/widgets/tooltip';
import { InlineMDT, MDTContext } from './markdown-mdt/mdt';
import { EntryLink } from './EntryLink';
import { LookupImage } from './LookupImage';
import { FormattedFileSize } from './widgets/FormattedFileSize';

interface LookupValueProps {
    value: api.AnyLookupValue;
    mdtContext: MDTContext;
    children?: never;
}

/**
 * Render a Lookup Value (computed/query value, such as all the "properties" shown on an entry's page)
 */
export const LookupValue: React.FunctionComponent<LookupValueProps> = (props) => {

    const {value} = props;
    if (typeof value !== "object" || value === null || !("type" in value)) {
        return <p>[ERROR INVALID VALUE, NO TYPE INFORMATION]</p>;  // Doesn't need i18n, internal error message shouldn't be seen
    }

    switch (value.type) {
        case "Page": {

            const listValues = value.values.map((v, idx) => 
                <LookupValue key={idx} value={v} mdtContext={props.mdtContext} />
            );
            if (listValues.length < value.totalCount) {
                listValues.push(
                    <FormattedMessage
                        key="more"
                        id="common.list.xmore"
                        defaultMessage="{extraCount, plural, one {# more…} other {# more…}}"
                        values={{extraCount: value.totalCount - listValues.length}}
                        description="How many more items there are (at the end of a list)"
                    />
                );
            }

            return <span className="neo-lookup-paged-values">
                <FormattedListParts type="unit" value={listValues}>
                    {parts => <>{parts.map(p => p.value)}</>}
                </FormattedListParts>
            </span>;
        }
        case "Entry": {
            const entry = props.mdtContext.refCache.entries[value.id];
            const linkText = entry ? entry.name : value.id;
            return <EntryLink entryKey={value.id} mdtContext={props.mdtContext}>{linkText}</EntryLink>
        }
        case "Image": {
            return <LookupImage value={value} mdtContext={props.mdtContext} />;
        }
        case "File": {
            return <>
                <a href={value.url}>{value.filename}</a> (<FormattedFileSize sizeInBytes={value.size} />)
            </>;
        }
        case "Property": {
            const prop = props.mdtContext.refCache.properties[value.id];
            if (prop === undefined) {
                // return <Link href={`/prop/${value.id}`}><a className="text-red-700 font-bold">{value.id}</a></Link>
                return <span className="text-red-700 font-bold">{value.id}</span>
            }
            return <Tooltip tooltipContent={<>
                <strong>{prop.name}</strong><br/>
                <p className="text-sm"><InlineMDT mdt={prop.description} context={props.mdtContext} /></p>
            </>}>
                {/* attribs => <Link href={`/prop/${prop.id}`}><a {...attribs}>{prop.name}</a></Link> */}
                {attribs => <span {...attribs}>{prop.name}</span>}
            </Tooltip>
        }
        case "String":
            // Temporary special case hack for the TechNotes hompage until we support video:
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
            return <span className="neo-lookup-error text-sm text-red-900">
                <FormattedMessage 
                    id="common.lookup-expression.error"
                    defaultMessage="Error ({errorType}): {errorMessage}"
                    values={{errorType: value.errorClass, errorMessage: value.message}}
                />
            </span>
        case "Annotated":
            if (value.annotations.note && value.annotations.note.type === "InlineMarkdownString" && value.annotations.note.value !== "") {
                return <>
                    <LookupValue value={value.value} mdtContext={props.mdtContext} />
                    <Tooltip tooltipContent={<>
                        <p className="text-sm"><InlineMDT mdt={value.annotations.note.value} context={props.mdtContext} /></p>
                    </>}>
                        {attribs => <>{' '}<span {...attribs}>(*)</span></>}
                    </Tooltip>
                </>;
            }
            return <LookupValue value={value.value} mdtContext={props.mdtContext} />
        default: {
            return <code>{JSON.stringify(value)}</code>;
        }
    }
};
