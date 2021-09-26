import {
    VNID,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";

import type { LookupValue } from "./values.ts";

export interface LookupContext {
    tx: WrappedTransaction;
    siteId: VNID;
    entryId?: VNID;
    localConstants?: Record<string, LookupValue>;
    // If lookup result values have to be paginated in this context, what's the default page size?
    defaultPageSize?: bigint;
}
