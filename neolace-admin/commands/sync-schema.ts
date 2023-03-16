import { getApiClientFromEnv, SDK } from "../deps.ts";
import { yamlToSchema } from "../lib/schema-yaml.ts";

/**
 * Import a site's schema from a human-readable YAML string. This will overwrite the site's current schema so use with
 * caution.
 */
export async function syncSchema(
    siteKey: string,
    schemaString: string,
): Promise<SDK.SiteSchemaData> {
    const client = await getApiClientFromEnv();
    const schema = yamlToSchema(schemaString);
    await client.replaceSiteSchema(schema, { siteKey });
    return schema;
}
