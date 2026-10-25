/** 极简 DOM 构造助手:UI 层不引入框架,统一经由这里创建节点。 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined && className !== '') node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 两位数字序号:1 → "01",用于时代编号。 */
export function pad2(value: number): string {
  const n = Math.max(0, Math.round(value));
  return n < 10 ? `0${n}` : String(n);
}

let uid = 0;

/** 生成组件内唯一 id(用于 aria-labelledby / aria-describedby)。 */
export function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}
