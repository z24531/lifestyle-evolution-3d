import type { KnowledgePoint } from '../types/content';

/**
 * 热点 + 数据对比浮层:通用模板渲染 title/body/data + 来源脚注。
 */
export class HotspotOverlay {
  constructor(private readonly root: HTMLElement) {
    // TODO: 创建浮层容器
  }

  show(kp: KnowledgePoint): void {
    this.root.textContent = kp.title;
    // TODO: 渲染 title/body/data 对比卡 + 来源脚注 + 关闭按钮
  }

  hide(): void {
    this.root.textContent = '';
  }
}
