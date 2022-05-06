// deno-lint-ignore-file no-explicit-any
import { PasswordlessLoginResponse } from "./user.ts";
import * as errors from "./errors.ts";
import { AnySchemaEdit, SiteSchemaData } from "./schema/index.ts";
import { DraftData, CreateDraftSchema, DraftFileData, AnyContentEdit, GetDraftFlags } from "./edit/index.ts";
import { EntryData, EntrySummaryData, EvaluateLookupData, GetEntryFlags, PaginatedResultData } from "./content/index.ts";
import { SiteDetailsData, SiteHomePageData, SiteSearchConnectionData } from "./site/Site.ts";
import * as schemas from "./api-schemas.ts";
import { VNID } from "./types.ts";

const bin2hex = (binary: Uint8Array) => Array.from(binary).map((b) => b.toString(16).padStart(2, "0")).join("");

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
export interface Config {
    /** Path to the Neolace API server ("backend"). Should not end with a slash. e.g. "http://backend:5554" */
    basePath: string;
    fetchApi: typeof window["fetch"];
    /**
     * To authenticate with the API, you must either specify a token here (for a bot) or use getExtraHeadersForRequest
     * to pass a JWT (for human users).
     */
    authToken?: string;
    /** Default site ID to use for requests involving a specific site. This is the site's shortId, e.g. "technotes" */
    siteId?: string;
    getExtraHeadersForRequest?: (request: {method: HttpMethod, path: string}) => Promise<{[headerName: string]: string}>;
}

interface RequestArgs {
    method?: HttpMethod;
    data?: any;
    body?: BodyInit | null;
    headers?: Headers;
    redirect?: RequestRedirect;
    noAuth?: boolean;  // If true, the "Authorization" header/token will never be sent for this request. Avoids 401 errors when getting a new token if current token is invalid.
}

export class NeolaceApiClient {
    readonly basePath: string;
    readonly fetchApi: typeof window["fetch"];
    readonly authToken?: string;
    readonly siteId?: string;
    private readonly getExtraHeadersForRequest?: Config["getExtraHeadersForRequest"];

    constructor(config: Config) {
        this.basePath = config.basePath.replace(/\/+$/, "");
        this.fetchApi = config.fetchApi;
        this.authToken = config.authToken;
        this.siteId = config.siteId;
        this.getExtraHeadersForRequest = config.getExtraHeadersForRequest;
    }

    private async callRaw(path: string, _args: RequestArgs): Promise<Response> {
        const {data, ...args} = _args;
        if (args.headers === undefined) {
            args.headers = new Headers();
        }
        if (data) {
            if ("body" in args) { throw new Error("Not allowed to pass both .data and .body to API client's callRaw()"); }
            args.body = JSON.stringify(data);
            args.headers.set("Content-Type", "application/json");
        }
        if (args.method === undefined) {
            args.method = "GET";
        }
        if (this.getExtraHeadersForRequest) {
            for (const [key, value] of Object.entries(await this.getExtraHeadersForRequest({method: args.method, path}))) {
                args.headers.set(key, value);
            }
        }
        if (this.authToken) {
            args.headers.set("Authorization", `Bearer ${this.authToken}`);
        }
        if (args.noAuth) {
            args.headers.delete("Authorization");
        }
        return this.fetchApi(this.basePath + path, args);
    }

    /**
     * Make a call to the Neolace API and return the (JSON decoded) response
     */
    private async call(path: string, args?: RequestArgs): Promise<any> {
        let response;
        try {
            response = await this.callRaw(path, args ?? {});
        } catch (err) {
            throw new errors.ConnectionError(err.message);
        }
        if (response.status < 200 || response.status >= 300) {
            // See if we can decode the error details (JSON):
            let errorData: any = {};
            try {
                errorData = await response.json();
            } catch {/* couldn't parse this as JSON... */}

            if (!errorData.message) {
                errorData = {message: typeof errorData === "string" ? errorData : response.statusText};
            }

            if (response.status === 401) {
                throw new errors.NotAuthenticated();
            } else if (response.status === 403) {
                throw new errors.NotAuthorized(errorData.message);
            } else if (response.status === 400) {
                if (errorData.reason === errors.InvalidRequestReason.InvalidFieldValue && errorData.fieldErrors) {
                    throw new errors.InvalidFieldValue(errorData.fieldErrors);
                } else if (errorData.reason === errors.InvalidRequestReason.InvalidEdit) {
                    throw new errors.InvalidEdit(errorData.editCode, errorData.context, errorData.message);
                } else {
                    throw new errors.InvalidRequest(errorData.reason ?? errors.InvalidRequestReason.OtherReason, errorData.message);
                }
            } else if (response.status === 404) {
                throw new errors.NotFound(errorData.message);
            } else {
                throw new errors.ApiError(errorData.message, response.status);
            }
        }
        return await response.json();
    }

