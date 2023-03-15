/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { equal } from "std/testing/asserts.ts";
import {
    EditList,
    EntryTypeColor,
    EntryTypeData,
    PropertyData,
    PropertyMode,
    PropertyType,
    SiteSchemaData,
    UpdateProperty,
} from "neolace/deps/neolace-sdk.ts";
import { C, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Type } from "neolace/deps/computed-types.ts";
import { Site } from "neolace/core/Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { features } from "neolace/core/entry/features/all-features.ts";

export async function getCurrentSchema(tx: WrappedTransaction, siteId: VNID): Promise<SiteSchemaData> {
    const result: SiteSchemaData = {
        entryTypes: {},
        properties: {},
    };
    const siteFilter = C`(@this)-[:FOR_SITE]->(:${Site} {id: ${siteId}})`;

    const entryTypes = await tx.pull(
        EntryType,
        (et) => et.key.name.description.keyPrefix.color.colorCustom.abbreviation,
        { where: siteFilter },
    );

    entryTypes.forEach((et) => {
        result.entryTypes[et.key] = {
            key: et.key,
            name: et.name,
            description: et.description,
            keyPrefix: et.keyPrefix,
            color: et.color as EntryTypeColor ?? EntryTypeColor.Default,
            abbreviation: et.abbreviation ?? "",
            enabledFeatures: {/* set below by contributeToSchema() */},
            ...(et.color === EntryTypeColor.Custom && typeof et.colorCustom === "string"
                ? { colorCustom: et.colorCustom }
                : {}),
        };
    });

    // For each feature that's enabled for a given entry type, update the schema with that feature's configuration
    await Promise.all(
        features.map((feature) => feature.contributeToSchema(result, tx, siteId)),
    );

    // Load properties:
    const properties = await tx.pull(
        Property,
        (p) =>
            p
                .key
                .name
                .description
                .type
                .mode
                .valueConstraint
                .default
                .inheritable
                .enableSlots
                .standardURL
                .rank
                .editNote
                .displayAs
                .appliesTo((et) => et.key)
                .parentProperties((pp) => pp.key),
        { where: siteFilter },
    );
    properties.forEach((p) => {
        // Sort the "applies to [entry types]" array to make test comparisons easier/stable.
        const appliesToSorted = p.appliesTo.slice().sort((a, b) => a.key.localeCompare(b.key));
        result.properties[p.key] = {
            key: p.key,
            name: p.name,
            description: p.description,
            type: p.type as PropertyType,
            mode: p.mode as PropertyMode,
            rank: p.rank,
            appliesTo: appliesToSorted.map((at) => ({ entryTypeKey: at.key })),
            ...(p.parentProperties.length > 0 && { isA: p.parentProperties.map((pp) => pp.key).sort() }),
            ...(p.default && { default: p.default }),
            ...(p.inheritable && { inheritable: p.inheritable }),
            ...(p.enableSlots && { enableSlots: p.enableSlots }),
            ...(p.valueConstraint && { valueConstraint: p.valueConstraint }),
            ...(p.editNote && { editNote: p.editNote }),
            ...(p.standardURL && { standardURL: p.standardURL }),
            ...(p.displayAs && { displayAs: p.displayAs }),
        };
    });

    return Object.freeze(result);
}

/** Get all elements of Set A that are not in Set B */
function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const difference = new Set(setA);
    for (const elem of setB) {
        difference.delete(elem);
    }
    return difference;
}

