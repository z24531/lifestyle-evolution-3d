#!/usr/bin/env node
/**
 * 内容 / 场景 / 锚点校验脚本（开发契约 §4、§6、§9）。
 *
 * 用法：
 *   npm run validate
 *   node scripts/validate-content.mjs
 *
 * 校验范围：
 *   1. src/content/eras.json —— schemaVersion、7 个时代、id/index 唯一且连续、
 *      knowledgePoints 的 id/anchor.mesh/title/body/data，data 每项 label/value/source(含 URL)。
 *   2. src/content/scenes/*.json —— eraId 与文件名/eras.json 对应、ground.top/side、
 *      props 长度、prop.type 存在于 props 注册表、pos/rotY/scale/anchorId。
 *   3. 契约 §6 必需锚点必须由某个 prop 的 anchorId 覆盖。
 *   4. 同一 era 内 prop 类型出现超过 MAX_SAME_PROP 次 → 警告。
 *
 * 设计原则：src/ 由多个 agent 并行开发，文件/目录暂时缺失不算脚本崩溃，
 * 而是逐条 collect 成 error/warning 后统一报告；有 error → exit 1，否则 exit 0。
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const ERAS_FILE = path.join(CONTENT_DIR, 'eras.json');
const SCENES_DIR = path.join(CONTENT_DIR, 'scenes');
const PROPS_DIR = path.join(ROOT, 'src', 'scene', 'props');

const EXPECTED_ERAS = 7;
const EXPECTED_KNOWLEDGE_POINTS = 23; // 契约 §2：内容总计 23 条知识点
const POS_LIMIT = 12; // 契约 §3：建议 |x|,|z| ≤ 10.5，脚本在 >12 时警告
const PROPS_HARD_MIN = 10;
const PROPS_HARD_MAX = 40;
const PROPS_SOFT_MIN = 18; // 契约 §4：建议 18–30；era2 冻结后为 31，区间放宽到 18–34
const PROPS_SOFT_MAX = 34;
const MAX_SAME_PROP = 6;

/** 契约 §6 各时代必需锚点（必须被场景 props[].anchorId 覆盖）。 */
const REQUIRED_ANCHORS = {
  // 时代 1 的 kp-cooked 改挂「篝火旁烤肉架」roast，避免与 kp-fire 的热点重叠
  'hunter-gatherer': ['fire', 'cave', 'roast'],
  agriculture: ['field', 'rice-paddy', 'wheel', 'tablet'],
  'craft-iron': ['furnace', 'paper'],
  steam: ['steam-engine', 'locomotive', 'telegraph', 'city'],
  electric: ['lightbulb', 'car', 'skyline'],
  information: ['chip', 'computer', 'server'],
  intelligence: ['smartphone', 'solar-panel', 'city', 'robot'],
};

/** 契约 §3：四象限与维度对应关系（用于场景完整度的软性检查）。 */
const QUADRANTS = [
  { key: 'energy-tool', label: '西北 · 能源与工具', inside: (x, z) => x <= -2 && z <= -2 },
  { key: 'food', label: '西南 · 食物', inside: (x, z) => x <= -2 && z >= 2 },
  { key: 'shelter', label: '东北 · 居住', inside: (x, z) => x >= 2 && z <= -2 },
  { key: 'transport', label: '东南 · 交通', inside: (x, z) => x >= 2 && z >= 2 },
];

/* -------------------------------------------------------------------------- */
/* 输出工具                                                                    */
/* -------------------------------------------------------------------------- */

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const red = (text) => paint('31', text);
const yellow = (text) => paint('33', text);
const green = (text) => paint('32', text);
const dim = (text) => paint('2', text);

const errors = [];
const warnings = [];
const addError = (message) => errors.push(message);
const addWarning = (message) => warnings.push(message);

/* -------------------------------------------------------------------------- */
/* 文件读取工具（缺失/损坏不抛异常，统一转成 error）                            */
/* -------------------------------------------------------------------------- */

