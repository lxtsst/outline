import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Trello(props: Props) {
  const { matches } = props.attrs;
  const objectId = matches[2];

  if (matches[1] === "c") {
    return (
      <Frame
        width="316px"
        height="141px"
        src={`https://trello.com/embed/card?id=${objectId}`}
        title={`Trello Card (${objectId})`}
      />
    );
  }

  return (
    <Frame
      {...props}
      width="248px"
      height="185px"
      src={`https://trello.com/embed/board?id=${objectId}`}
      title={`Trello Board (${objectId})`}
    />
  );
}

Trello.ENABLED = [/^https:\/\/trello\.com\/(c|b)\/([^/]*)(.*)?$/];

export default Trello;
