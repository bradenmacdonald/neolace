import { getLogger } from "std/log/mod.ts";
import * as CSV from "std/encoding/csv.ts";
import { TextLineStream } from "std/streams/text_line_stream.ts";

import * as SDK from "../src/index.ts";

const moduleName = "neolace-sdk";
const fmtObj = typeof Deno?.inspect === "function" ? Deno.inspect : JSON.stringify;
const fmt = (msg: unknown) => typeof msg === "string" ? msg : fmtObj(msg);
const log = {
    warning(...args: unknown[]) {
        getLogger(moduleName).warning(() => args.map((a) => fmt(a)).join(" "));
    },
    debug(...args: unknown[]) {
        getLogger(moduleName).debug(() => args.map((a) => fmt(a)).join(" "));
    },
    info(...args: unknown[]) {
        getLogger(moduleName).info(() => args.map((a) => fmt(a)).join(" "));
    },
    error(...args: unknown[]) {
        getLogger(moduleName).error(() => args.map((a) => fmt(a)).join(" "));
    },
    critical(...args: unknown[]) {
        getLogger(moduleName).critical(() => args.map((a) => fmt(a)).join(" "));
    },
};

interface Actions {
    upsert(
        entryKey: string,
        details: {
            entryTypeKey: string;
            name?: string;
            description?: string;
            /** Skip update: if the entry with the given key already exists, don't change its 'name' or 'description' */
            skipUpdate?: boolean;
        },
    ): void;
    setPropValues(
        entryKey: string,
        propValues: {
            [propKey: string]:
                | null
                | string
                | ({ valueExpression: string; note?: string | undefined; slot?: string | undefined }[]);
        },
    ): void;
    setRelationshipProp(
        entryKey: string,
        propertyKey: string,
        to:
            | { entryKey: string }
            | ({
                entryWith: { entryId: SDK.VNID } | { entryKey: string };
                note?: string;
                slot?: string;
            }[]),
    ): void;
}
type ColHeaders = ReadonlyArray<string>;
interface ActionFn<H extends ColHeaders> {
    (data: { [col in (H extends ReadonlyArray<infer U> ? U : never)]: string }, actions: Actions): void;
}

/** Read a file using a stream that will give on line at a time */
async function streamFileLines(filePath: string): Promise<ReadableStreamDefaultReader<string>> {
    const fileHandle = await Deno.open(filePath);
    const stream = fileHandle.readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream());
    return stream.getReader();
}

async function countLinesInFile(filePath: string): Promise<number> {
    let numLines = 0;
    const lineCountStream = await streamFileLines(filePath);
    while (true) {
        const { done } = await lineCountStream.read();
        if (done) break;
        else numLines++;
    }
    return numLines;
}

/** Import a CSV file that has a header. Uses streaming and chunking to support files of any size. */
export async function importCsvFile<H extends ColHeaders>(
    filePath: string,
    rowActions: ActionFn<H>,
    client: SDK.NeolaceApiClient,
    bulkParams: Parameters<SDK.NeolaceApiClient["pushBulkEdits"]>[1],
) {
    let firstLine: string | undefined;
    const chunkSize = 200;
    const numChunks = Math.ceil(await countLinesInFile(filePath) / chunkSize);
    let numChunksRead = 0;
    const reader = await streamFileLines(filePath);

    let buffer = "";
    let bufferSize = 0;

    while (true) {
        // Read a line of the file, one line at a time:
        const { done, value: line } = await reader.read();
        if (done) break;
        if (line.trim() === "") continue;
        if (!firstLine) {
            log.debug("Importing CSV with first line:", line);
            firstLine = line;
            buffer = line + "\n";
        } else {
            buffer += line + "\n";
            bufferSize++;
            if (bufferSize == chunkSize) {
                const parsedLines = CSV.parse(buffer, { skipFirstRow: true }) as Record<string, string>[];
                numChunksRead++;
                log.debug("Processing CSV chunk", numChunksRead, "of", numChunks);
                await importCsvChunk(parsedLines, rowActions, client, bulkParams);
                buffer = firstLine + "\n";
                bufferSize = 0;
            }
        }
    }
    if (bufferSize > 0) {
        const parsedLines = CSV.parse(buffer, { skipFirstRow: true }) as Record<string, string>[];
        await importCsvChunk(parsedLines, rowActions, client, bulkParams);
    }
}

async function importCsvChunk<H extends ColHeaders>(
    dataLines: { [col: string]: string }[],
    rowActions: ActionFn<H>,
    client: SDK.NeolaceApiClient,
    bulkParams: Parameters<SDK.NeolaceApiClient["pushBulkEdits"]>[1],
) {
    const edits: SDK.AnyBulkEdit[] = [];
    const actions: Actions = {
        // Upsert an entry baesd on the given entryKey
        upsert(entryKey, detail) {
            edits.push({
                code: "UpsertEntryByKey",
                data: {
                    where: { entryKey, entryTypeKey: detail.entryTypeKey },
                    [detail.skipUpdate ? "setOnCreate" : "set"]: { name: detail.name, description: detail.description },
                },
            });
        },
        setPropValues(entryKey, propValues) {
            const rows: {
                propertyKey: string;
                facts: { valueExpression: string; note?: string | undefined; slot?: string | undefined }[];
            }[] = [];
            Object.entries(propValues).forEach(([propertyKey, val]) => {
                if (val === null) {
                    // Un-set this property:
                    rows.push({ propertyKey, facts: [] });
                } else if (typeof val === "string") {
                    // Set this property to a single value:
                    rows.push({ propertyKey, facts: [{ valueExpression: val }] });
                } else {
                    // Set this property to multiple values, or a single value with note or other details.
                    rows.push({ propertyKey, facts: val });
                }
            });
            edits.push({
                code: "SetPropertyFacts",
                data: {
                    entryWith: { entryKey },
                    set: rows,
                },
            });
        },
        setRelationshipProp(
            entryKey: string,
            propertyKey: string,
            to:
                | { entryKey: string }
                | ({
                    entryWith: { entryId: SDK.VNID } | { entryKey: string };
                    note?: string;
                    slot?: string;
                }[]),
        ) {
            edits.push({
                code: "SetRelationships",
                data: {
                    entryWith: { entryKey },
                    set: [{
                        propertyKey,
                        toEntries: (
                            typeof to === "object" && "entryKey" in to ? [{ entryWith: { entryKey: to.entryKey } }] : to
                        ),
                    }],
                },
            });
        },
    };
    for (const line of dataLines) {
        // deno-lint-ignore no-explicit-any
        rowActions(line as any, actions);
    }
    // Submit the edits:
    try {
        log.debug("Submitting", edits.length, "bulk edits");
        await client.pushBulkEdits(edits, bulkParams);
    } catch (err) {
        // An error occurred. Try again line by line until we find the failure.
        if (err instanceof SDK.InvalidRequest) {
            log.error(`An error occurred (${err.message}). Trying to isolate the line that caused the error....`);
            for (const edit of edits) {
                try {
                    await client.pushBulkEdits([edit], bulkParams);
                } catch (err) {
                    log.error(`Got an error with this edit: `, edit, `\nThe error was: `, err);
                    throw err;
                }
            }
        } else {
            throw err;
        }
    }
}
