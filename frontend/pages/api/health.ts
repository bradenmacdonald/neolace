/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { client } from "lib/sdk";

/**
 * This page can be used to confirm that the frontend is working.
 */
const getFrontendHealth = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.status(405).json({ error: "Invalid method requested. Use GET." });
    }
    // Check if the backend is working, but time out after 2 seconds.
    let backendWorking = false;
    await Promise.race([
        client.checkHealth().then(
            () => backendWorking = true,
            () =>{ /* Supress any errors */ }
        ),
        new Promise(timedOut => setTimeout(timedOut, 2_000)),
    ]);
    res.status(200).json({
        frontendWorking: true,
        backendWorking,
    });
};
export default getFrontendHealth;
