import * as React from "react";
import BaseEmail, { EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
  teamUrl: string;
  webhookName: string;
};

/**
 * Email sent to the creator of a webhook when the webhook has become disabled
 * due to repeated failure.
 */
export default class WebhookDisabledEmail extends BaseEmail<
  Props,
  Record<string, any>
> {
  protected subject() {
    return `Warning: Webhook disabled`;
  }

  protected preview({ webhookName }: Props) {
    return `Your webhook (${webhookName}) has been disabled`;
  }

  protected markup({ teamUrl }: Props) {
    const url = `${teamUrl}/settings/webhooks`;
    const name = "View Settings";

    return JSON.stringify({
      "@context": "http://schema.org",
      "@type": "EmailMessage",
      potentialAction: {
        "@type": "ViewAction",
        url,
        name,
      },
    });
  }

  protected renderAsText({ webhookName, teamUrl }: Props): string {
    return `
Your webhook (${webhookName}) has been automatically disabled as the last 25 
delivery attempts have failed. You can re-enable by editing the webhook.

Webhook settings: ${teamUrl}/settings/webhooks
`;
  }

  protected render({ webhookName, teamUrl }: Props) {
    return (
      <EmailTemplate
        previewText={this.preview({ webhookName } as Props)}
        markup={this.markup({ teamUrl } as Props)}
      >
        <Header />

        <Body>
          <Heading>Webhook disabled</Heading>
          <p>
            Your webhook ({webhookName}) has been automatically disabled as the
            last 25 delivery attempts have failed. You can re-enable by editing
            the webhook.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={teamUrl + "/settings/webhooks"}>
              Webhook settings
            </Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
