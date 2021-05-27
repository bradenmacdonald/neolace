import {
    C,
    VNodeType,
    VirtualPropType,
    defaultUpdateFor,
    defaultCreateFor,
    defaultDeleteFor,
    DerivedProperty,
    Field,
} from "vertex-framework";
import { config } from "../app/config";
import { TechDbEntryRef as TechDbEntry } from "../core/entry/Entry";
import { DataFile } from "./DataFile";


@VNodeType.declare
export class Image extends VNodeType {
    static label = "Image";
    static readonly properties = {
        ...VNodeType.properties,
        slugId: Field.Slug,
        name: Field.String,
        description: Field.NullOr.String.Check(desc => desc.max(5_000)),
        //sourceUrl: Field.NullOr.String,
        //licenseDetails: Field.NullOr.String.Check(ld => ld.max(5_000)),
        imageType: Field.String.Check(it => it.valid("photo", "screenshot", "chart", "drawing")),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        /** Things depicted or explained by this image */
        RELATES_TO: {
            to: [TechDbEntry],
            properties: {weight: Field.Int.Check(w => w.min(1).max(12))},
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        HAS_DATA: {
            to: [DataFile],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });
    static readonly virtualProperties = VNodeType.hasVirtualProperties({
        dataFile: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${Image.rel.HAS_DATA}]->(@target:${DataFile})`,
            target: DataFile,
        },
    });
    static readonly derivedProperties = VNodeType.hasDerivedProperties({
        imageUrl,
    });
}


/**
 * Get the full public path to view/download this image
 */
export function imageUrl(): DerivedProperty<string> { return DerivedProperty.make(
    Image,
    img => img.dataFile(df => df.sha256Hash),
    data => {
        if (data.dataFile === null) { throw new Error(`Image is unexpectedly missing required DataFile.`); }
        return `${config.objStorePublicUrlPrefix}/${data.dataFile.sha256Hash}`;
    },
);}


// Action to make changes to an existing Image entry:
export const UpdateImage = defaultUpdateFor(Image, i => i.slugId.name.description.imageType, {
    otherUpdates: async (args: {
        relatesTo?: {key: string, weight: number}[],
        /** SHA-256 hash of the data file for this image (required) */
        dataHash?: string
    }, tx, nodeSnapshot) => {
        const id = nodeSnapshot.id;
        const previousValues: Partial<typeof args> = {};

        // Relationship updates:
        if (args.relatesTo !== undefined) {
            previousValues.relatesTo = (await tx.updateToManyRelationship({
                from: [Image, id],
                rel: Image.rel.RELATES_TO,
                to: args.relatesTo,
            })).prevTo as any;
        }

        if (args.dataHash) {
            const result = await tx.query(C`
                MATCH (img:${Image} {id: ${id}})
                WITH img
                    MATCH (df:${DataFile} {sha256Hash: ${args.dataHash}})
                    MERGE (img)-[:${Image.rel.HAS_DATA}]->(df)
                WITH img, df
                    MATCH (img)-[oldRel:${Image.rel.HAS_DATA}]->(old:DataFile)
                    WHERE old <> df
                    DELETE oldRel
            `.RETURN({old: Field.VNode(DataFile)}));
            if (result.length) {
                previousValues.dataHash = result[result.length - 1].old.sha256Hash;
            }
        }

        return {previousValues};
    },
});

/** Create a new "Image" entry in the TechDB */
export const CreateImage = defaultCreateFor(Image, i => i.slugId.name.description.imageType, UpdateImage);

export const DeleteImage = defaultDeleteFor(Image);
