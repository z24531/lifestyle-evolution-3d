import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * 内容 schema 测试（开发契约 §2 / §4 / §6）。
 *
 * 说明：这里**只读 JSON**，不 import src/ 下任何正在并行开发的 TS 代码，
 * 保证在渲染器 / UI 尚未完成时测试也能稳定运行。
 */

interface KnowledgePointData {
  label: string;
  value: string;
  source?: string;
}

interface KnowledgePoint {
  id: string;
  anchor: { mesh: string };
  title: string;
  body: string;
  data: KnowledgePointData[];
}

interface Era {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  themeColor: string;
  knowledgePoints: KnowledgePoint[];
}

interface ErasDoc {
  schemaVersion: number;
  eras: Era[];
}

const EXPECTED_ERAS = 7;
const EXPECTED_KNOWLEDGE_POINTS = 23;

/** 契约 §6：各时代必需锚点（知识点的 anchor.mesh 必须覆盖它们）。 */
const REQUIRED_ANCHORS: Record<string, string[]> = {
  // 时代 1 的 kp-cooked 改挂「篝火旁烤肉架」roast
  'hunter-gatherer': ['fire', 'cave', 'roast'],
  agriculture: ['field', 'rice-paddy', 'wheel', 'tablet'],
  'craft-iron': ['furnace', 'paper'],
  steam: ['steam-engine', 'locomotive', 'telegraph', 'city'],
  electric: ['lightbulb', 'car', 'skyline'],
  information: ['chip', 'computer', 'server'],
  intelligence: ['smartphone', 'solar-panel', 'city', 'robot'],
};

function readErasDoc(): ErasDoc {
  const url = new URL('../src/content/eras.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8').replace(/^\uFEFF/, '')) as ErasDoc;
}

const doc = readErasDoc();
const eras = doc.eras;

describe('eras.json 顶层结构', () => {
  it('schemaVersion 为 1', () => {
    expect(doc.schemaVersion).toBe(1);
  });

  it(`恰好 ${EXPECTED_ERAS} 个时代`, () => {
    expect(Array.isArray(eras)).toBe(true);
    expect(eras).toHaveLength(EXPECTED_ERAS);
  });

  it('时代 id 唯一，index 是 0..6 且与数组顺序一致', () => {
    const ids = eras.map((era) => era.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(eras.map((era) => era.index)).toEqual(eras.map((_, position) => position));
  });

  it('每个时代都有标题/副标题/主题色', () => {
    for (const era of eras) {
      expect(era.title.trim().length, `${era.id} title`).toBeGreaterThan(0);
      expect(era.subtitle.trim().length, `${era.id} subtitle`).toBeGreaterThan(0);
      expect(era.themeColor, `${era.id} themeColor`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('knowledgePoints 内容', () => {
  it(`总计 ${EXPECTED_KNOWLEDGE_POINTS} 条知识点，每条含 id/anchor.mesh/title/body/data`, () => {
    const allPoints = eras.flatMap((era) => era.knowledgePoints);
    expect(allPoints).toHaveLength(EXPECTED_KNOWLEDGE_POINTS);

    for (const era of eras) {
      expect(era.knowledgePoints.length, `${era.id} 至少有 1 条知识点`).toBeGreaterThan(0);
      const kpIds = new Set<string>();
      for (const kp of era.knowledgePoints) {
        expect(kp.id.trim().length, `${era.id} 知识点 id`).toBeGreaterThan(0);
        expect(kpIds.has(kp.id), `${era.id} 知识点 id 重复：${kp.id}`).toBe(false);
        kpIds.add(kp.id);

        expect(kp.anchor?.mesh?.trim().length, `${era.id}/${kp.id} anchor.mesh`).toBeGreaterThan(0);
        expect(kp.title.trim().length, `${era.id}/${kp.id} title`).toBeGreaterThan(0);
        expect(kp.body.trim().length, `${era.id}/${kp.id} body`).toBeGreaterThan(0);
        expect(kp.data.length, `${era.id}/${kp.id} data`).toBeGreaterThan(0);
      }
    }
  });

  it('每条 data 都有 label/value/source，source 可定位来源', () => {
    for (const era of eras) {
      for (const kp of era.knowledgePoints) {
        for (const [dataIndex, item] of kp.data.entries()) {
          const at = `${era.id}/${kp.id}.data[${dataIndex}]`;
          expect(item.label.trim().length, `${at} label`).toBeGreaterThan(0);
          expect(item.value.trim().length, `${at} value`).toBeGreaterThan(0);
          // source 可能是"机构名 + URL"，也可能暂为纯机构名；至少不能为空
          expect((item.source ?? '').trim().length, `${at} source`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('知识点 anchor.mesh 覆盖契约 §6 每个时代的必需锚点', () => {
    for (const era of eras) {
      const required = REQUIRED_ANCHORS[era.id];
      expect(required, `契约 §6 未定义时代 ${era.id}`).toBeDefined();
      const anchors = new Set(era.knowledgePoints.map((kp) => kp.anchor.mesh));
      for (const anchorId of required) {
        expect(anchors.has(anchorId), `${era.id} 缺少必需锚点 "${anchorId}"`).toBe(true);
      }
    }
  });

  it('契约 §6 的 7 个时代全部出现在 eras.json 中', () => {
    const ids = new Set(eras.map((era) => era.id));
    for (const eraId of Object.keys(REQUIRED_ANCHORS)) {
      expect(ids.has(eraId), `eras.json 缺少时代 ${eraId}`).toBe(true);
    }
  });
});
