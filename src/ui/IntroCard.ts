import { el } from './dom';

export interface IntroCardOptions {
  title: string;
  subtitle: string;
  hint: string;
}

export interface IntroCard {
  setVisible(v: boolean): void;
}

/** 七个时代的主题色,仅作为序章卡的装饰渐变。 */
const SPECTRUM_GRADIENT =
  'linear-gradient(90deg, #E8793A 0%, #8FAE3B 16%, #A8662A 33%, #6B6B6B 50%, #F2B705 67%, #2E86DE 84%, #7C4DFF 100%)';

/**
 * 序章标题卡:大标题 + 副标题 + 向下滚动提示。
 * 整卡不接收指针事件,只做淡入淡出。
 */
export function createIntroCard(root: HTMLElement, opts: IntroCardOptions): IntroCard {
  const host = el('section', 'ui-intro');
  host.setAttribute('aria-hidden', 'true');

  const inner = el('div', 'ui-intro__inner');

  const spectrum = el('span', 'ui-intro__spectrum');
  spectrum.setAttribute('aria-hidden', 'true');
  spectrum.style.background = SPECTRUM_GRADIENT;

  const title = el('h1', 'ui-intro__title', opts.title);
  const subtitle = el('p', 'ui-intro__subtitle', opts.subtitle);

  const hint = el('div', 'ui-intro__hint');
  const hintLine = el('span', 'ui-intro__hint-line');
  hintLine.setAttribute('aria-hidden', 'true');
  const hintText = el('span', 'ui-intro__hint-text', opts.hint);
  const hintChevron = el('span', 'ui-intro__hint-chevron');
  hintChevron.setAttribute('aria-hidden', 'true');
  hint.append(hintLine, hintText, hintChevron);

  inner.append(spectrum, title, subtitle, hint);
  host.append(inner);
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
