/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */

/**
 * Wipe the dev database and reset it to the PlantDB example
 */
import { VNID } from "neolace/deps/vertex-framework.ts";
import { shutdown } from "neolace/app/shutdown.ts";
import { generateTestFixtures } from "neolace/lib/tests-default-data.ts";
import { authClient } from "neolace/core/authn-client.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateUser } from "neolace/core/User.ts";

// First reset the database, apply migrations, and create the same PlantDB content used for tests.
await generateTestFixtures();

// Create an admin user that can be used for development:
const userId = VNID(); // Their new internal user ID.
const authnData = await authClient.createUser({ username: userId, password: "neolace" });
const graph = await getGraph();
await graph.runAsSystem(CreateUser({
    id: userId,
    authnId: authnData.accountId,
    email: "admin@example.com",
    fullName: "Developer Admin",
    username: "admin",
}));

shutdown();
