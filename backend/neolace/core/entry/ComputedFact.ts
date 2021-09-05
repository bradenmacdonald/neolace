import * as check from "neolace/deps/computed-types.ts";
import {
    VNodeType,
    Field,
    RawVNode,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";


/**
 * A computed fact displays some computed value on an entry or entries. The value is computed using a lookup expression.
 */
@VNodeType.declare
export class ComputedFact extends VNodeType {
    static label = "ComputedFact";
    static properties = {
        ...VNodeType.properties,
        label: Field.String,
        expression: Field.String,
        // Importance: Computed facts with importance < 20 are shown directly in the article, with 0 being the most
        // important and first shown. Computed facts with importance > 20 are shown in a separate "All Properties"
        // screen.
        importance: Field.Int.Check(check.number.min(0).max(99)),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo(() => ({
        // There are no relationships *from* a computed fact.
    }));

    static virtualProperties = this.hasVirtualProperties(() => ({
    }));

    static derivedProperties = this.hasDerivedProperties({});

    // Always order first by importance (0 before 99), then by label (A before B)
    static defaultOrderBy = "@this.importance, @this.label";

    static async validate(dbObject: RawVNode<typeof ComputedFact>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);
    }
}
