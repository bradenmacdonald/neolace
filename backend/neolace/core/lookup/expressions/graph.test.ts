import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Ancestors, AndAncestors } from "./ancestors.ts";
import { AnnotatedValue, IntegerValue, MakeAnnotatedEntryValue, PageValue } from "../values.ts";
import { This } from "./this.ts";
import { Count } from "./count.ts";
import { LookupExpression } from "../expression.ts";
import { Graph } from "./graph.ts"

group(import.meta, () => {
    group("graph()", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("It can graph all the ancestors of the ponderosa pine", async () => {
            // this is the same as this.ancestors().graph()
            const expression = new Graph (new Ancestors(new This()));

            const value = await graph.read((tx) =>
                expression.getValue({ tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n }).then((v) =>
                    v.makeConcrete()
                )
            );

            assertEquals(value, {});
        })
    });
});
