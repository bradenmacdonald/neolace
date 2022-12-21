import { Field } from "neolace/deps/vertex-framework.ts";

import { api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { getRedis } from "neolace/core/redis.ts";
import { createRandomToken } from "neolace/lib/secure-token.ts";
import { mailer, makeSystemEmail } from "neolace/core/mailer/mailer.ts";
import { siteIdFromKey } from "neolace/core/Site.ts";
import { dedent } from "neolace/lib/dedent.ts";
import { HumanUser } from "neolace/core/User.ts";

const validateEmail = Field.validators.email;

const DAYS = 60 * 60 * 24;
/**
 * How long an email validation link is valid for.
 */
const EMAIL_VALIDATION_EXPIRY_SECONDS = 2 * DAYS;
const redisKeyPrefix = "email-validation-token:";

/**
 * Generate and store an expiring a validation token, which we can then email to the user.
 * If they click the link with this token in their email, we know their email address is valid.
 */
export async function saveValidationToken(
    { email, data }: { email: string; data: Record<string, unknown> },
): Promise<string> {
    const token = await createRandomToken(24);
    const key = redisKeyPrefix + token;
    const value = JSON.stringify({ email, data });
    const redis = await getRedis();
    // Store the token in Redis, and have it expire after a certain amount of time.
    await redis.set(key, value, { ex: EMAIL_VALIDATION_EXPIRY_SECONDS });
    return token;
}

/**
 * Given an email validation token that was emailed to a user, check if it's
 * valid and return the associated email address and data.
 */
export async function checkValidationToken(token: string): Promise<{ email: string; data: Record<string, unknown> }> {
    const redis = await getRedis();
    const key = redisKeyPrefix + token;
    const result = await redis.get(key);
    if (result === null) {
        throw new api.InvalidRequest(api.InvalidRequestReason.ValidationTokenInvalid, "Token invalid or expired.");
    }
    const data = JSON.parse(result);
    return { email: data.email, data: data.data };
}

export class VerifyUserEmailResource extends NeolaceHttpResource {
    public paths = ["/user/verify-email"];

    POST = this.method({
        responseSchema: api.schemas.Schema({}), // Empty response
        requestBodySchema: api.VerifyEmailRequest,
        description: "Request verification for an email address",
    }, async ({ request, bodyData }) => {
        if (request.user) {
            throw new api.NotAuthorized("You cannot use this API if you are already logged in.");
        }

        // Validate the email address before we try doing anything else:
        const email = bodyData.email.toLowerCase();
        try {
            validateEmail(email);
        } catch (err) {
            throw new api.InvalidFieldValue([{ fieldPath: "email", message: err.message }]);
        }

        // And make sure the email address isn't already used:
        const graph = await getGraph();
        const checkEmail = await graph.pull(HumanUser, (u) => u.id, { with: { email } });
        if (checkEmail.length !== 0) {
            throw new api.InvalidRequest(
                api.InvalidRequestReason.EmailAlreadyRegistered,
                "A user account is already registered with that email address.",
            );
        }

        const token = await saveValidationToken({ email, data: bodyData.data as Record<string, unknown> });

        // The API always accepts the site "key" but we need the site VNID if we're sending
        // the validation email as coming from a specific site and not the overall realm.
        const siteId = bodyData.siteKey ? await siteIdFromKey(bodyData.siteKey) : undefined;

        // Send the user an email with the link:
        const msg = await makeSystemEmail({
            siteId,
            to: email,
            subjectTemplate: `Create your account`,
            args: {
                returnUrl: bodyData.returnUrl.replace("{token}", token),
            },
            plainTextTemplate: dedent`
                Hi,

                Someone - hopefully you - wants to create a new account with this email address on {site}.

                To verify your email address and activate your new account, click here:

                {returnUrl}

                If you did not request this new account, you can ignore or delete this message.
            `,
            htmlTemplate: dedent`
                Hi,

                Someone - hopefully you - wants to create a new account with this email address on <a href="{siteUrl}">{site}</a>.

                <a href="{returnUrl}"><strong>Click here to verify your email address and activate your new account.</strong></a>

                If you did not request this new account, you can ignore or delete this message.
            `,
        });
        await mailer.sendEmail(msg);

        return {};
    });

    GET = this.method({
        responseSchema: api.EmailTokenResponse,
        description: "Check if a verification token is [still] valid and get the associated data.",
    }, async ({ request }) => {
        if (request.user) {
            throw new api.NotAuthorized("You cannot use this API if you are already logged in.");
        }
        const token = request.queryParam("token");
        if (!token) {
            throw new api.InvalidFieldValue([{ fieldPath: "token", message: "No token was provided." }]);
        }

        return await checkValidationToken(token);
    });
}
