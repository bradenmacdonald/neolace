import {
    VNID,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";

export interface LookupContext {
    tx: WrappedTransaction;
    siteId: VNID;
    entryId?: VNID;
    // If lookup result values have to be paginated in this context, what's the default page size?
    defaultPageSize?: bigint;
}
