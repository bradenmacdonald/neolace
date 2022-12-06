import type { NextApiRequest, NextApiResponse } from "next";
import { client } from "lib/api";

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