    /** Helper method to get a siteId, either as given to the current method or falling back to the default. */
    private getSiteId(methodOptions?: {siteId?: string}): string {
        if (methodOptions?.siteId) {
            return methodOptions.siteId;
        }
        if (!this.siteId) {
            throw new Error("siteId is required, either in the constructor or the API method.");
        }
        return this.siteId;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Health Check

    /* Check if the API server is working properly */
    public async checkHealth(): Promise<schemas.Type<typeof schemas.HealthCheckResponse>> {
        return await this.call("/health");
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // User API Methods

    /**
     * Get information about the currently logged-in user (or bot).
     *
     * Will throw a NotAuthenticated error if the user is not authenticated.
     */
    public async whoAmI(): Promise<schemas.Type<typeof schemas.UserDataResponse>> {
        return await this.call("/user/me");
    }

    /**
     * Register a new user account (human user)
     */
    public async registerHumanUser(data: {email: string, fullName?: string, username?: string}): Promise<schemas.Type<typeof schemas.UserDataResponse>> {
        return await this.call("/user", {method: "POST", data});
    }

    /**
     * Request passwordless login
     */
    public async requestPasswordlessLogin(data: {email: string}): Promise<PasswordlessLoginResponse> {
        return await this.call("/auth/request-login", {method: "POST", data, noAuth: true});
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Site API Methods

    public async getSite(criteria: {domain: string}): Promise<SiteDetailsData> {
        return await this.call(`/site/find?domain=${encodeURIComponent(criteria.domain)}`, {method: "GET"});
    }

    public async getSiteHomePage(options?: {siteId?: string}): Promise<SiteHomePageData> {
        const siteId = this.getSiteId(options);
        return await this.call(`/site/${siteId}/home`, {method: "GET"});
    }

    public async getSiteSchema(options?: {siteId?: string}): Promise<SiteSchemaData> {
        const siteId = this.getSiteId(options);
        return await this.call(`/site/${siteId}/schema`, {method: "GET"});
    }

    /** Replace a site's schema with the provided schema */
    public async replaceSiteSchema(schema: SiteSchemaData, options?: {siteId?: string}): Promise<void> {
        const siteId = this.getSiteId(options);
        await this.call(`/site/${siteId}/schema`, {method: "PUT", data: schema});
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Lookup API Methods

    public evaluateLookupExpression(expression: string, options: {entryKey?: VNID|string, siteId?: string} = {}): Promise<EvaluateLookupData> {
        const siteId = this.getSiteId(options);
        const query = new URLSearchParams({expression,});
        if (options.entryKey) {
            query.set("entryKey", options.entryKey);
        }
        return this.call(`/site/${siteId}/lookup?${query.toString()}`);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Draft API Methods

    private _parseDraft(rawDraft: any): DraftData {
        rawDraft.created = Date.parse(rawDraft.created);
        if (rawDraft.edits) {
            rawDraft.edits.forEach((e: any) => { e.timestamp = Date.parse(e.timestamp); })
        }
        return rawDraft;
    }

    public async getDraft<Flags extends readonly GetDraftFlags[]|undefined = undefined>(draftId: string, options?: {flags: Flags, siteId?: string}): Promise<ApplyFlags<typeof GetDraftFlags, Flags, DraftData>> {
        const siteId = this.getSiteId(options);
        return this._parseDraft(await this.call(`/site/${siteId}/draft/${draftId}` + (options?.flags?.length ? `?include=${options.flags.join(",")}` : ""), {method: "GET"})) as any;
    }

    public async createDraft(data: schemas.Type<typeof CreateDraftSchema>, options?: {siteId?: string}): Promise<DraftData> {
        const siteId = this.getSiteId(options);
        const result = await this.call(`/site/${siteId}/draft`, {method: "POST", data: {
            title: data.title,
            description: data.description,
            edits: data.edits ?? [],
        }});
        return this._parseDraft(result);
    }

    public async addEditToDraft(edit: AnySchemaEdit|AnyContentEdit, options: {draftId: string, siteId?: string}): Promise<void> {
        const siteId = this.getSiteId(options);
        await this.call(`/site/${siteId}/draft/${options.draftId}/edit`, {method: "POST", data: edit});
    }

    public async uploadFileToDraft(fileData: Blob, options: {draftId: string, siteId?: string}): Promise<DraftFileData> {
        const siteId = this.getSiteId(options);
        const hash = await crypto.subtle.digest("SHA-256", await fileData.arrayBuffer());
        const hashHex = bin2hex(new Uint8Array(hash));
        const formData = new FormData();
        formData.append('file', fileData);
        const result = await this.call(`/site/${siteId}/draft/${options.draftId}/file?sha256Hash=${hashHex}`, {
            method: "POST",
            body: formData,
        });
        return result;
    }

    public async acceptDraft(draftId: string, options?: {siteId?: string}): Promise<void> {
        const siteId = this.getSiteId(options);
        await this.call(`/site/${siteId}/draft/${draftId}/accept`, {method: "POST"});
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Entry API Methods

    public getEntry<Flags extends readonly GetEntryFlags[]|undefined = undefined>(key: string, options: {flags?: Flags, siteId?: string} = {}): Promise<ApplyFlags<typeof GetEntryFlags, Flags, EntryData>> {
        const siteId = this.getSiteId(options);
        return this.call(`/site/${siteId}/entry/${encodeURIComponent(key)}` + (options?.flags?.length ? `?include=${options.flags.join(",")}` : ""));
    }

    /**
     * Get a basic list of all entries on the site that the current user can view, optionally filtered by type.
     * 
     * This is a very simple API, and for performance reasons results are ordered by ID, not by name. Use the search API
     * via getSearchConnection for more flexible ways of retrieving the list of entries.
     */
    public async getEntries(options: {ofEntryType?: VNID, siteId?: string} = {}): Promise<{totalCount: number}&AsyncIterable<EntrySummaryData>> {
        const siteId = this.getSiteId(options);
        const firstPage: PaginatedResultData<EntrySummaryData> = await this.call(`/site/${siteId}/entry/` + (options.ofEntryType ? `?entryType=${options.ofEntryType}` : ""));
        let currentPage = firstPage;
        return {
            totalCount: firstPage.totalCount!,  // The first page always includes the total count
            [Symbol.asyncIterator]: () => ({
                next: async (): Promise<IteratorResult<EntrySummaryData>> => {
                    if (currentPage.values.length > 0) {
                        return {
                            done: false,
                            value: currentPage.values.shift()!,
                        };
                    } else if (currentPage.nextPageUrl) {
                        const nextUrl = new URL(currentPage.nextPageUrl);
                        currentPage = await this.call(nextUrl.pathname + nextUrl.search);
                        return {
                            done: false,
                            value: currentPage.values.shift()!,
                        };
                    } else {
                        return {done: true, value: undefined};
                    }
                },
            }),
        };
    }

    /**
     * Erase all entries on the site. This is dangerous! Mostly useful for development.
     */
    public async eraseAllEntriesDangerously(options: {confirm?: "danger", siteId?: string} = {}): Promise<void> {
        const siteId = this.getSiteId(options);
        await this.call(`/site/${siteId}/entry/?confirm=${options.confirm}`, {method: 'DELETE'});
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Built-in plugin methods

    public getSearchConnection(options?: {siteId?: string}): Promise<SiteSearchConnectionData> {
        const siteId = this.getSiteId(options);
        return this.call(`/site/${siteId}/search/connection`);
    }
}

/**
 * Helper to apply "flags" to conditional properties in a data type.
 *
 * This allows us to provide detailed typing for API responses that contain conditional fields (where certain fields in
 * the response may or may not be included based on whether or not certain "flags" were set when the request was made.)
 * 
 * See getEntry() and the test cases for details.
 */
export type ApplyFlags<
    // The Enum type containing all the available flags
    AllFlags extends Record<string, string>,
    // An array that contains the flags that the user has requested for the current request
    EnabledFlags extends readonly string[]|undefined,
    // The overall data type that we'll return, where some fields may or may not be included based on whether the flag
    // (whose enum _value_ matches the field name) is enabled or not.
    DataType
> = (

    EnabledFlags extends ArrayInnerType<EnabledFlags>[] ?
        // We don't know which flags are enabled until runtime.
        DataType
    : 
        // We know now (at compile time) which flags are enabled and which aren't:
        {
            // Unconditionally include all the normal properties that aren't controlled by flags
            [Key in keyof DataType as (Key extends EnumValues<AllFlags> ? never : Key)]: DataType[Key]
        } & {
            // But conditionally include the fields that _are_ controlled by flags:
            [Key in keyof DataType as Key extends EnumValues<AllFlags> ? Key : never]-?:
                Key extends ToStringUnion<EnabledFlags> ? DataType[Key] : `requires the ${Key&string} flag`
        }
);

type ArrayInnerType <T> = T extends ((infer V)[]) ? V : never;
type ToStringUnion <T> = T extends readonly [infer Type1, ...infer Rest] ? (Type1 extends string ? `${Type1}` : never)|ToStringUnion<Rest> : never;

/** Helper to get the *values* of a string enum as a combined string type, like "Value1"|"Value2" */
type EnumValues<Enum> = Enum extends Record<string, string> ? `${Enum[keyof Enum]}` : never;
