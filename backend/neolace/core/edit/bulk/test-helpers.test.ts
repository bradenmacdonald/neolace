import { C } from "neolace/deps/vertex-framework.ts";
import { assertInstanceOf, assertRejects, TestLookupContext } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AnnotatedValue, EntryValue, PageValue, StringValue } from "neolace/core/lookup/values.ts";
import { AnyBulkEdit, VNID } from "neolace/deps/neolace-api.ts";
import { LookupEvaluationError } from "neolace/core/lookup/errors.ts";
import { getConnection } from "../connections.ts";
import { ApplyBulkEdits } from "../ApplyBulkEdits.ts";
import { TestSetupData } from "neolace/lib/tests-default-data.ts";
import { AppliedEdit } from "../AppliedEdit.ts";
import { ApplyEdits, UseSystemSource } from "../ApplyEdits.ts";
import { getRawProperties } from "neolace/core/entry/properties.ts";

export const testHelpers = (defaultData: TestSetupData["data"]) => {
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });
    return {
        siteId,
        species: defaultData.schema.entryTypes.ETSPECIES,
        ponderosaPine: defaultData.entries.ponderosaPine,
        jackPine: defaultData.entries.jackPine,
        stonePine: defaultData.entries.stonePine,

        getKey: (entry: { id: VNID }) =>
            context.evaluateExprConcrete(`entry("${entry.id}").key`).then((val) => (val as StringValue).value),
        getName: (entry: { id: VNID }) =>
            context.evaluateExprConcrete(`entry("${entry.id}").name`).then((val) => (val as StringValue).value),
        getDescription: (entry: { id: VNID }) =>
            context.evaluateExprConcrete(`entry("${entry.id}").description`).then((val) => (val as StringValue).value),
        /** Evaluate a lookup expresion like 'this.get(prop=prop("...")) that returns a list of entries. */
        evaluateEntryListLookup: (entry: { id: VNID }, expr: string) =>
            context.evaluateExprConcrete(expr, entry.id).then((val) => {
                return (val as PageValue<AnnotatedValue | EntryValue>).values.map((ev) =>
                    ev instanceof AnnotatedValue ? (ev.value as EntryValue).id : ev.id
                );
            }),

        /** Get all the facts (values) for a particular property on a particular entry */
        getPropertyFacts: async (entry: { id: VNID }, propertyKey: string) => {
            const graph = await getGraph();
            const allRawProps = await graph.read((tx) => getRawProperties({ tx, entryId: entry.id }));
            const rawProp = allRawProps.find((rp) => rp.propertyKey === propertyKey);
            return rawProp?.facts ?? [];
        },

        assertExists: (entry: { id: VNID } | { key: string }) =>
            context.evaluateExprConcrete(`entry("${"id" in entry ? entry.id : entry.key}")`).then((val) => {
                assertInstanceOf(val, EntryValue);
                return { id: val.id };
            }),
        assertNotExists: (entry: { id: VNID } | { key: string }) =>
            assertRejects(
                () => context.evaluateExprConcrete(`entry("${"id" in entry ? entry.id : entry.key}")`),
                LookupEvaluationError,
                "not found",
            ),

        doBulkEdits: async (edits: AnyBulkEdit[], siteIdOverride = siteId) => {
            const graph = await getGraph();
            /** For now, BulkUpdateEntries only works as part of a Connection, not via Drafts or anything else. */
            const connection = await getConnection({
                key: "bulk-test",
                siteId: siteIdOverride,
                create: true,
                plugin: "none",
            });
            return graph.runAsSystem(ApplyBulkEdits({ siteId: siteIdOverride, edits, connectionId: connection.id }));
        },

        getAppliedEdits: async (result: { appliedEditIds: VNID[] }) => {
            const graph = await getGraph();
            return graph.pull(AppliedEdit, (a) => a.code.data.oldData, {
                where: C`@this.id IN ${result.appliedEditIds}`,
                orderBy: "@this.timestamp",
            });
        },

        /** Create an entry type and some entries on the other site, to use in tests */
        populateOtherSite: async () => {
            const graph = await getGraph();
            const entryTypeKey = "ETTEST", entryA = VNID(), entryB = VNID(), entryC = VNID();
            await graph.runAsSystem(ApplyEdits({
                siteId: defaultData.otherSite.id,
                edits: [
                    { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                    {
                        code: "CreateEntry",
                        data: { entryId: entryA, name: "Entry A", entryTypeKey, key: "a", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { entryId: entryB, name: "Entry B", entryTypeKey, key: "b", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { entryId: entryC, name: "Entry C", entryTypeKey, key: "c", description: "" },
                    },
                ],
                editSource: UseSystemSource,
            }));
            return { entryTypeKey, entryA, entryB, entryC };
        },
    };
};
