import React from "react";
import { FormattedMessage, IntlShape, MessageDescriptor } from "react-intl";

const _isDefined = Symbol("_isDefined");

interface CustomMessage extends MessageDescriptor {
    defaultMessage: string;
    [_isDefined]: true;
}

/**
 * Use this when defining a custom UI component that needs to accept a text string as a property, and display it in the
 * UI, anywhere that JSX/HTML objects are supported. The UI component should use displayText() to convert this to a
 * <FormattedMessage/> object, which will actually translate it.
 */
export type TranslatableText =
    | CustomMessage
    | { msg: CustomMessage; values: Record<string, React.ReactNode> }
    | { custom: React.ReactNode };

/**
 * Use this when defining a custom UI component that needs to accept a text string as a property, and use it as a plain
 * text string, e.g. when setting an HTML attribute. The UI component should use
 * `const intl = useIntl()` and `intl.formatMessage(...)`
 */
export type TranslatableString =
    | CustomMessage
    | { msg: CustomMessage; values: Record<string, string> };

/** Use this function to indicate which text should be translated. */
export function defineMessage(md: MessageDescriptor | CustomMessage): CustomMessage {
    return md as CustomMessage;
}

/** Use this function to pass text that can't be translated (like someone's name) to a component expecting TranslatableText */
export function noTranslationNeeded(text: string): CustomMessage {
    return { defaultMessage: text, id: "" } as CustomMessage;
}

export function displayText(message: TranslatableText, values?: Record<string, React.ReactNode>): React.ReactNode {
    if ("custom" in message) {
        return message.custom;
    } else if ("msg" in message) {
        if (message.msg.id === "") {
            // Somehow this message is missing an ID. react-intl will throw an error if we try to translate it.
            return <>{message.msg.defaultMessage}</>;
        }
        return (
            // eslint-disable-next-line formatjs/enforce-id
            <FormattedMessage
                defaultMessage={message.msg.defaultMessage}
                id={message.msg.id}
                values={{ ...message.values, ...values }}
            />
        );
    } else {
        if (message.id === "") {
            // Somehow this message is missing an ID. react-intl will throw an error if we try to translate it.
            return <>{message.defaultMessage}</>;
        }
        // eslint-disable-next-line formatjs/enforce-id
        return <FormattedMessage defaultMessage={message.defaultMessage} id={message.id} values={values} />;
    }
}

export function displayString(intl: IntlShape, message: TranslatableString, values?: Record<string, string>): string {
    if ("msg" in message) {
        if (message.msg.id === "") {
            return message.msg.defaultMessage;
        }
        return intl.formatMessage(message.msg, { ...message.values, ...values });
    } else {
        if (message.id === "") {
            return message.defaultMessage;
        }
        return intl.formatMessage(message, values);
    }
}
