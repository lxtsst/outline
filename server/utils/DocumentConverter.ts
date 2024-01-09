import mammoth from "mammoth";
import quotedPrintable from "quoted-printable";
import utf8 from "utf8";
import { FileImportError } from "@server/errors";
import turndownService from "@server/utils/turndown";

export class DocumentConverter {
  /**
   * Convert an incoming file to markdown.
   * @param content The content of the file.
   * @param fileName The name of the file, including extension.
   * @param mimeType The mime type of the file.
   * @returns The markdown representation of the file.
   */
  public static async convertToMarkdown(
    content: Buffer | string,
    fileName: string,
    mimeType: string
  ) {
    switch (mimeType) {
      case "application/msword":
        return this.confluenceToMarkdown(content);
      case "application/octet-stream":
        if (fileName.endsWith(".docx")) {
          return this.docXToMarkdown(content);
        }
        throw FileImportError(`File type ${mimeType} not supported`);
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return this.docXToMarkdown(content);
      case "text/html":
        return this.htmlToMarkdown(content);
      case "text/plain":
      case "text/markdown":
        return this.fileToMarkdown(content);
      default:
        break;
    }

    const extension = fileName.split(".").pop();
    switch (extension) {
      case "docx":
        return this.docXToMarkdown(content);
      case "html":
        return this.htmlToMarkdown(content);
      case "md":
      case "markdown":
        return this.fileToMarkdown(content);
      default:
        throw FileImportError(`File type ${mimeType} not supported`);
    }
  }

  public static async docXToMarkdown(content: Buffer | string) {
    if (content instanceof Buffer) {
      const { value } = await mammoth.convertToHtml({
        buffer: content,
      });

      return turndownService.turndown(value);
    }

    throw FileImportError("Unsupported Word file");
  }

  public static async htmlToMarkdown(content: Buffer | string) {
    if (content instanceof Buffer) {
      content = content.toString("utf8");
    }

    return turndownService.turndown(content);
  }

  public static async fileToMarkdown(content: Buffer | string) {
    if (content instanceof Buffer) {
      content = content.toString("utf8");
    }
    return content;
  }

  public static async confluenceToMarkdown(value: Buffer | string) {
    if (value instanceof Buffer) {
      value = value.toString("utf8");
    }

    // We're only supporting the ridiculous output from Confluence here, regular
    // Word documents should call into the docxToMarkdown importer.
    // See: https://jira.atlassian.com/browse/CONFSERVER-38237
    if (!value.includes("Content-Type: multipart/related")) {
      throw FileImportError("Unsupported Word file");
    }

    // get boundary marker
    const boundaryMarker = value.match(/boundary="(.+)"/);

    if (!boundaryMarker) {
      throw FileImportError("Unsupported Word file (No boundary marker)");
    }

    // get content between multipart boundaries
    let boundaryReached = 0;
    const lines = value.split("\n").filter((line) => {
      if (line.includes(boundaryMarker[1])) {
        boundaryReached++;
        return false;
      }

      if (line.startsWith("Content-")) {
        return false;
      }

      // 1 == definition
      // 2 == content
      // 3 == ending
      if (boundaryReached === 2) {
        return true;
      }

      return false;
    });

    if (!lines.length) {
      throw FileImportError("Unsupported Word file (No content found)");
    }

    // Mime attachment is "quoted printable" encoded, must be decoded first
    // https://en.wikipedia.org/wiki/Quoted-printable
    value = utf8.decode(quotedPrintable.decode(lines.join("\n")));

    // If we don't remove the title here it becomes printed in the document
    // body by turndown
    turndownService.remove(["style", "title"]);

    // Now we should have something that looks like HTML
    const html = turndownService.turndown(value);
    return html.replace(/<br>/g, " \\n ");
  }
}
