#!/usr/bin/env node
/**
 * 场景截图脚本（puppeteer-core + 本机 Chrome/Edge，SwiftShader 软件 WebGL）。
 *
 * 依赖 Lead 在 src/main.ts 暴露的调试接口：
 *   window.__DEV__ = {
 *     ready: boolean,
 *     setProgress(p: number): void,
 *     jumpTo(index: number): void,
 *     progressForEra(index: number): number, // 各时代驻留位的滚动进度
 *     state(): { progress: number; eraIndex: number; f: number },
 *     info(): { calls: number; triangles: number; geometries: number }, // 性能验收
 *   }
 *
 * 用法：
 *   npm run build && npm run preview            # 另开一个终端
 *   npm run shots                               # 默认 http://127.0.0.1:4173/
 *   npm run shots -- --url http://127.0.0.1:5173/ --out artifacts/shots
 *
 * 截图点：
 *   00-intro  p=0.02                      序章
 *   era1..era7  __DEV__.progressForEra(i) 各时代驻留位（不再用固定公式，避免落在过渡中段）
 *   08-end   p=0.99                       结语
 *
 * 每张截图前：setProgress(p) → 等 900ms 稳定 → 读 __DEV__.state()/info() → 截图。
 * 打印每张的 state（progress/eraIndex/f）与 info（calls/triangles/geometries），
 * 汇总性能采样并对照目标 calls < 300（超出只告警，不阻塞截图）。
 *
 * 退出码：0 成功；1 脚本异常；2 环境/接口未就绪（找不到浏览器、__DEV__ 超时）；
 *         3 页面出现 WebGL 失败 / 控制台 error / 页面异常 / 截图失败。
 */

import { existsSync } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { launch } from 'puppeteer-core';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);

const DEFAULT_URL = 'http://127.0.0.1:4173/';
const DEFAULT_OUT = path.join(ROOT, 'artifacts', 'shots');
const VIEWPORT = { width: 1600, height: 900, deviceScaleFactor: 1 };
/** 场景变多后首帧构建可能 3–5s，默认给到 90s 余量。 */
const READY_TIMEOUT_MS = 90_000;
const NAV_TIMEOUT_MS = 60_000;
const SETTLE_MS = 900;
const ERA_COUNT = 7;
/** 性能验收目标（Lead 约定）。 */
const CALLS_TARGET = 300;

/** 新无头模式 + SwiftShader 软件渲染，避免 CI 无 GPU。 */
const LAUNCH_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
];

/** 本机浏览器查找顺序（Windows 优先 Google Chrome，回退 Edge；可用 CHROME_PATH 覆盖）。 */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fmt = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : String(value);

/* -------------------------------------------------------------------------- */
/* 参数与输出                                                                  */
/* -------------------------------------------------------------------------- */

function printHelp() {
  console.log(`用法：node scripts/screenshot.mjs [选项]

选项：
  --url <url>                 页面地址（默认 ${DEFAULT_URL}）
  --out <dir>                 截图输出目录（默认 artifacts/shots）
  --wait-ready-timeout <ms>   等待 window.__DEV__.ready 的超时（默认 ${READY_TIMEOUT_MS}）
  --timeout <ms>              --wait-ready-timeout 的别名（兼容旧用法）
  --settle <ms>               每次改进度后的稳定等待（默认 ${SETTLE_MS}）
  --help, -h                  显示本帮助

截图点：序章 p=0.02；时代 i（0..6）用 __DEV__.progressForEra(i) 的驻留位；结语 p=0.99。

前置条件：已运行 npm run preview（或 npm run dev）；main.ts 已暴露 window.__DEV__。`);
}

