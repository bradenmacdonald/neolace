import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { getPluginsForSite } from "../../plugins/loader.ts";
import { LookupError, LookupParseError } from "./errors.ts";

import type { LookupExpression } from "./expressions/base.ts";
import { LookupFunctionClass } from "./expressions/functions/base.ts";
import { parseLookupString } from "./parse.ts";
import { ErrorValue, LookupValue } from "./values.ts";

// A symbol to pass private data into the LookupContext constructor
const _internalCache = Symbol("internalCache");

/**
 * A context in which lookup expressions can be evaluated.
 *
 * The lookup context defines some data required to evaluate a lookup expression, like:
 * -> what is the current transaction? (in case we're previewing draft changes)
 * -> what is the current entry ID? (to evaluate "this")
 *
 * Has a cache that caches values for optimal performance.
 */
export class LookupContext {
    public readonly tx: WrappedTransaction;
    public readonly siteId: VNID;
    /**
     * The "current entry", i.e. the value of "this" in any lookup expression in this context. May not be defined, in
     * cases like the home page which can have lookup expressions but aren't entries themselves.
     */
    public readonly entryId?: VNID;
    /** If lookup result values have to be paginated in this context, what's the default page size? */
    public readonly defaultPageSize: bigint;
    private _cache: Map<string, LookupValue>;

    constructor(args: {
        tx: WrappedTransaction;
        siteId: VNID;
        entryId?: VNID;
        defaultPageSize?: bigint;
        [_internalCache]?: Map<string, LookupValue>;
    }) {
        // protected _cache = new Map<string, LookupValue>(),
        this.tx = args.tx;
        this.siteId = args.siteId;
        this.entryId = args.entryId;
        this.defaultPageSize = args.defaultPageSize ?? 10n;
        this._cache = args[_internalCache] ?? new Map<string, LookupValue>();
    }

    /**
     * For evaluating lookup expressions in a related entry or not an entry at all, but still sharing the same cache.
     * @param entryId The new entry ID to use in this child context
     */
    protected _getChildContext(entryId: VNID | undefined) {
        return new LookupContext({
            tx: this.tx,
            siteId: this.siteId,
            entryId,
            defaultPageSize: this.defaultPageSize,
            [_internalCache]: this._cache,
        });
    }

    public getContextFor(entryId: VNID | undefined) {
        if (entryId === this.entryId) {
            return this;
        } else {
            return this._getChildContext(entryId);
        }
    }

    /**
     * Parse a lookup expression from string to a LookupExpression object.
     * You should generally use this instead of using parseLookupString directly, because this method is aware of
     * additional lookup functions that may be available from plugins for the current site.
     */
    public async parseLookupString(lookupExpression: string): Promise<LookupExpression> {
        const extraFunctionsForSite: LookupFunctionClass[] = [];
        for (const _plugin of await getPluginsForSite(this.siteId)) {
            // TODO: if the plugin implements a lookup function, push it.
        }
        return parseLookupString(lookupExpression, extraFunctionsForSite);
    }

    /**
     * Evaluate a lookup expression.
     */
    public async evaluateExpr(expr: LookupExpression | string): Promise<LookupValue> {
        if (typeof expr === "string") {
            // We were just given a string, so first parse it to a lookup expression.
            try {
                expr = await this.parseLookupString(expr);
            } catch (err) {
                if (err instanceof LookupParseError) {
                    return new Promise((r) => r(new ErrorValue(err)));
                }
                throw err;
            }
        }
        // We always parse it first because this allows us to normalize the expression to make the cache more likely to
        // hit an existing use of the same expression.
        return this._evaluateExprWithCache(expr);
    }

    protected async _evaluateExprWithCache(expr: LookupExpression) {
        const prefix = (this.entryId ?? "") + ":";
        // Key is the entry ID, then a colon, then the expression in "standard form"
        const key = prefix + expr.toString();
        const cachedValue = this._cache.get(key);
        if (cachedValue !== undefined) {
            return cachedValue;
        }
        // Evaluate the value and cache the result:
        let value;
        try {
            value = await expr.getValue(this);
        } catch (err: unknown) {
            if (err instanceof LookupError) {
                value = new ErrorValue(err);
            } else {
                throw err;
            }
        }
        this._cache.set(key, value);
        return value;
    }
}
