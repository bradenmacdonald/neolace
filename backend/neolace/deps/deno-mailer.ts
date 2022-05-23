import * as log from "std/log/mod.ts";

export enum MailProvider {
    /** For development: just log emails to the console; don't actually send anything. */
    Console = "console",
    /** https://postmarkapp.com/ */
    Postmark = "postmark",
}

export interface Recipient {
    name?: string;
    email: string;
}

export interface Email {
    from: Recipient;
    /** to can either be a single email address or an array of Recipients */
    to: Recipient[] | string;
    cc?: Recipient[];
    bcc?: Recipient[];
    subject: string;
    bodyHtml?: string;
    bodyPlainText: string;
    replyTo?: string;
}

export abstract class Mailer {
    protected constructor() {}

    public abstract sendEmail(email: Email): Promise<void>;

    public static init(provider: MailProvider | string, config: Record<string, unknown> = {}): Mailer {
        if (provider === MailProvider.Console) {
            return new ConsoleMailer();
        } else if (provider === MailProvider.Postmark) {
            return new PostmarkMailer(config);
        } else {
            throw new Error(`Invalid mailer configuration; unknown provider "${provider}"`);
        }
    }
}

class ConsoleMailer extends Mailer {
    public async sendEmail(email: Email): Promise<void> {
        const toString = typeof email.to === "string"
            ? email.to
            : (email.to.length === 1 ? email.to[0].email : `${email.to.length} recipients`);
        const lineLength = 118;
        let text = email.bodyPlainText;
        const lines = [];
        // log the email text, with word wrapping and indentation
        while (text.length > 0) {
            let line;
            const newlinePos = text.indexOf("\n");
            const spacePos = text.lastIndexOf(" ", lineLength);
            if (newlinePos >= 0 && newlinePos < lineLength) {
                // wrap at the newline
                line = text.substring(0, newlinePos);
                text = text.substring(newlinePos + 1);
            } else if (text.length <= lineLength) {
                // No need to wrap; the last line is short enough to print as-is.
                line = text;
                text = "";
            } else if (spacePos > 0) {
                // wrap at the last space on the line
                line = text.substring(0, spacePos);
                text = text.substring(spacePos + 1);
            } else {
                // If there is something like a URL that's longer than a single line, don't break it, just display it as is:
                let nextWhitespace = text.search(/\s/);
                if (nextWhitespace === -1) {
                    nextWhitespace = text.length;
                }
                line = text.substring(0, nextWhitespace);
                text = text.substring(nextWhitespace + 1);
            }
            lines.push(`> ${line}`);
        }
        log.info(`Sent email to ${toString} with subject "${email.subject}":\n` + lines.join("\n"));
    }
}

interface PostmarkConfig {
    apiToken: string;
}

class PostmarkMailer extends Mailer {
    #config: PostmarkConfig;

    constructor(readonly config: Record<string, unknown>) {
        super();
        if (typeof config.apiToken !== "string" || !config.apiToken) {
            throw new Error(`PostmarkMailer: missing required config value for "apiToken".`);
        }
        this.#config = {
            apiToken: config.apiToken,
        };
    }

    public async sendEmail(_email: Email): Promise<void> {
        throw new Error("Postmark sender hasn't been implemented yet.");
    }
}

/**
 * When sending email, sometimes you just want a very simple, modern, responsive HTML template to use.
 * Well, https://github.com/leemunroe/responsive-html-email-template by Lee Munroe is exactly that.
 *
 * This function just provides that template ready for you to use with deno-mailer.
 *
 * leemunroe/responsive-html-email-template is licensed under the MIT License.
 *
 * "previewText" is an optional "hidden" message included in the HTML which may be shown
 * by some mail clients when previewing the email before the user clicks on it to read it.
 */
export function responsiveHtmlEmailTemplate(
    args: { title: string; previewText: string; contentHtml: string; footerHtml: string },
): string {
    return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${args.title}</title>
        <style>
    @media only screen and (max-width: 620px) {
      table.body h1 {
        font-size: 28px !important;
        margin-bottom: 10px !important;
      }
    
      table.body p,
    table.body ul,
    table.body ol,
    table.body td,
    table.body span,
    table.body a {
        font-size: 16px !important;
      }
    
      table.body .wrapper,
    table.body .article {
        padding: 10px !important;
      }
    
      table.body .content {
        padding: 0 !important;
      }
    
      table.body .container {
        padding: 0 !important;
        width: 100% !important;
      }
    
      table.body .main {
        border-left-width: 0 !important;
        border-radius: 0 !important;
        border-right-width: 0 !important;
      }
    
      table.body .btn table {
        width: 100% !important;
      }
    
      table.body .btn a {
        width: 100% !important;
      }
    
      table.body .img-responsive {
        height: auto !important;
        max-width: 100% !important;
        width: auto !important;
      }
    }
    @media all {
      .ExternalClass {
        width: 100%;
      }
    
      .ExternalClass,
    .ExternalClass p,
    .ExternalClass span,
    .ExternalClass font,
    .ExternalClass td,
    .ExternalClass div {
        line-height: 100%;
      }
    
      .apple-link a {
        color: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
    
      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }
    
      .btn-primary table td:hover {
        background-color: #34495e !important;
      }
    
      .btn-primary a:hover {
        background-color: #34495e !important;
        border-color: #34495e !important;
      }
    }
    </style>
      </head>
      <body style="background-color: #f6f6f6; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
        <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">${args.previewText}</span>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6; width: 100%;" width="100%" bgcolor="#f6f6f6">
          <tr>
            <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
            <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; margin: 0 auto;" width="580" valign="top">
              <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px;">
    
                <!-- START CENTERED WHITE CONTAINER -->
                <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">
    
                  <!-- START MAIN CONTENT AREA -->
                  <tr>
                    <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                        <tr>
                          <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                            ${args.contentHtml}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
    
                <!-- END MAIN CONTENT AREA -->
                </table>
                <!-- END CENTERED WHITE CONTAINER -->
    
                <!-- START FOOTER -->
                <div class="footer" style="clear: both; margin-top: 10px; text-align: center; width: 100%;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                    <tr>
                      <td class="content-block" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; color: #999999; font-size: 12px; text-align: center;" valign="top" align="center">
                        ${args.footerHtml}
                      </td>
                    </tr>
                  </table>
                </div>
                <!-- END FOOTER -->
              </div>
            </td>
            <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
          </tr>
        </table>
      </body>
    </html>
    `;
}
