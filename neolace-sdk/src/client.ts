// deno-lint-ignore-file no-explicit-any
import {
    CreateHumanUserResponse,
    EmailTokenResponse,
    PasswordlessLoginResponse,
    UserDataResponse,
    VerifyEmailRequest,
} from "./user.ts";
import * as errors from "./errors.ts";
import { AnySchemaEdit, SiteSchemaData } from "./schema/index.ts";
import {
    AnyBulkEdit,
    AnyContentEdit,
    CreateDraftSchema,
    DraftData,
    DraftStatus,
    GetDraftFlags,
TempFileData,
} from "./edit/index.ts";
import { EntryData, EntrySummaryData, EvaluateLookupData, GetEntryFlags } from "./content/index.ts";
import { SiteDetailsData, SiteHomePageData, SiteSearchConnectionData, SiteUserMyPermissionsData } from "./site/Site.ts";
import { SiteUserSummaryData } from "./site/SiteAdmin.ts";
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
    /** Default site ID to use for requests involving a specific site. This is the site's key, e.g. "technotes" */
    siteKey?: string;
    getExtraHeadersForRequest?: (
        request: { method: HttpMethod; path: string },
    ) => Promise<{ [headerName: string]: string }>;
}

interface RequestArgs {
    method?: HttpMethod;
    data?: any;
    body?: BodyInit | null;
    headers?: Headers;
    redirect?: RequestRedirect;
    noAuth?: boolean; // If true, the "Authorization" header/token will never be sent for this request. Avoids 401 errors when getting a new token if current token is invalid.
}

export class NeolaceApiClient {
    readonly basePath: string;
    readonly fetchApi: typeof window["fetch"];
    readonly authToken?: string;
    readonly siteKey?: string;
    private readonly getExtraHeadersForRequest?: Config["getExtraHeadersForRequest"];

    constructor(config: Config) {
        this.basePath = config.basePath.replace(/\/+$/, "");
        this.fetchApi = config.fetchApi;
        this.authToken = config.authToken;
        this.siteKey = config.siteKey;
        this.getExtraHeadersForRequest = config.getExtraHeadersForRequest;
    }

