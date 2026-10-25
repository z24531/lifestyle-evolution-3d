import { el } from './dom';
import type { TimelineEra } from './types';

export type { TimelineEra } from './types';

export interface TimelineSlider {
  /** -1 = 序章,无高亮。 */
  setActive(index: number): void;
  /** 0..1,节点间进度条。 */
  setProgress(p: number): void;
  dispose(): void;
}

/**
 * 左侧垂直时间轴:7 个主题色节点(button,可 Tab 聚焦)。
 * 当前节点高亮放大并显示时代名;点击回调 onSelect(index)。
 */
export function createTimelineSlider(
  root: HTMLElement,
  eras: TimelineEra[],
  onSelect: (index: number) => void,
): TimelineSlider {
  const host = el('nav', 'ui-timeline');
  host.setAttribute('aria-label', '时代时间轴');

  const rail = el('div', 'ui-timeline__rail');
  rail.setAttribute('aria-hidden', 'true');
  const railGradient = el('span', 'ui-timeline__rail-gradient');
  const railFill = el('span', 'ui-timeline__rail-fill');
  rail.append(railGradient, railFill);

  const colors = eras.map((era) => era.themeColor);
  const fallbackColor = colors[0] ?? '#ffffff';
  host.style.setProperty(
    '--rail-gradient',
    `linear-gradient(180deg, ${colors.length > 1 ? colors.join(', ') : `${fallbackColor}, ${fallbackColor}`})`,
  );

  const list = el('ol', 'ui-timeline__list');
  const buttons: HTMLButtonElement[] = [];

  eras.forEach((era, index) => {
    const item = el('li', 'ui-timeline__item');
    const button = el('button', 'ui-timeline__node');
    button.type = 'button';
    button.style.setProperty('--node-color', era.themeColor);
    button.setAttribute('aria-label', `跳到第 ${index + 1} 个时代:${era.title}`);

    const dot = el('span', 'ui-timeline__dot');
    dot.setAttribute('aria-hidden', 'true');
    const label = el('span', 'ui-timeline__label', era.title);
    label.setAttribute('aria-hidden', 'true');

    button.append(dot, label);
    button.addEventListener('click', () => onSelect(index));
    item.append(button);
    list.append(item);
    buttons.push(button);
  });

  host.append(rail, list);
  root.append(host);

  function setActive(index: number): void {
    // 每次调用都重写完整状态:保证 setActive(-1)(序章)一定清空高亮与 aria-current
    const next = Number.isInteger(index) && index >= 0 && index < buttons.length ? index : -1;
    buttons.forEach((button, i) => {
      const isActive = i === next;
      button.classList.toggle('is-active', isActive);
      if (isActive) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function setProgress(p: number): void {
    const clamped = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
    railFill.style.setProperty('--rail-remain', `${(1 - clamped) * 100}%`);
  }

  function onKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const index = buttons.indexOf(target);
    if (index < 0) return;

    let next = -1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = (index + 1) % buttons.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      next = (index - 1 + buttons.length) % buttons.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = buttons.length - 1;
    }
    if (next < 0) return;

    event.preventDefault();
    buttons[next].focus();
    onSelect(next);
  }

  host.addEventListener('keydown', onKeydown);

  const showFrame = window.requestAnimationFrame(() => {
    host.classList.add('is-visible');
  });
  setProgress(0);

  return {
    setActive,
    setProgress,
    dispose(): void {
      window.cancelAnimationFrame(showFrame);
      host.removeEventListener('keydown', onKeydown);
      host.remove();
    },
  };
}
