import { VNID } from "neolace/deps/neolace-api.ts";
import { config } from "neolace/app/config.ts";
import { type Email, Mailer, responsiveHtmlEmailTemplate } from "neolace/deps/deno-mailer.ts";
import { getGraph } from "neolace/core/graph.ts";
import { Site } from "neolace/core/Site.ts";

export { type Email, responsiveHtmlEmailTemplate };

/**
 * Use this to send email.
 */
export const mailer = Mailer.init(config.mailProvider, config.mailProviderConfig);

/**
 * Create a system email, automatically applying whatever layout, header,
 * footer, etc. are appropriate.
 *
 * If any of the following variables occur in the subject line or body, they will
 * be replaced:
 *   - {site} - name of the current site or realm (siteId must be provided)
 */
export async function makeSystemEmail(
    { siteId, ...params }: {
        to: Email["to"];
        siteId?: VNID;
        subjectTemplate: string;
        previewTextTemplate?: string;
        htmlTemplate: string;
        plainTextTemplate: string;
        args: Record<string, string>;
    },
): Promise<Email> {
    // Data about the specific Site we're sending from, if any.
    const site = siteId ? await (await getGraph()).pullOne(Site, (s) => s.name.domain, { key: siteId }) : undefined;
    // Name that emails come from, e.g. "Neolace System"
    const fromName = site ? site.name : config.realmName;
    // Values that can be interpolated into the template, e.g. {site} becomes the name of the site or realm:
    const args: Record<string, string> = {
        ...params.args,
        site: fromName,
        siteUrl: site ? `https://${site.domain}` : config.realmURL,
        realm: config.realmName,
        sitePhysicalAddress: config.realmPhysicalAddress,
    };
    const applyTemplate = (str: string, html = false) => {
        // Apply the replacements all at once so that we don't replace any {variables} in user-provided strings
        return str.replaceAll(/{(\w+)}/g, (_m, key) => {
            let value = args[key] ?? "------";
            if (html) {
                value = value.replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>");
            }
            return value;
        });
    };

    const subject = applyTemplate(params.subjectTemplate);
    const bodyHtml = responsiveHtmlEmailTemplate({
        title: subject,
        contentHtml: applyTemplate(params.htmlTemplate, true),
        previewText: applyTemplate(params.previewTextTemplate ?? "", true),
        footerHtml: applyTemplate(`<a href="{siteUrl}">{site}</a><br><br>{sitePhysicalAddress}`, true),
    });
    const bodyPlainText = applyTemplate(params.plainTextTemplate) + ``;

    return {
        to: params.to,
        from: { name: fromName, email: config.mailFromAddress },
        subject,
        bodyPlainText,
        bodyHtml,
    };
}
