import { C, Field } from "neolace/deps/vertex-framework.ts";
import { assertArrayIncludes, assertEquals, assertRejects, group, test } from "neolace/lib/tests.ts";
import { _forTests } from "./check.ts";
import { AllOfCondition, Always, IfLoggedIn, OneOfCondition, PermissionGrant, TestCondition } from "./grant.ts";
import { corePerm } from "./permissions.ts";

const {
    getAllRequiredPermissions,
    makeCloseableTransactionOnDemand,
    determineCondition,
} = _forTests;

// Once https://github.com/denoland/deno_std/issues/2295 is fixed, we can use assertEquals to compare sets.
// Until then, use this:
const assertSetEquals = <T>(a: Set<T>, b: Set<T>) => {
    assertArrayIncludes(Array.from(a.values()), Array.from(b.values()));
    assertEquals(a.size, b.size);
};

group("getAllRequiredPermissions()", () => {
    test("it computes required permissions", async () => {
        // Empty permissions:
        assertSetEquals(
            await getAllRequiredPermissions([]),
            new Set(),
        );

        // A basic permission:
        assertEquals(corePerm.viewSite.name, "view");
        assertSetEquals(
            await getAllRequiredPermissions([corePerm.viewSite.name]),
            new Set(["view"]),
        );

        // view.entry requires view
        assertEquals(corePerm.viewEntry.name, "view.entry");
        assertSetEquals(
            await getAllRequiredPermissions([corePerm.viewEntry.name]),
            new Set(["view", "view.entry"]),
        );

        // "proposeEdits.entry.new" requires "proposeEdits.entry" which requires "view.entry" (and thus "view")
        // See permissions.ts for the definitions of these.
        assertEquals(corePerm.proposeNewEntry.name, "proposeEdits.entry.new");
        assertSetEquals(
            await getAllRequiredPermissions([corePerm.proposeNewEntry.name]),
            new Set(["view", "view.entry", "proposeEdits.entry", "proposeEdits.entry.new"]),
        );
    });

    test("it passes through unrecognized permissions", async () => {
        assertSetEquals(
            await getAllRequiredPermissions(["foobar-permission"]),
            new Set(["foobar-permission"]),
        );
    });
});

group("determineCondition()", () => {
    test("no permissions needed", () => {
        assertEquals(
            determineCondition(
                // If the user doesn't need any permissions:
                new Set(),
                // regardless of what grants they have:
                [],
            ), // Then they always meet the requirements:
            Always,
        );
    });

    test("no overlap", () => {
        assertEquals(
            determineCondition(
                // If the user needs these permissions:
                new Set(["foo.bar"]),
                // And has these conditional grants:
                [new PermissionGrant(Always, ["bar", "something.else"])],
            ), // Then there is no possible condition under which they have permission:
            undefined,
        );
    });

    test("two perms, one grant", () => {
        assertEquals(
            determineCondition(
                // If the user needs these permissions:
                new Set(["create", "edit.andSave"]),
                // And has these conditional grants:
                [
                    new PermissionGrant(Always, ["foobar"]),
                    new PermissionGrant(new TestCondition("123"), ["other", "edit"]),
                    new PermissionGrant(IfLoggedIn, ["x", "create", "edit*"]),
                ],
            ), // Then they have permission if any only if they are logged in:
            IfLoggedIn,
        );
    });

    test("two perms, two grants", () => {
        assertEquals(
            determineCondition(
                // If the user needs these permissions:
                new Set(["create", "edit.andSave"]),
                // And has these conditional grants:
                [
                    new PermissionGrant(Always, ["foobar"]),
                    new PermissionGrant(new TestCondition("123"), ["edit*"]),
                    new PermissionGrant(IfLoggedIn, ["create"]),
                ],
            ), // Then they have permission if both grant 2 and grant 3 match:
            new AllOfCondition([
                // Permissions get sorted alphabetically, so the "create if logged in" will be first:
                IfLoggedIn,
                new TestCondition("123"),
            ]),
        );
    });

    test("need A or (B and C)", () => {
        const A = new PermissionGrant(new TestCondition("A"), ["p1", "p2"]);
        const B = new PermissionGrant(new TestCondition("B"), ["p1"]);
        const C = new PermissionGrant(new TestCondition("C"), ["p2"]);
        assertEquals(
            determineCondition(
                // If the user needs these permissions:
                new Set(["p1", "p2"]),
                // And has these conditional grants:
                [A, B, C],
            ), // Then they have permission if they have A or (B and C)
            new OneOfCondition([
                A.condition,
                new AllOfCondition([B.condition, C.condition]),
            ]),
        );
    });
});

group("makeCloseableTransactionOnDemand()", () => {
    test("it can create a transaction that gets closed later.", async () => {
        const { getTx, closeTx } = makeCloseableTransactionOnDemand();
        const tx = await getTx();
        // Confirm that the transaction is open and working:
        const result = await tx.queryOne(C`RETURN 123 AS x`.givesShape({ x: Field.Int }));
        assertEquals(result.x, 123);
        // Close it:
        await closeTx();
        // Now confirm that the transaction is closed. Running a query should give an error:
        assertRejects(() => tx.queryOne(C`RETURN 123 AS x`.givesShape({ x: Field.Int })));
    });
});
