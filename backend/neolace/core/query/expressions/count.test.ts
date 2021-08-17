import { group, test, setTestIsolation } from "neolace/lib/tests.ts";
// import { Count } from "./count.ts";

group(import.meta, () => {

    setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);

    group("count()", () => {

        test(`It gives an error with non-countable values`, async () => {
            // TODO
        });

    });
});
