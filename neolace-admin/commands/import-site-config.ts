import { deepMerge, getApiClientFromEnv, InvalidUsageError, log, parseArgs, parseYaml, readAll, SDK } from "../deps.ts";

type SiteConfigData = Omit<SDK.schemas.Type<typeof SDK.CreateOrUpdateSiteSchema>, "create" | "createOnly"> & {
    key?: string;
};

/**
 * Import a site's configuration from a human-readable YAML string.
 * This will overwrite the site's current configuration so use with caution.
 */
async function importSiteConfiguration(
    siteKey: string,
    siteConfigData: SiteConfigData,
    /** Allow creating a new site on this realm */
    createSite?: boolean,
    /** Fail if the site already exists. */
    onlyCreateSite?: boolean,
): Promise<void> {
    const client = await getApiClientFromEnv();
    const { key, ...data } = siteConfigData;
    if (key === "") {
        // It's fine if there is no site key in the export, though it's safer to include it to ensure we don't
        // accidentally import one site's data into another site.
    } else if (key !== siteKey) {
        throw new Error(`The YAML data has key: "${key}" which doesn't match specified site key "${siteKey}".`);
    }
    log.info("Updating configuration of site", siteKey);
    await client.createOrUpdateSite({
        ...data,
        create: createSite,
        createOnly: onlyCreateSite,
        siteKey,
    });
}

export const importSiteConfigCommand = {
    // usage: "",
    async run(args: string[]) {
        const flags = parseArgs(args, {
            boolean: ["create", "create-only"],
        });
        const [siteKey, ...fileNames] = flags._;
        if (!siteKey || typeof siteKey !== "string") {
            throw new InvalidUsageError();
        }
        let parsedConfig: SiteConfigData;
        if (fileNames.length > 0) {
            // Read from YAML files and merge them together:
            parsedConfig = {};
            for (const fileName of fileNames) {
                const thisFileParsed = parseYaml(await Deno.readTextFile(String(fileName))) as SiteConfigData;
                parsedConfig = deepMerge(parsedConfig, thisFileParsed);
            }
        } else {
            const stdinContent = await readAll(Deno.stdin);
            const siteConfigYaml = new TextDecoder().decode(stdinContent);
            parsedConfig = parseYaml(siteConfigYaml) as SiteConfigData;
        }
        // TODO: allow specifying a file instead of stdin, and if so allow specifying multiple files that get
        // merged together using deepMerge from deno std.
        await importSiteConfiguration(siteKey, parsedConfig, flags.create, flags["create-only"]);
    },
};
