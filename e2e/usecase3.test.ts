import { test, expect } from "@playwright/test";
import { initAndLogIn } from "./common";

test("A teacher can preview an existing content", async ({ page }) => {
  await initAndLogIn(page, "1a7170e4-a488-42fc-bfe9-e130564d5482", "TEACHER");

  await initAndLogIn(page, "auth0|69c0b7d478b2b5818046fcd4", "TEACHER");

  await page.goto("/");
  await expect(page.getByText("りょうど")).toBeVisible();
  await page
    .getByTestId("course-card")
    .filter({ hasText: "りょうど" })
    .getByRole("link", { name: "開く" })
    .click();

  await expect(page.getByText("よくし")).toBeVisible();
  await page
    .getByTestId("content-card")
    .filter({ hasText: "よくし" })
    .getByRole("link", { name: "開く" })
    .click();

  const contentMdEditor = page.getByRole("textbox", { name: "本文" });
  await contentMdEditor.clear();
  await contentMdEditor.fill(`# Hello, world!

これは Markdown です. **Bold**, _Italic_, \`code\` が使えます.
`);
  await page.getByRole("button", { name: "保存" }).click();

  await page.getByRole("tab", { name: "プレビュー" }).click();

  const previewPanel = page.getByRole("tabpanel", { name: "プレビュー" });
  await expect(previewPanel).toMatchAriaSnapshot(`
    - heading "Hello, world!" [level=1]
    - paragraph:
      - text: これは Markdown です.
      - strong: Bold
      - text: ","
      - emphasis: Italic
      - text: ","
      - code: code
      - text: が使えます.
  `);
});
