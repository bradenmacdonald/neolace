import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Ancestors, AndAncestors } from "./ancestors.ts";
import { AnnotatedValue, GraphValue, IntegerValue, MakeAnnotatedEntryValue, PageValue } from "../values.ts";
import { This } from "./this.ts";
import { Count } from "./count.ts";
import { LookupExpression } from "../expression.ts";
import { Graph } from "./graph.ts";

group(import.meta, () => {
    group("graph()", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("It can graph all the ancestors of the ponderosa pine", async () => {
            // this is the same as this.ancestors().graph()
            const expression = new Graph(new AndAncestors(new This()));

            const value = await graph.read((tx) =>
                expression.getValue({ tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n }).then((v) =>
                    v.makeConcrete()
                )
            );

            assertEquals(value, {
                entries: [
                    {
                        data: {},
                        entryId: defaultData.entries.ponderosaPine.id,
                        entryType: defaultData.schema.entryTypes._ETSPECIES.id,
                        name: "Ponderosa Pine",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.genusPinus.id,
                        entryType: defaultData.schema.entryTypes._ETGENUS.id,
                        name: "Pinus",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.familyPinaceae.id,
                        entryType: defaultData.schema.entryTypes._ETFAMILY.id,
                        name: "Pinaceae",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.orderPinales.id,
                        entryType: defaultData.schema.entryTypes._ETORDER.id,
                        name: "Pinales",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.classPinopsida.id,
                        entryType: defaultData.schema.entryTypes._ETCLASS.id,
                        name: "Pinopsida",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.divisionTracheophyta.id,
                        entryType: defaultData.schema.entryTypes._ETDIVISION.id,
                        name: "Tracheophyta",
                    },
                ],
                rels: [
                    {
                        data: {},
                        fromEntryId: defaultData.entries.classPinopsida.id,
                        relId: (value as GraphValue).rels[4]?.relId,
                        relType: defaultData.schema.properties._parentDivision.id,
                        toEntryId: defaultData.entries.divisionTracheophyta.id,
                    },
                    {
                        data: {},
                        fromEntryId: defaultData.entries.orderPinales.id,
                        relId: (value as GraphValue).rels[3]?.relId,
                        relType: defaultData.schema.properties._parentClass.id,
                        toEntryId: defaultData.entries.classPinopsida.id,
                    },
                    {
                        data: {},
                        fromEntryId: defaultData.entries.familyPinaceae.id,
                        relId: (value as GraphValue).rels[2]?.relId,
                        relType: defaultData.schema.properties._parentOrder.id,
                        toEntryId: defaultData.entries.orderPinales.id,
                    },
                    {
                        data: {},
                        fromEntryId: defaultData.entries.genusPinus.id,
                        relId: (value as GraphValue).rels[1]?.relId,
                        relType: defaultData.schema.properties._parentFamily.id,
                        toEntryId: defaultData.entries.familyPinaceae.id,
                    },
                    {
                        data: {},
                        fromEntryId: defaultData.entries.ponderosaPine.id,
                        relId: (value as GraphValue).rels[0]?.relId,
                        relType: defaultData.schema.properties._parentGenus.id,
                        toEntryId: defaultData.entries.genusPinus.id,
                    },
                ],
            });
        });
    });
});