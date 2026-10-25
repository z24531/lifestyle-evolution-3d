import { el } from './dom';

export interface AutoTour {
  setVisible(v: boolean): void;
  setPlaying(v: boolean): void;
}

/**
 * 自动导览按钮(舞台右下角):播放/暂停图标用 CSS 图形绘制,
 * 点击回调 onToggle,由 main.ts 决定播放状态再回写 setPlaying。
 */
export function createAutoTour(root: HTMLElement, onToggle: () => void): AutoTour {
  const host = el('button', 'ui-tour');
  host.type = 'button';
  host.setAttribute('aria-pressed', 'false');
  host.setAttribute('aria-label', '开始自动导览');

  const icon = el('span', 'ui-tour__icon');
  icon.setAttribute('aria-hidden', 'true');
  const text = el('span', 'ui-tour__text', '自动导览');
  host.append(icon, text);
  host.addEventListener('click', onToggle);
  root.append(host);

  let visible = false;
  let playing = false;

  return {
    setVisible(v: boolean): void {
      if (v === visible) return;
      visible = v;
      host.classList.toggle('is-visible', v);
      host.tabIndex = v ? 0 : -1;
    },
    setPlaying(v: boolean): void {
      if (v === playing) return;
      playing = v;
      host.classList.toggle('is-playing', v);
      host.setAttribute('aria-pressed', v ? 'true' : 'false');
      host.setAttribute('aria-label', v ? '暂停自动导览' : '开始自动导览');
      text.textContent = v ? '暂停导览' : '自动导览';
    },
  };
}
