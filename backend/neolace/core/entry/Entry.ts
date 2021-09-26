import * as check from "neolace/deps/computed-types.ts";
import {
    DerivedProperty,
    VirtualPropType,
    C,
    VNodeType,
    Field,
    RawVNode,
    WrappedTransaction,
    ValidationError,
} from "neolace/deps/vertex-framework.ts";

import { EntryType } from "neolace/core/schema/EntryType.ts";
import { slugIdToFriendlyId } from "neolace/core/Site.ts";
import { RelationshipFact } from "./RelationshipFact.ts";
import { PropertyFact } from "./PropertyFact.ts";


/**
 * Abstract base class for an "entry"
 */
export class Entry extends VNodeType {
    static label = "Entry";
    static properties = {
        ...VNodeType.properties,
        // slugId: The friendlyId along with a Site-specific prefix.
        // See arch-decisions/007-sites-multitenancy for details.
        slugId: Field.Slug,
        // The name of this entry
        // This does not need to be unique or include disambiguation - so just put "Drive", not "Drive (computer science)"
        name: Field.String,
        // Description: Short, rich text summary of the thing
        description: Field.String.Check(check.string.trim().max(5_000)),


        /// CONTENT

        // Todo: article text.

        // If this entry is a "property" entry type (e.g. a "birth date" property entry), it will have these extra
        // fields:

        // Importance: Properties with importance < 20 are shown directly on the entry page, with 0 being the most
        // important and first shown. Properties with importance > 20 are shown in a separate "All Properties"
        // screen.
        propertyImportance: Field.NullOr.Int.Check(check.number.min(0).max(99)),
        // The data type for values of this property
        propertyValueType: Field.NullOr.String,
        // Should property values of this type be inherited by child entries?
        propertyInherits: Field.NullOr.Boolean,
        // Markdown formatting to use to display the value, if it's a simple string value.
        // e.g. set this to "**{value}**" to make it bold.
        propertyDisplayAs: Field.NullOr.String,
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        /** The type of this entry */
        IS_OF_TYPE: {
            to: [EntryType],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        /** This Entry has a relationship to another entry, via a RelationshipFact */
        REL_FACT: {
            to: [RelationshipFact],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        /** This Entry has property values */
        PROP_FACT: {
            to: [PropertyFact],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        // If this Entry has an IS_A relationship to other entries (via RelationshipFact), it will also have a direct
        // IS_A relationship to the Entry, which makes computing ancestors of an Entry much simpler.
        // i.e. If there is (this:Entry)-[:REL_FACT]->(:RelationshipFact {category: "IS_A"})-[:REL_FACT]->(parent:Entry)
        //      then there will also be a (this)-[:IS_A]->(parent) relationship
        IS_A: {
            to: [this],
            cardinality: VNodeType.Rel.ToMany,
            properties: {
                relFactId: Field.VNID,
            },
        },
    });

    static virtualProperties = this.hasVirtualProperties(() => ({
        type: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.IS_OF_TYPE}]->(@target:${EntryType})`,
            target: EntryType,
        },
        /*
        relatedImages: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@target:${Image})-[:${Image.rel.RELATES_TO}]->(:${this})-[:IS_A*0..10]->(@this)`,
            target: Image,
        },
        */
    }));

    static derivedProperties = this.hasDerivedProperties({
        friendlyId,
        //numRelatedImages,
    });

    static async validate(dbObject: RawVNode<typeof Entry>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);
        // Check that the slugId is prefixed with the site code.
        const entryData = await tx.pullOne(Entry, e => e.type(t => t.friendlyIdPrefix.site(s => s.siteCode)), {key: dbObject.id});
        const siteCode = entryData.type?.site?.siteCode;
        if (!siteCode) {
            throw new ValidationError("Entry is unexpectedly not linked to a site with a sitecode.");
        }
        if (dbObject.slugId.substr(0, 5) !== siteCode) {
            throw new ValidationError("Entry's slugId does not start with the site code.");
        }

        // Check the friendlyIdPrefix:
        const friendlyIdPrefix = entryData.type?.friendlyIdPrefix;
        if (friendlyIdPrefix && !dbObject.slugId.substr(5).startsWith(friendlyIdPrefix)) {
            throw new ValidationError(`Invalid friendlyId; expected it to start with ${friendlyIdPrefix}`);
        }

        // Validate that all IS_A relationships have corresponding RelationshipFacts
        // RelationshipFact validates the opposite, that all IS_A RelationshipFacts have corresponding IS_A relationships
        const isACheck = await tx.query(C`
            MATCH (entry:${this})-[rel:${this.rel.IS_A}]->(otherEntry:VNode)
            WITH rel.relFactId AS expectedId
            OPTIONAL MATCH (entry:${this})-[:${this.rel.REL_FACT}]->(relFact:VNode {id: expectedId})
            RETURN expectedId, relFact.id AS actualId
        `.givesShape({expectedId: Field.VNID, actualId: Field.VNID}));
        if (!isACheck.every(row => row.actualId === row.expectedId)) {
            throw new ValidationError(`Entry has a stranded IS_A relationship without a corresponding RelationshipFact`);
        }
    }

}


/**
 * A property that provides the slugId without its site-specific prefix
 * See arch-decisions/007-sites-multitenancy for details.
 */
export function friendlyId(): DerivedProperty<string> { return DerivedProperty.make(
    Entry,
    e => e.slugId,
    e => slugIdToFriendlyId(e.slugId),
);}
