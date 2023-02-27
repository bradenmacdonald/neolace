import { SDK, useDraft, useLookupExpression, usePermissions, useRefCache, useSchema } from "lib/sdk";
import Link from "next/link";
import React from "react";
import { FormattedMessage } from "react-intl";
import { HoverClickNote } from "./HoverClickNote";

interface Props {
    edit: SDK.AnyEdit;
}

/**
 * Display a description of one of the changes made during a draft.
 * e.g. "Created a new entry, called 'Foobar'"
 * @param param0 
 * @returns 
 */
export const EditDescription: React.FunctionComponent<Props> = ({edit, ...props}) => {

    const [draft] = useDraft();
    const [schema] = useSchema();
    const permissions = usePermissions();
    const {code, data} = edit;

    // Our little helper to render a link to an entry, based on lots of details about the user's permissions and whether
    // we're seeing this in an open draft (so further changes can be made) or not.
    const entryLink = ({name, entryId, key}: {name?: string|React.ReactElement, entryId: SDK.VNID, key?: string}) => {
        name = name ?? <EntryName entryId={entryId} />
        if (draft) {
            if (draft.status === SDK.DraftStatus.Open) {
                // This is an active draft. Show a link to allow the user to make further edits to this entry, but only
                // if the user has permission to edit this draft.
                if (permissions?.[SDK.CorePerm.editDraft]?.hasPerm) {
                    return <Link href={`/draft/${draft.num}/entry/${entryId}/edit`}>{name}</Link>;
                } else {
                    return <>{name}</>;
                }
            } else if (draft.status === SDK.DraftStatus.Accepted) {
                return <Link href={`/entry/${key ?? entryId}`}>{name}</Link>
            }
        }
        return name;
    };

    const description: React.ReactNode = (() => {
        switch (code) {
            //
            // Schema changes:
            //
            case "CreateEntryType": {
                return <FormattedMessage defaultMessage="Created new entry type: {entryType}" id="qYXLaL" values={{
                    entryType: <strong>{edit.data.name}</strong>,
                }} />
            }
            case "UpdateEntryTypeFeature": {
                const entryType = schema?.entryTypes[edit.data.entryTypeKey]?.name ?? edit.data.entryTypeKey;
                if (data.feature.enabled && data.feature.featureType === "HeroImage") {
                    return <FormattedMessage defaultMessage="Enabled/updated the Hero Image feature for {entryType} entries, using lookup expression {expr}" id="OS5mRn" values={{
                        entryType,
                        expr: <code>data.feature.config.lookupExpression</code>,
                    }} />
                } else if (data.feature.enabled) {
                    return <FormattedMessage defaultMessage="Enabled/updated the {feature} feature for {entryType} entries" id="6cCBFz" values={{
                        entryType,
                        feature: data.feature.featureType,
                    }} />
                } else {
                    return <FormattedMessage defaultMessage="Disabled the {feature} feature for {entryType} entries" id="DySDnu" values={{
                        entryType,
                        feature: data.feature.featureType,
                    }} />
                }
            }
            case "CreateProperty": {
                return <FormattedMessage defaultMessage="Created new property: {propertyName}" id="EVuqQe" values={{
                    propertyName: <strong>{edit.data.name}</strong>,
                }} />
            }
            case "UpdateProperty": {
                const prop = schema?.properties[edit.data.key];
                return <FormattedMessage defaultMessage="Updated {propertyName} property ({fields})" id="E8NYSc" values={{
                    propertyName: <strong>{prop?.name ?? edit.data.key}</strong>,
                    fields: Object.keys(edit.data).filter((k) => k !== "id").join(", "),
                }} />
            }
            //
            // Content changes:
            //
            case "CreateEntry": {
                return <FormattedMessage defaultMessage="Created new {entryType} entry: {entry}, with friendly ID {key}" id="10rJBw" values={{
                    entry: <><strong>{entryLink({...edit.data})}</strong></>,
                    entryType: <>{schema?.entryTypes[edit.data.entryTypeKey]?.name}</>,
                    key: <code>{edit.data.key}</code>,
                }} />
            }
            case "SetEntryName": {
                return <FormattedMessage defaultMessage="Renamed {entry} to {name}" id="RBY6Qr" values={{
                    entry: <><strong>{entryLink({entryId: edit.data.entryId})}</strong></>,
                    name: <>"{edit.data.name}"</>,
                }} />
            }
            case "SetEntryDescription": {
                return <FormattedMessage defaultMessage="Changed description of {entry}" id="Usb1qT" values={{
                    entry: <><strong>{entryLink({entryId: edit.data.entryId})}</strong></>,
                }} />
            }
            case "SetEntryKey": {
                return <FormattedMessage defaultMessage="Changed key of {entry} to {key}" id="/e0epF" values={{
                    entry: <><strong>{entryLink({entryId: edit.data.entryId, key: edit.data.key})}</strong></>,
                    key: <code>{edit.data.key}</code>,
                }} />
            }
            case "AddPropertyFact": {
                return <FormattedMessage defaultMessage="Added a new property value to {entry} - {property}: {value}" id="fktjWL" values={{
                    entry: <>{entryLink({entryId: edit.data.entryId})}</>,
                    property: <strong>{schema?.properties[edit.data.propertyKey]?.name}</strong>,
                    value: <FriendlyValueDisplay lookupValue={edit.data.valueExpression} />,
                }} />
            }
            case "UpdatePropertyFact": {
                return <FormattedMessage defaultMessage="Updated property value on {entry} - fact {propertyFactId}: {value}" id="M6/W4Z" values={{
                    entry: <>{entryLink({entryId: edit.data.entryId})}</>,
                    propertyFactId: <>{edit.data.propertyFactId}</>,
                    value: <FriendlyValueDisplay lookupValue={edit.data.valueExpression} />,
                }} />
            }
            case "UpdateEntryFeature": {
                if (edit.data.feature.featureType === "Article") {
                    return <FormattedMessage defaultMessage="Updated article text of {entry}" id="uAI35y" values={{
                        entry: <><strong>{entryLink({entryId: edit.data.entryId})}</strong></>,
                    }} />
                } else {
                    return SDK.getEditType(edit.code).describe(edit.data);
                }
            }
            default: {
                return SDK.getEditType(edit.code).describe(edit.data);
            }
        }
    })();

    return <>
        {description}
        <HoverClickNote superscript={false} displayText="(...)">
            <p><FormattedMessage defaultMessage="Data for this edit:" id="WHBGLA" /></p>
            <pre className="whitespace-pre-wrap">{JSON.stringify(edit.data, undefined, 4)}</pre>
        </HoverClickNote>
    </>;
};

