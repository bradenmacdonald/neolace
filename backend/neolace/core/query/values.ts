import {
    C,
    CypherQuery,
    Field,
    VNID,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";

import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { slugIdToFriendlyId } from "neolace/core/Site.ts";

import { QueryContext } from "./context.ts";
import { QueryEvaluationError } from "./errors.ts";

// Query language string > expression tree > abstract value > concrete value


export abstract class QueryValue {
    public abstract readonly isAbstract: boolean;
}

/**
 * A value that respresents some concrete data, like the number 5 or a list of entries.
 */
abstract class ConcreteValue extends QueryValue {
    readonly isAbstract = false;
}

/**
 * A value that respresents something abstract like "All Image Entries", and which
 * needs to be 
 */
abstract class AbstractValue extends QueryValue {
    readonly isAbstract = true;

    public abstract getValueFor(context: {tx: WrappedTransaction, siteId: VNID, entryId?: VNID}): Promise<ConcreteValue>;
}

interface ICountableValue {
    hasCount: true;
    getCount(context: QueryContext): Promise<bigint>;
}


/**
 * A value that respresents an integer (BigInt)
 */
export class IntegerValue extends ConcreteValue {
    readonly value: bigint;

    constructor(value: bigint|number) {
        super();
        this.value = BigInt(value);
    }
}

interface EntryData {
    id: VNID,
    name: string,
    friendlyId: string,
    entryType: {id: VNID},
}

/**
 * Basic data about a single entry
 */
export class EntrySummaryValue extends ConcreteValue {
    readonly id: VNID;
    readonly name: string;
    readonly friendlyId: string;
    readonly entryType: {id: VNID};

    constructor(data: EntryData) {
        super();
        this.id = data.id;
        this.name = data.name;
        this.friendlyId = data.friendlyId;
        this.entryType = data.entryType;
    }
}

/**
 * A subset of values from a larger value set.
 */
export class PageValue<T extends ConcreteValue> extends ConcreteValue {
    readonly values: T[];
    readonly startedAt: bigint;  // Also called "skip"
    readonly pageSize: bigint;  // Also called "limit"
    readonly totalCount: bigint;

    constructor(values: T[], {startedAt, pageSize, totalCount}: {startedAt: bigint, pageSize: bigint, totalCount: bigint}) {
        super();
        this.values = values;
        this.startedAt = startedAt;
        this.pageSize = pageSize;
        this.totalCount = totalCount;
    }
}


/**
 * An abstract value that represents a set of entries.
 * 
 * e.g. "All image entries", or "entries with ID A, B, or C"
 */
export class EntrySetValue extends AbstractValue implements ICountableValue {
    readonly query: CypherQuery;
    /**
     * Many entry queries are designed to be evaluated in the context of a specific entry,
     * e.g. a query for "All image entries related to (THIS ENTRY)". If this is such a query,
     * it can only be evaluated if an entry ID is provided.
     */
    readonly requiresEntryId: boolean;
    readonly hasCount = true;

    constructor(query: CypherQuery, requiresEntryId: boolean) {
        super();
        this.query = query;
        this.requiresEntryId = requiresEntryId;
    }

    private getBaseQuery(context: QueryContext) {
        const params: {siteId: VNID, entryId?: VNID} = {siteId: context.siteId};
        if (this.requiresEntryId) {
            if (!context.entryId) {
                throw new QueryEvaluationError("This expression can only be evaluated in the context of a specific entry.");
            }
            params.entryId = context.entryId;
        }
        return this.query.withParams(params);
    }

    public async getValueFor(context: QueryContext): Promise<PageValue<EntrySummaryValue>> {
        const skip = 0n;
        const limit = 100n;
        const query = C`
            ${this.getBaseQuery(context)}
            WITH entry
            MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
            RETURN entry.id, entry.name, entry.slugId, entryType.id
            SKIP ${C(String(skip))} LIMIT ${C(String(limit))}
        `.givesShape({
            "entry.id": Field.VNID,
            "entry.name": Field.String,
            "entry.slugId": Field.Slug,
            "entryType.id": Field.VNID,
        });
        const result = await context.tx.query(query);
        const totalCount = skip === 0n && result.length < limit ? BigInt(result.length) : await this.getCount(context);
        return new PageValue<EntrySummaryValue>(
            result.map(r => new EntrySummaryValue({
                id: r["entry.id"],
                name: r["entry.name"],
                friendlyId: slugIdToFriendlyId(r["entry.slugId"]),
                entryType: {id: r["entryType.id"]},
            })),
            {
                startedAt: skip,
                pageSize: limit,
                totalCount,
            },
        );
    }

    public async getCount(context: QueryContext): Promise<bigint> {
        const countQuery = this.getBaseQuery(context).RETURN({"count(*)": Field.BigInt});
        const result = await context.tx.query(countQuery);
        return result[0]["count(*)"];
    }
}
