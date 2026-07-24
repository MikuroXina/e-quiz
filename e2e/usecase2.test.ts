import { test, expect } from "@playwright/test";
import { initAndLogIn } from "./common";

test("A teacher can open an existing new course and edit existing content and quiz", async ({
  page,
}) => {
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

  await page.getByRole("textbox", { name: "本文" }).fill(`
    # Hello, world!

    これは Markdown です. **Bold**, _Italic_, \`code\` が使えます.
  `);

  const quiz1Container = page.getByTestId("quiz").filter({ hasText: "クイズ 1 の問題文" });
  await quiz1Container
    .getByRole("textbox", { name: "クイズ 1 の問題文" })
    .fill("下のクイズの正解は順に 2, 3 です.");
  await quiz1Container.getByText("これが正解").nth(1).click();

  await page.getByRole("button", { name: "クイズを追加" }).click();

  const quiz2Container = page.getByTestId("quiz").filter({ hasText: "クイズ 2 の問題文" });
  await quiz2Container.getByRole("button", { name: "選択肢を追加する" }).click();
  await quiz2Container.getByRole("button", { name: "選択肢を追加する" }).click();
  await quiz2Container.getByTestId("choice-textbox").nth(0).fill("foo");
  await quiz2Container.getByTestId("choice-textbox").nth(1).fill("bar");
  await quiz2Container.getByTestId("choice-textbox").nth(2).fill("baz");
  await quiz2Container.getByText("これが正解").nth(2).click();

  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("button", { name: "保存" })).toBeDisabled();
  await page.reload();

  await expect(quiz1Container.getByTestId("choice-radio").nth(1)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(quiz2Container.getByTestId("choice-radio").nth(2)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(quiz2Container.getByTestId("choice-textbox").nth(0)).toHaveValue("foo");
  await expect(quiz2Container.getByTestId("choice-textbox").nth(1)).toHaveValue("bar");
  await expect(quiz2Container.getByTestId("choice-textbox").nth(2)).toHaveValue("baz");
});
