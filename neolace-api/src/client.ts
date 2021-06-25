// deno-lint-ignore-file no-explicit-any
import { PasswordlessLoginResponse, PublicUserData } from "./user.ts";
import * as errors from "./errors.ts";
import { SiteSchemaData } from "./schema/index.ts";
import { DraftData, EditList } from "./edit/index.ts";

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
                errorData.message = response.statusText;
            }

            console.error(`${path} API call failed (${response.status} ${response.statusText}). Response from server: \n${errorDataFormatted}`);

            if (response.status === 401) {
                throw new errors.NotAuthenticated();
            } else if (response.status === 403) {
                throw new errors.NotAuthorized(errorData.message);
            } else if (response.status === 400) {
                if (errorData.reason === errors.InvalidRequestReason.InvalidFieldValue) {
                    throw new errors.InvalidFieldValue(errorData.fields, errorData.message);
                } else {
                    throw new errors.InvalidRequest(errorData.reason, errorData.message);
                }
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
    // User API Methods

    /**
     * Get information about the currently logged-in user (or bot).
     *
     * Will throw a NotAuthenticated error if the user is not authenticated.
     */
    public async whoAmI(): Promise<PublicUserData> {
        return await this.call("/user/me");
    }

    /**
     * Register a new user account (human user)
     */
    public async registerHumanUser(data: {email: string, fullName?: string, username?: string}): Promise<PublicUserData> {
        return await this.call("/user", {method: "POST", data});
    }

    /**
     * Request passwordless login
     */
    public async requestPasswordlessLogin(data: {email: string}): Promise<PasswordlessLoginResponse> {
        return await this.call("/user/request-login", {method: "POST", data});
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Site API Methods

    public async getSiteSchema(options?: {siteId?: string}): Promise<SiteSchemaData> {
        const siteId = this.getSiteId(options);
        return await this.call(`/site/${siteId}/schema`, {method: "GET"});
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

    public async createDraft(data: Pick<DraftData, "title"|"description">&{edits?: EditList}, options?: {siteId?: string}): Promise<DraftData> {
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

    /*
    public getTechDbEntry<Flags extends readonly TechDbEntryFlags[]|undefined>(args: {key: string, flags?: Flags}): Promise<ApplyFlags<TechDbEntryFlags, Flags, TechDbEntryData>> {
        return this.call(`/techdb/db/${encodeURIComponent(args.key)}` + (args.flags && args.flags.length ? `?fields=${args.flags.join(",")}` : ""));
    }

    public getTechConcept(args: {key: string, flags?: TechDbEntryFlags[]}): Promise<TechConceptData> {
        return this.call(`/techdb/tech/${encodeURIComponent(args.key)}` + (args.flags && args.flags.length ? `?fields=${args.flags.join(",")}` : ""));
    }
    public getProcess(args: {key: string}): Promise<ProcessData> {
        return this.call(`/techdb/process/${encodeURIComponent(args.key)}`);
    }
    public getDesign(args: {key: string, flags?: TechDbEntryFlags[]}): Promise<DesignData> {
        return this.call(`/techdb/design/${encodeURIComponent(args.key)}` + (args.flags && args.flags.length ? `?fields=${args.flags.join(",")}` : ""));
    }*/
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
export type ApplyFlags<AllFlags, EnabledFlags extends readonly string[]|undefined, DataType> = DataType
// This is disabled until Next.js is compatible with TypeScript 4.1
/*(

    undefined extends EnabledFlags ?
        // No flags are set, mark the conditional (flagged) fields as "never" type .
        {
            [Key in keyof DataType]: Key extends AllFlags ? never : DataType[Key];
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
            // Every field that's not one of the conditional fields mentioned in "AllFlags" gets passed unchanged:
            [Key in keyof DataType as Exclude<Key, AllFlags>]: DataType[Key];
        } &
        {
            // Every field that is a conditional field:
            [Key in keyof DataType as (Key extends AllFlags ? Key : never)]-?: (
                // This field is conditional on a flag. Check if its flag is set.
                Key extends ElementType<EnabledFlags> ? DataType[Key] : undefined
            );
        }
);*/

/** Helper to get a union of the value types of an array, if known at compile time */
type ElementType < T extends ReadonlyArray<unknown>|undefined > = (
    T extends ReadonlyArray<infer ElementType> ? ElementType
    : never
);
