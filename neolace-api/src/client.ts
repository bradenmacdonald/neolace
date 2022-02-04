// deno-lint-ignore-file no-explicit-any
import { PasswordlessLoginResponse } from "./user.ts";
import * as errors from "./errors.ts";
import { SiteSchemaData } from "./schema/index.ts";
import { DraftData, CreateDraftSchema } from "./edit/index.ts";
import { EntryData, EntrySummaryData, GetEntryFlags, PaginatedResultData } from "./content/index.ts";
import { SiteDetailsData, SiteHomePageData, SiteSearchConnectionData } from "./site/Site.ts";
import * as schemas from "./api-schemas.ts";
import { VNID } from "./types.ts";

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
    headers?: Record<string, string>;
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
        if (data) {
            if ("body" in args) { throw new Error("Not allowed to pass both .data and .body to API client's callRaw()"); }
            args.body = JSON.stringify(data);
        }
        if (args.method === undefined) {
            args.method = "GET";
        }
        let extraHeaders: {[k: string]: string} = {};
        if (this.getExtraHeadersForRequest) {
            extraHeaders = await this.getExtraHeadersForRequest({method: args.method, path});
        }
        if (this.authToken) {
            extraHeaders["Authorization"] = `Bearer ${this.authToken}`;
        }
        if (args.noAuth) {
            delete extraHeaders["Authorization"];
        }
        args.headers = {"Content-Type": "application/json", ...args.headers, ...extraHeaders};
        return this.fetchApi(this.basePath + path, args);
    }

    /**
     * Make a call to the Neolace API and return the (JSON decoded) response
     */
    private async call(path: string, args?: RequestArgs): Promise<any> {
        const response = await this.callRaw(path, args ?? {});
        if (response.status < 200 || response.status >= 300) {
            // See if we can decode the error details (JSON):
            let errorData: any = {};
            let errorDataFormatted = "(invalid response - not JSON)";
            try {
                errorData = await response.json();
                errorDataFormatted = JSON.stringify(errorData);
            } catch {/* couldn't parse this as JSON... */}

            if (!errorData.message) {
                errorData = {message: typeof errorData === "string" ? errorData : response.statusText};
            }

            console.error(`${path} API call failed (${response.status} ${response.statusText}). Response from server: \n${errorDataFormatted}`);

            if (response.status === 401) {
                throw new errors.NotAuthenticated();
            } else if (response.status === 403) {
                throw new errors.NotAuthorized(errorData.message);
            } else if (response.status === 400) {
                if (errorData.reason === errors.InvalidRequestReason.InvalidFieldValue && errorData.fieldErrors) {
                    throw new errors.InvalidFieldValue(errorData.fieldErrors);
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
        return await this.call(`/site/lookup?domain=${encodeURIComponent(criteria.domain)}`, {method: "GET"});
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
    // Draft API Methods

    private _parseDraft(rawDraft: any): DraftData {
        rawDraft.created = Date.parse(rawDraft.created);
        if (rawDraft.edits) {
            rawDraft.edits.forEach((e: any) => { e.timestamp = Date.parse(e.timestamp); })
        }
        return rawDraft;
    }

    public async getDraft(draftId: string, options?: {siteId?: string}): Promise<DraftData> {
        const siteId = this.getSiteId(options);
        return this._parseDraft(await this.call(`/site/${siteId}/draft/${draftId}`, {method: "GET"}));
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

    public async acceptDraft(draftId: string, options?: {siteId?: string}): Promise<void> {
        const siteId = this.getSiteId(options);
        await this.call(`/site/${siteId}/draft/${draftId}/accept`, {method: "POST"});
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Entry API Methods

    public getEntry<Flags extends readonly GetEntryFlags[]>(key: string, options: {flags?: Flags, siteId?: string} = {}): Promise<ApplyFlags<typeof GetEntryFlags, Flags, EntryData>> {
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
 * Examples:
 * 
 * const response = await client.getTechDbEntry({key, flags: [TechDbEntryFlags.relatedImages, TechDbEntryFlags.numRelatedImages]});
 * // response.numRelatedImages: number, response.relatedImages: {...}[]
 *
 * const response = await client.getTechDbEntry({key, flags: [TechDbEntryFlags.numRelatedImages]});
 * // response.numRelatedImages: number, response.relatedImages: never
 *
 * const response = await client.getTechDbEntry({key});
 * // response.numRelatedImages?: undefined, response.relatedImages?: undefined
 * 
 * const flags: TechDbEntryFlags[] = getFlags();  // Known only at runtime
 * const response = await client.getTechDbEntry({key, flags});
 * // response.numRelatedImages?: number|undefined, response.relatedImages?: {...}[]|undefined
 */
export type ApplyFlags<AllFlags extends Record<string, string>, EnabledFlags extends readonly string[]|undefined, DataType> = (

    undefined extends EnabledFlags ?
        // No flags are set, mark the conditional (flagged) fields as "never" type .
        {
            [Key in keyof DataType]: Key extends EnumValues<AllFlags> ? never : DataType[Key];
        } :
    XFlag extends ElementType<EnabledFlags> ?
        // The exact flags passed are not known - we just have the generic flags type like string[] instead of a
        // specific set of flag types, like ["includeDetails", "includeLinks"]. So leave DataType as-is, with some
        // fields being "optional?:"
        DataType
    :
        // In this case, we know at compile time exactly which flags were set, so we can convert properties from
        // optional to defined:
        {
            [Key in keyof DataType]: Key extends EnumValues<AllFlags> ? 
                // Check if this specific flag is enabled:
                (Key extends ToStringUnion<EnabledFlags> ? Defined<DataType[Key]> : never)
            : DataType[Key];
        }
);

/** XFlag is not actually used, but helps us write typescript checks for when flags are specified exactly or not. */
type XFlag = "x";

/** Helper to get a union of the value types of an array, if known at compile time */
type ElementType < T extends ReadonlyArray<unknown>|undefined > = (
    T extends ReadonlyArray<infer ElementType> ? ElementType
    : never
);

type ToStringUnion <T> = T extends readonly [infer Type1, ...infer Rest] ? (Type1 extends string ? `${Type1}` : never)|ToStringUnion<Rest> : never;

/** Helper type to remove "undefined" from a type */
type Defined<T> = T extends undefined ? never : T;

/** Helper to get the values of an enum as a combined string type, like "Value1"|"Value2" */
type EnumValues<Enum extends Record<string, string>> = keyof {[K in keyof Enum as `${Enum[K]}`]: undefined};
