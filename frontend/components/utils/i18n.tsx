import { FormattedMessage, MessageDescriptor, IntlShape } from "react-intl";

const _isDefined = Symbol("_isDefined");

export interface TranslatableText extends MessageDescriptor {
    [_isDefined]: true, 
}

/** Use this function to indicate which text should be translated. */
export function defineMessage(md: MessageDescriptor|TranslatableText): TranslatableText {
    return md as TranslatableText;
}

/** Use this function to pass text that can't be translated (like someone's name) to a component expecting TranslatableText */
export function noTranslationNeeded(text: string): TranslatableText {
    return {defaultMessage: text, id: ""} as TranslatableText;
}

export function displayText(text: TranslatableText, values?: Record<string, React.ReactNode>) {
    if (text.id === "") {
        return text.defaultMessage;
    }
    return <FormattedMessage defaultMessage={text.defaultMessage} id={text.id} values={values} />;
}
