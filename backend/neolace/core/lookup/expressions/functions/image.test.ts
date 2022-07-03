import * as api from "neolace/deps/neolace-api.ts";
import {
    assertEquals,
    assertInstanceOf,
    assertRejects,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import {
    EntryValue,
    ImageValue,
    IntegerValue,
    NullValue,
    PageValue,
    PropertyValue,
    StringValue,
} from "../../values.ts";
import { Image } from "./image.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { GetProperty } from "./get.ts";
import { First } from "./first.ts";
import { parseLookupString } from "../../parse.ts";
import { ReverseProperty } from "./reverse.ts";

group("image.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    test(`It gives data about the image associated with an entry`, async () => {
        const expression = new Image(
            new LiteralExpression(
                new EntryValue(
                    defaultData.entries.imgPonderosaTrunk.id,
                ),
            ),
            {},
        );

        const result = await context.evaluateExprConcrete(expression);

        assertInstanceOf(result, ImageValue);
        assertEquals(result.data, {
            entryId: defaultData.entries.imgPonderosaTrunk.id,
            altText: defaultData.entries.imgPonderosaTrunk.name,
            caption: undefined,
            contentType: "image/webp",
            format: api.ImageDisplayFormat.Normal,
            imageUrl: result.data.imageUrl,
            blurHash: "LCDu}B~VNu9Z0LxGNH9u$zjYWCt7",
            borderColor: undefined,
            size: 1581898,
            sizing: api.ImageSizingMode.Cover,
            width: 3504,
            height: 2336,
            link: new EntryValue(defaultData.entries.imgPonderosaTrunk.id),
            maxWidth: undefined,
        });
    });

    test(`It gives data about the image retrieved from an entry's property which is a lookup expression`, async () => {
        const expression = new Image(
            new First(
                new GetProperty(
                    // Instead of a literal referencing the photo of a ponderosa pine,
                    // lookup the "hero image" property of the "Ponderosa Pine (Species)" entry
                    new LiteralExpression(new EntryValue(defaultData.entries.ponderosaPine.id)),
                    {
                        prop: new LiteralExpression(
                            new PropertyValue(defaultData.schema.properties._hasHeroImage.id),
                        ),
                    },
                ),
            ),
            { format: new LiteralExpression(new StringValue("right")) },
        );

        const result = await context.evaluateExprConcrete(expression);

        const equivalentExpression = new Image(
            new LiteralExpression(
                new EntryValue(
                    defaultData.entries.imgPonderosaTrunk.id,
                ),
            ),
            { format: new LiteralExpression(new StringValue("right")) },
        );
        const result2 = await context.evaluateExprConcrete(equivalentExpression);
        assertEquals(result, result2);
    });

    test(`It works with multiple entry values`, async () => {
        const expression = new Image(
            parseLookupString(
                `this.andDescendants().reverse(prop=prop("${defaultData.schema.properties._imgRelTo.id}"))`,
            ),
            { format: new LiteralExpression(new StringValue("thumb")) },
        );

        const result = await context.evaluateExprConcrete(expression, defaultData.entries.ponderosaPine.id);

        assertInstanceOf(result, PageValue);
        assertInstanceOf(result.values[0], ImageValue);
        assertEquals(result.values[0].data.entryId, defaultData.entries.imgPonderosaTrunk.id);
        assertInstanceOf(result.sourceExpression, ReverseProperty);
        assertEquals(result.sourceExpressionEntryId, defaultData.entries.ponderosaPine.id);
    });

    test(`It gives a null value when used with non-image entries`, async () => {
        const expression = new Image(
            new LiteralExpression(
                new EntryValue(
                    defaultData.entries.ponderosaPine.id,
                ),
            ),
            {},
        );

        assertEquals(await context.evaluateExprConcrete(expression), new NullValue());
    });

    test(`It gives an error message when used with non-entries`, async () => {
        const expression = new Image(new LiteralExpression(new IntegerValue(123n)), {});

        await assertRejects(
            () => context.evaluateExprConcrete(expression),
            LookupEvaluationError,
            `The expression "123" is not of the right type.`,
        );
    });
});
