const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const results = {};

  for (const url of [
    "https://chapmee.com/truyen",
    "https://chapmee.com/community/story/meo-nho-thao-thiet-cua-te-vuong"
  ]) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator("main").innerText().catch(() => "");
    const alertText = await page.locator('[role="alert"]').allTextContents().catch(() => []);
    const title = await page.title();
    const shot = url.includes("/truyen")
      ? path.join(__dirname, "truyen-browser.png")
      : path.join(__dirname, "community-browser.png");
    await page.screenshot({ path: shot, fullPage: true });

    const storyLink = await page
      .locator('a[href*="/truyen/meo-nho"]')
      .first()
      .getAttribute("href")
      .catch(() => null);

    results[url] = {
      status: resp?.status(),
      title,
      alertText,
      storyLink,
      hasStoryTitle: bodyText.includes("Mèo Nhỏ"),
      hasCatalogHeader: bodyText.includes("Danh mục truyện"),
      hasErrorBanner:
        bodyText.includes("Không thể") ||
        bodyText.includes("Không tải") ||
        bodyText.includes("Something went wrong"),
      hasDescription: bodyText.includes("Thần thú") || bodyText.includes("Thao Thiết"),
      hasFakeFeed: bodyText.includes("Bình luận hot") || bodyText.includes("345 thành viên"),
      hasNewTabs: bodyText.includes("Hoạt động") || bodyText.includes("Thảo luận"),
      bodySnippet: bodyText.slice(0, 1500),
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors],
      screenshot: shot
    };
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
