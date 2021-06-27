import { group, test, setTestIsolation, getClient, assertEquals, assertThrowsAsync, api, assertArrayIncludes } from "neolace/api/tests.ts";


// deno-lint-ignore no-explicit-any
interface Constructor { new (...args: any[]): any; }

// A version of "assertThrowsAsync" with better typing. TODO: contribute to Deno std library.
function assertThrowsAsync2<T = void, EC extends Constructor = typeof Error>(
    fn: () => Promise<T>,
    ErrorClass?: EC,
    msgIncludes = "",
    msg?: string,
): Promise<InstanceType<EC>> {
      // deno-lint-ignore no-explicit-any
      return assertThrowsAsync(fn, ErrorClass, msgIncludes, msg) as any;
}




group(import.meta, () => {

    group("Create a user account", () => {

        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        test("can create an account with only an email, no other information", async () => {
            
            const client = await getClient();

            const result = await client.registerHumanUser({email: "jamie456@example.com"});

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

            
            await client.registerHumanUser({email: "jamie456@example.com"});
            const err = await assertThrowsAsync2(
                () => client.registerHumanUser({email: "jamie456@example.com"}),
                api.InvalidRequest,
                "A user account is already registered with that email address."
            );
            assertEquals(err.reason, api.InvalidRequestReason.EmailAlreadyRegistered);
        });

        test("cannot create two accounts with the same username", async () => {
            
            const client = await getClient();

            await client.registerHumanUser({email: "jamie123@example.com", username: "jamie"});
            const err = await assertThrowsAsync2(
                () => client.registerHumanUser({email: "jamie456@example.com", username: "jamie"}),
                api.InvalidRequest,
                `The username "jamie" is already taken.`,
            );
            assertEquals(err.reason, api.InvalidRequestReason.UsernameAlreadyRegistered);
        });

        test("returns an appropriate error with invalid input (invalid data type)", async () => {

            const client = await getClient();

            const err = await assertThrowsAsync2(
                // deno-lint-ignore no-explicit-any
                () => client.registerHumanUser({email: 1234 as any}),
                api.InvalidFieldValue,
            );
            assertEquals(err.fieldErrors, [{
                fieldPath: "email",
                message: `Expect value to be "string"`,
            }]);
        });

        // The email type check tests a different path (Vertex field validation) than the above test (REST API input
        // field validation)
        test("returns an appropriate error with invalid input (invalid email)", async () => {

            const client = await getClient();

            const err = await assertThrowsAsync2(
                () => client.registerHumanUser({email: "foobar"}),
                api.InvalidFieldValue,
            );
            assertEquals(err.fieldErrors, [{
                fieldPath: "email",
                message: `"foobar" is not a valid email address.`,
            }]);
        });

        test("returns an appropriate error with invalid input (multiple issues)", async () => {

            const client = await getClient();

            const err = await assertThrowsAsync2(
                () => client.registerHumanUser({email: "foo@example.com", fullName: "a".repeat(1_000), username: " @LEX "}),
                api.InvalidFieldValue,
            );
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
