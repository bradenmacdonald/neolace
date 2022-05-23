import { VNID } from "neolace/deps/vertex-framework.ts";
import { LookupContext } from "../context.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";
import { EntryValue } from "./EntryValue.ts";

/**
 * Represents a value that has been "annotated" with some extra information
 * (like property values get annotated with "note" and "rank", or ancestor
 * entries get annotated with "distance" from the current entry)
 */
export class AnnotatedValue extends ConcreteValue {
    readonly value: ConcreteValue;
    readonly annotations: Readonly<Record<string, ConcreteValue>>;

    constructor(value: ConcreteValue, annotations: Record<string, ConcreteValue>) {
        super();
        if (value instanceof AnnotatedValue) {
            // Special case: we just add annotations to the existing wrapper, don't wrap the value twice.
            this.value = value.value;
            this.annotations = { ...value.annotations, ...annotations };
        } else {
            this.value = value;
            this.annotations = annotations;
        }
        if (Object.keys(annotations).length === 0) {
            throw new Error(`Missing annotations`);
        }
        if (annotations.value !== undefined || annotations.id !== undefined) {
            throw new Error("Invalid annotation key.");
        }
    }

    protected serialize() {
        const annotations: Record<string, unknown> = {};
        for (const key in this.annotations) {
            annotations[key] = this.annotations[key].toJSON();
        }
        return { value: this.value.toJSON(), annotations };
    }

    protected override doCastTo(
        newType: ClassOf<LookupValue>,
        context: LookupContext,
    ): Promise<LookupValue | undefined> {
        return this.value.castTo(newType, context);
    }

    public override asLiteral() {
        return undefined; // Annotated values do not have literal expressions.
    }
}

/** A helper function to create an annotated entry value */
export function MakeAnnotatedEntryValue(entryId: VNID, annotations: Record<string, ConcreteValue>) {
    return new AnnotatedValue(new EntryValue(entryId), annotations);
}