export const FriendlyValueDisplay: React.FunctionComponent<{lookupValue?: string}> = ({lookupValue}) => {
    if (lookupValue === undefined) {
        return null;
    } else if (lookupValue.startsWith('entry("') && lookupValue.endsWith('")')) {
        const vnidSlice = lookupValue.slice(7, -2);
        if (SDK.isVNID(vnidSlice)) {
            return <EntryName entryId={vnidSlice} />
        }
    }
    return <code>{lookupValue}</code>;
};


/** Display the name of an entry, loading it from the server as needed. */
export const EntryName: React.FunctionComponent<{entryId: SDK.VNID}> = ({entryId}) => {
    const refCache = useRefCache();
    if (refCache.entries[entryId]) {
        return <>{refCache.entries[entryId].name}</>;
    } else {
        return <LoadEntryName entryId={entryId} />
    }
};
/** When the entry name is not available from the Draft / RefCache, load it from the server. */
export const LoadEntryName: React.FunctionComponent<{entryId: SDK.VNID}> = ({entryId}) => {
    const data = useLookupExpression(`this.name`, {entryId});
    if (data.error || data.resultValue?.type !== "String") {
        return <>{entryId}</>;  // The entry name could not be loaded. Just display the ID.
    }
    return <>{data.resultValue.value}</>;
};
