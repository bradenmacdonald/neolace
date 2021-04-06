import { ApiError, InvalidFieldValue, InvalidRequest, InvalidRequestReason } from "neolace-api";
import { suite, test, assert, beforeEach, setTestIsolation, getClient, assertRejects, assertRejectsWith } from "../../lib/intern-tests";

suite(__filename, () => {

    suite("Create a user account", () => {

        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        test("can create an account with only an email, no other information", async () => {
            
            const client = getClient();

            const result = await client.registerHumanUser({email: "jamie456@example.com"});

            assert.deepStrictEqual(result, {
                isBot: false,
                fullName: null,
                username: "jamie456",
            });

        });

        test("can create an account an email and full name and username", async () => {
            
            const client = getClient();

            const result = await client.registerHumanUser({
                email: "jamie456@example.com",
                username: "JamieRocks",
                fullName: "Jamie Rockland",
            });

            assert.deepStrictEqual(result, {
                isBot: false,
                fullName: "Jamie Rockland",
                username: "JamieRocks",
            });

        });

        test("cannot create two accounts with the same email address", async () => {
            
            const client = getClient();

            
            await client.registerHumanUser({email: "jamie456@example.com"});
            const err = await assertRejects(
                client.registerHumanUser({email: "jamie456@example.com"}),
            );
            assert.instanceOf(err, InvalidRequest);
            assert.strictEqual(err.reason, InvalidRequestReason.Email_already_registered);
            assert.equal(err.message, "A user account is already registered with that email address.");
        });

        test("returns an appropriate error with invalid input", async () => {

            const client = getClient();

            const err = await assertRejects(
                client.registerHumanUser({email: "foobar"}),
            );
            assert.instanceOf(err, InvalidFieldValue);
            assert.strictEqual(err.reason, InvalidRequestReason.Invalid_field_value);
            assert.deepStrictEqual(err.fields, ["email"]);
            assert.equal(err.message, `"email" must be a valid email`);
        });

    });
});
