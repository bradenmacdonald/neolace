import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import {
    BooleanValue,
    ConcreteValue,
    EntryTypeValue,
    EntryValue,
    IntegerValue,
    NullValue,
    StringValue,
} from "../values.ts";
import { If } from "./if.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { LookupExpression } from "../expression.ts";
import { List } from "./list-expr.ts";

group(import.meta, () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const evalExpression = (expr: LookupExpression, entryId?: VNID) =>
        graph.read((tx) => expr.getValue({ tx, siteId, entryId, defaultPageSize: 10n })).then((v) => v.makeConcrete());
    const assertEvaluatesTo = async (expr: LookupExpression, value: ConcreteValue) =>
        assertEquals(await evalExpression(expr), value);

    group("if()", () => {
        const literal = (value: ConcreteValue) => new LiteralExpression(value);

        test(`if(falsy_value) returns NULL`, async () => {
            const checkFalsy = async (value: ConcreteValue) => {
                await assertEvaluatesTo(
                    new If(literal(value), {}),
                    new NullValue(),
                );
            };

            // if(false) -> Null
            await checkFalsy(new BooleanValue(false));
            // if(0) -> Null
            await checkFalsy(new IntegerValue(0));
            // if("") -> Null
            await checkFalsy(new StringValue(""));
            // if(Null) -> Null
            await checkFalsy(new NullValue());
        });

        test(`if(truthy_value) returns that value`, async () => {
            const checkTruthy = async (value: ConcreteValue) => {
                await assertEvaluatesTo(
                    new If(literal(value), {}),
                    value,
                );
            };

            // if(true) -> true
            await checkTruthy(new BooleanValue(true));
            // if(15) -> 15
            await checkTruthy(new IntegerValue(15));
            // if(-1) -> -1
            await checkTruthy(new IntegerValue(-1));
            // if("hello world") -> "hello world"
            await checkTruthy(new StringValue("hello world"));
            // Generally any object value (Entry, EntryType, etc.) is truthy
            await checkTruthy(new EntryValue(VNID("_entryId")));
            await checkTruthy(new EntryTypeValue(VNID("_entryId")));
        });

        test(`if(conditional, then=X) returns X if conditional is truthy`, async () => {
            // if(true, then="hello") -> "hello"
            const helloStr = new StringValue("hello");
            await assertEvaluatesTo(
                new If(literal(new BooleanValue(true)), { thenExpr: literal(helloStr) }),
                helloStr,
            );

            // if(false, then="hello") -> Null
            await assertEvaluatesTo(
                new If(literal(new BooleanValue(false)), { thenExpr: literal(helloStr) }),
                new NullValue(),
            );

            // if([1, 2, 3], then="hello") -> "hello" (a list is truthy if non-empty)
            await assertEvaluatesTo(
                new If(
                    new List([
                        literal(new IntegerValue(1)),
                        literal(new IntegerValue(2)),
                        literal(new IntegerValue(3)),
                    ]),
                    { thenExpr: literal(helloStr) },
                ),
                helloStr,
            );

            // if([], then="hello") -> Null (an empty list is not truthy)
            await assertEvaluatesTo(
                new If(
                    new List([]),
                    { thenExpr: literal(helloStr) },
                ),
                new NullValue(),
            );
        });

        test(`if(conditional, then=X, else=Y) returns X if conditional is truthy, otherwise Y`, async () => {
            const yesStr = new StringValue("yes");
            const noStr = new StringValue("no");

            // if(true, then="yes", else="no") -> "yes"
            await assertEvaluatesTo(
                new If(literal(new BooleanValue(true)), { thenExpr: literal(yesStr), elseExpr: literal(noStr) }),
                yesStr,
            );

            // if(false, then="yes", else="no") -> "no"
            await assertEvaluatesTo(
                new If(literal(new BooleanValue(false)), { thenExpr: literal(yesStr), elseExpr: literal(noStr) }),
                noStr,
            );
        });
    });
});
