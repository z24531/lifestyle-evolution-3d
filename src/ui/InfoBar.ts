import type { Era } from '../types/content';

/**
 * 底部/侧角信息条:当前时代标题 + 一句话定位。
 */
export class InfoBar {
  constructor(private readonly root: HTMLElement) {
    // TODO: 创建标题容器
  }

  setEra(era: Era | null): void {
    this.root.textContent = era ? `${era.title} · ${era.subtitle}` : '';
  }
}
