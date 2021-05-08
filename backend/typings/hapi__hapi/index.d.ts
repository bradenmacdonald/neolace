import * as Hapi from "@hapi/hapi"; // This line is requried to augment instead of replace the types
import { VNID } from "vertex-framework";

declare module "@hapi/hapi" {
    // User credentials available on request.auth.credentials.user
    export interface UserCredentials {
        id: VNID;
        isBot: boolean;
        authnId?: number;
        // Email address. Empty if this user is a bot.
        email: string;
        // Public username. Unique but can be changed at any time.
        username: string;
        // Optional real name
        fullName: string;
    }

    // App credentials available on request.auth.credentials.app
    // export interface AppCredentials {
    // }

    // Custom type for request.auth.credentials.
    // export interface AuthCredentials {
    //     /**
    //      * The application scopes to be granted.
    //      * [See docs](https://github.com/hapijs/hapi/blob/master/API.md#-routeoptionsauthaccessscope)
    //      */
    //     scope?: string[];
    //     /**
    //      * If set, will only work with routes that set `access.entity` to `user`.
    //      */
    //     user?: UserCredentials;

    //     /**
    //      * If set, will only work with routes that set `access.entity` to `app`.
    //      */
    //     app?: AppCredentials;
    // }

    // Application specific state (`server.app`).
    // export interface ServerApplicationState {
    // }

    // Type for application specific state on requests (`request.app`).
    // export interface RequestApplicationState {
    // }

    // Type for application specific state on responses (`response.app`).
    // export interface ResponseApplicationState {
    // }
}
