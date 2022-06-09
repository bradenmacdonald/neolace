import { C, CypherQuery, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { ActionObject, ActionSubject } from "./action.ts";
import { Draft } from "neolace/core/edit/Draft.ts";
import { User } from "../User.ts";

const areSetsEqual = <T>(a: Set<T>, b: Set<T>) => a.size === b.size && [...a].every((value) => b.has(value));

export class PermissionGrant {
    get name(): string {
        return this.constructor.name;
    }
    static readonly description: string = "This grant is missing a description";

    constructor(
        public readonly condition: GrantCondition,
        public readonly permissions: string[],
    ) {}

    /** Does this grant give the specified permission? (Assuming this grant's condition is met.) */
    public givesPermission(perm: string): boolean {
        for (const grantedPerm of this.permissions) {
            if (perm === grantedPerm) {
                return true;
            } else if (grantedPerm.endsWith("*")) {
                // This is a wildcard perm, e.g. "view*" matches "view" and "view.entry".
                // Note: "view.*" would match "view.entry" but not "view" but that's not a very useful case.
                if (perm.startsWith(grantedPerm.substring(0, grantedPerm.length - 1))) {
                    return true;
                }
            }
        }
        return false;
    }

    public get isConditional(): boolean {
        return !(this.condition instanceof AlwaysCondition);
    }

    /** Serialize this permission grant as a string */
    public serialize(): string {
        const permsPart = this.permissions.join(",");
        if (permsPart.includes(" ")) throw new Error(`Invalid permissions string "${permsPart}"`);
        const conditionPart = this.isConditional ? ` if ${this.condition.serialize()}` : "";
        return permsPart + conditionPart;
    }

    public static parse(s: string) {
        const splitPoint = s.indexOf(" if ");
        if (splitPoint === -1) {
            // This is an unconditional permissions grant
            return new PermissionGrant(Always, s.split(","));
        } else {
            // This grant is conditional:
            const permStr = s.substring(0, splitPoint);
            const condStr = s.substring(splitPoint + 4);
            return new PermissionGrant(parseConditionString(condStr), permStr.split(","));
        }
    }
}

interface AppliesToContext {
    subject: ActionSubject;
    object: ActionObject;
    getTx: () => Promise<WrappedTransaction>;
}

interface CypherPredicateContext {
    subject: ActionSubject;
    /**
     * This is called a partial object because e.g. if asking about an entry/entry set, this will not have the entry ID;
     * instead you need to get it from the query. It will have the siteId though, and possibly other IDs that are more
     * contextual.
     */
    partialObject: ActionObject;
    cypherVars: string[];
}

/** Cypher 'true' boolean literal */
const cTrue = C`true`;
/** Cypher 'false' boolean literal */
const cFalse = C`false`;

export class GrantCondition {
    public async appliesTo(_context: AppliesToContext): Promise<boolean> {
        this.throwError(`appliesTo() not implemented.`);
    }

    public asCypherPredicate(_context: CypherPredicateContext): CypherQuery {
        this.throwError(`asCypherPredicate() not implemented.`);
    }

    protected throwError(message: string): never {
        throw new Error(`${this.constructor.name} conditional permission grant cannot be evaluated: ${message}`);
    }

    /**
     * Convert this condition to a string representation.
     * It should start with the name of the class excluding "Condition"
     */
    public serialize(): string {
        this.throwError("serialize() not implemented.");
    }

    /** Parse a string representation and return an instance of this OR undefined if it's not a serialized form of this */
    public static parse(_s: string): GrantCondition {
        throw new Error(`parse() not implemented for ${this.name}.`);
    }

    /**
     * To improve efficiency of checks, subclasses should implement this comparison function used to simplify
     * conditional logic (e.g. so "needs A and (A or B)" becomes just "needs A and B")
     */
    public equals(_otherCondition: GrantCondition): boolean {
        return false;
    }
}

/**
 * This grant is applied unconditionally
 */
export class AlwaysCondition extends GrantCondition {
    public override async appliesTo() {
        return true;
    }
    public override asCypherPredicate(): CypherQuery {
        return cTrue;
    }
    public override equals(otherCondition: GrantCondition) {
        return otherCondition instanceof AlwaysCondition;
    }
    public serialize(): string {
        return "Always";
    }
    public static override parse(s: string): AlwaysCondition {
        if (s !== "Always") throw new Error("Not Always");
        return Always;
    }
}
/** Singleton of AlwaysCondition, for convenience */
export const Always = new AlwaysCondition();

// /**
//  * This grant is never applied
//  */
// export class NeverCondition extends GrantCondition {
//     public override async appliesTo() {
//         return false;
//     }
//     public asCypherPredicate(): CypherQuery {
//         return cFalse;
//     }
// }
// /** Singleton of NeverCondition, for convenience */
// export const Never = new NeverCondition();

/**
 * Grant a permission to a any logged in user (even if they are not part of any groups on the site)
 */
export class LoggedInUserCondition extends GrantCondition {
    public override async appliesTo(context: AppliesToContext) {
        return context.subject.userId !== undefined;
    }

    public override asCypherPredicate(context: CypherPredicateContext): CypherQuery {
        return context.subject.userId !== undefined ? cTrue : cFalse;
    }

    public override equals(otherCondition: GrantCondition) {
        return otherCondition instanceof LoggedInUserCondition;
    }

    public serialize(): string {
        return "LoggedInUser";
    }
    public static override parse(s: string): LoggedInUserCondition {
        if (s !== "LoggedInUser") throw new Error("Not LoggedInUser");
        return IfLoggedIn;
    }
}
/** Singleton of LoggedInUserCondition, for convenience */
export const IfLoggedIn = new LoggedInUserCondition();

/**
 * Grant a permission to a specific user(s) - we are not using this because permissions should be granted to *groups*
 * /
export class SpecificUserCondition extends GrantCondition {
    constructor(public readonly onlyUserIds: VNID[]) {
        super();
    }

    private checkUserId(context: { subject: ActionSubject }): boolean {
        if (!context.subject.userId) {
            return false;
        }
        return this.onlyUserIds.includes(context.subject.userId);
    }

    public override async appliesTo(context: AppliesToContext) {
        return this.checkUserId(context);
    }

    public override asCypherPredicate(context: CypherPredicateContext): CypherQuery {
        return this.checkUserId(context) ? cTrue : cFalse;
    }

    public override equals(otherCondition: GrantCondition): boolean {
        return otherCondition instanceof SpecificUserCondition &&
            areSetsEqual(new Set(this.onlyUserIds), new Set(otherCondition.onlyUserIds));
    }
}*/

/**
 * Grant a permission only if the entry is one of these entry type(s)
 */
export class EntryTypesCondition extends GrantCondition {
    constructor(public readonly onlyEntryTypes: VNID[]) {
        super();
    }

    public override async appliesTo(context: AppliesToContext) {
        // Do we know the entry type ID already?
        if (context.object.entryTypeId) {
            return this.onlyEntryTypes.includes(context.object.entryTypeId);
        }
        // No, so let's look up the entry type:
        if (!context.object.entryId) {
            return false;
        }
        const tx = await context.getTx();
        const entryData = await tx.pullOne(Entry, (e) => e.type((et) => et.id), { key: context.object.entryId });
        return entryData.type?.id ? this.onlyEntryTypes.includes(entryData.type.id) : false;
    }

    public override asCypherPredicate(context: CypherPredicateContext): CypherQuery {
        if (this.onlyEntryTypes.length === 0) {
            return cFalse;
        }
        // Do we know the entry type ID already?
        if (context.partialObject.entryTypeId) {
            return this.onlyEntryTypes.includes(context.partialObject.entryTypeId) ? cTrue : cFalse;
        }
        // Otherwise we need to check it in the query:
        if (context.cypherVars.includes("entryType")) {
            return C`entryType.id IN ${this.onlyEntryTypes}`;
        } else if (context.cypherVars.includes("entry")) {
            const entryTypeIds = [...this.onlyEntryTypes]; // We already know this contains at least one ID
            let predicate = C`(entry)-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType} {id: ${entryTypeIds.pop()}})`;
            while (entryTypeIds.length > 0) {
                predicate = C
                    `${predicate} OR (entry)-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType} {id: ${entryTypeIds.pop()}})`;
            }
            return predicate;
        }
        this.throwError(`Requires 'entry' or 'entryType' in the cypher query.`);
    }

    public override equals(otherCondition: GrantCondition): boolean {
        return otherCondition instanceof EntryTypesCondition &&
            areSetsEqual(new Set(this.onlyEntryTypes), new Set(otherCondition.onlyEntryTypes));
    }

    public serialize(): string {
        return `EntryTypes:${this.onlyEntryTypes.join(",")}`;
    }
    public static override parse(s: string): EntryTypesCondition {
        if (!s.startsWith("EntryTypes:")) throw new Error("Not EntryTypesCondition");
        return new EntryTypesCondition(s.substring(11).split(",").map((etId) => VNID(etId)));
    }
}

/** A boolean condition represents an AND, OR, or NOT relationship to other conditions */
abstract class BooleanCondition extends GrantCondition {
    public abstract simplify(): GrantCondition;

    /**
     * Helper method to encode a list of GrantCondition objects as a string.
     * The array [OneOf(A, B), AllOf(C,D)] would be encoded as:
     * "[[OneOf:[A],[B]]],[[AllOf:[C],[D]]]"
     * This idosyncratic notation is relatively fast to parse and remains much more readable than escaping JSON encoded
     * arrays as strings within strings.
     */
    protected static serializeArray(conds: GrantCondition[]) {
        return conds.map((c) => {
            let numBrackets = 1;
            const innerString = c.serialize();
            while (innerString.includes("[".repeat(numBrackets)) || innerString.includes("]".repeat(numBrackets))) {
                numBrackets++; // If the inner string contains '[ brackets ]' we need to use '[[ ]]' for the outer
            }
            return "[".repeat(numBrackets) + innerString + "]".repeat(numBrackets);
        }).join(",");
    }

    /** Helper method: The opposite of serializeArray() */
    protected static unserializeArray(s: string): GrantCondition[] {
        const result: GrantCondition[] = [];
        let start = 0;
        while (start < s.length) {
            if (s[start] !== "[") throw new Error(`unserializeArray can't un-serialize "${s}"`);
            let numBrackets = 1;
            while (s[start + numBrackets] === "[") {
                numBrackets++;
            }
            let endSearchStartIndex = start + numBrackets;
            let found = false;
            while (!found && endSearchStartIndex < s.length) {
                const end = s.indexOf("]".repeat(numBrackets), endSearchStartIndex);
                if (s[end + numBrackets] === "," || s[end + numBrackets] === undefined) {
                    result.push(parseConditionString(s.substring(start + numBrackets, end)));
                    start = end + numBrackets + 1;
                    found = true;
                }
                endSearchStartIndex++;
            }
            if (!found) throw new Error(`unserializeArray can't un-serialize "${s}"`);
        }
        return result;
    }
}

/**
 * Grant a permission only if some other condition does NOT match (e.g. if the entry is NOT one of a specific type)
 */
export class NotCondition extends BooleanCondition {
    constructor(public readonly innerCondition: GrantCondition) {
        super();
    }

    public override async appliesTo(context: AppliesToContext) {
        return !(await this.innerCondition.appliesTo(context));
    }

    public override asCypherPredicate(): CypherQuery {
        return C`NOT (${this.innerCondition})`;
    }

    public override simplify(): GrantCondition {
        // not(not(A)) is just A:
        if (this.innerCondition instanceof NotCondition) {
            return this.innerCondition.innerCondition;
        }
        return this;
    }

    public override equals(otherCondition: GrantCondition): boolean {
        return otherCondition instanceof NotCondition && this.innerCondition.equals(otherCondition.innerCondition);
    }

    public serialize(): string {
        return `Not:${this.innerCondition.serialize()}`;
    }

    public static override parse(s: string): NotCondition {
        if (!s.startsWith("Not:")) throw new Error("Not NotCondition");
        const innerCondition = parseConditionString(s.substring(4));
        return new NotCondition(innerCondition);
    }
}

/**
 * Grant a permission if at least one of the specified conditions matches (boolean OR)
 */
export class OneOfCondition extends BooleanCondition {
    constructor(public readonly innerConditions: GrantCondition[]) {
        super();
        if (innerConditions.length === 0) {
            this.throwError(`OneOfCondition with no conditions specified is undefined`);
        }
    }

    public override async appliesTo(context: AppliesToContext) {
        for (const innerCondition of this.innerConditions) {
            if (await innerCondition.appliesTo(context)) {
                return true;
            }
        }
        return false;
    }

    public override asCypherPredicate(context: CypherPredicateContext): CypherQuery {
        let p = C`(${this.innerConditions[0].asCypherPredicate(context)})`;
        for (let i = 1; i < this.innerConditions.length; i++) {
            p = C`${p} OR (${this.innerConditions[i].asCypherPredicate(context)})`;
        }
        return p;
    }

    public override simplify(): GrantCondition {
        const conds = [...this.innerConditions];
        for (let x = 0; x < conds.length; x++) {
            if (conds[x] instanceof AlwaysCondition) {
                return Always; // "Always or _____" simplifies to just "Always"
            }
            for (let y = x + 1; y < conds.length; y++) {
                if (conds[x].equals(conds[y])) {
                    conds.splice(y, 1); // Remove the duplicate condition
                    y--; // And continue comparing the next one, which is now in the index where we just deleted one.
                }
            }
        }
        if (conds.length === 1) {
            return conds[0]; // "A or A" simplifies to just A!
        } else if (conds.length < this.innerConditions.length) {
            return new OneOfCondition(conds); // We have simplified the expression somewhat
        }
        return this; // Could not simplify
    }

    public override equals(otherCondition: GrantCondition): boolean {
        if (!(otherCondition instanceof OneOfCondition)) {
            return false;
        }
        for (const c of this.innerConditions) {
            if (otherCondition.innerConditions.find((oc) => oc.equals(c)) === undefined) {
                return false; // This condition is found in 'this' but not in 'otherCondition'
            }
        }
        for (const oc of otherCondition.innerConditions) {
            if (this.innerConditions.find((c) => oc.equals(c)) === undefined) {
                return false; // This condition is found in 'otherCondition' but not in 'this'
            }
        }
        return true;
    }

    public serialize(): string {
        return `OneOf:${BooleanCondition.serializeArray(this.innerConditions)}`;
    }

    public static override parse(s: string): OneOfCondition {
        if (!s.startsWith("OneOf:")) throw new Error("Not OneOfCondition");
        const innerConditions = BooleanCondition.unserializeArray(s.substring(6));
        return new OneOfCondition(innerConditions);
    }
}

/**
 * Grant a permission if all of the specified conditions match (boolean AND)
 */
export class AllOfCondition extends BooleanCondition {
    constructor(public readonly innerConditions: GrantCondition[]) {
        super();
        if (innerConditions.length === 0) {
            this.throwError(`AllOfCondition with no conditions specified is undefined`);
        }
    }

    public override async appliesTo(context: AppliesToContext) {
        for (const innerCondition of this.innerConditions) {
            if (await innerCondition.appliesTo(context)) {
                return true;
            }
        }
        return false;
    }

    public override asCypherPredicate(context: CypherPredicateContext): CypherQuery {
        let p = C`(${this.innerConditions[0].asCypherPredicate(context)})`;
        for (let i = 1; i < this.innerConditions.length; i++) {
            p = C`${p} OR (${this.innerConditions[i].asCypherPredicate(context)})`;
        }
        return p;
    }

    /**
     * Simplify: things like AllOf(A, A, B, C, C, A) should be reduced to AllOf(A, B, C)
     *
     * This function exists purely as an optimization to make the conditional grants more performant.
     * All the logic should still be correct if this function is reduced to 'return this'
     */
    public override simplify(): GrantCondition {
        const conds = this.innerConditions.map((c) => c instanceof BooleanCondition ? c.simplify() : c).filter((c) =>
            !(c instanceof AlwaysCondition)
        );
        for (let x = 0; x < conds.length; x++) {
            for (let y = x + 1; y < conds.length; y++) {
                if (conds[x].equals(conds[y])) {
                    conds.splice(y, 1); // remove duplicate condition y from the array
                    y--; // Since we removed y, the next item to check is at the same y index
                }
            }
        }

        // Special case: (A or B) and (A or C) and (A or D) is equivalent to (A or (B and C and D))
        if (conds.length > 1 && conds.every((c) => c instanceof OneOfCondition && c.innerConditions.length === 2)) {
            const first = (conds[0] as OneOfCondition).innerConditions[0];
            const newAnds = [(conds[0] as OneOfCondition).innerConditions[1]];
            for (let x = 1; x < conds.length; x++) {
                const cond = (conds[x] as OneOfCondition);
                if (cond.innerConditions[0].equals(first)) {
                    newAnds.push(cond.innerConditions[1]);
                } else if (cond.innerConditions[1].equals(first)) {
                    newAnds.push(cond.innerConditions[0]);
                } else {
                    break;
                }
            }
            if (newAnds.length === conds.length) {
                return new OneOfCondition([first, new AllOfCondition(newAnds)]);
            }
        }

        if (conds.length === 1) {
            return conds[0]; // We completely eliminated the AND expression, a very nice simplification
        } else if (conds.length < this.innerConditions.length) {
            return new AllOfCondition(conds); // We managed to simplify it a bit
        } else {
            return this; // We couldn't simplify at all
        }
    }

    public override equals(otherCondition: GrantCondition): boolean {
        if (!(otherCondition instanceof AllOfCondition)) {
            return false;
        }
        for (const c of this.innerConditions) {
            if (otherCondition.innerConditions.find((oc) => oc.equals(c)) === undefined) {
                return false; // This condition is found in 'this' but not in 'otherCondition'
            }
        }
        for (const oc of otherCondition.innerConditions) {
            if (this.innerConditions.find((c) => oc.equals(c)) === undefined) {
                return false; // This condition is found in 'otherCondition' but not in 'this'
            }
        }
        return true;
    }

    public serialize(): string {
        return `AllOf:${BooleanCondition.serializeArray(this.innerConditions)}`;
    }

    public static override parse(s: string): AllOfCondition {
        if (!s.startsWith("AllOf:")) throw new Error("Not AllOfCondition");
        const innerConditions = BooleanCondition.unserializeArray(s.substring(6));
        return new AllOfCondition(innerConditions);
    }
}

/**
 * Grant a permission only if the user is the author of the draft
 */
export class DraftSelfAuthoredCondition extends GrantCondition {
    public override async appliesTo(context: AppliesToContext) {
        if (!context.object.draftId) {
            this.throwError("Cannot use without a draftId.");
        }
        if (context.subject.userId === undefined) {
            return false;
        }
        // Look up the owner of the draft:
        const tx = await context.getTx();
        const draftData = await tx.pullOne(Draft, (d) => d.author((a) => a.id), { key: context.object.draftId });
        return draftData.author?.id === context.subject.userId;
    }

    public override asCypherPredicate(context: CypherPredicateContext): CypherQuery {
        if (context.subject.userId === undefined) {
            return cFalse;
        }
        if (!context.cypherVars.includes("draft")) {
            this.throwError(`Cannot use without a "draft" cypher variable.`);
        }
        return C`(draft)-[:${Draft.rel.AUTHORED_BY}]->(:${User} {id: ${context.subject.userId}})`;
    }

    public override equals(otherCondition: GrantCondition): boolean {
        return otherCondition instanceof DraftSelfAuthoredCondition;
    }

    public serialize(): string {
        return "DraftSelfAuthored";
    }

    public static override parse(s: string): DraftSelfAuthoredCondition {
        if (s !== "DraftSelfAuthored") throw new Error("Not DraftSelfAuthored");
        return new DraftSelfAuthoredCondition();
    }
}

/** This type of condition is only useful for tests */
export class TestCondition extends GrantCondition {
    constructor(public readonly condStr: string) {
        super();
    }

    public override async appliesTo(): Promise<boolean> {
        this.throwError("Unimplemented - for testing only");
    }

    public override asCypherPredicate(): CypherQuery {
        this.throwError("Unimplemented - for testing only");
    }

    public override equals(otherCondition: GrantCondition): boolean {
        return otherCondition instanceof TestCondition && otherCondition.condStr === this.condStr;
    }

    public serialize(): string {
        return `Test:${this.condStr}`;
    }

    public static override parse(s: string): TestCondition {
        if (!s.startsWith("Test:")) throw new Error("Not TestCondition");
        return new TestCondition(s.substring(5));
    }
}

const allConditions = [
    AlwaysCondition,
    LoggedInUserCondition,
    EntryTypesCondition,
    NotCondition,
    OneOfCondition,
    AllOfCondition,
    DraftSelfAuthoredCondition,
    TestCondition,
];

export function parseConditionString(s: string): GrantCondition {
    for (const c of allConditions) {
        if (s.startsWith(c.name.substring(0, c.name.length - 9))) { // Starts with the class name except for "Condition"
            return c.parse(s);
        }
    }
    throw new Error(`Could not parse GrantCondition string: "${s}". Expected something like "EntryTypes:_123456"`);
}
