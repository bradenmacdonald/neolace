import type * as api from "neolace/deps/neolace-api.ts";
import { ConcreteValue } from "./base.ts";

/**
 * A file attached to an entry (using the Files feature)
 */
export class FileValue extends ConcreteValue {
    constructor(
        public readonly filename: string,
        public readonly url: string,
        public readonly contentType: string,
        public readonly size: number,
    ) {
        super();
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for a file
    }

    protected serialize(): Omit<api.FileValue, "type"> {
        return {
            filename: this.filename,
            url: this.url,
            contentType: this.contentType,
            size: this.size,
        };
    }
}
