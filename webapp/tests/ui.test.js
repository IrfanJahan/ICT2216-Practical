const test = require("node:test");
const assert = require("node:assert/strict");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const appUrl = process.env.APP_URL || "https://nginx";
const seleniumUrl = process.env.SELENIUM_URL || "http://127.0.0.1:4444/wd/hub";

test("create account UI flow", async () => {
  const options = new chrome.Options();
  options.addArguments("--headless=new");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--ignore-certificate-errors");
  options.setAcceptInsecureCerts(true);

  const driver = await new Builder()
    .forBrowser("chrome")
    .usingServer(seleniumUrl)
    .setChromeOptions(options)
    .build();

  try {
    await driver.get(`${appUrl}/create-account`);
    await driver.findElement(By.name("username")).sendKeys(`ui_${Date.now()}`);
    await driver.findElement(By.name("password")).sendKeys("MySecurePassword2026");
    await driver.findElement(By.css("button")).click();
    await driver.wait(until.elementLocated(By.css("h1")), 10000);

    const source = await driver.getPageSource();
    assert.match(source, /Welcome/);
    assert.match(source, /MySecurePassword2026/);
  } finally {
    await driver.quit();
  }
});