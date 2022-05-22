import type { NextApiRequest, NextApiResponse } from "next";
import { client } from "lib/api-client";

/**
 * This page can be used to confirm that the frontend is working.
 */
const getFrontendHealth = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.status(405).json({ error: "Invalid method requested. Use GET." });
    }
    let backendWorking = false;
    try {
        await client.checkHealth();
        backendWorking = true;
    } catch { /* Ignore errors */ }
    res.status(200).json({
        frontendWorking: true,
        backendWorking,
    });
};
export default getFrontendHealth;
