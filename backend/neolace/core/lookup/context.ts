import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { getPluginsForSite } from "../../plugins/loader.ts";
import { type ActionSubject } from "neolace/core/permissions/action.ts";
import { LookupError, LookupParseError } from "./errors.ts";

import type { LookupExpression } from "./expressions/base.ts";
import { LookupFunctionClass } from "./expressions/functions/base.ts";
import { parseLookupString } from "./parser/parser.ts";
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
    public readonly userId: VNID | undefined;
    /**
     * The "current entry", i.e. the value of "this" in any lookup expression in this context. May not be defined, in
     * cases like the home page which can have lookup expressions but aren't entries themselves.
     */
    public readonly entryId?: VNID;
    /** If lookup result values have to be paginated in this context, what's the default page size? */
    public readonly defaultPageSize: bigint;
    /** Any user-defined variables that are in scope in this context. */
    public readonly variables: ReadonlyMap<string, LookupValue>;
    private _cache: Map<string, LookupValue>;

    constructor(args: {
        tx: WrappedTransaction;
        siteId: VNID;
        userId?: VNID;
        entryId?: VNID;
        defaultPageSize?: bigint;
        /** Any user-defined variables that are in scope in this context. */
        variables?: ReadonlyMap<string, LookupValue>;
        [_internalCache]?: Map<string, LookupValue>;
    }) {
        // protected _cache = new Map<string, LookupValue>(),
        this.tx = args.tx;
        this.siteId = args.siteId;
        this.userId = args.userId;
        this.entryId = args.entryId;
        this.defaultPageSize = args.defaultPageSize ?? 10n;
        this.variables = args.variables ?? new Map<string, LookupValue>();
        this._cache = args[_internalCache] ?? new Map<string, LookupValue>();
    }

    /** The Permissions Subject (user and site), used to check permissions */
    public get subject(): ActionSubject {
        return { siteId: this.siteId, userId: this.userId };
    }

    /**
     * For evaluating lookup expressions in a related entry or not an entry at all, but still sharing the same cache.
     * @param entryId The new entry ID to use in this child context
     */
    protected _getChildContext(entryId: VNID | undefined, variables?: ReadonlyMap<string, LookupValue>) {
        return new LookupContext({
            tx: this.tx,
            siteId: this.siteId,
            userId: this.userId,
            entryId,
            defaultPageSize: this.defaultPageSize,
            variables: variables ?? this.variables,
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

    /** Get an identical clone of this context that has new variables set / in scope. */
    public childContextWithVariables(variables: Record<string, LookupValue>) {
        const newMap = new Map(this.variables.entries());
        for (const [k, v] of Object.entries(variables)) {
            newMap.set(k, v);
        }
        return this._getChildContext(this.entryId, newMap);
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
        if (this.variables.size > 0) {
            // If any variables are set, we can't cache the result because we'd have to key the cache by all the
            // variables and values, which is not worth it.
            return this._evaluateExpr(expr);
        }
        const prefix = (this.entryId ?? "") + ":";
        // Key is the entry ID, then a colon, then the expression in "standard form"
        const key = prefix + expr.toString();
        const cachedValue = this._cache.get(key);
        if (cachedValue !== undefined) {
            return cachedValue;
        }
        // Evaluate the value and cache the result:
        const value = await this._evaluateExpr(expr);
        this._cache.set(key, value);
        return value;
    }

    protected async _evaluateExpr(expr: LookupExpression) {
        // Evaluate the value:
        try {
            return await expr.getValue(this);
        } catch (err: unknown) {
            if (err instanceof LookupError) {
                return new ErrorValue(err);
            } else {
                throw err;
            }
        }
    }
}
