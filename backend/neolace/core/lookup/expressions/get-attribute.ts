import { LookupExpression } from "./base.ts";
import { LookupContext } from "../context.ts";
import {
    AnnotatedValue,
    EntryValue,
    InlineMarkdownStringValue,
    LookupValue,
    NullValue,
    StringValue,
} from "../values.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { LookupEvaluationError } from "../errors.ts";

/**
 * This expression is used to get an attribute of a value.
 *
 * For example, entries have .id, .name, .friendlyId, .description as attributes.
 *
 * In addition, any value can have additional attributes added onto it using 'annotations'
 */
export class GetAttribute extends LookupExpression {
    constructor(
        public readonly attributeName: string,
        /** The expression whose attribute we want to get */
        public readonly expression: LookupExpression,
    ) {
        super();
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        if (["id", "name", "friendlyId", "description"].includes(this.attributeName)) {
            const entry = await this.expression.getValueAs(EntryValue, context).catch(() => undefined);
            if (entry) {
                if (this.attributeName === "id") {
                    return new StringValue(entry.id);
                } else if (this.attributeName === "name") {
                    return new StringValue(
                        await (await context.tx.pullOne(Entry, (e) => e.name, { key: entry.id })).name,
                    );
                } else if (this.attributeName === "description") {
                    return new InlineMarkdownStringValue(
                        await (await context.tx.pullOne(Entry, (e) => e.description, { key: entry.id })).description,
                    );
                } else if (this.attributeName === "friendlyId") {
                    return new StringValue(
                        await (await context.tx.pullOne(Entry, (e) => e.friendlyId(), { key: entry.id })).friendlyId,
                    );
                } else throw new Error("Unexpected entry attribute request.");
            }
        }

        // TODO: support getting .name and .id of EntryType or Property values

        // If it's not one of the core entry attributes, try loading it from the annotation:
        const annotatedValue = await this.expression.getValueAs(AnnotatedValue, context).catch(() => undefined);
        if (annotatedValue && annotatedValue.annotations[this.attributeName]) {
            return annotatedValue.annotations[this.attributeName];
        }

        // Standard annotations like 'slot', 'note', or 'detail' may not be present but shouldn't give errors when
        // the user tries to access them and they're blank.
        if (["name", "id", "slot", "note", "detail"].includes(this.attributeName)) {
            return new NullValue();
        }

        // But otherwise we want to give a clear error so that users who forget parentheses on a function get a clear
        // warning. e.g. 'allEntries().count' should raise an error because they meant 'allEntries().count()'
        throw new LookupEvaluationError(`Unknown attribute/annotation: ${this.attributeName}`);
    }

    public toString(): string {
        return `${this.expression.toString()}.${this.attributeName}`;
    }
}
