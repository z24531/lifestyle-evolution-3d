import { el, pad2 } from './dom';
import type { EraInfo } from './types';

export type { EraInfo } from './types';

export interface InfoBar {
  setEra(era: EraInfo): void;
  hide(): void;
}

/** 与 CSS 中 `.ui-info.is-swapping` 的淡出时长保持一致。 */
const SWAP_OUT_MS = 160;

function eraKey(era: EraInfo): string {
  return `${era.index}/${era.total}/${era.title}/${era.subtitle}/${era.themeColor}`;
}

/**
 * 左下角时代信息卡:编号(01/07)+ 时代名 + 一句话定位 + 主题色竖条。
 * 切换时代时先淡出、换内容、再淡入。
 */
export function createInfoBar(root: HTMLElement): InfoBar {
  const host = el('aside', 'ui-info');
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-hidden', 'true');

  const bar = el('span', 'ui-info__bar');
  bar.setAttribute('aria-hidden', 'true');

  const body = el('div', 'ui-info__body');
  const meta = el('div', 'ui-info__meta');
  const indexEl = el('span', 'ui-info__index');
  const sepEl = el('span', 'ui-info__sep', '/');
  const totalEl = el('span', 'ui-info__total');
  meta.append(indexEl, sepEl, totalEl);

  const titleEl = el('h2', 'ui-info__title');
  const subtitleEl = el('p', 'ui-info__subtitle');
  body.append(meta, titleEl, subtitleEl);
  host.append(bar, body);
  root.append(host);

  let key = '';
  let visible = false;
  let swapTimer = 0;
  let showFrame = 0;

  function apply(era: EraInfo): void {
    indexEl.textContent = pad2(era.index + 1);
    totalEl.textContent = pad2(era.total);
    titleEl.textContent = era.title;
    subtitleEl.textContent = era.subtitle;
    host.style.setProperty('--era-color', era.themeColor);
    bar.style.background = era.themeColor;
  }

  function show(): void {
    if (visible) return;
    visible = true;
    host.setAttribute('aria-hidden', 'false');
    window.cancelAnimationFrame(showFrame);
    showFrame = window.requestAnimationFrame(() => {
      host.classList.add('is-visible');
    });
  }

  function hide(): void {
    window.clearTimeout(swapTimer);
    window.cancelAnimationFrame(showFrame);
    visible = false;
    host.setAttribute('aria-hidden', 'true');
    host.classList.remove('is-visible', 'is-swapping');
  }

  function setEra(era: EraInfo): void {
    window.clearTimeout(swapTimer);
    const nextKey = eraKey(era);
    if (nextKey === key && visible) return;
    key = nextKey;

    if (!visible) {
      apply(era);
      show();
      return;
    }

    // 已展示中:淡出 → 换内容 → 淡入(类名由 CSS 过渡驱动)。
    host.classList.add('is-swapping');
    swapTimer = window.setTimeout(() => {
      apply(era);
      host.classList.remove('is-swapping');
    }, SWAP_OUT_MS);
  }

  return { setEra, hide };
}
