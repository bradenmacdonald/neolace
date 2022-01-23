import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { LookupError, LookupParseError } from "./errors.ts";

import type { LookupExpression } from "./expression.ts";
import { parseLookupString } from "./parse.ts";
import { ErrorValue, LookupValue } from "./values.ts";

/**
 * The lookup context defines some data required to evaluate a lookup expression, like:
 * -> what is the current transaction? (in case we're previewing draft changes)
 * -> what is the current entry ID? (to evaluate "this")
 */
export interface LookupContext {
    tx: WrappedTransaction;
    siteId: VNID;
    entryId?: VNID;
    // If lookup result values have to be paginated in this context, what's the default page size?
    defaultPageSize: bigint;
}

export class LookupCache {
    private cache = new Map<string, LookupValue>();

    constructor(
        public readonly tx: WrappedTransaction,
        public readonly siteId: VNID,
        public readonly defaultPageSize: bigint,
    ) {}

    public async evaluateExprWithCache(expr: LookupExpression, entryId: VNID | undefined) {
        const prefix = (entryId ?? "") + ":";
        // Key is the entry ID, then a colon, then the expression in "standard form"
        const key = prefix + expr.toString();
        const cachedValue = this.cache.get(key);
        if (cachedValue !== undefined) {
            return cachedValue;
        }
        // Evaluate the value and cache the result:
        const context: LookupContext = {
            tx: this.tx,
            siteId: this.siteId,
            defaultPageSize: this.defaultPageSize,
            entryId,
        };
        let value;
        try {
            value = await expr.getValue(context);
        } catch (err: unknown) {
            if (err instanceof LookupError) {
                value = new ErrorValue(err);
            } else {
                throw err;
            }
        }
        this.cache.set(key, value);
        return value;
    }
}

/**
 * A context in which lookup expressions can be evaluated.
 * Has a cache that caches values for optimal performance.
 */
export class CachedLookupContext implements LookupContext {
    constructor(
        public readonly tx: WrappedTransaction,
        public readonly siteId: VNID,
        public readonly entryId?: VNID,
        // If lookup result values have to be paginated in this context, what's the default page size?
        public readonly defaultPageSize: bigint = 10n,
        protected _cache: LookupCache = new LookupCache(tx, siteId, defaultPageSize),
    ) {
    }

    /**
     * For evaluating lookup expressions in a related entry or not an entry at all, but still sharing the same cache.
     * @param entryId The new entry ID to use in this child context
     */
    protected getChildContext(entryId: VNID | undefined) {
        return new CachedLookupContext(this.tx, this.siteId, entryId, this.defaultPageSize, this._cache);
    }

    public getContextFor(entryId: VNID | undefined) {
        if (entryId === this.entryId) {
            return this;
        } else {
            return this.getChildContext(entryId);
        }
    }

    public evaluateExpr(expr: LookupExpression | string): Promise<LookupValue> {
        if (typeof expr === "string") {
            // We were just given a string, so first parse it to a lookup expression.
            // We always parse it because this allows us to normalize the expression to make the cache more likely to
            // hit an existing use of the same expression.
            try {
                expr = parseLookupString(expr);
            } catch (err) {
                if (err instanceof LookupParseError) {
                    return new Promise((r) => r(new ErrorValue(err)));
                }
                throw err;
            }
        }
        return this._cache.evaluateExprWithCache(expr, this.entryId);
    }
}
