/** 道具类型注册表:各时代 props 文件把自己的 builder 注册进来,渲染器按 type 查找。 */
import type { PropBuilder } from '../primitives';

const registry = new Map<string, PropBuilder>();

/** 注册一组道具。重复 id 会告警(只保留首个),用于及早发现跨文件命名冲突。 */
export function registerProps(builders: Record<string, PropBuilder>, owner: string): void {
  for (const [type, builder] of Object.entries(builders)) {
    if (registry.has(type)) {
      console.warn(
        `[props] 道具类型重复注册:"${type}"(来自 ${owner}),已忽略。请检查开发契约 §7 归属。`,
      );
      continue;
    }
    registry.set(type, builder);
  }
}

export function getProp(type: string): PropBuilder | undefined {
  return registry.get(type);
}

export function propTypes(): string[] {
  return [...registry.keys()];
}

export function hasProp(type: string): boolean {
  return registry.has(type);
}
