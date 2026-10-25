/**
 * 内容入口:合并「文案内容」(eras.json)与「场景数据」(scenes/*.json)。
 * 新增时代 = 两处各加一份数据,代码零改动(开发契约 §3/§4)。
 */
import erasJson from './eras.json';
import type { ContentSchema, Era } from '../types/content';
import type { EraSceneSpec } from '../types/scene';

const sceneModules = import.meta.glob<{ default: EraSceneSpec }>('./scenes/*.json', {
  eager: true,
});

export const content = erasJson as ContentSchema;

export const scenes: Record<string, EraSceneSpec> = Object.fromEntries(
  Object.values(sceneModules)
    .map((mod) => mod.default)
    .filter((spec) => Boolean(spec?.eraId))
    .map((spec) => [spec.eraId, spec]),
);

/** 按 index 排序后的时代列表(= 展示顺序 = 垂直时间轴从上到下)。 */
export const eras: Era[] = [...content.eras].sort((a, b) => a.index - b.index);

export function getEra(index: number): Era | undefined {
  return eras[index];
}

export function getScene(eraId: string): EraSceneSpec | undefined {
  return scenes[eraId];
}

export function eraById(id: string): Era | undefined {
  return eras.find((era) => era.id === id);
}

/** 内容自检:返回人类可读的问题列表(空数组 = 通过)。dev 模式启动时打印。 */
export function checkContentIntegrity(): string[] {
  const issues: string[] = [];
  if (!Array.isArray(content.eras) || content.eras.length === 0) {
    issues.push('eras.json 没有 eras 数据');
    return issues;
  }
  const ids = new Set<string>();
  eras.forEach((era, index) => {
    if (era.index !== index) issues.push(`时代 ${era.id} 的 index 不连续(应为 ${index})`);
    if (ids.has(era.id)) issues.push(`时代 id 重复:${era.id}`);
    ids.add(era.id);
    const scene = scenes[era.id];
    if (!scene) {
      issues.push(`缺少场景数据 src/content/scenes/${era.id}.json`);
      return;
    }
    const anchorIds = new Set(
      scene.props.map((prop) => prop.anchorId).filter((id): id is string => Boolean(id)),
    );
    for (const kp of era.knowledgePoints) {
      if (kp.anchor?.mesh && !anchorIds.has(kp.anchor.mesh)) {
        issues.push(`时代 ${era.id} 的知识点 ${kp.id} 锚点 "${kp.anchor.mesh}" 找不到对应 prop`);
      }
    }
  });
  return issues;
}