async function readJsonFile(file, label) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      addError(`${label}：文件不存在（${path.relative(ROOT, file)}）`);
    } else {
      addError(`${label}：读取失败（${error.message}）`);
    }
    return null;
  }
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    addError(`${label}：JSON 解析失败（${error.message}）`);
    return null;
  }
}

async function listJsonFiles(dir, label) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      addError(`${label}：目录不存在（${path.relative(ROOT, dir)}）`);
    } else {
      addError(`${label}：读取目录失败（${error.message}）`);
    }
    return [];
  }
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const hasUrl = (value) => typeof value === 'string' && /https?:\/\/\S+/i.test(value);

/* -------------------------------------------------------------------------- */
/* 道具注册表：静态解析 src/scene/props/era*.ts 的 builders 顶层 key            */
/* -------------------------------------------------------------------------- */

/**
 * 从 `export const builders: Record<string, PropBuilder> = { ... }` 中提取顶层属性名。
 *
 * 为什么不用 §9 建议的 `^  ([a-z0-9-]+):` 正则：`era1-hunter.ts` 用的是 ES6 简写属性
 * （`fire, cave, ...`），没有冒号，正则会整体漏掉共享池。这里做轻量结构化扫描：
 * 只在对象字面量 depth===1 处识别 key，支持：简写属性、`'kebab-case': value`、
 * `name: value`、方法简写 `name(...) {}`、`...spread`；字符串/注释/嵌套对象会跳过。
 */
function extractBuilderKeys(source) {
  const match = /\bconst\s+builders\b[^=]*=\s*\{/.exec(source);
  if (!match) return [];

  const keys = new Set();
  const length = source.length;
  let index = match.index + match[0].length;
  let depth = 1;
  /** 'key' = 期待属性名；'sep' = 已读到属性名，等 ':' / '(' / ','；'value' = 跳过属性值 */
  let state = 'key';

  const readString = (start) => {
    const quote = source[start];
    let cursor = start + 1;
    while (cursor < length) {
      const char = source[cursor];
      if (char === '\\') {
        cursor += 2;
        continue;
      }
      if (char === quote) break;
      cursor += 1;
    }
    return { value: source.slice(start + 1, cursor), end: cursor + 1 };
  };

  while (index < length && depth > 0) {
    const char = source[index];

    // 行注释
    if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index);
      if (newline < 0) break;
      index = newline;
      continue;
    }
    // 块注释
    if (char === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      if (close < 0) break;
      index = close + 2;
      continue;
    }
    // 字符串 / 模板字符串
    if (char === "'" || char === '"' || char === '`') {
      const { value, end } = readString(index);
      if (depth === 1 && state === 'key') {
        keys.add(value);
        state = 'sep';
      }
      index = end;
      continue;
    }

    if (char === '{' || char === '(' || char === '[') {
      depth += 1;
      index += 1;
      continue;
    }
    if (char === '}' || char === ')' || char === ']') {
      depth -= 1;
      index += 1;
      continue;
    }

    if (depth === 1) {
      if (char === ',') {
        state = 'key';
        index += 1;
        continue;
      }
      if (state === 'key') {
        if (/[A-Za-z_$]/.test(char)) {
          let end = index + 1;
          while (end < length && /[A-Za-z0-9_$]/.test(source[end])) end += 1;
          const identifier = source.slice(index, end);
          if (identifier !== 'async') {
            keys.add(identifier);
            state = 'sep';
          }
          index = end;
          continue;
        }
        if (char === '.' && source.startsWith('...', index)) {
          state = 'value';
          index += 3;
          continue;
        }
      } else if (state === 'sep') {
        if (char === ':') {
          state = 'value';
          index += 1;
          continue;
        }
        if (char === '(') {
          // 方法简写：name(...) { ... }
          depth += 1;
          state = 'value';
          index += 1;
          continue;
        }
        state = 'key';
        continue; // 不消费该字符，交给下一轮（',' / '}'）
      }
    }
    index += 1;
  }

  return [...keys];
}