export function diffSchema(
    oldSchema: Readonly<SiteSchemaData>,
    newSchema: Readonly<SiteSchemaData>,
): { edits: EditList } {
    const result: { edits: EditList } = { edits: [] };

    // Do some quick validation of the schema IDs:
    for (
        const [key, val] of [
            ...Object.entries(oldSchema.entryTypes),
            ...Object.entries(oldSchema.properties),
            ...Object.entries(newSchema.entryTypes),
            ...Object.entries(newSchema.properties),
        ]
    ) {
        if (val.key !== key) {
            throw new Error(
                `Invalid schema: the key of an entry type / property (${key}) doesn't match its schema key (${key}).`,
            );
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    { // Entry Types:
        const oldEntryTypeKeys = new Set(Object.keys(oldSchema.entryTypes));
        const newEntryTypeKeys = new Set(Object.keys(newSchema.entryTypes));

        // Delete any removed EntryTypes:
        const deletedEntryTypeKeys = difference(oldEntryTypeKeys, newEntryTypeKeys);
        for (const deletedTypeKey of deletedEntryTypeKeys) {
            result.edits.push({
                code: "DeleteEntryType",
                data: {
                    entryTypeKey: deletedTypeKey,
                },
            });
        }

        // Create any newly added EntryTypes:
        const addedEntryTypeKeys = difference(newEntryTypeKeys, oldEntryTypeKeys);
        for (const newKey of addedEntryTypeKeys) {
            result.edits.push({
                code: "CreateEntryType",
                data: {
                    key: newSchema.entryTypes[newKey].key,
                    name: newSchema.entryTypes[newKey].name,
                },
            });
        }
        // Set properties on existing and new EntryTypes
        for (const entryTypeKey of newEntryTypeKeys) {
            const oldET: EntryTypeData | undefined = oldSchema.entryTypes[entryTypeKey];
            const newET = newSchema.entryTypes[entryTypeKey];
            // deno-lint-ignore no-explicit-any
            const changes: any = {};
            for (
                const field of [
                    "name",
                    "description",
                    "keyPrefix",
                    "color",
                    "colorCustom",
                    "abbreviation",
                ] as const
            ) {
                if (field === "name" && addedEntryTypeKeys.has(entryTypeKey)) {
                    continue; // Name was already set during the Create step, so skip that property
                }
                if (newET[field] !== oldET?.[field]) {
                    changes[field] = newET[field];
                }
            }
            if (Object.keys(changes).length > 0) {
                result.edits.push({
                    code: "UpdateEntryType",
                    data: {
                        key: entryTypeKey,
                        ...changes,
                    },
                });
            }
            // Check for differences to the features enabled for this entry type:
            features.forEach(({ featureType }) => {
                const oldFeature = oldET?.enabledFeatures[featureType];
                const newFeature = newET.enabledFeatures[featureType];
                if (oldFeature && newFeature === undefined) {
                    // This feature has been disabled:
                    result.edits.push({
                        code: "UpdateEntryTypeFeature",
                        data: { entryTypeKey, feature: { featureType, enabled: false } },
                    });
                } else if (newFeature && !equal(oldFeature, newFeature)) {
                    // This feature has been enabled or modified:
                    result.edits.push({
                        code: "UpdateEntryTypeFeature",
                        data: {
                            entryTypeKey,
                            // deno-lint-ignore no-explicit-any
                            feature: { featureType, enabled: true, config: newFeature as any },
                        },
                    });
                }
            });
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    { // Properties:
        const oldPropertyKeys = new Set(Object.keys(oldSchema.properties));
        const newPropertyKeys = new Set(Object.keys(newSchema.properties));

        // Delete any removed Properties:
        const deletedPropertyIds = difference(oldPropertyKeys, newPropertyKeys);
        for (const propKey of deletedPropertyIds) {
            result.edits.push({ code: "DeleteProperty", data: { key: propKey } });
        }

        // Create any newly added Properties:
        const addedPropIds = difference(newPropertyKeys, oldPropertyKeys);
        for (const newKey of addedPropIds) {
            result.edits.push({ code: "CreateProperty", data: newSchema.properties[newKey] });
        }
        // Update any already-existing properties that may have changed.
        for (const propKey of oldPropertyKeys) {
            if (!newPropertyKeys.has(propKey)) {
                continue; // This property was deleted
            }
            const oldProp: PropertyData = oldSchema.properties[propKey];
            const newProp: PropertyData = newSchema.properties[propKey];
            if (newProp.type !== oldProp.type) {
                // The type has changed - need to delete and re-create this property
                result.edits.push({ code: "DeleteProperty", data: { key: propKey } });
                result.edits.push({ code: "CreateProperty", data: newSchema.properties[propKey] });
                continue;
            }

            const changes: Partial<Type<typeof UpdateProperty["dataSchema"]>> = {};

            // Handle appliesTo
            const newAppliesToSorted = newProp.appliesTo.sort((a, b) =>
                // deno-lint-ignore no-explicit-any
                (a.entryTypeKey as any) - (b.entryTypeKey as any)
            );
            const oldAppliesToSorted = oldProp.appliesTo.sort((a, b) =>
                // deno-lint-ignore no-explicit-any
                (a.entryTypeKey as any) - (b.entryTypeKey as any)
            );
            if (!equal(newAppliesToSorted, oldAppliesToSorted)) {
                changes.appliesTo = newProp.appliesTo;
            }

            if (!equal(newProp.isA, oldProp.isA)) {
                changes.isA = newProp.isA;
            }

            for (
                const key of [
                    "name",
                    "description",
                    "mode",
                    "valueConstraint",
                    "default",
                    "standardURL",
                    "rank",
                    "editNote",
                    "displayAs",
                    "inheritable",
                    "enableSlots",
                ] as const
            ) {
                if (newProp[key] !== oldProp[key]) {
                    // deno-lint-ignore no-explicit-any
                    (changes as any)[key] = newProp[key];
                }
            }
            if (Object.keys(changes).length > 0) {
                result.edits.push({
                    code: "UpdateProperty",
                    data: { key: propKey, ...changes },
                });
            }
        }
    }

    return result;
}