function parseArgs(argv) {
  const options = {
    url: DEFAULT_URL,
    out: DEFAULT_OUT,
    readyTimeout: READY_TIMEOUT_MS,
    settle: SETTLE_MS,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    const equalsAt = raw.indexOf('=');
    const key = equalsAt >= 0 ? raw.slice(0, equalsAt) : raw;
    const inline = equalsAt >= 0 ? raw.slice(equalsAt + 1) : undefined;
    const readValue = () => {
      if (inline !== undefined) return inline;
      index += 1;
      if (index >= argv.length) throw new Error(`参数 ${key} 缺少取值`);
      return argv[index];
    };
    switch (key) {
      case '--url':
        options.url = readValue();
        break;
      case '--out':
        options.out = path.resolve(ROOT, readValue());
        break;
      case '--wait-ready-timeout':
      case '--timeout':
        options.readyTimeout = Number(readValue());
        break;
      case '--settle':
        options.settle = Number(readValue());
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`未知参数 "${raw}"（用 --help 查看用法）`);
    }
  }
  if (!Number.isFinite(options.readyTimeout) || options.readyTimeout <= 0) {
    throw new Error('--wait-ready-timeout 必须是正数（毫秒）');
  }
  if (!Number.isFinite(options.settle) || options.settle < 0) {
    throw new Error('--settle 必须是非负数（毫秒）');
  }
  return options;
}

/* -------------------------------------------------------------------------- */
/* 截图点                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 序章/结语用固定进度；时代驻留位在运行时通过 __DEV__.progressForEra(i) 解析，
 * 避免写死公式与 TimelineMap 的实际分镜脱节（旧公式会落在过渡中段）。
 */
function buildShotPlan() {
  const plan = [{ name: '00-intro', progress: 0.02, label: '序章' }];
  for (let index = 0; index < ERA_COUNT; index += 1) {
    plan.push({
      name: `era${index + 1}`,
      eraIndex: index,
      label: `时代 ${index + 1} 驻留位`,
    });
  }
  plan.push({ name: '08-end', progress: 0.99, label: '结语' });
  return plan;
}

/** 解析某张截图的滚动进度；旧版 main.ts 没有 progressForEra 时退回旧公式兜底。 */
async function resolveShotProgress(page, shot) {
  if (shot.eraIndex === undefined) return shot.progress;
  const progress = await page.evaluate((eraIndex) => {
    const dev = window.__DEV__;
    if (!dev || typeof dev.progressForEra !== 'function') return null;
    const value = dev.progressForEra(eraIndex);
    return Number.isFinite(value) ? value : null;
  }, shot.eraIndex);
  if (typeof progress === 'number') return progress;

  const fallback = 0.06 + shot.eraIndex * 0.13 + 0.065;
  console.warn(
    `[shots] ! __DEV__.progressForEra 不可用，era${shot.eraIndex + 1} 退回兜底进度 ${fmt(fallback)}（会落在过渡中段）`,
  );
  return fallback;
}

/* -------------------------------------------------------------------------- */
/* 浏览器                                                                      */
/* -------------------------------------------------------------------------- */

function resolveExecutablePath() {
  return CHROME_CANDIDATES.find((candidate) => {
    try {
      return existsSync(candidate);
    } catch {
      return false;
    }
  });
}

/** Puppeteer v22+ 中 headless:true 即"新"无头模式；'new' 在 v23+ 已移除，旧版本才需要。 */
function detectHeadlessMode() {
  let version = '0.0.0';
  try {
    version = require('puppeteer-core/package.json').version;
  } catch {
    // 忽略：读不到版本时按新版本处理
  }
  const major = Number.parseInt(version.split('.')[0] ?? '0', 10) || 0;
  return { mode: major >= 22 ? true : 'new', version };
}

