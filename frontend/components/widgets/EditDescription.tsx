import { api, useDraft, usePermissions, useSchema } from "lib/api";
import Link from "next/link";
import React from "react";
import { FormattedMessage } from "react-intl";
import { HoverClickNote } from "./HoverClickNote";

interface Props {
    edit: api.AnyEdit;
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
    const entryLink = ({name, entryId, friendlyId}: {name: string, entryId: api.VNID, friendlyId?: string}) => {
        if (draft) {
            if (draft.status === api.DraftStatus.Open) {
                // This is an active draft. Show a link to allow the user to make further edits to this entry, but only
                // if the user has permission to edit this draft.
                if (permissions?.[api.CorePerm.editDraft]?.hasPerm) {
                    return <Link href={`/draft/${draft.id}/entry/${entryId}/edit`}>{name}</Link>;
                } else {
                    return <>{name}</>;
                }
            } else if (draft.status === api.DraftStatus.Accepted) {
                return <Link href={`/entry/${friendlyId ?? entryId}`}>{name}</Link>
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
                const entryType = schema?.entryTypes[edit.data.entryTypeId]?.name ?? edit.data.entryTypeId;
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
                const prop = schema?.properties[edit.data.id];
                return <FormattedMessage defaultMessage="Updated {propertyName} property ({fields})" id="E8NYSc" values={{
                    propertyName: <strong>{prop?.name ?? edit.data.id}</strong>,
                    fields: Object.keys(edit.data).filter((k) => k !== "id").join(", "),
                }} />
            }
            //
            // Content changes:
            //
            case "CreateEntry": {
                return <FormattedMessage defaultMessage="Created new {entryType} entry: {entry}, with friendly ID {friendlyId}" id="wGmmfj" values={{
                    entry: <><strong>{entryLink({...edit.data, entryId: edit.data.id})}</strong></>,
                    entryType: <>{schema?.entryTypes[edit.data.type]?.name}</>,
                    friendlyId: <code>{edit.data.friendlyId}</code>,
                }} />
            }
            case "AddPropertyValue": {
                return <FormattedMessage defaultMessage="Added a new property value to {entry} - {property}: {value}" id="fktjWL" values={{
                    entry: <>{entryLink({name: edit.data.entryId, entryId: edit.data.entryId})}</>,
                    property: <strong>{schema?.properties[edit.data.propertyId]?.name}</strong>,
                    value: <code>{edit.data.valueExpression}</code>,
                }} />
            }
            case "UpdatePropertyValue": {
                return <FormattedMessage defaultMessage="Updated property value on {entry} - fact {propertyFactId}: {value}" id="M6/W4Z" values={{
                    entry: <>{entryLink({name: edit.data.entryId, entryId: edit.data.entryId})}</>,
                    propertyFactId: <>{edit.data.propertyFactId}</>,
                    value: <code>{edit.data.valueExpression}</code>,
                }} />
            }
            default: {
                return api.getEditType(edit.code).describe(edit.data);
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
