import { test, expect } from "@playwright/test";
import { initAndLogIn } from "./common";

test("A teacher can add a new course and write new content and quiz", async ({ page }) => {
  await initAndLogIn(page, "1a7170e4-a488-42fc-bfe9-e130564d5482", "TEACHER");

  await page.goto("/");

  await page.getByRole("button", { name: "講座を新規追加" }).click();
  await page.getByLabel("名前").fill("foo bar");
  await page.getByRole("button", { name: "追加する" }).click();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByText("foo bar")).toBeVisible();

  await page
    .getByTestId("course-card")
    .filter({ hasText: "foo bar" })
    .getByRole("link", { name: "開く" })
    .click();

  await expect(page.getByText("コンテンツ一覧")).toBeVisible();

  await page.getByRole("button", { name: "コンテンツを新規追加" }).click();
  await page.getByLabel("名前").fill("baz fred");
  await page.getByRole("button", { name: "追加する" }).click();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByText("baz fred")).toBeVisible();
});
