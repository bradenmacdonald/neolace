import * as check from "neolace/deps/computed-types.ts";
import {
    Field,
    RawVNode,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";


/**
 * If an EntryType has the UseAsProperty Feature enabled, then its entries can be used as properties on other entries.
 * 
 * For example, if you have a "PersonAttribute" EntryType that enables the UseAsProperty Feature, then PersonAttribute
 * entries can be used as properties on other entries. For example, you could create en Entry of type Person, and assign
 * that Person entry a "BirthDate" property value, where BirthDate is a PersonAttribute Entry.
 */
export class UseAsPropertyData extends EntryFeatureData {
    static label = "UseAsPropertyData";
    static properties = {
        ...EntryFeatureData.properties,
        // Importance: Properties with importance < 20 are shown directly on the entry page, with 0 being the most
        // important and first shown. Properties with importance > 20 are shown in a separate "All Properties"
        // screen.
        importance: Field.Int.Check(check.number.min(0).max(99)),
        // The data type for values of this property
        valueType: Field.NullOr.String,
        // Should property values of this type be inherited by child entries?
        inherits: Field.Boolean,
        // Markdown formatting to use to display the value, if it's a simple string value.
        // e.g. set this to "**{value}**" to make it bold.
        displayAs: Field.NullOr.String,
    };

    static defaultImportance = 10;

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties(() => ({}));

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(dbObject: RawVNode<typeof this>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);
    }
}
