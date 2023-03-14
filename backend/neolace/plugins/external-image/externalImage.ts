import { LookupContext, LookupExpression, LookupFunctionWithArgs, LookupValues } from "neolace/plugins/api.ts";

/**
 * externalImage(url, alt)
 *
 * Display an external image.
 */
export class ExternalImage extends LookupFunctionWithArgs {
    static functionName = "externalImage";

    /** An expression that the URL of the image */
    public get imageUrl(): LookupExpression {
        return this.firstArg;
    }
    /** An expression that will be displayed if people cannot see the image */
    public get altText(): LookupExpression {
        return this.otherArgs.alt;
    }

    protected override validateArgs(): void {
        this.requireArgs(["alt"], { optional: [] });
    }

    public async getValue(context: LookupContext): Promise<LookupValues.PluginValue> {
        const imageUrl = await this.imageUrl.getValueAs(LookupValues.StringValue, context);
        const altText = await this.altText.getValueAs(LookupValues.StringValue, context);

        return new LookupValues.PluginValue("external-image", {
            url: imageUrl.value,
            alt: altText.value,
        });
    }
}
