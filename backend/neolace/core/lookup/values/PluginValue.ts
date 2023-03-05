import { LookupContext } from "../context.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";

type JsonObject = { [x: string]: JsonCompatibleValue };
type JsonCompatibleValue = string | number | boolean | JsonObject | Array<JsonCompatibleValue>;

/**
 * A value that could be anything - depends on the plugin used to generate/display it.
 */
export class PluginValue extends ConcreteValue {
    constructor(
        /** Which plugin generated / should display this value? */
        public readonly plugin: string,
        public readonly value: JsonCompatibleValue,
    ) {
        super();
    }

    /**
     * We don't implement a literal representation for plugin-generated values in general, though some may exist.
     */
    public override asLiteral() {
        return undefined;
    }

    protected serialize() {
        return { type: "PluginValue" as const, plugin: this.plugin, value: this.value };
    }

    protected override doCastTo(_newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        return undefined;
    }
}
