import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, group, test } from "neolace/lib/tests.ts";
import {
    AllOfCondition,
    Always,
    AlwaysCondition,
    DraftSelfAuthoredCondition,
    EntryTypesCondition,
    GrantCondition,
    IfLoggedIn,
    LoggedInUserCondition,
    NotCondition,
    OneOfCondition,
    parseConditionString,
    PermissionGrant,
    TestCondition,
} from "./grant.ts";

group("PermissionGrant", () => {
    test("givesPermission() states whether a grant gives a particular permission, including handling wildcards", async () => {
        const check = (permsGranted: string[], perm: string) =>
            new PermissionGrant(Always, permsGranted).givesPermission(perm);

        // A grant of "foo" and "bar" gives the permissions foo and bar, but not blah:
        assertEquals(check(["foo", "bar"], "foo"), true);
        assertEquals(check(["foo", "bar"], "bar"), true);
        assertEquals(check(["foo", "bar"], "blah"), false);

        // An empty grant gives no permissions:
        assertEquals(check([], "view"), false);

        // A grant of "view*" gives "view", "view.entry", "view.entry.property", etc.
        assertEquals(check(["view*"], "view"), true);
        assertEquals(check(["view*"], "view.entry"), true);
        assertEquals(check(["view*"], "view.entry.property"), true);
        assertEquals(check(["foo", "view*", "view"], "view.entry.property"), true);
        assertEquals(check(["view*"], "edit.entry"), false); // this one is not matched

        // A grant of "view.*" matches "view.entry", "view.entry.property", but not "view"
        assertEquals(check(["view.*"], "view"), false);
        assertEquals(check(["view.*"], "view.entry"), true);
        assertEquals(check(["view.*"], "view.entry.property"), true);
    });

    test("serialization", () => {
        assertEquals(new PermissionGrant(Always, ["view.entry"]).serialize(), "view.entry");
        assertEquals(new PermissionGrant(Always, ["foo", "edit*", "view.entry"]).serialize(), "foo,edit*,view.entry");
        assertEquals(new PermissionGrant(IfLoggedIn, ["edit.entry"]).serialize(), "edit.entry if LoggedInUser");

        const assertRoundTripSerialization = (g: PermissionGrant) =>
            assertEquals(g, PermissionGrant.parse(g.serialize()));

        assertRoundTripSerialization(new PermissionGrant(Always, ["view.entry"]));
        assertRoundTripSerialization(
            new PermissionGrant(
                new OneOfCondition([
                    new AllOfCondition([new TestCondition("A"), new TestCondition("B")]),
                    new AllOfCondition([new TestCondition("[C]"), new TestCondition("[D]")]),
                ]),
                ["view.entry", "edit*", "admin.site.all"],
            ),
        );
    });
});

