import type { VNID } from "neolace/deps/vertex-framework.ts";
import type * as api from "neolace/deps/neolace-api.ts";
import { LookupContext } from "../context.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";
import { EntryValue } from "./EntryValue.ts";
import { LookupEvaluationError } from "../errors.ts";

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
        if (annotations.value !== undefined || annotations.id !== undefined) {
            throw new LookupEvaluationError("Invalid annotation key.");
        }
    }

    protected serialize() {
        const annotations: Record<string, api.AnyLookupValue> = {};
        for (const key in this.annotations) {
            annotations[key] = this.annotations[key].toJSON();
        }
        return { ...this.value.toJSON(), annotations };
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

    /** Get an attribute from this annotated value. This is the normal way to get annotation values via lookup expressions */
    public override async getAttribute(attrName: string, context: LookupContext): Promise<LookupValue | undefined> {
        // First check the "inner" value (cannot be overridden by annotations)
        const innerValueAttr = await this.value.getAttribute(attrName, context);
        if (innerValueAttr !== undefined) {
            return innerValueAttr;
        }
        // Then check annotation values:
        return this.annotations[attrName]; // May be undefined
    }
}

/** A helper function to create an annotated entry value */
export function MakeAnnotatedEntryValue(entryId: VNID, annotations: Record<string, ConcreteValue>) {
    return new AnnotatedValue(new EntryValue(entryId), annotations);
}
