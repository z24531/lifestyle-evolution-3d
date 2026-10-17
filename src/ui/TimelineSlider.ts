import type { Era } from '../types/content';

/**
 * 侧边时间轴滑块:7 个主题色节点,可点击跳转。
 */
export class TimelineSlider {
  constructor(
    private readonly root: HTMLElement,
    eras: Era[],
  ) {
    root.innerHTML = '';
    for (const era of eras) {
      const node = document.createElement('button');
      node.textContent = era.title;
      node.style.background = era.themeColor;
      root.appendChild(node);
    }
    // TODO: 绑定点击 → ScrollController.jumpTo(era.id);高亮当前段
  }
}
