import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertRejects, assertEquals, assert } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { EntryValue, ImageValue, IntegerValue, NullValue, PropertyValue, StringValue } from "../values.ts";
import { Image } from "./image.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupExpression } from "../expression.ts";
import { GetProperty } from "./get.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const evalExpression = (expr: LookupExpression, entryId?: VNID) => graph.read(tx => expr.getValue({tx, siteId, entryId, defaultPageSize: 10n})).then(v => v.makeConcrete());
    const siteId = defaultData.site.id;

    group("image()", () => {

        test(`It gives data about the image associated with an entry`, async () => {
            const expression = new Image(new LiteralExpression(new EntryValue(
                defaultData.entries.imgPonderosaTrunk.id
            )), {});

            const result = await evalExpression(expression);

            assert(result instanceof ImageValue);
            assertEquals(result.data, {
                entryId: defaultData.entries.imgPonderosaTrunk.id,
                altText: defaultData.entries.imgPonderosaTrunk.name,
                caption: undefined,
                contentType: "image/webp",
                format: "thumb",  // default format
                imageUrl: result.data.imageUrl,
                blurHash: "LCDu}B~VNu9Z0LxGNH9u$zjYWCt7",
                size: 1581898,
                width: 3504,
                height: 2336,
                link: new EntryValue(defaultData.entries.imgPonderosaTrunk.id),
                maxWidth: undefined,
            });
        });

        test(`It gives data about the image retrieved from an entry's property which is a lookup expression`, async () => {
            const expression = new Image(
                new GetProperty(
                    // Instead of a literal referencing the photo of a ponderosa pine,
                    // lookup the "hero image" property of the "Ponderosa Pine (Species)" entry
                    new LiteralExpression(new EntryValue(defaultData.entries.ponderosaPine.id)),
                    {propertyExpr: new LiteralExpression(new PropertyValue(defaultData.schema.properties._hasHeroImage.id))}
                ), {formatExpr: new LiteralExpression(new StringValue("right"))}
            );

            const result = await evalExpression(expression);

            const equivalentExpression = new Image(new LiteralExpression(new EntryValue(
                defaultData.entries.imgPonderosaTrunk.id
            )), {formatExpr: new LiteralExpression(new StringValue("right"))});
            const result2 = await evalExpression(equivalentExpression);
            assertEquals(result, result2);
        });

        test(`It gives a null value when used with non-image entries`, async () => {
            const expression = new Image(new LiteralExpression(new EntryValue(
                defaultData.entries.ponderosaPine.id
            )), {});

            assertEquals(await evalExpression(expression), new NullValue());
        });

        test(`It gives an error message when used with non-entries`, async () => {
            const expression = new Image(new LiteralExpression(new IntegerValue(123n)), {});

            await assertRejects(
                () => evalExpression(expression),
                LookupEvaluationError,
                `The expression "123" is not of the right type.`,
            )
        });

    });
});
