import { PasswordlessLoginResponse, PublicUserData } from "./user";
import { DesignData, ProcessData, TechConceptData, TechDbEntryData, TechDbEntryFlags, XFlag } from "./techdb";
import * as errors from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
export interface Config {
    /** Path to the Neolace API server ("backend"). Should not end with a slash. e.g. "http://backend:5554" */
    basePath: string;
    fetchApi: WindowOrWorkerGlobalScope["fetch"];
    /**
     * To authenticate with the API, you must either specify a token here (for a bot) or use getExtraHeadersForRequest
     * to pass a JWT (for human users).
     */
    authToken?: string;
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
    readonly fetchApi: WindowOrWorkerGlobalScope["fetch"];
    readonly authToken?: string;
    private readonly getExtraHeadersForRequest?: Config["getExtraHeadersForRequest"];

    constructor(config: Config) {
        this.basePath = config.basePath.replace(/\/+$/, "");
        this.fetchApi = config.fetchApi;
        this.authToken = config.authToken;
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
            } catch {}

            if (!errorData.message) {
                errorData.message = response.statusText;
            }

            console.error(`${path} API call failed (${response.status} ${response.statusText}). Response from server: \n${errorDataFormatted}`);

            if (response.status === 401) {
                throw new errors.NotAuthenticated();
            } else if (response.status === 403) {
                throw new errors.NotAuthorized(errorData.message);
            } else {
                throw new errors.ApiError(errorData.message, response.status);
            }
        }
        return await response.json();
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // User API Methods

    /**
     * Get information about the currently logged-in user (or bot).
     *
     * Will throw a NotAuthenticated error if the user is not authenticated.
     */
    public async whoAmI(): Promise<PublicUserData> {
        return this.call("/user/me");
    }

    /**
     * Request passwordless login
     */
    public async requestPasswordlessLogin(data: {email: string}): Promise<PasswordlessLoginResponse> {
        return this.call("/user/request-login", {method: "POST", data});
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // TechDB API Methods

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
