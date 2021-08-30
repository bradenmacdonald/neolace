import {
    VNID,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";

export interface QueryContext {
    tx: WrappedTransaction;
    siteId: VNID;
    entryId?: VNID;
}
