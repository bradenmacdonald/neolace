import {
    VNID,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";

export interface QueryContext {
    tx: WrappedTransaction;
    siteId: VNID;
    entryId?: VNID;
    // If queries have to be paginated in this context, what's the default page size?
    defaultPageSize?: bigint;
}
