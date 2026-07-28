import { test, expect } from "@playwright/test";
import { initAndLogIn } from "./common";

test("A student can check an invitation and enroll the course with opening it", async ({
  page,
}) => {
  await initAndLogIn(page, "auth0|69c0b7d478b2b5818046fcd4", "STUDENT");

  await page.goto("/invite?course_id=a2b6e251-ee4a-4d88-a31e-ea55beeca12e");

  await expect(page).toHaveTitle("招待確認");
  await expect(
    page.getByText("教員 堀田 葵 から講座「かんどうする」に招待されました"),
  ).toBeVisible();

  await page.getByRole("button", { name: "受講する" }).click();

  await expect(page).toHaveTitle("講座 かんどうする - e-Quiz");
  await expect(page.getByText("コンテンツ一覧")).toBeVisible();
});
