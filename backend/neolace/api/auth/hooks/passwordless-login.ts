import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { api, getGraph, log, NeolaceHttpResource } from "neolace/api/mod.ts";
import { config } from "neolace/app/config.ts";
import { mailer, makeSystemEmail } from "neolace/core/mailer/mailer.ts";
import { HumanUser } from "neolace/core/User.ts";
import { dedent } from "neolace/lib/dedent.ts";

export class PasswordlessLoginWebhookResource extends NeolaceHttpResource {
    public paths = ["/auth/passwordless-login"];

    POST = this.method({
        requestBodySchema: api.schemas.Schema({ account_id: api.schemas.string, token: api.schemas.string }),
        responseSchema: api.schemas.Schema({}),
        description: "Passwordless login webhook",
        notes: "Passwordless login webhook (called by the Keratin AuthN microservice)",
    }, async ({ bodyData }) => {
        const accountId = Number(bodyData.account_id);
        const token = bodyData.token;
        log.info(`Passwordless login hook from authn service for user with account ID ${accountId}`);
        const loginUrl = `${config.realmAdminUrl}/login/passwordless#${token}`;

        const graph = await getGraph();
        let userData;
        try {
            userData = await graph.pullOne(HumanUser, (u) => u.email, { where: C`@this.authnId = ${accountId}` });
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new api.NotFound("User with that authn account ID was not found.");
            } else {
                throw err;
            }
        }

        // Send the user an email with the link:
        const msg = await makeSystemEmail({
            siteId: undefined,
            to: userData.email,
            subjectTemplate: `Log in to ${config.realmName}`,
            args: {
                loginUrl,
            },
            plainTextTemplate: dedent`
                Hi,

                Someone - hopefully you - wants to log in to ${config.realmName}.

                To log in, click here:

                {loginUrl}

                If you were not trying to log in to our site, you can ignore or delete this message.
            `,
            htmlTemplate: dedent`
                <p>Hi,</p>

                <p>Someone - hopefully you - wants to log in to ${config.realmName}.</p>

                <p>To log in, click here:</p>

                <p><a href="{loginUrl}">{loginUrl}</a></p>

                <p>If you were not trying to log in to our site, you can ignore or delete this message.</p>
            `,
        });
        await mailer.sendEmail(msg);

        return {};
    });
}
