import type { Page } from "@playwright/test";

export async function initAndLogIn(
  page: Page,
  id: string,
  kind: "TEACHER" | "STUDENT",
): Promise<void> {
  const params = new URLSearchParams({
    id,
    entry_kind: kind,
  });
  await page.goto("/init_fake");
  await page.goto(`/init_session?${params}`);
}
