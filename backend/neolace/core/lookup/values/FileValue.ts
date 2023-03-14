/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import type * as api from "neolace/deps/neolace-sdk.ts";
import { IntegerValue, StringValue } from "../values.ts";
import { ConcreteValue, LookupValue } from "./base.ts";

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

    protected serialize(): api.FileValue {
        return {
            type: "File",
            filename: this.filename,
            url: this.url,
            contentType: this.contentType,
            size: this.size,
        };
    }

    /** Get an attribute of this value, if any, e.g. value.name or value.length */
    public override async getAttribute(attrName: string): Promise<LookupValue | undefined> {
        if (attrName === "filename") return new StringValue(this.filename);
        if (attrName === "url") return new StringValue(this.url);
        if (attrName === "contentType") return new StringValue(this.contentType);
        if (attrName === "size") return new IntegerValue(this.size);
        return undefined;
    }
}
