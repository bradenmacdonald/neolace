/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { CreateSite, getHomeSite, siteIdFromKey, UpdateSite } from "neolace/core/Site.ts";
import { EmptyResultError, VNID } from "neolace/deps/vertex-framework.ts";
import { hasPermission } from "neolace/core/permissions/check.ts";

export class SiteResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey"];

    /**
     * Create or update a site, including its core configuration like domain name, home page content, etc.
     * This is meant to be an admin API, and it's very powerful. In general, users should use some more specific,
     * limited API like "update home page" rather than this one.
     */
    PUT = this.method({
        requestBodySchema: SDK.CreateOrUpdateSiteSchema,
        responseSchema: SDK.schemas.Schema({}),
        description: "Create a new site. This API is for administrators and requires ",
    }, async ({ request, bodyData }) => {
        const user = await this.requireUser(request);
        const graph = await getGraph();

        const siteKey = request.pathParam("siteKey") as string;
        let siteId: VNID | undefined;
        try {
            siteId = await siteIdFromKey(siteKey);
        } catch (err) {
            if (err instanceof EmptyResultError) {
                // We are creating a brand new site.
            } else {
                throw err;
            }
        }

        const details = {
            name: bodyData.name,
            domain: bodyData.domain,
            accessMode: bodyData.accessMode,
            description: bodyData.description,
            homePageContent: bodyData.homePageContent,
            footerContent: bodyData.footerContent,
            frontendConfig: bodyData.frontendConfig,
            publicGrantStrings: bodyData.publicGrantStrings,
        };

        if (siteId === undefined) {
            // The site doesn't exist so we need to create it.
            if (!bodyData.create && !bodyData.createOnly) {
                throw new SDK.NotFound("That site doesn't exist. Set the 'create' parameter if you want to create it.");
            }
            // Does the user have permission? We need to check this on the home site, since using our normal
            // requirePermission() API will try to check it on the site which doesn't exist yet, and throw an error.
            const authorized = await hasPermission(
                { siteId: (await getHomeSite()).siteId, userId: user.id },
                SDK.CorePerm.createSite,
                {},
            );
            if (!authorized) {
                throw new SDK.NotAuthorized(
                    "You are not authorized to create a site using this API. " +
                        "However, there may be another more limited API call that " +
                        "you are allowed to use to create a new site.",
                    // e.g. if a plugin implements a special create site API for users of Neolace.com
                );
            }
            // Make sure we have the required fields:
            const { name, domain, ...rest } = details;
            if (name === undefined || domain === undefined) {
                const errors = [
                    ...(name === undefined
                        ? [{ fieldPath: "name", message: "name is required to create a new site." }]
                        : []),
                    ...(domain === undefined
                        ? [{ fieldPath: "domain", message: "domain is required to create a new site." }]
                        : []),
                ];
                throw new SDK.InvalidFieldValue(errors);
            }
            // Make the current user the administrator of the new site:
            const adminUser = user.id;
            // Create the new site:
            try {
                await graph.runAs(user.id, CreateSite({ key: siteKey, name, domain, ...rest, adminUser }));
            } catch (err) {
                if (
                    err instanceof Error &&
                    err.message.includes("already exists with label `Site` and property `domain`")
                ) {
                    throw new SDK.InvalidFieldValue([{
                        fieldPath: "domain",
                        message: "That domain is already used by another site.",
                    }]);
                }
                throw err;
            }
        } else {
            // We are just going to update the existing site. Unless the request said createOnly.
            if (bodyData.createOnly) {
                throw new SDK.InvalidRequest(SDK.InvalidRequestReason.SiteAlreadyExists, "That site already exists.");
            }
            await this.requirePermission(request, SDK.CorePerm.siteAdminManageCoreSettings);
            await graph.runAs(user.id, UpdateSite({ id: siteId, ...details }));
        }

        return {};
    });
}
