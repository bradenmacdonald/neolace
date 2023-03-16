/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import { parseYaml, SDK, stringifyYaml } from "../deps.ts";

interface StreamlinedSchema {
    // In our export format, we use arrays, not maps, to avoid duplicating the keys. (The keys are in the value, so
    // it's redundant in the export format to also include them as keys of the YAML object; we just use a list.)
    entryTypes: SDK.EntryTypeData[];
    properties: SDK.PropertyData[];
}

/**
 * Convert a site's schema to a human-readable YAML string.
 * This function used to have to generate human-readable keys but now it's basically a pass-through to stringify()
 */
export function schemaToYaml(schema: SDK.SiteSchemaData): string {
    const schemaOut: StreamlinedSchema = {
        entryTypes: Object.values(schema.entryTypes),
        properties: Object.values(schema.properties),
    };
    // deno-lint-ignore no-explicit-any
    return stringifyYaml(schemaOut as any);
}

/**
 * Convert a schema from a human-readable YAML string back to the "normal" schema format.
 * This is the opposite of schemaToYaml()
 */
export function yamlToSchema(yamlString: string): SDK.SiteSchemaData {
    const schemaStreamlined = parseYaml(yamlString) as StreamlinedSchema;
    const schema: SDK.SiteSchemaData = {
        entryTypes: Object.fromEntries(schemaStreamlined.entryTypes.map((et) => [et.key, et])),
        properties: Object.fromEntries(schemaStreamlined.properties.map((p) => [p.key, p])),
    };
    // Set some defaults
    for (const entryType of Object.values(schema.entryTypes)) {
        if (entryType.color === undefined) {
            entryType.color = SDK.EntryTypeColor.Default;
        }
        if (entryType.abbreviation === undefined) {
            entryType.abbreviation = "";
        }
    }
    return schema;
}