async function collectPropRegistry() {
  const types = new Map(); // type -> 定义文件
  const duplicates = [];
  let files = [];
  try {
    files = (await readdir(PROPS_DIR)).filter((name) => /^era.*\.ts$/.test(name)).sort();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      addWarning(`道具目录不存在（${path.relative(ROOT, PROPS_DIR)}），跳过 prop 注册表解析`);
    } else {
      addWarning(`道具目录读取失败（${error.message}），跳过 prop 注册表解析`);
    }
    return { types, duplicates, files: [] };
  }

  for (const file of files) {
    let source;
    try {
      source = await readFile(path.join(PROPS_DIR, file), 'utf8');
    } catch (error) {
      addWarning(`读取道具文件失败：${file}（${error.message}）`);
      continue;
    }
    for (const type of extractBuilderKeys(source)) {
      if (types.has(type)) {
        duplicates.push(`${type}（${types.get(type)} 与 ${file}）`);
      } else {
        types.set(type, file);
      }
    }
  }

  for (const duplicate of duplicates) {
    addWarning(`道具类型重复定义：${duplicate}（契约 §7 要求只在归属文件里定义一次）`);
  }
  return { types, duplicates, files };
}

/* -------------------------------------------------------------------------- */
/* eras.json 校验                                                             */
/* -------------------------------------------------------------------------- */

function validateEraKnowledgePoints(era, eraAnchors) {
  const where = `eras.json · ${era.id}`;
  if (!Array.isArray(era.knowledgePoints) || era.knowledgePoints.length === 0) {
    addError(`${where}：knowledgePoints 必须是非空数组`);
    return 0;
  }

  const kpIds = new Set();
  let dataCount = 0;
  era.knowledgePoints.forEach((kp, index) => {
    const at = `${where} · knowledgePoints[${index}]`;
    if (!isPlainObject(kp)) {
      addError(`${at}：必须是对象`);
      return;
    }
    if (!isNonEmptyString(kp.id)) {
      addError(`${at}：缺少 id`);
    } else if (kpIds.has(kp.id)) {
      addError(`${at}：knowledgePoint id 重复（${kp.id}）`);
    } else {
      kpIds.add(kp.id);
    }

    const anchorMesh = kp.anchor && kp.anchor.mesh;
    if (!isNonEmptyString(anchorMesh)) {
      addError(`${at}：anchor.mesh 必须是非空字符串`);
    } else {
      eraAnchors.add(anchorMesh);
    }

    if (!isNonEmptyString(kp.title)) addError(`${at}：缺少 title`);
    if (!isNonEmptyString(kp.body)) addError(`${at}：缺少 body`);

    if (!Array.isArray(kp.data) || kp.data.length === 0) {
      addError(`${at}：data 必须是非空数组`);
      return;
    }
    kp.data.forEach((item, dataIndex) => {
      const dataAt = `${at}.data[${dataIndex}]`;
      dataCount += 1;
      if (!isPlainObject(item)) {
        addError(`${dataAt}：必须是对象`);
        return;
      }
      if (!isNonEmptyString(item.label)) addError(`${dataAt}：缺少 label`);
      if (!isNonEmptyString(item.value)) addError(`${dataAt}：缺少 value`);
      if (!isNonEmptyString(item.source)) {
        addError(`${dataAt}：缺少 source`);
      } else if (!hasUrl(item.source)) {
        addError(`${dataAt}：source 必须包含可核验的 URL（当前为"${item.source}"）`);
      }
    });
  });

  return dataCount;
}

