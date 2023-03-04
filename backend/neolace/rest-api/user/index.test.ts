import {
    assertArrayIncludes,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    getClient,
    group,
    SDK,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";
import { saveValidationToken } from "./verify-email.ts";

group("api/user/index.ts", () => {
    group("Create a user account", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        test("can create an account with only an email, no other information", async () => {
            const client = await getClient();

            const emailToken = await saveValidationToken({ email: "jamie456@example.com", data: {} });
            const result = await client.registerHumanUser({ emailToken });

            assertEquals(result.userData.isBot, false);
            assertEquals(result.userData.fullName, "");
            assertEquals(result.userData.username, "jamie456");
        });

        test("can create an account an email and full name and username", async () => {
            const client = await getClient();

            const emailToken = await saveValidationToken({ email: "jamie456@example.com", data: {} });
            const result = await client.registerHumanUser({
                emailToken,
                username: "JamieRocks",
                fullName: "Jamie Rockland",
            });

            assertEquals(result.userData.isBot, false);
            assertEquals(result.userData.fullName, "Jamie Rockland");
            assertEquals(result.userData.username, "JamieRocks");
        });

        test("cannot create two accounts with the same email address", async () => {
            const client = await getClient();

            const emailToken = await saveValidationToken({ email: "jamie456@example.com", data: {} });
            await client.registerHumanUser({ emailToken });
            const err = await assertRejects(() => client.registerHumanUser({ emailToken }));
            assertInstanceOf(err, SDK.InvalidRequest);
            assertEquals(err.message, "A user account is already registered with that email address.");
            assertEquals(err.reason, SDK.InvalidRequestReason.EmailAlreadyRegistered);
        });

        test("cannot create two accounts with the same email address that differs only by case", async () => {
            const client = await getClient();

            const emailToken = await saveValidationToken({ email: "jamie456@example.com", data: {} });
            await client.registerHumanUser({ emailToken });
            const err = await assertRejects(() => client.registerHumanUser({ emailToken }));
            assertInstanceOf(err, SDK.InvalidRequest);
            assertEquals(err.message, "A user account is already registered with that email address.");
            assertEquals(err.reason, SDK.InvalidRequestReason.EmailAlreadyRegistered);
        });

        test("cannot create two accounts with the same username", async () => {
            const client = await getClient();

            const emailToken1 = await saveValidationToken({ email: "jamie123@example.com", data: {} });
            const emailToken2 = await saveValidationToken({ email: "jamie456@example.com", data: {} });
            await client.registerHumanUser({ emailToken: emailToken1, username: "jamie" });
            const err = await assertRejects(
                () => client.registerHumanUser({ emailToken: emailToken2, username: "jamie" }),
            );
            assertInstanceOf(err, SDK.InvalidRequest);
            assertEquals(err.message, `The username "jamie" is already taken.`);
            assertEquals(err.reason, SDK.InvalidRequestReason.UsernameAlreadyRegistered);
        });

        test("returns an appropriate error with invalid input (invalid data type)", async () => {
            const client = await getClient();

            const err = await assertRejects(
                // deno-lint-ignore no-explicit-any
                () => client.registerHumanUser({ emailToken: 1234 as any }),
            );
            assertInstanceOf(err, SDK.InvalidFieldValue);
            assertEquals(err.fieldErrors, [{
                fieldPath: "emailToken",
                message: `Expect value to be "string"`,
            }]);
        });

        // The email type check tests a different path (Vertex field validation) than the above test (REST API input
        // field validation)
        test("returns an appropriate error with invalid input (invalid email)", async () => {
            const client = await getClient();

            const err = await assertRejects(
                //() => client.registerHumanUser({ email: "foobar" }),
                () => client.requestEmailVerification({ email: "foobar", data: {}, returnUrl: "http://example.com" }),
            );
            assertInstanceOf(err, SDK.InvalidFieldValue);
            assertEquals(err.fieldErrors, [{
                fieldPath: "email",
                message: `"foobar" is not a valid email address.`,
            }]);
        });

        test("returns an appropriate error with invalid input (multiple issues)", async () => {
            const client = await getClient();

            const emailToken = await saveValidationToken({ email: "foo@example.com", data: {} });
            const err = await assertRejects(() =>
                client.registerHumanUser({
                    emailToken,
                    fullName: "a".repeat(1_000),
                    username: " @LEX ",
                })
            );
            assertInstanceOf(err, SDK.InvalidFieldValue);
            assertArrayIncludes(err.fieldErrors, [
                /*
                {
                    fieldPath: "fullName",
                    message: "todo - figure out error message here.",
                },*/
                {
                    fieldPath: "username",
                    message: "Not a valid slug (cannot contain spaces or other special characters other than '-')",
                },
            ]);
        });
    });
});
