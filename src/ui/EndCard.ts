import { el } from './dom';

export interface EndCard {
  setVisible(v: boolean): void;
}

/**
 * 结语卡:标题 + 一句收束文案 + 「重新开始」按钮。
 * 卡片本身不拦截指针事件,只有按钮可点。
 */
export function createEndCard(root: HTMLElement, onReplay: () => void): EndCard {
  const host = el('section', 'ui-end');
  host.setAttribute('aria-hidden', 'true');

  const card = el('div', 'ui-end__card');
  const accent = el('span', 'ui-end__accent');
  accent.setAttribute('aria-hidden', 'true');
  const eyebrow = el('p', 'ui-end__eyebrow', '尾声');
  const title = el('h2', 'ui-end__title', '生活方式仍在变迁');
  const copy = el(
    'p',
    'ui-end__copy',
    '从洞穴篝火到城市与 AI,七个时代里,人类一直在重写自己的日常。下一次改变,正在发生。',
  );
  const replay = el('button', 'ui-end__replay');
  replay.type = 'button';
  const replayIcon = el('span', 'ui-end__replay-icon', '↺');
  replayIcon.setAttribute('aria-hidden', 'true');
  const replayText = el('span', 'ui-end__replay-text', '重新开始');
  replay.append(replayIcon, replayText);
  replay.addEventListener('click', onReplay);

  card.append(accent, eyebrow, title, copy, replay);
  host.append(card);
  root.append(host);

  let visible = false;

  return {
    setVisible(v: boolean): void {
      if (v === visible) return;
      visible = v;
      host.classList.toggle('is-visible', v);
      host.setAttribute('aria-hidden', v ? 'false' : 'true');
    },
  };
}