async function launchBrowser(executablePath) {
  const headless = detectHeadlessMode();
  const baseOptions = {
    executablePath,
    headless: headless.mode,
    args: LAUNCH_ARGS,
    defaultViewport: VIEWPORT,
    protocolTimeout: 120_000,
  };
  try {
    return await launch(baseOptions);
  } catch (error) {
    // 极少数旧版本仍只接受 'new' / 或新版拒绝 'new'：按相反值重试一次
    if (/headless/i.test(String(error && error.message))) {
      return await launch({ ...baseOptions, headless: headless.mode === true ? 'new' : true });
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* __DEV__ 读取工具                                                            */
/* -------------------------------------------------------------------------- */

async function readDevState(page) {
  return page.evaluate(() => {
    const dev = window.__DEV__;
    return dev && typeof dev.state === 'function' ? dev.state() : null;
  });
}

async function readDevInfo(page) {
  return page.evaluate(() => {
    const dev = window.__DEV__;
    return dev && typeof dev.info === 'function' ? dev.info() : null;
  });
}

/** 等 __DEV__ 就绪；可用于 dev HMR 整页重载后重新等待。 */
async function waitForDevReady(page, timeout) {
  await page.waitForFunction(
    () => {
      const dev = window.__DEV__;
      return Boolean(dev && dev.ready === true && typeof dev.setProgress === 'function');
    },
    { timeout, polling: 200 },
  );
}

/* -------------------------------------------------------------------------- */
/* 主流程                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }

  const executablePath = resolveExecutablePath();
  if (!executablePath) {
    console.error(
      '[shots] 未找到本机 Chrome / Edge。请安装 Google Chrome，或设置 CHROME_PATH 环境变量。',
    );
    console.error(`[shots] 已尝试：\n  ${CHROME_CANDIDATES.join('\n  ')}`);
    return 2;
  }

  const { mode, version } = detectHeadlessMode();
  console.log(`[shots] 浏览器：${executablePath}`);
  console.log(`[shots] puppeteer-core ${version}（headless=${JSON.stringify(mode)}，SwiftShader）`);
  console.log(`[shots] 页面：${options.url}`);
  console.log(`[shots] 输出：${path.relative(ROOT, options.out)}`);
  console.log(`[shots] ready 超时 ${options.readyTimeout}ms，每张稳定等待 ${options.settle}ms`);
  await mkdir(options.out, { recursive: true });

  const consoleErrors = [];
  const consoleWarnings = [];
  const ignoredResourceWarnings = [];
  const pageErrors = [];
  const requestFailures = [];
  const stateWarnings = [];
  const performanceSamples = [];
  const reloadRetries = [];
  let pageReloads = 0;
  let browser;

  try {
    browser = await launchBrowser(executablePath);
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    page.on('console', (message) => {
      const text = message.text();
      const locationUrl = message.location() ? message.location().url : '';
      if (message.type() === 'error') {
        // 浏览器自动请求的 /favicon.ico 404 不算应用错误（index.html 未声明 icon 时出现），
        // 记录为可忽略的 warning；真实资源/运行时错误仍然失败。
        if (/failed to load resource/i.test(text) && /favicon\.ico/i.test(locationUrl)) {
          ignoredResourceWarnings.push(`${locationUrl} 返回 404（缺少 favicon，非致命）`);
          return;
        }
        consoleErrors.push(locationUrl ? `${text} [${locationUrl}]` : text);
      } else if (message.type() === 'warning') {
        consoleWarnings.push(text);
      }
    });
    page.on('pageerror', (error) =>
      pageErrors.push(error && error.message ? error.message : String(error)),
    );
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      requestFailures.push(`${request.url()}（${failure ? failure.errorText : '未知原因'}）`);
    });

    // 1) 打开页面
    try {
      await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    } catch (error) {
      console.error(`[shots] 打开 ${options.url} 失败：${error.message}`);
      console.error(
        '[shots] 请先运行 npm run preview（默认 4173）或 npm run dev（默认 5173），并用 --url 指定。',
      );
      return 2;
    }

    // 2) 等 window.__DEV__.ready === true
    let ready = false;
    try {
      await waitForDevReady(page, options.readyTimeout);
      ready = true;
    } catch {
      ready = false;
    }

    // dev server 下其他 agent 改文件会触发 HMR 整页重载；就绪后开始计数，用于告警/重试
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) pageReloads += 1;
    });

    if (!ready) {
      const diagnostics = await page
        .evaluate(() => ({
          devType: typeof window.__DEV__,
          ready: window.__DEV__ ? window.__DEV__.ready : undefined,
          hasSetProgress: Boolean(
            window.__DEV__ && typeof window.__DEV__.setProgress === 'function',
          ),
          hasProgressForEra: Boolean(
            window.__DEV__ && typeof window.__DEV__.progressForEra === 'function',
          ),
          canvases: document.querySelectorAll('canvas').length,
          title: document.title,
        }))
        .catch(() => ({ error: '页面已崩溃或无法 evaluate' }));
      console.error(
        `[shots] 等待 window.__DEV__.ready 超时（${options.readyTimeout}ms）。诊断信息：`,
      );
      console.error(JSON.stringify(diagnostics, null, 2));
      console.error(
        '[shots] 请确认 src/main.ts 已暴露 window.__DEV__ = ' +
          '{ ready, setProgress, jumpTo, progressForEra, state, info }；接口缺失时无法截图。',
      );
      return 2;
    }

    // 画布存在性（WebGL 初始化失败的早期信号）
    const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
    if (canvasCount === 0) {
      consoleErrors.push('页面中没有 <canvas>，Three.js 渲染器可能未初始化');
    }

    // 3) 逐个停留点：等就绪 → 解析进度 → setProgress → 等稳定 → 读 state/info → 截图
    //    dev server 下 HMR 可能整页重载导致 state 读取失败；每张最多重试一次。
    const plan = buildShotPlan();
    const results = [];
    for (const shot of plan) {
      const filePath = path.join(options.out, `${shot.name}.png`);
      let result = null;
      let lastError = null;

      for (let attempt = 1; attempt <= 2 && result === null; attempt += 1) {
        try {
          await waitForDevReady(page, options.readyTimeout);
          const progress = await resolveShotProgress(page, shot);
          const applied = await page.evaluate((value) => {
            const dev = window.__DEV__;
            if (!dev || typeof dev.setProgress !== 'function') return false;
            dev.setProgress(value);
            return true;
          }, progress);
          if (!applied) throw new Error('window.__DEV__.setProgress 不可用');
          await sleep(options.settle);

          const state = await readDevState(page).catch(() => null);
          const info = await readDevInfo(page).catch(() => null);
          if (state === null && attempt === 1) {
            throw new Error('state() 返回 null，页面可能正在重载（dev HMR）');
          }
          await page.screenshot({ path: filePath, type: 'png', captureBeyondViewport: false });
          const fileStat = await stat(filePath);

          const stateText = state
            ? `state={progress:${fmt(state.progress)}, eraIndex:${state.eraIndex}, f:${fmt(state.f)}}`
            : 'state=null';
          const infoText = info
            ? `info={calls:${info.calls}, triangles:${info.triangles}, geometries:${info.geometries}}`
            : 'info=null';
          console.log(
            `  ✓ ${shot.name}.png  p=${fmt(progress)}  ${stateText}  ${infoText}  ${(fileStat.size / 1024).toFixed(0)} KB`,
          );

          // state 校验：请求进度/时代是否真的落位（不阻塞截图，记 warning）
          if (state) {
            if (Math.abs(state.progress - progress) > 0.005) {
              stateWarnings.push(
                `${shot.name}: 请求 p=${fmt(progress)}，但 state.progress=${fmt(state.progress)}`,
              );
            }
            if (shot.eraIndex !== undefined && state.eraIndex !== shot.eraIndex) {
              stateWarnings.push(
                `${shot.name}: 期望 eraIndex=${shot.eraIndex}，实际 ${state.eraIndex}`,
              );
            }
          } else {
            stateWarnings.push(`${shot.name}: state() 返回 null，截图可能拍到重载中的页面`);
          }
          if (info) {
            performanceSamples.push({
              name: shot.name,
              eraIndex: shot.eraIndex,
              calls: info.calls,
              triangles: info.triangles,
              geometries: info.geometries,
            });
          }
          result = { ...shot, progress, filePath, ok: true, bytes: fileStat.size, state, info };
        } catch (error) {
          lastError = error;
          if (attempt === 1) {
            reloadRetries.push(shot.name);
            console.warn(
              `[shots] ! ${shot.name} 第 1 次截图失败（可能 dev HMR 重载）：${error.message}，重试…`,
            );
            await sleep(600);
          }
        }
      }

      if (result === null) {
        result = {
          ...shot,
          filePath,
          ok: false,
          error: lastError ? lastError.message : '未知错误',
        };
      }
      results.push(result);
      if (!result.ok) {
        console.error(`  ✗ ${shot.name}.png  截图失败：${result.error}`);
      }
    }

    // 4) 汇总
    const webglPattern = /webgl|context lost|context_lost|Error creating WebGL/i;
    const webglFailures = [...consoleErrors, ...pageErrors].filter((text) =>
      webglPattern.test(text),
    );
    const shotFailures = results.filter((result) => !result.ok);
    const failures = [];

    if (webglFailures.length > 0) {
      failures.push(`WebGL 渲染失败：\n    ${webglFailures.join('\n    ')}`);
    }
    if (consoleErrors.length > 0) {
      failures.push(
        `浏览器控制台 error（${consoleErrors.length} 条）：\n    ${consoleErrors.join('\n    ')}`,
      );
    }
    if (pageErrors.length > 0) {
      failures.push(`页面异常（${pageErrors.length} 条）：\n    ${pageErrors.join('\n    ')}`);
    }
    if (shotFailures.length > 0) {
      failures.push(
        `截图失败（${shotFailures.length} 张）：${shotFailures.map((result) => result.name).join('、')}`,
      );
    }
    if (requestFailures.length > 0) {
      console.warn(
        `\n[shots] 资源加载失败（${requestFailures.length} 条，多为 favicon 等非致命请求）：`,
      );
      for (const failure of requestFailures) console.warn(`    - ${failure}`);
    }
    if (ignoredResourceWarnings.length > 0) {
      console.warn(`[shots] 忽略 ${ignoredResourceWarnings.length} 条非致命资源 404：`);
      for (const ignored of ignoredResourceWarnings) console.warn(`    - ${ignored}`);
    }
    if (stateWarnings.length > 0) {
      console.warn(`[shots] state 校验 warning（${stateWarnings.length} 条）：`);
      for (const warning of stateWarnings) console.warn(`    - ${warning}`);
    }
    if (reloadRetries.length > 0 || pageReloads > 0) {
      console.warn(
        `[shots] 截图期间页面重载 ${pageReloads} 次（dev HMR），重试 ${reloadRetries.length} 张：` +
          `${reloadRetries.length ? reloadRetries.join('、') : '无'}`,
      );
      console.warn('[shots] 验收截图建议用 npm run preview（静态构建，无 HMR）运行。');
    }

    // 性能采样（Lead 用于验收 calls < 300）
    const eraSamples = performanceSamples.filter((sample) => sample.eraIndex !== undefined);
    if (eraSamples.length > 0) {
      console.log('\n[shots] 性能采样（__DEV__.info()，时代驻留位）：');
      for (const sample of eraSamples) {
        console.log(
          `  ${sample.name}: calls=${sample.calls}  triangles=${sample.triangles}  geometries=${sample.geometries}`,
        );
      }
      const maxCalls = Math.max(...eraSamples.map((sample) => sample.calls));
      if (maxCalls < CALLS_TARGET) {
        console.log(`  最大 calls = ${maxCalls}（目标 < ${CALLS_TARGET} ✓）`);
      } else {
        console.warn(
          `  最大 calls = ${maxCalls} ⚠ 超过目标 < ${CALLS_TARGET}（不阻塞截图，供 Lead 决策）`,
        );
      }
    }

    console.log('');
    console.log(
      `[shots] 完成：${results.filter((result) => result.ok).length}/${results.length} 张截图`,
    );

    if (failures.length > 0) {
      console.error('\n[shots] 发现以下问题（契约 §9 场景质量红线）：');
      for (const failure of failures) console.error(`  ✗ ${failure}`);
      return 3;
    }
    if (consoleWarnings.length > 0) {
      console.log(`[shots] 控制台 warning ${consoleWarnings.length} 条（不视为失败，示例）：`);
      for (const warning of consoleWarnings.slice(0, 5)) console.log(`    - ${warning}`);
    }
    console.log('[shots] 全部通过。截图目录：' + path.relative(ROOT, options.out));
    return 0;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.warn(`[shots] 关闭浏览器失败：${error.message}`);
      }
    }
  }
}

let exitCode = 1;
try {
  exitCode = await main();
} catch (error) {
  console.error(`\n[shots] 脚本异常：${error && error.stack ? error.stack : error}\n`);
  exitCode = 1;
}
process.exitCode = typeof exitCode === 'number' ? exitCode : 1;
