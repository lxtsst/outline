// @flow
import parseTitle from "shared/utils/parseTitle";
import DocumentsStore from "stores/DocumentsStore";
import Document from "models/Document";
import { client } from "./ApiClient";

type Options = {
  file: File,
  documents: DocumentsStore,
  collectionId: string,
  documentId?: string,
};

const importFile = async ({
  documents,
  file,
  documentId,
  collectionId,
}: Options): Promise<Document> => {
  return new Promise(async (resolve, reject) => {
    // docx support
    if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const newFileMarkdown = await getMarkdownFromDocx(file);
        const document = await processAndSaveDocument(newFileMarkdown, {
          documents,
          file,
          documentId,
          collectionId,
        });
        resolve(document);
      } catch (err) {
        reject(err);
      }
      return;
    }

    const reader = new FileReader();

    reader.onload = async (ev) => {
      try {
        const document = await processAndSaveDocument(ev, {
          documents,
          file,
          documentId,
          collectionId,
        });
        resolve(document);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};

async function getMarkdownFromDocx(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { markdown } = await client.post("/files.import", formData);
  return markdown;
}

async function processAndSaveDocument(
  ev,
  { documents, file, documentId, collectionId }: Options
) {
  let text = typeof ev === "string" ? ev : ev.target.result;
  let title;

  // If the first line of the imported file looks like a markdown heading
  // then we can use this as the document title
  if (text.trim().startsWith("# ")) {
    const result = parseTitle(text);
    title = result.title;
    text = text.replace(`# ${title}\n`, "");

    // otherwise, just use the filename without the extension as our best guess
  } else {
    title = file.name.replace(/\.[^/.]+$/, "");
  }

  let document = new Document(
    {
      parentDocumentId: documentId,
      collectionId,
      text,
      title,
    },
    documents
  );

  document = await document.save({ publish: true });
  return document;
}

export default importFile;