    private async callRaw(path: string, _args: RequestArgs): Promise<Response> {
        const { data, ...args } = _args;
        if (args.headers === undefined) {
            args.headers = new Headers();
        }
        if (data) {
            if ("body" in args) throw new Error("Not allowed to pass both .data and .body to API client's callRaw()");
            args.body = JSON.stringify(data);
            args.headers.set("Content-Type", "application/json");
        }
        if (args.method === undefined) {
            args.method = "GET";
        }
        if (this.getExtraHeadersForRequest) {
            for (
                const [key, value] of Object.entries(
                    await this.getExtraHeadersForRequest({ method: args.method, path }),
                )
            ) {
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
            } catch { /* couldn't parse this as JSON... */ }

            if (!errorData.message) {
                errorData = { message: typeof errorData === "string" ? errorData : response.statusText };
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
                    throw new errors.InvalidRequest(
                        errorData.reason ?? errors.InvalidRequestReason.OtherReason,
                        errorData.message,
                    );
                }
            } else if (response.status === 404) {
                throw new errors.NotFound(errorData.message);
            } else {
                throw new errors.ApiError(errorData.message, response.status);
            }
        }
        return await response.json();
    }

    /** Helper method to get a siteKey, either as given to the current method or falling back to the default. */
    private getSiteKey(methodOptions?: { siteKey?: string }): string {
        if (methodOptions?.siteKey) {
            return methodOptions.siteKey;
        }
        if (!this.siteKey) {
            throw new Error("siteKey is required, either in the constructor or the API method.");
        }
        return this.siteKey;
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
    public async whoAmI(): Promise<schemas.Type<typeof UserDataResponse>> {
        return await this.call("/user/me");
    }

    /**
     * Send a validation email to an email address. Required before it can be used to register.
     * You can pass additional data like fullName which you can later retrieve from the token
     * that gets emailed to the user.
     *
     * returnUrl needs to include "{token}", which will get replaced with a secure token. Then
     * that updated link will be emailed to the user.
     */
    public async requestEmailVerification(
        options: { email: string; returnUrl: string; data: Record<string, unknown>; siteKey?: string },
    ): Promise<void> {
        const data: schemas.Type<typeof VerifyEmailRequest> = {
            email: options.email,
            data: options.data,
            returnUrl: options.returnUrl,
            // siteKey is optional for this API call:
            siteKey: options.siteKey ?? this.siteKey ?? undefined,
        };
        await this.call("/user/verify-email", { method: "POST", data });
    }

    /**
     * After requestEmailVerification() is used, a token will be emailed to the user.
     * This API can then be used to check if that token is valid, and retrieve whatever
     * data was passed when creating the token.
     */
    public async checkVerificationToken(token: string): Promise<schemas.Type<typeof EmailTokenResponse>> {
        return await this.call(`/user/verify-email?token=${token}`, { method: "GET" });
    }

    /**
     * Register a new user account (human user).
     * First you must use requestEmailVerification() to verify the user's email address and get an email token.
     * This will return a temporary password which you can use to log the user in and/or to set a new password for them.
     */
    public async registerHumanUser(
        data: { emailToken: string; fullName?: string; username?: string },
    ): Promise<schemas.Type<typeof CreateHumanUserResponse>> {
        return await this.call("/user", { method: "POST", data });
    }

    /**
     * Request passwordless login
     */
    public async requestPasswordlessLogin(data: { email: string }): Promise<PasswordlessLoginResponse> {
        return await this.call("/auth/request-login", { method: "POST", data, noAuth: true });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Site API Methods

    public async getSite(criteria: { domain: string }): Promise<SiteDetailsData> {
        return await this.call(`/site/find?domain=${encodeURIComponent(criteria.domain)}`, { method: "GET" });
    }

    public async getSiteHomePage(options?: { siteKey?: string }): Promise<SiteHomePageData> {
        const siteKey = this.getSiteKey(options);
        return await this.call(`/site/${siteKey}/home`, { method: "GET" });
    }

    public async getSiteSchema(options?: { siteKey?: string }): Promise<SiteSchemaData> {
        const siteKey = this.getSiteKey(options);
        return await this.call(`/site/${siteKey}/schema`, { method: "GET" });
    }

    /** Replace a site's schema with the provided schema */
    public async replaceSiteSchema(schema: SiteSchemaData, options?: { siteKey?: string }): Promise<void> {
        const siteKey = this.getSiteKey(options);
        await this.call(`/site/${siteKey}/schema`, { method: "PUT", data: schema });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Lookup API Methods

    public evaluateLookupExpression(
        expression: string,
        options: {
            entryKey?: VNID | string;
            siteKey?: string;
            pageSize?: number;
        } = {},
    ): Promise<EvaluateLookupData> {
        const siteKey = this.getSiteKey(options);
        const query = new URLSearchParams({ expression });
        if (options.entryKey) {
            query.set("entryKey", options.entryKey);
        }
        if (options.pageSize) {
            query.set("pageSize", options.pageSize.toString());
        }
        return this.call(`/site/${siteKey}/lookup?${query.toString()}`);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Draft API Methods

    private _parseDraft(rawDraft: any): DraftData {
        rawDraft.created = new Date(rawDraft.created);
        if (rawDraft.edits) {
            rawDraft.edits.forEach((e: any) => {
                e.timestamp = Date.parse(e.timestamp);
            });
        }
        return rawDraft;
    }

    public async listDrafts(
        options?: { siteKey?: string; page?: number; status?: DraftStatus },
    ): Promise<schemas.PaginatedResultData<DraftData>> {
        const siteKey = this.getSiteKey(options);
        const args = new URLSearchParams();
        if (options?.page !== undefined) {
            args.set("page", options.page.toString());
        }
        if (options?.status !== undefined) {
            args.set("status", options.status.toString());
        }
        const data = await this.call(`/site/${siteKey}/draft/?` + args.toString(), { method: "GET" }) as any;
        data.values = data.values.map(this._parseDraft);
        return data;
    }

    public async getDraft<Flags extends readonly GetDraftFlags[] | undefined = undefined>(
        draftNum: number,
        options?: { flags: Flags; siteKey?: string },
    ): Promise<ApplyFlags<typeof GetDraftFlags, Flags, DraftData>> {
        const siteKey = this.getSiteKey(options);
        return this._parseDraft(
            await this.call(
                `/site/${siteKey}/draft/${draftNum}` +
                    (options?.flags?.length ? `?include=${options.flags.join(",")}` : ""),
                { method: "GET" },
            ),
        ) as any;
    }

    public async createDraft(
        data: schemas.Type<typeof CreateDraftSchema>,
        options?: { siteKey?: string },
    ): Promise<DraftData> {
        const siteKey = this.getSiteKey(options);
        const result = await this.call(`/site/${siteKey}/draft`, {
            method: "POST",
            data: {
                title: data.title,
                description: data.description,
                edits: data.edits ?? [],
            },
        });
        return this._parseDraft(result);
    }

    public async addEditToDraft(
        edit: AnySchemaEdit | AnyContentEdit,
        options: { draftNum: number; siteKey?: string },
    ): Promise<void> {
        const siteKey = this.getSiteKey(options);
        await this.call(`/site/${siteKey}/draft/${options.draftNum}/edit`, { method: "POST", data: edit });
    }

    /** Upload a new file; this returns a tempFileId which can then be used for an edit like UpdateEntryFeature */
    public async uploadFile(
        fileData: Blob,
        options: { siteKey?: string },
    ): Promise<TempFileData> {
        const siteKey = this.getSiteKey(options);
        const formData = new FormData();
        formData.append("file", fileData);
        let hashParam = "";
        try {
            const hash = await crypto.subtle.digest("SHA-256", await fileData.arrayBuffer());
            const hashHex = bin2hex(new Uint8Array(hash));
            hashParam = `sha256Hash=${hashHex}`;
        } catch {
            console.error("Unable to compute SHA-256 hash for upload. Usually this is because you are not on an HTTPS connection.");
            // Note that computing the hash is not actually required, just helps to speed uploads up in the case where
            // the content already exists in object storage.
        }
        const result = await this.call(`/site/${siteKey}/file?${hashParam}`, {
            method: "POST",
            body: formData,
        });
        return result;
    }

    public async acceptDraft(draftNum: number, options?: { siteKey?: string }): Promise<void> {
        const siteKey = this.getSiteKey(options);
        await this.call(`/site/${siteKey}/draft/${draftNum}/accept`, { method: "POST" });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Entry API Methods

    public getEntry<Flags extends readonly GetEntryFlags[] | undefined = undefined>(
        key: string,
        options: { flags?: Flags; siteKey?: string } = {},
    ): Promise<ApplyFlags<typeof GetEntryFlags, Flags, EntryData>> {
        const siteKey = this.getSiteKey(options);
        return this.call(
            `/site/${siteKey}/entry/${encodeURIComponent(key)}` +
                (options?.flags?.length ? `?include=${options.flags.join(",")}` : ""),
        );
    }

    /**
     * Get a basic list of all entries on the site that the current user can view, optionally filtered by type.
     *
     * This is a very simple API, and for performance reasons results are ordered by ID, not by name. Use the search API
     * via getSearchConnection for more flexible ways of retrieving the list of entries.
     */
    public async getEntries(
        options: { ofEntryType?: string; siteKey?: string } = {},
    ): Promise<{ totalCount: number } & AsyncIterable<EntrySummaryData>> {
        const siteKey = this.getSiteKey(options);
        const firstPage: schemas.StreamedResultData<EntrySummaryData> = await this.call(
            `/site/${siteKey}/entry/` + (options.ofEntryType ? `?entryType=${options.ofEntryType}` : ""),
        );
        let currentPage = firstPage;
        return {
            totalCount: firstPage.totalCount!, // The first page always includes the total count
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
                        return { done: true, value: undefined };
                    }
                },
            }),
        };
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Permissions API

    /**
     * Get the permissions that the user has, in a specific context.
     * For example, to determine if the user has 'edit.entry' permission, pass in the entryId and entryTypeKey
     * @param options
     * @returns
     */
    public async getMyPermissions(
        options: {
            entryId?: VNID;
            entryTypeKey?: VNID;
            draftNum?: number;
            [custom: `plugin:${string}`]: string;
            siteKey?: string;
        } = {},
    ): Promise<SiteUserMyPermissionsData> {
        const siteKey = this.getSiteKey(options);

        const objectFields: Record<string, string> = {};
        for (const [k, v] of Object.entries(options)) {
            if (v !== undefined && k !== "siteKey") {
                objectFields[k] = String(v);
            }
        }
        const args = new URLSearchParams(objectFields);

        return await this.call(`/site/${siteKey}/my-permissions?${args.toString()}`, { method: "GET" });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Site administration API methods

    public async getSiteUsers(
        options?: { page?: number; siteKey?: string },
    ): Promise<schemas.PaginatedResultData<SiteUserSummaryData>> {
        const siteKey = this.getSiteKey(options);
        return await this.call(`/site/${siteKey}/user` + (options?.page ? `?page=${options.page}` : ""), {
            method: "GET",
        });
    }

    /**
     * Erase all entries on the site. This is dangerous! Mostly useful for development.
     */
    public async eraseAllEntriesDangerously(options: { confirm?: "danger"; siteKey?: string } = {}): Promise<void> {
        const siteKey = this.getSiteKey(options);
        await this.call(`/site/${siteKey}/entry/?confirm=${options.confirm}`, { method: "DELETE" });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Built-in plugin methods

    public getSearchConnection(options?: { siteKey?: string }): Promise<SiteSearchConnectionData> {
        const siteKey = this.getSiteKey(options);
        return this.call(`/site/${siteKey}/search/connection`);
    }

    public pushBulkEdits(
        edits: AnyBulkEdit[],
        options: { siteKey?: string; connectionId: string; createConnection?: boolean },
    ): Promise<{ appliedEditIds: string[] }> {
        const siteKey = this.getSiteKey(options);
        return this.call(
            `/site/${siteKey}/connection/push/${options.connectionId}/edit/?${
                options.createConnection ? "create=true" : ""
            }`,
            {
                method: "POST",
                data: { edits },
            },
        );
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
    EnabledFlags extends readonly string[] | undefined,
    // The overall data type that we'll return, where some fields may or may not be included based on whether the flag
    // (whose enum _value_ matches the field name) is enabled or not.
    DataType,
> = EnabledFlags extends ArrayInnerType<EnabledFlags>[] // We don't know which flags are enabled until runtime.
    ? DataType
    // We know now (at compile time) which flags are enabled and which aren't:
    : 
        & {
            // Unconditionally include all the normal properties that aren't controlled by flags
            [Key in keyof DataType as (Key extends EnumValues<AllFlags> ? never : Key)]: DataType[Key];
        }
        & {
            // But conditionally include the fields that _are_ controlled by flags:
            [Key in keyof DataType as Key extends EnumValues<AllFlags> ? Key : never]-?: Key extends
                ToStringUnion<EnabledFlags> ? DataType[Key] : undefined; //`requires the ${Key&string} flag`
        };

type ArrayInnerType<T> = T extends ((infer V)[]) ? V : never;
type ToStringUnion<T> = T extends readonly [infer Type1, ...infer Rest]
    ? (Type1 extends string ? `${Type1}` : never) | ToStringUnion<Rest>
    : never;

/** Helper to get the *values* of a string enum as a combined string type, like "Value1"|"Value2" */
type EnumValues<Enum> = Enum extends Record<string, string> ? `${Enum[keyof Enum]}` : never;
