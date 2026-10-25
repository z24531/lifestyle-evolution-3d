import { el } from './dom';
import type { HotspotFrame, HotspotItem } from './types';

export type { HotspotFrame, HotspotItem } from './types';

export interface HotspotLayer {
  setItems(items: HotspotItem[]): void;
  sync(frames: HotspotFrame[]): void;
}

function sameItems(a: HotspotItem[], b: HotspotItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.kpId === b[i].kpId && item.title === b[i].title && item.themeColor === b[i].themeColor,
  );
}

/**
 * DOM 热点层:中心圆点 + 扩散脉冲。
 * renderer 每帧喂屏幕坐标,这里只做 transform / opacity / scale。
 * 指针事件只落在热点按钮上(容器 pointer-events: none)。
 */
export function createHotspotLayer(
  root: HTMLElement,
  onOpen: (kpId: string) => void,
): HotspotLayer {
  const host = el('div', 'ui-hotspots');
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', '知识点热点');

  const nodes = new Map<string, HTMLButtonElement>();
  let items: HotspotItem[] = [];

  function createButton(item: HotspotItem): HTMLButtonElement {
    const button = el('button', 'ui-hotspot');
    button.type = 'button';
    button.dataset.kpId = item.kpId;
    button.style.setProperty('--kp-color', item.themeColor);
    button.setAttribute('aria-label', `查看知识点:${item.title}`);
    button.title = item.title;
    button.classList.add('is-hidden');
    button.tabIndex = -1;
    button.setAttribute('aria-hidden', 'true');

    const pulse = el('span', 'ui-hotspot__pulse');
    pulse.setAttribute('aria-hidden', 'true');
    const dot = el('span', 'ui-hotspot__dot');
    dot.setAttribute('aria-hidden', 'true');
    const label = el('span', 'ui-hotspot__label', item.title);
    label.setAttribute('aria-hidden', 'true');

    button.append(pulse, dot, label);
    button.addEventListener('click', () => onOpen(item.kpId));
    return button;
  }

  function setItems(next: HotspotItem[]): void {
    if (sameItems(items, next)) return;
    items = next.slice();
    host.replaceChildren();
    nodes.clear();
    for (const item of items) {
      const button = createButton(item);
      nodes.set(item.kpId, button);
      host.append(button);
    }
  }

  function sync(frames: HotspotFrame[]): void {
    for (const frame of frames) {
      const node = nodes.get(frame.kpId);
      if (!node) continue;

      const x = Number.isFinite(frame.x) ? frame.x : 0;
      const y = Number.isFinite(frame.y) ? frame.y : 0;
      const scale = Number.isFinite(frame.scale) ? Math.max(0.01, frame.scale) : 1;

      node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
      node.style.opacity = frame.visible ? '0.9' : '0';
      node.classList.toggle('is-hidden', !frame.visible);
      // 贴近画面顶部时把标签翻到圆点下方,避免被视口裁掉
      node.classList.toggle('is-flipped', frame.visible && y < 96);
      node.tabIndex = frame.visible ? 0 : -1;
      node.setAttribute('aria-hidden', frame.visible ? 'false' : 'true');
    }
  }

  root.append(host);

  return { setItems, sync };
}
