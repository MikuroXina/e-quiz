import { test, expect } from "@playwright/test";
import { initAndLogIn } from "./common";

test("A teacher can change the publish state of content", async ({ page }) => {
  await initAndLogIn(page, "auth0|69c0b7d478b2b5818046fcd4", "TEACHER");

  await page.goto("/");
  await expect(page.getByText("りょうど")).toBeVisible();
  await page
    .getByTestId("course-card")
    .filter({ hasText: "りょうど" })
    .getByRole("link", { name: "開く" })
    .click();

  await expect(page.getByText("よくし")).toBeVisible();
  const contentCard = page.getByTestId("content-card").filter({ hasText: "よくし" });
  await contentCard.getByRole("button", { name: "非公開" }).click();
  await page.getByRole("option", { name: "公開済み" }).click();
  await expect(contentCard.getByRole("button", { name: "公開済み" })).toBeVisible();
});
