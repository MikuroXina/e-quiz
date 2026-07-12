import sanitize from "sanitize-html";
import { marked } from "marked";

export async function mdToHtml(markdown: string): Promise<string> {
  return sanitize(await marked(markdown));
}