group("Grant conditions", () => {
    const A = new TestCondition("A");
    const B = new TestCondition("B");
    const C = new TestCondition("C");

    const assertCondsEqual = (a: GrantCondition, b: GrantCondition) => assertEquals(a.equals(b), true);
    const assertCondsNotEqual = (a: GrantCondition, b: GrantCondition) => assertEquals(a.equals(b), false);
    const assertRoundTripSerialization = (c: GrantCondition) => assertEquals(c, parseConditionString(c.serialize()));

    test("TestCondition", () => {
        // Just confirm that our test helpers and assumptions are working:
        assertCondsEqual(A, A);
        assertCondsEqual(B, B);
        assertCondsEqual(C, C);
        assertCondsNotEqual(A, B);
        assertCondsNotEqual(B, C);
    });

    test("TestCondition - serialization", () => {
        assertEquals(new TestCondition("A").serialize(), "Test:A");
        assertEquals(new TestCondition("B").serialize(), "Test:B");
        assertRoundTripSerialization(new TestCondition("ABC"));
        assertRoundTripSerialization(new TestCondition("!@#$%^&*() skdlf ja;lksadks jf;aldksfj "));
    });

    // AlwaysCondition

    test("AlwaysCondition - equals()", () => {
        assertCondsEqual(new AlwaysCondition(), new AlwaysCondition());
        assertCondsEqual(Always, new AlwaysCondition());
        assertCondsNotEqual(Always, A);
    });

    test("AlwaysCondition - serialization", () => {
        assertRoundTripSerialization(Always);
    });

    // LoggedInUserCondition

    test("LoggedInUserCondition - equals()", () => {
        assertCondsEqual(new LoggedInUserCondition(), new LoggedInUserCondition());
        assertCondsEqual(IfLoggedIn, new LoggedInUserCondition());
        assertCondsNotEqual(IfLoggedIn, A);
    });

    test("LoggedInUserCondition - serialization", () => {
        assertRoundTripSerialization(IfLoggedIn);
    });

    // EntryTypesCondition

    // Create some fake entry type IDs for these tests:
    const alphaType = VNID("_typeAlpha"), betaType = VNID("_typeBeta");

    test("EntryTypesCondition - equals()", () => {
        assertCondsEqual(new EntryTypesCondition([alphaType]), new EntryTypesCondition([alphaType]));
        assertCondsEqual(
            new EntryTypesCondition([alphaType, betaType]),
            new EntryTypesCondition([alphaType, betaType]),
        );
        assertCondsNotEqual(new EntryTypesCondition([alphaType]), new EntryTypesCondition([betaType]));
    });

    test("EntryTypesCondition - serialization", () => {
        assertEquals(new EntryTypesCondition([alphaType]).serialize(), "EntryTypes:_typeAlpha");
        assertRoundTripSerialization(new EntryTypesCondition([alphaType]));
        assertRoundTripSerialization(new EntryTypesCondition([betaType, alphaType]));
    });

    // NotCondition

    test("NotCondition - equals()", () => {
        // !A == !A
        assertCondsEqual(new NotCondition(A), new NotCondition(A));
        // !A != !B
        assertCondsNotEqual(new NotCondition(A), new NotCondition(B));
    });

    test("NotCondition - simplify()", () => {
        // !!A simplifies to A
        assertCondsEqual(new NotCondition(new NotCondition(A)).simplify(), A);
    });

    test("NotCondition - serialization", () => {
        assertEquals(new NotCondition(A).serialize(), "Not:Test:A");
        assertRoundTripSerialization(new NotCondition(A));
    });

    // OneOfCondition

    test("OneOfCondition - asCypherPredicate()", async () => {
        const subject = { siteId: VNID(), userId: VNID() };

        // All of A and B:
        const predicate = await new OneOfCondition([A, B]).asCypherPredicate({
            subject,
            partialObject: {},
            cypherVars: ["var"],
        });
        let queryString = predicate.queryString;
        for (const [key, value] of Object.entries(predicate.params)) {
            queryString = queryString.replaceAll(`$${key}`, value as string);
        }
        assertEquals(queryString, "(conditionA) OR (conditionB)");
    });

    test("OneOfCondition - equals()", () => {
        // Not equal
        assertCondsNotEqual(new OneOfCondition([A, B]), new OneOfCondition([A, C]));
        // Identity
        assertCondsEqual(new OneOfCondition([A, B, C]), new OneOfCondition([A, B, C]));
        // Order doesn't matter
        assertCondsEqual(new OneOfCondition([A, B, C]), new OneOfCondition([B, A, C]));
        // Duplicates are ignored for equality checking:
        assertCondsEqual(new OneOfCondition([A, A, B]), new OneOfCondition([B, B, A])); // "A or B" is equal to "B or A"
        assertCondsNotEqual(new OneOfCondition([A, A, B]), new OneOfCondition([B, A, C])); // "A or B" is not equal to "A or B or C"
    });

    test("OneOfCondition - simplify()", () => {
        // Simplification - note we use assertEquals for these tests since assertCondsEqual would use .equals()
        // which ignores duplicates even though the expression may not be simplified.

        // "A or A" simplifies to A
        assertEquals(new OneOfCondition([A, A]).simplify(), A);
        // "A or B or !A" simplifies to Always true
        assertEquals(new OneOfCondition([A, B, new NotCondition(A)]).simplify(), Always);
        // "!A or B or A" simplifies to Always true (same as above, just different order)
        assertEquals(new OneOfCondition([new NotCondition(A), A, B]).simplify(), Always);
        // "A or B or B or A" simplifies to "A or B"
        assertEquals(new OneOfCondition([A, B, B, A]).simplify(), new OneOfCondition([A, B]));
        // "Always or B or C" simplifies to Always:
        assertEquals(new OneOfCondition([Always, A, B]).simplify(), Always);
    });

    test("OneOfCondition - serialization", () => {
        assertEquals(new OneOfCondition([A, B]).serialize(), "OneOf:[Test:A],[Test:B]");
        // A or [B or C]:
        assertEquals(
            new OneOfCondition([A, new OneOfCondition([B, C])]).serialize(),
            "OneOf:[Test:A],[[OneOf:[Test:B],[Test:C]]]",
        );
        // Now test round-trip serialization of some complex cases:
        assertRoundTripSerialization(new OneOfCondition([A, B]));
        assertRoundTripSerialization(
            new OneOfCondition([new NotCondition(A), new OneOfCondition([new OneOfCondition([B, C]), A])]),
        );
        const evil1 = new TestCondition("[[[]]]]]"),
            evil2 = new TestCondition("[[]],"),
            evil3 = new TestCondition("!@#$%^&*()[][]]");
        assertRoundTripSerialization(
            new OneOfCondition([
                evil1,
                new NotCondition(new OneOfCondition([evil1, evil2, evil3, new OneOfCondition([evil3, A])])),
            ]),
        );
    });

    // AllOfCondition

    test("AllOfCondition - appliesTo()", async () => {
        // deno-lint-ignore no-explicit-any
        const getTx = () => null as any;
        const subject = { siteId: VNID(), userId: VNID() };
        assertEquals(
            await new AllOfCondition([A, B]).appliesTo({ getTx, subject, object: { ["plugin:teststring"]: "A" } }),
            false, // string does not contain A and B
        );
        assertEquals(
            await new AllOfCondition([A, B]).appliesTo({ getTx, subject, object: { ["plugin:teststring"]: "AB" } }),
            true,
        );
        assertEquals(
            await new AllOfCondition([A, B, C]).appliesTo({ getTx, subject, object: { ["plugin:teststring"]: "BBC" } }),
            false,
        );
        assertEquals(
            await new AllOfCondition([A, B, C, A]).appliesTo({
                getTx,
                subject,
                object: { ["plugin:teststring"]: "ABC" },
            }),
            true,
        );
    });

    test("AllOfCondition - asCypherPredicate()", async () => {
        const subject = { siteId: VNID(), userId: VNID() };

        // All of A and B:
        const predicate = await new AllOfCondition([A, B]).asCypherPredicate({
            subject,
            partialObject: {},
            cypherVars: ["var"],
        });
        let queryString = predicate.queryString;
        for (const [key, value] of Object.entries(predicate.params)) {
            queryString = queryString.replaceAll(`$${key}`, value as string);
        }
        assertEquals(queryString, "(conditionA) AND (conditionB)");
    });

    test("AllOfCondition - equals()", () => {
        // Not equal
        assertCondsNotEqual(new AllOfCondition([A, B]), new AllOfCondition([A, C]));
        // Identity
        assertCondsEqual(new AllOfCondition([A, B, C]), new AllOfCondition([A, B, C]));
        // Order doesn't matter
        assertCondsEqual(new AllOfCondition([A, B, C]), new AllOfCondition([B, A, C]));
        // Duplicates are ignored for equality checking:
        assertCondsEqual(new AllOfCondition([A, A, B]), new AllOfCondition([B, B, A])); // "A and B" is equal to "B and A"
        assertCondsNotEqual(new AllOfCondition([A, A, B]), new AllOfCondition([B, A, C])); // "A and B" is not equal to "A and B and C"
    });

    test("AllOfCondition - simplify()", () => {
        // Simplification - note we use assertEquals for these tests since assertCondsEqual would use .equals()
        // which ignores duplicates even though the expression may not be simplified.

        // "A and A" simplifies to A
        assertEquals(new AllOfCondition([A, A]).simplify(), A);
        // "A and B and B and A" simplifies to "A and B"
        assertEquals(new AllOfCondition([A, B, B, A]).simplify(), new AllOfCondition([A, B]));
        // "Always and B and C" simplifies to "B and C":
        assertEquals(new AllOfCondition([Always, B, C]).simplify(), new AllOfCondition([B, C]));
        // "(A or B) and (A or C)" simplifies to "A or (B and C)":
        assertEquals(
            new AllOfCondition([new OneOfCondition([A, B]), new OneOfCondition([A, C])]).simplify(),
            new OneOfCondition([A, new AllOfCondition([B, C])]),
        );
    });

    test("AllOfCondition - serialization", () => {
        assertEquals(new AllOfCondition([A, B]).serialize(), "AllOf:[Test:A],[Test:B]");
        // A or [B or C]:
        assertEquals(
            new AllOfCondition([A, new AllOfCondition([B, C])]).serialize(),
            "AllOf:[Test:A],[[AllOf:[Test:B],[Test:C]]]",
        );
        // Now test round-trip serialization of some complex cases:
        assertRoundTripSerialization(new AllOfCondition([A, B]));
        assertRoundTripSerialization(
            new AllOfCondition([new NotCondition(A), new AllOfCondition([new AllOfCondition([B, C]), A])]),
        );
        const evil1 = new TestCondition("[[[]]]]]"),
            evil2 = new TestCondition("[[]],"),
            evil3 = new TestCondition("!@#$%^&*()[][]]");
        assertRoundTripSerialization(
            new AllOfCondition([
                evil1,
                new NotCondition(new AllOfCondition([evil1, evil2, evil3, new AllOfCondition([evil3, A])])),
            ]),
        );
    });

    // DraftSelfAuthoredCondition

    test("DraftSelfAuthoredCondition - equals()", () => {
        assertCondsEqual(new DraftSelfAuthoredCondition(), new DraftSelfAuthoredCondition());
        assertCondsNotEqual(new DraftSelfAuthoredCondition(), A);
    });

    test("DraftSelfAuthoredCondition - serialization", () => {
        assertRoundTripSerialization(new DraftSelfAuthoredCondition());
    });
});
