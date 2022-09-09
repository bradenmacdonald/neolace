/**
 * This file contains our custom code for working with internationalization and localization (making the Neolace
 * frontend work in multiple languages).
 *
 * Generally we just use react-i18n directly, so see its documentation for usage instructions. However, some of our
 * custom components want to enforce best practices, so we use the `TranslatableText` type to indicate where text should
 * always be marked for translation when used with our custom components. This helps ensure that more of the UI is
 * correctly made available for translation.
 *
 * So in general when writing a custom UI component that accepts a text string that's coming from the code (not coming
 * from the user or the API), you should make that 'prop' accept the TranslatableText type, not a plain string. Then,
 * within the UI component, use displayText() to display that TranslatableText in the current language.
 *
 * Outside of custom reusable components, just use <FormattedMessage> from react-intl directly.
 */
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
 * A string that appears in the UI and which can be translated and localized into different languages.
 *
 * Use this when defining a custom UI component that needs to accept a text string as a property, and use it as a plain
 * text string, e.g. when setting an HTML attribute.
 */
export type TranslatableString =
    | CustomMessage
    | { msg: CustomMessage; values: Record<string, string> };

/** Use this function to indicate which text should be translated. */
export function defineMessage(md: MessageDescriptor | CustomMessage): CustomMessage {
    return md as CustomMessage;
}

/**
 * Use this function to pass text that can't be translated (like someone's name) to a component expecting
 * TranslatableText
 */
export function noTranslationNeeded(text: string): CustomMessage {
    return { defaultMessage: text, id: "" } as CustomMessage;
}

/**
 * Use this function to display the translated/localized version of a TranslatableText as a React element.
 *
 * That is, this is the "normal" way to include translatable text in the UI, when building our own widgets.
 * In other cases, where you're not working with TranslatableText, you can just use <FormattedMessage> directly.
 * Or if you have a TranslatableText object and you need to access it as a string (not a React element), use
 * displayString()
 */
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

/**
 * Use this function to get the translated/localized version of a TranslatableText as a string.
 * You need to pass in the 'intl' object, which you can get using the useIntl() React hook.
 *
 * This is an alternative to displayText(), which returns it as a React element.
 * You can also use intl.formatMessage() directly, if you aren't working with a TranslatableText object specifically.
 */
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
