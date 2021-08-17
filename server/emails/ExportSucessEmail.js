// @flow
import * as React from "react";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

export const exportEmailSuccessText = `
Your Data Export

Your requested data export is complete, the exported files are also available in the admin section.
`;

export const ExportSuccessEmail = ({ id }: { id: string }) => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>Your Data Export</Heading>
        <p>
          Your requested data export is complete, the exported files are also
          available in the admin section.
        </p>
        <EmptySpace height={10} />
        <p>
          <Button
            href={`${process.env.URL}/api/fileOperations.redirect?id=${id}`}
          >
            View my export
          </Button>
        </p>
      </Body>

      <Footer />
    </EmailTemplate>
  );
};
