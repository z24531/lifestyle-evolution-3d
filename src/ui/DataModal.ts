import { el, nextId } from './dom';
import type { ModalContent, ModalDataRow } from './types';

export type { ModalContent, ModalDataRow } from './types';

export interface DataModal {
  open(content: ModalContent): void;
  close(): void;
  isOpen(): boolean;
  onClose(cb: () => void): void;
}

const URL_PATTERN = /https?:\/\/[^\s<>"'（）【】]+/gi;
const URL_TRAILING = /[.,;:!?，。；：！？、]+$/;
const NAME_TRAILING = /[\s,;，；|·—–-]+$/;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ParsedSource {
  /** 来源名称(URL 已剔除);若原始串只有 URL,则退化为域名。 */
  name: string;
  /** 首个 http(s) URL,无则空串。 */
  url: string;
}

/** 把「名称 + URL」的来源串拆开,兼容名称与 URL 之间没有空格的数据。 */
function parseSource(source?: string): ParsedSource | null {
  const raw = (source ?? '').trim();
  if (raw === '') return null;

  const matches = raw.match(URL_PATTERN) ?? [];
  const url = (matches[0] ?? '').replace(URL_TRAILING, '');

  let name = raw;
  for (const match of matches) name = name.replace(match, ' ');
  name = name.replace(/\s+/g, ' ').trim().replace(NAME_TRAILING, '').trim();

  if (url !== '' && name === '') {
    try {
      name = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      name = '查看来源';
    }
  }

  return { name, url };
}

/** 来源显示为「来源 · 名称」:名称是链接,URL 不再作为文本显示。 */
function createSourceNode(source?: string): HTMLElement | null {
  const parsed = parseSource(source);
  if (parsed === null) return null;

  const wrap = el('span', 'ui-modal__source');
  if (parsed.url === '') {
    wrap.textContent = parsed.name;
    return wrap;
  }

  const link = el('a', 'ui-modal__link');
  link.href = parsed.url;
  link.target = '_blank';
  link.rel = 'noreferrer noopener';
  link.textContent = parsed.name;
  link.title = `在新标签页打开来源:${parsed.url}`;
  wrap.append('来源 · ', link);
  return wrap;
}

/**
 * 数据浮层:role=dialog + aria-modal。
 * 支持 ESC 关闭、点击遮罩关闭、Tab 焦点限制在弹层内。
 */
export function createDataModal(root: HTMLElement): DataModal {
  const titleId = nextId('ui-modal-title');
  const bodyId = nextId('ui-modal-body');

  const host = el('div', 'ui-modal');
  host.setAttribute('role', 'presentation');
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;

  const backdrop = el('div', 'ui-modal__backdrop');
  backdrop.setAttribute('aria-hidden', 'true');

  const dialog = el('div', 'ui-modal__dialog');
  dialog.tabIndex = -1;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.setAttribute('aria-describedby', bodyId);

  const accent = el('div', 'ui-modal__accent');
  accent.setAttribute('aria-hidden', 'true');

  const header = el('header', 'ui-modal__header');
  const heading = el('div', 'ui-modal__heading');
  const eraEl = el('p', 'ui-modal__era');
  const titleEl = el('h2', 'ui-modal__title');
  titleEl.id = titleId;
  heading.append(eraEl, titleEl);

  const closeButton = el('button', 'ui-modal__close');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '关闭数据浮层');
  const closeIcon = el('span', 'ui-modal__close-icon');
  closeIcon.setAttribute('aria-hidden', 'true');
  closeButton.append(closeIcon);
  header.append(heading, closeButton);

  const contentBox = el('div', 'ui-modal__content');
  const bodyText = el('p', 'ui-modal__body');
  bodyText.id = bodyId;
  const dataList = el('dl', 'ui-modal__data');
  contentBox.append(bodyText, dataList);

  dialog.append(accent, header, contentBox);
  host.append(backdrop, dialog);
  root.append(host);

  const closeHandlers: Array<() => void> = [];
  let opened = false;
  let lastFocused: HTMLElement | null = null;

  function renderData(rows: ModalDataRow[]): void {
    dataList.replaceChildren();
    dataList.hidden = rows.length === 0;
    for (const row of rows) {
      const item = el('div', 'ui-modal__row');
      const label = el('dt', 'ui-modal__label', row.label);
      const cell = el('dd', 'ui-modal__cell');
      const value = el('span', 'ui-modal__value', row.value);
      cell.append(value);
      const sourceNode = createSourceNode(row.source);
      if (sourceNode) cell.append(sourceNode);
      item.append(label, cell);
      dataList.append(item);
    }
  }

  function render(next: ModalContent): void {
    host.style.setProperty('--modal-color', next.themeColor);
    accent.style.background = next.themeColor;
    eraEl.textContent = next.eraTitle;
    titleEl.textContent = next.title;
    bodyText.textContent = next.body;
    renderData(next.data);
  }

  function trapTab(event: KeyboardEvent): void {
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const inside = active !== null && dialog.contains(active);
    // 焦点停在 dialog 自身(tabindex=-1)时,Shift+Tab 也要回绕到最后一个可聚焦元素
    const atStart = active === first || active === dialog;

    if (event.shiftKey) {
      if (!inside || atStart) {
        event.preventDefault();
        last.focus();
      }
    } else if (!inside || active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!opened) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') trapTab(event);
  }

  function open(next: ModalContent): void {
    render(next);
    if (opened) return;

    opened = true;
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    host.inert = false;
    host.setAttribute('aria-hidden', 'false');
    host.classList.add('is-open');
    document.addEventListener('keydown', onKeydown);
    dialog.focus({ preventScroll: true });
  }

  function close(): void {
    if (!opened) return;

    opened = false;
    host.classList.remove('is-open');
    host.setAttribute('aria-hidden', 'true');
    host.inert = true;
    document.removeEventListener('keydown', onKeydown);

    const target = lastFocused;
    lastFocused = null;
    if (target !== null && target.isConnected) target.focus({ preventScroll: true });

    for (const cb of closeHandlers) cb();
  }

  backdrop.addEventListener('click', close);
  closeButton.addEventListener('click', close);

  return {
    open,
    close,
    isOpen(): boolean {
      return opened;
    },
    onClose(cb: () => void): void {
      closeHandlers.push(cb);
    },
  };
}
