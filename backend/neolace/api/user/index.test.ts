import {
    api,
    assertArrayIncludes,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    getClient,
    group,
    setTestIsolation,
    test,
} from "neolace/api/tests.ts";
import { saveValidationToken } from "./verify-email.ts";

group("index.ts", () => {
    group("Create a user account", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        test("can create an account with only an email, no other information", async () => {
            const client = await getClient();

            const emailToken = await saveValidationToken({ email: "jamie456@example.com", data: {} });
            const result = await client.registerHumanUser({ emailToken });

            assertEquals(result, {
                isBot: false,
                fullName: null,
                username: "jamie456",
            });
        });

        test("can create an account an email and full name and username", async () => {
            const client = await getClient();

            const result = await client.registerHumanUser({
                email: "jamie456@example.com",
                username: "JamieRocks",
                fullName: "Jamie Rockland",
            });

            assertEquals(result, {
                isBot: false,
                fullName: "Jamie Rockland",
                username: "JamieRocks",
            });
        });

        test("cannot create two accounts with the same email address", async () => {
            const client = await getClient();

            await client.registerHumanUser({ email: "jamie456@example.com" });
            await assertRejects(
                () => client.registerHumanUser({ email: "jamie456@example.com" }),
                (err: Error) => {
                    assertInstanceOf(err, api.InvalidRequest);
                    assertEquals(err.message, "A user account is already registered with that email address.");
                    assertEquals(err.reason, api.InvalidRequestReason.EmailAlreadyRegistered);
                },
            );
        });

        test("cannot create two accounts with the same email address that differs only by case", async () => {
            const client = await getClient();

            const emailToken = await saveValidationToken({ email: "jamie456@example.com", data: {} });
            await client.registerHumanUser({ emailToken });
            await assertRejects(
                () => client.registerHumanUser({ emailToken }),
                (err: Error) => {
                    assertInstanceOf(err, api.InvalidRequest);
                    assertEquals(err.message, "A user account is already registered with that email address.");
                    assertEquals(err.reason, api.InvalidRequestReason.EmailAlreadyRegistered);
                },
            );
        });

        test("cannot create two accounts with the same username", async () => {
            const client = await getClient();

            const emailToken1 = await saveValidationToken({ email: "jamie123@example.com", data: {} });
            const emailToken2 = await saveValidationToken({ email: "jamie456@example.com", data: {} });
            await client.registerHumanUser({ emailToken: emailToken1, username: "jamie" });
            await assertRejects(
                () => client.registerHumanUser({ emailToken: emailToken2, username: "jamie" }),
                (err: Error) => {
                    assertInstanceOf(err, api.InvalidRequest);
                    assertEquals(err.message, `The username "jamie" is already taken.`);
                    assertEquals(err.reason, api.InvalidRequestReason.UsernameAlreadyRegistered);
                },
            );
        });

        test("returns an appropriate error with invalid input (invalid data type)", async () => {
            const client = await getClient();

            await assertRejects(
                // deno-lint-ignore no-explicit-any
                () => client.registerHumanUser({ emailToken: 1234 as any }),
                (err: Error) => {
                    assertInstanceOf(err, api.InvalidFieldValue);
                    assertEquals(err.fieldErrors, [{
                        fieldPath: "emailToken",
                        message: `Expect value to be "string"`,
                    }]);
                },
            );
        });

        // The email type check tests a different path (Vertex field validation) than the above test (REST API input
        // field validation)
        test("returns an appropriate error with invalid input (invalid email)", async () => {
            const client = await getClient();

            await assertRejects(
                //() => client.registerHumanUser({ email: "foobar" }),
                () => client.requestEmailVerification({ email: "foobar", data: {}, returnUrl: "http://example.com" }),
                (err: Error) => {
                    assertInstanceOf(err, api.InvalidFieldValue);
                    assertEquals(err.fieldErrors, [{
                        fieldPath: "email",
                        message: `"foobar" is not a valid email address.`,
                    }]);
                },
            );
        });

        test("returns an appropriate error with invalid input (multiple issues)", async () => {
            const client = await getClient();

            const emailToken = await saveValidationToken({ email: "foo@example.com", data: {} });
            await assertRejects(
                () =>
                    client.registerHumanUser({
                        emailToken,
                        fullName: "a".repeat(1_000),
                        username: " @LEX ",
                    }),
                (err: Error) => {
                    assertInstanceOf(err, api.InvalidFieldValue);
                    assertArrayIncludes(err.fieldErrors, [
                        /*
                        {
                            fieldPath: "fullName",
                            message: "todo - figure out error message here.",
                        },*/
                        {
                            fieldPath: "username",
                            message:
                                "Not a valid slug (cannot contain spaces or other special characters other than '-')",
                        },
                    ]);
                },
            );
        });
    });
});
