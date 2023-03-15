import * as React from "react";
import { NotificationEventType } from "@shared/types";
import env from "@server/env";
import { Collection, User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import BaseEmail from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = {
  to: string;
  eventName: string;
  userId: string;
  collectionId: string;
};

type BeforeSend = {
  collection: Collection;
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when they have enabled notifications of new collection
 * creation.
 */

export default class CollectionNotificationEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({ userId, collectionId }: Props) {
    const collection = await Collection.scope("withUser").findByPk(
      collectionId
    );
    if (!collection) {
      return false;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return false;
    }

    return {
      collection,
      unsubscribeUrl: NotificationSettingsHelper.unsubscribeUrl(
        user,
        NotificationEventType.CreateCollection
      ),
    };
  }

  protected subject({ collection, eventName }: Props) {
    return `“${collection.name}” ${eventName}`;
  }

  protected preview({ collection, eventName }: Props) {
    return `${collection.user.name} ${eventName} a collection`;
  }

  protected renderAsText({ collection, eventName = "created" }: Props) {
    return `
${collection.name}

${collection.user.name} ${eventName} the collection "${collection.name}"

Open Collection: ${env.URL}${collection.url}
`;
  }

  protected render({
    collection,
    eventName = "created",
    unsubscribeUrl,
  }: Props) {
    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>{collection.name}</Heading>
          <p>
            {collection.user.name} {eventName} the collection "{collection.name}
            ".
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={`${env.URL}${collection.url}`}>
              Open Collection
            </Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
