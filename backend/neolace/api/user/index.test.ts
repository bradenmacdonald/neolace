import * as api from "neolace-api";
import { suite, test, assert, beforeEach, setTestIsolation, getClient } from "../../lib/intern-tests";

suite(__filename, () => {

    suite("Create a user account", () => {

        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        test("can create an account with only an email, no other information", async () => {
            
            //const result = await api.Tech
        });

    });
});
