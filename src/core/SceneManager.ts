import type { Era } from '../types/content';

/**
 * 场景管理器:按需加载/切换/休眠 7 个时代的场景。
 * 深模块:调用者只告诉它"进入哪个时代",它内部管加载、对象池、LOD、热点挂载。
 */
export class SceneManager {
  private current: Era | null = null;

  enter(era: Era): void {
    this.current = era;
    // TODO: 流式加载 era.model(glb),实例化声明式元素与热点
  }

  release(): void {
    this.current = null;
    // TODO: 释放当前场景资源,休眠
  }

  get activeEra(): Era | null {
    return this.current;
  }
}
