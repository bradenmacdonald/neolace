import * as Hapi from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import * as Joi from "@hapi/joi";
import { User } from "./User";
import { log } from "../app/log";
import { authClient } from "./auth/authn";
import { graph } from "./graph";
import { C } from "vertex-framework";

const prefix = `/user`;

const UserType = Joi.object({
    username: User.properties.shortId,
    realname: User.properties.realname,
    // Country code
    country: User.properties.country,
}).label("User");

export const userRoutes: Hapi.ServerRoute[] = [

    ///////////////////////////// Request passwordless login
    {
        method: "POST",
        path: `${prefix}/request-login`,
        options: {
            description: "Request passwordless login",
            auth: false,
            tags: ["api"],
            validate: {
                payload: Joi.object({
                    email: User.properties.email.required(),
                }).label("PasswordlessLoginRequest"),
            },
            response: { status: {
                200: Joi.object({requested: Joi.boolean().required()}).label("PasswordlessLoginResponse"),
            } },
        },
        handler: async (request, h) => {
            const email = (request.payload as any).email;
            try {
                const user = await graph.pullOne(User, u => u.uuid, {where: C`@this.email = ${email}`});
                await authClient.requestPasswordlessLogin({username: user.uuid});
            } catch (err) {
                log.debug(`Passwordless login request failed: ${err}`);
                return h.response({requested: false});
            }
            log.debug(`Passwordless login request for ${email}`);
            return h.response({requested: true});
        },
    },
    ///////////////////////////// Get details of my own account
    {
        method: "GET",
        path: `${prefix}/me`,
        options: {
            description: "Get my account information",
            notes: "Get information about the logged in user (or bot)",
            auth: "technotes_strategy",
            tags: ["api"],
            validate: {},
            response: { status: { 200: UserType } },
        },
        handler: (request, h) => {
            const user = request.auth.credentials.user;
            if (user === undefined) {
                throw Boom.internal("Auth Expected");
            }
            return h.response({
                username: user.username,
                realname: user.realname,
                country: user.country,
            });
        },
    },
];
