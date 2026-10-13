/**
 * browserTools.js — Playwright-based browser automation tools
 * Replaces Python agent/tools/browser_tools.py
 */
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import { ToolResult } from './schemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class BrowserSession {
  static _instance = null;

  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.runId = 'default_run';
  }

  static getInstance() {
    if (!BrowserSession._instance) {
      BrowserSession._instance = new BrowserSession();
    }
    return BrowserSession._instance;
  }

  setRunId(runId) {
    this.runId = runId;
  }

  async ensurePage() {
    if (!this.page || this.page.isClosed()) {
      if (!this.browser || !this.browser.isConnected()) {
        const headless = process.env.HEADLESS !== '0';
        this.browser = await chromium.launch({ headless });
      }
      if (!this.context) {
        this.context = await this.browser.newContext({
          viewport: { width: 1280, height: 800 },
        });
      }
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(10000);
    }
    return this.page;
  }

  async close() {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    this.page = null;
  }
}

export async function browserOpen(url) {
  try {
    const session = BrowserSession.getInstance();
    const page = await session.ensurePage();
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    const statusCode = response ? response.status() : 200;
    const currentUrl = page.url();
    const title = await page.title();
    return new ToolResult({
      ok: true,
      data: { url: currentUrl, title, status_code: statusCode },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Failed to open URL '${url}': ${err.message}` });
  }
}

export async function browserSnapshot() {
  try {
    const session = BrowserSession.getInstance();
    const page = await session.ensurePage();
    let snapshot = '';
    try {
      if (typeof page.locator('body').ariaSnapshot === 'function') {
        snapshot = await page.locator('body').ariaSnapshot();
      } else {
        snapshot = await page.content();
      }
    } catch {
      snapshot = await page.content();
    }
    return new ToolResult({
      ok: true,
      data: {
        url: page.url(),
        title: await page.title(),
        snapshot,
      },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Failed to capture snapshot: ${err.message}` });
  }
}

export async function browserClick(selectorOrText) {
  try {
    const session = BrowserSession.getInstance();
    const page = await session.ensurePage();

    if ((await page.locator(selectorOrText).count()) > 0) {
      await page.locator(selectorOrText).first().click();
    } else if ((await page.getByRole('button', { name: selectorOrText }).count()) > 0) {
      await page.getByRole('button', { name: selectorOrText }).first().click();
    } else if ((await page.getByText(selectorOrText, { exact: false }).count()) > 0) {
      await page.getByText(selectorOrText, { exact: false }).first().click();
    } else {
      await page.click(selectorOrText);
    }

    await page.waitForTimeout(300);
    return new ToolResult({
      ok: true,
      data: { clicked: selectorOrText, current_url: page.url() },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Failed to click '${selectorOrText}': ${err.message}` });
  }
}

export async function browserType(target, text) {
  try {
    const session = BrowserSession.getInstance();
    const page = await session.ensurePage();

    let loc;
    if ((await page.locator(target).count()) > 0) {
      loc = page.locator(target).first();
    } else if ((await page.getByLabel(target, { exact: false }).count()) > 0) {
      loc = page.getByLabel(target, { exact: false }).first();
    } else if ((await page.getByPlaceholder(target, { exact: false }).count()) > 0) {
      loc = page.getByPlaceholder(target, { exact: false }).first();
    } else {
      loc = page.locator(`input[name='${target}'], textarea[name='${target}']`).first();
    }

    await loc.fill(String(text));
    return new ToolResult({
      ok: true,
      data: { target, typed_length: String(text).length },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Failed to type into '${target}': ${err.message}` });
  }
}

export async function browserSelect(target, value) {
  try {
    const session = BrowserSession.getInstance();
    const page = await session.ensurePage();

    let loc;
    if ((await page.locator(target).count()) > 0) {
      loc = page.locator(target).first();
    } else if ((await page.getByLabel(target, { exact: false }).count()) > 0) {
      loc = page.getByLabel(target, { exact: false }).first();
    } else {
      loc = page.locator(`select[name='${target}']`).first();
    }

    await loc.selectOption({ value: String(value) });
    return new ToolResult({
      ok: true,
      data: { target, selected_value: value },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Failed to select '${value}' in '${target}': ${err.message}` });
  }
}

export async function browserScreenshot(label = 'screenshot') {
  try {
    const session = BrowserSession.getInstance();
    const page = await session.ensurePage();

    const runId = session.runId;
    const reportsDir = path.resolve(__dirname, '../../../../reports');
    const outDir = path.join(reportsDir, 'screenshots', runId);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const filename = `${Date.now()}_${label.replace(/\s+/g, '_')}.png`;
    const filepath = path.join(outDir, filename);
    await page.screenshot({ path: filepath });

    return new ToolResult({
      ok: true,
      data: { filepath, label, run_id: runId },
    });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Failed to take screenshot: ${err.message}` });
  }
}

export async function browserWaitFor(text, timeoutMs = 10000) {
  try {
    const session = BrowserSession.getInstance();
    const page = await session.ensurePage();
    await page.waitForSelector(`text=${text}`, { timeout: timeoutMs });
    return new ToolResult({ ok: true, data: { found_text: text } });
  } catch (err) {
    return new ToolResult({ ok: false, error: `Timed out waiting for text '${text}': ${err.message}` });
  }
}

export default {
  BrowserSession,
  browserOpen,
  browserSnapshot,
  browserClick,
  browserType,
  browserSelect,
  browserScreenshot,
  browserWaitFor,
};
