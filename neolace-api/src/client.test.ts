import { NeolaceApiClient } from "./client.ts";
import { GetEntryFlags, RawPropertyData } from "./content/Entry.ts";
import { AnyLookupValue } from "./content/lookup-value.ts";
import { VNID } from "./types.ts";

// IfEquals check from https://stackoverflow.com/a/53808212 - if T and U are equal, this evaluates to Y, else N
type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? Y
    : N;

// Helper for asserting that types are equal
export type AssertEqual<Type, Expected> = IfEquals<Type, Expected, true, false>;
export type AssertNotEqual<Type, Expected> = IfEquals<Type, Expected, false, true>;
export function checkType<Assertion extends true>(): void {/* */}

Deno.test("Compile-time tests for typing of client.getEntry()", async () => {
    // This will never be true because we only want to run this test at compile time.
    if (Math.random() < 0) {
        const client = new NeolaceApiClient({ basePath: "", fetchApi: fetch });

        // Check without including any flags:
        {
            const entryResponse = await client.getEntry("id");
            const propertiesSummary = entryResponse.propertiesSummary;
            // Type of propertiesSummary should be: never
            checkType<AssertEqual<typeof propertiesSummary, never>>();
            checkType<AssertNotEqual<typeof propertiesSummary, "some other string value">>();
            // deno-lint-ignore ban-types
            checkType<AssertNotEqual<typeof propertiesSummary, {}>>();
        }

        // Check with runtime flags:
        {
            const flags: GetEntryFlags[] = [GetEntryFlags.IncludePropertiesSummary];
            const entryResponse = await client.getEntry("id", { flags });
            let propertiesSummary = entryResponse.propertiesSummary;
            // Type of propertiesSummary should be: { propertyId: VNID; value: AnyLookupValue; }[] | undefined;
            checkType<
                AssertEqual<typeof propertiesSummary, { propertyId: VNID; value: AnyLookupValue }[] | undefined>
            >();
            checkType<AssertNotEqual<typeof propertiesSummary, { propertyId: VNID; value: AnyLookupValue }[]>>();
            // @ts-expect-error The type should not be 'any'
            propertiesSummary = false;
            // Same for other fields, since the exact flags aren't known at compile time:
            checkType<AssertEqual<typeof entryResponse.propertiesRaw, RawPropertyData[] | undefined>>();
        }

        // Check with compile-time flags:
        {
            const flags = [GetEntryFlags.IncludePropertiesSummary] as const;
            const entryResponse = await client.getEntry("id", { flags });
            const propertiesSummary = entryResponse.propertiesSummary;
            // We should know that propertiesSummary is always defined:
            checkType<AssertEqual<typeof propertiesSummary, { propertyId: VNID; value: AnyLookupValue }[]>>();
            checkType<
                AssertNotEqual<typeof propertiesSummary, { propertyId: VNID; value: AnyLookupValue }[] | undefined>
            >();
            // And other fields should be absent:
            checkType<AssertEqual<typeof entryResponse.propertiesRaw, never>>();
        }
    }
});