async function validateErasFile() {
  const doc = await readJsonFile(ERAS_FILE, '内容文件 src/content/eras.json');
  const result = {
    doc: null,
    eras: [],
    eraById: new Map(),
    eraAnchors: new Map(), // eraId -> Set(anchorId)
    knowledgePointCount: 0,
    dataCount: 0,
  };
  if (!doc) return result;

  result.doc = doc;
  if (doc.schemaVersion !== 1) {
    addError(`eras.json：schemaVersion 应为 1，实际为 ${JSON.stringify(doc.schemaVersion)}`);
  }
  if (!Array.isArray(doc.eras)) {
    addError('eras.json：eras 必须是数组');
    return result;
  }
  if (doc.eras.length !== EXPECTED_ERAS) {
    addError(`eras.json：应恰好有 ${EXPECTED_ERAS} 个时代，实际为 ${doc.eras.length} 个`);
  }

  const usedIndexes = new Map();
  doc.eras.forEach((era, arrayIndex) => {
    const where = `eras.json · eras[${arrayIndex}]`;
    if (!isPlainObject(era)) {
      addError(`${where}：必须是对象`);
      return;
    }
    if (!isNonEmptyString(era.id)) {
      addError(`${where}：缺少 id`);
      return;
    }
    if (result.eraById.has(era.id)) {
      addError(`${where}：时代 id 重复（${era.id}）`);
      return;
    }
    if (typeof era.index !== 'number' || !Number.isInteger(era.index)) {
      addError(`${where}（${era.id}）：index 必须是整数`);
    } else {
      if (usedIndexes.has(era.index)) {
        addError(
          `${where}（${era.id}）：index=${era.index} 重复（与 ${usedIndexes.get(era.index)} 冲突）`,
        );
      } else {
        usedIndexes.set(era.index, era.id);
      }
      if (era.index !== arrayIndex) {
        addWarning(`${where}（${era.id}）：index=${era.index} 与数组顺序 ${arrayIndex} 不一致`);
      }
    }
    for (const field of ['title', 'subtitle', 'themeColor']) {
      if (!isNonEmptyString(era[field])) addError(`${where}（${era.id}）：缺少 ${field}`);
    }
    if (isNonEmptyString(era.themeColor) && !/^#[0-9a-fA-F]{6}$/.test(era.themeColor)) {
      addWarning(`${where}（${era.id}）：themeColor "${era.themeColor}" 建议使用 #RRGGBB 格式`);
    }
    if (era.axes !== undefined && !Array.isArray(era.axes)) {
      addError(`${where}（${era.id}）：axes 必须是数组`);
    }

    const eraAnchors = new Set();
    result.knowledgePointCount += Array.isArray(era.knowledgePoints)
      ? era.knowledgePoints.length
      : 0;
    result.dataCount += validateEraKnowledgePoints(era, eraAnchors);

    result.eras.push(era);
    result.eraById.set(era.id, era);
    result.eraAnchors.set(era.id, eraAnchors);
  });

  // index 连续：应为 0..N-1 的一个排列
  const indexes = [...usedIndexes.keys()].sort((a, b) => a - b);
  const expected = doc.eras.map((_, index) => index);
  if (indexes.length === expected.length && indexes.some((value, i) => value !== expected[i])) {
    addError(`eras.json：index 不连续，期望 ${expected.join(',')}，实际 ${indexes.join(',')}`);
  }

  if (result.knowledgePointCount !== EXPECTED_KNOWLEDGE_POINTS) {
    addWarning(
      `eras.json：知识点总数为 ${result.knowledgePointCount}，契约 §2 期望 ${EXPECTED_KNOWLEDGE_POINTS} 条`,
    );
  }

  // 契约 §6 锚点表与 eras.json 的 anchor.mesh 互相核对
  for (const era of result.eras) {
    const required = REQUIRED_ANCHORS[era.id];
    const anchors = result.eraAnchors.get(era.id) ?? new Set();
    if (!required) {
      addWarning(`eras.json · ${era.id}：契约 §6 未定义该时代的必需锚点，请同步契约与校验表`);
      continue;
    }
    for (const anchorId of required) {
      if (!anchors.has(anchorId)) {
        addError(
          `eras.json · ${era.id}：契约 §6 必需锚点 "${anchorId}" 没有对应 knowledgePoint.anchor.mesh`,
        );
      }
    }
    for (const anchorId of anchors) {
      if (!required.includes(anchorId)) {
        addWarning(
          `eras.json · ${era.id}：知识点锚点 "${anchorId}" 不在契约 §6 必需锚点表中（请确认是否为新增知识点）`,
        );
      }
    }
  }
  for (const eraId of Object.keys(REQUIRED_ANCHORS)) {
    if (!result.eraById.has(eraId)) {
      addError(`eras.json：契约 §6 定义的时代 "${eraId}" 不存在`);
    }
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* scenes/*.json 校验                                                        */
/* -------------------------------------------------------------------------- */

function validateSceneGround(scene, file) {
  const where = `scenes/${file} · ground`;
  if (!isPlainObject(scene.ground)) {
    addError(`${where}：缺少 ground 对象（需 top/side）`);
    return;
  }
  if (!isNonEmptyString(scene.ground.top)) addError(`${where}.top：缺少顶面颜色`);
  if (!isNonEmptyString(scene.ground.side)) addError(`${where}.side：缺少盘侧颜色`);
  if (scene.ground.underside !== undefined && !isNonEmptyString(scene.ground.underside)) {
    addWarning(`${where}.underside：应为非空颜色字符串`);
  }
  const scatter = scene.ground.scatter;
  if (scatter !== undefined) {
    if (!isPlainObject(scatter)) {
      addError(`${where}.scatter：必须是对象`);
    } else {
      if (!isNonEmptyString(scatter.type)) {
        addError(`${where}.scatter.type：必须是道具类型字符串`);
      } else if (registryHas(scatter.type) === false) {
        addError(`${where}.scatter.type："${scatter.type}" 不在 props 注册表中`);
      }
      if (!Number.isInteger(scatter.count) || scatter.count < 1) {
        addError(`${where}.scatter.count：必须是 ≥1 的整数`);
      }
    }
  }
}

// 在 validateScenes 内被替换为真实实现（避免把 registry 传来传去）
let registryHas = () => true;

function validateSceneProps(scene, file, eraAnchors, registry) {
  const where = `scenes/${file}`;
  if (!Array.isArray(scene.props)) {
    addError(`${where}：props 必须是数组`);
    return { propCount: 0, coveredAnchors: new Set(), quadrantCounts: {} };
  }

  const coveredAnchors = new Set();
  const typeCounts = new Map();
  const quadrantCounts = Object.fromEntries(QUADRANTS.map((quadrant) => [quadrant.key, 0]));

  const propCount = scene.props.length;
  if (propCount < PROPS_HARD_MIN || propCount > PROPS_HARD_MAX) {
    addError(
      `${where}：props 数量为 ${propCount}，必须在 ${PROPS_HARD_MIN}–${PROPS_HARD_MAX} 之间`,
    );
  } else if (propCount < PROPS_SOFT_MIN || propCount > PROPS_SOFT_MAX) {
    addWarning(
      `${where}：props 数量为 ${propCount}，契约 §4 建议 ${PROPS_SOFT_MIN}–${PROPS_SOFT_MAX} 个`,
    );
  }

  scene.props.forEach((prop, index) => {
    const at = `${where} · props[${index}]`;
    if (!isPlainObject(prop)) {
      addError(`${at}：必须是对象`);
      return;
    }

    // type
    if (!isNonEmptyString(prop.type)) {
      addError(`${at}：type 必须是非空字符串`);
    } else {
      if (!registry.types.has(prop.type)) {
        const hint = registry.files.length
          ? `（已解析 ${registry.files.length} 个道具文件、${registry.types.size} 个类型）`
          : '（未解析到任何道具类型，era*.ts 可能尚未实现）';
        addError(`${at}：道具类型 "${prop.type}" 不在 props 注册表中${hint}`);
      }
      typeCounts.set(prop.type, (typeCounts.get(prop.type) ?? 0) + 1);
    }

    // pos
    if (prop.pos === undefined) {
      addWarning(`${at}：缺少 pos，将落在平台原点`);
    } else if (
      !Array.isArray(prop.pos) ||
      prop.pos.length !== 3 ||
      prop.pos.some((value) => !Number.isFinite(value))
    ) {
      addError(`${at}：pos 必须是 3 个数字 [x, y, z]`);
    } else {
      const [x, , z] = prop.pos;
      if (Math.abs(x) > POS_LIMIT || Math.abs(z) > POS_LIMIT) {
        addWarning(`${at}：pos [${x}, ${z}] 超出建议范围 |x|,|z| ≤ ${POS_LIMIT}`);
      }
      const quadrant = QUADRANTS.find((candidate) => candidate.inside(x, z));
      if (quadrant) quadrantCounts[quadrant.key] += 1;
    }

    // rotY / scale / params
    if (prop.rotY !== undefined && !Number.isFinite(prop.rotY)) {
      addError(`${at}：rotY 必须是数字（弧度）`);
    }
    if (prop.scale !== undefined && (!Number.isFinite(prop.scale) || prop.scale <= 0)) {
      addError(`${at}：scale 必须是 > 0 的数字`);
    }
    if (prop.params !== undefined && !isPlainObject(prop.params)) {
      addError(`${at}：params 必须是对象`);
    }

    // anchorId
    if (prop.anchorId !== undefined) {
      if (!isNonEmptyString(prop.anchorId)) {
        addError(`${at}：anchorId 必须是非空字符串`);
      } else {
        coveredAnchors.add(prop.anchorId);
        if (!eraAnchors.has(prop.anchorId)) {
          addError(
            `${at}：anchorId "${prop.anchorId}" 不对应本时代任何 knowledgePoint.anchor.mesh`,
          );
        }
      }
    }
  });

  // 同类型道具次数
  for (const [type, count] of typeCounts) {
    if (count > MAX_SAME_PROP) {
      addWarning(`${where}：道具类型 "${type}" 出现 ${count} 次（> ${MAX_SAME_PROP}），建议合并`);
    }
  }

  // 四象限完整度（§9 质量红线 1/2）
  for (const quadrant of QUADRANTS) {
    if (quadrantCounts[quadrant.key] === 0) {
      addWarning(`${where}：${quadrant.label} 象限没有道具（§9 要求四象限都有内容）`);
    }
  }

  return { propCount, coveredAnchors, quadrantCounts };
}

async function validateScenes(erasResult, registry) {
  registryHas = (type) => registry.types.has(type);
  const result = {
    sceneFiles: [],
    sceneCount: 0,
    propCount: 0,
    coveredAnchorCount: 0,
  };

  const files = await listJsonFiles(SCENES_DIR, '场景目录 src/content/scenes');
  result.sceneFiles = files;
  const seenEraIds = new Map();

  for (const file of files) {
    const scene = await readJsonFile(path.join(SCENES_DIR, file), `场景文件 scenes/${file}`);
    if (!scene) continue;
    const base = path.basename(file, '.json');
    const where = `scenes/${file}`;

    if (!isNonEmptyString(scene.eraId)) {
      addError(`${where}：缺少 eraId`);
      continue;
    }
    if (scene.eraId !== base) {
      addError(`${where}：eraId "${scene.eraId}" 与文件名 "${base}" 不一致（契约 §4 硬性要求 1）`);
    }
    const era = erasResult.eraById.get(scene.eraId);
    if (!era) {
      addError(`${where}：eraId "${scene.eraId}" 不在 eras.json 中`);
      continue;
    }
    if (seenEraIds.has(scene.eraId)) {
      addError(
        `${where}：与 scenes/${seenEraIds.get(scene.eraId)} 重复声明 eraId "${scene.eraId}"`,
      );
      continue;
    }
    seenEraIds.set(scene.eraId, file);

    validateSceneGround(scene, file);
    const eraAnchors = erasResult.eraAnchors.get(scene.eraId) ?? new Set();
    const stats = validateSceneProps(scene, file, eraAnchors, registry);
    result.sceneCount += 1;
    result.propCount += stats.propCount;
    result.coveredAnchorCount += stats.coveredAnchors.size;

    // 契约 §6 必需锚点覆盖
    const required = REQUIRED_ANCHORS[scene.eraId] ?? [];
    const missing = required.filter((anchorId) => !stats.coveredAnchors.has(anchorId));
    if (missing.length > 0) {
      addError(`${where}：缺少必需锚点 ${missing.map((id) => `"${id}"`).join('、')}（契约 §6）`);
    }

    // 非必需但被知识点引用的锚点若未落场景 → 热点会丢失
    for (const anchorId of eraAnchors) {
      if (!required.includes(anchorId) && !stats.coveredAnchors.has(anchorId)) {
        addWarning(
          `${where}：知识点锚点 "${anchorId}" 没有对应 prop.anchorId（该热点在场景中会丢失）`,
        );
      }
    }
  }

  // 每个 era 都要有场景文件
  for (const era of erasResult.eras) {
    if (!seenEraIds.has(era.id)) {
      addError(`缺少场景文件 src/content/scenes/${era.id}.json`);
    }
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* 入口                                                                       */
/* -------------------------------------------------------------------------- */

function printReport(summary) {
  const lines = [];
  lines.push('');
  lines.push(green('== 内容校验报告（开发契约 §4 / §6 / §9）=='));
  lines.push(
    `  时代: ${summary.eraCount} 个（期望 ${EXPECTED_ERAS}）  ` +
      `知识点: ${summary.knowledgePointCount} 条  ` +
      `数据行: ${summary.dataCount} 条`,
  );
  lines.push(
    `  场景: ${summary.sceneCount}/${summary.eraCount || EXPECTED_ERAS} 个  ` +
      `道具: ${summary.propCount} 个  ` +
      `锚点覆盖: ${summary.coveredAnchorCount} 个`,
  );
  lines.push(
    `  道具注册表: ${summary.registryTypes} 个类型（来自 ${summary.registryFiles} 个 era*.ts）`,
  );
  lines.push('');

  if (errors.length > 0) {
    lines.push(red(`  ${errors.length} 个 error：`));
    for (const error of errors) lines.push(red(`  ✗ ${error}`));
  }
  if (warnings.length > 0) {
    const LIMIT = 40;
    lines.push(yellow(`  ${warnings.length} 个 warning：`));
    for (const warning of warnings.slice(0, LIMIT)) lines.push(yellow(`  ! ${warning}`));
    if (warnings.length > LIMIT) {
      lines.push(yellow(`  … 另有 ${warnings.length - LIMIT} 条 warning 未显示`));
    }
  }
  if (errors.length === 0) {
    lines.push(green(`  ✓ 校验通过（${warnings.length} 个 warning）`));
  }
  lines.push('');
  console.log(lines.join('\n'));
}

async function main() {
  // 先打印版本/路径，便于 CI 定位
  console.log(dim(`校验工作目录：${ROOT}`));

  const erasResult = await validateErasFile();
  const registry = await collectPropRegistry();
  const scenesResult = await validateScenes(erasResult, registry);

  // 内容统计（即使文件缺失也尽量输出）
  const eraCount = erasResult.eras.length;
  printReport({
    eraCount,
    knowledgePointCount: erasResult.knowledgePointCount,
    dataCount: erasResult.dataCount,
    sceneCount: scenesResult.sceneCount,
    propCount: scenesResult.propCount,
    coveredAnchorCount: scenesResult.coveredAnchorCount,
    registryTypes: registry.types.size,
    registryFiles: registry.files.length,
  });

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(red(`校验脚本异常退出：${error?.stack ?? error}`));
  process.exitCode = 1;
});
