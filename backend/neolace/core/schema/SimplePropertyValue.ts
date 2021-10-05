import * as check from "neolace/deps/computed-types.ts";
import {
    VNodeType,
    Field,
    RawVNode,
    WrappedTransaction,
    VirtualPropType,
    C,
    ValidationError,
} from "neolace/deps/vertex-framework.ts";
import { EntryType } from "./EntryType.ts";


/**
 * A simple property value is a lookup expression along with a label that can be attached to an entry type, and is
 * displayed for all entries of that type.
 * 
 * It is treated like a property and displayed alongside other properties, but it has no associated property Entry.
 * 
 * Simple properties are never inherited.
 */
export class SimplePropertyValue extends VNodeType {
    static label = "SimplePropertyValue";
    static properties = {
        ...VNodeType.properties,
        label: Field.String,
        /** A Lookup expression (usually a literal expression) defining the value of this property value, e.g. "5" */
        valueExpression: Field.String,

        /** An optional MDT (Markdown) string explaining something about this property value */
        note: Field.String,
        // Importance: property values (including Simple Property Values) with importance < 20 are shown directly in the
        // article, with 0 being the most important and first shown. Computed facts with importance > 20 are shown in a
        // separate "All Properties" screen.
        importance: Field.Int.Check(check.number.min(0).max(99)),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo(() => ({
        // There are no relationships *from* a simple property value.
        // It is "owned" by an EntryType.
    }));

    static virtualProperties = this.hasVirtualProperties(() => ({
        forEntryType: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:HAS_SIMPLE_PROP]-(@target:${EntryType})`,
            target: EntryType,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({});

    // Always order first by importance (0 before 99), then by label (A before B)
    static defaultOrderBy = "@this.importance, @this.label";

    static async validate(dbObject: RawVNode<typeof SimplePropertyValue>, tx: WrappedTransaction): Promise<void> {
        // Validate:
        const data = await tx.pullOne(SimplePropertyValue, pv => pv.forEntryType(et => et.id), {key: dbObject.id});

        if (data.forEntryType === null) {
            throw new ValidationError("A PropertyFact must be attached to either an Entry or an EntryType");
        }
    }
}
