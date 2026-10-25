/**
 * UI 层公共数据契约。
 *
 * 只描述 UI 需要消费的纯数据:不 import Three.js / src/core / src/scene。
 * main.ts 可以从这里取类型,也可以从各组件文件的同名 re-export 取。
 */

/** 左下角时代信息卡数据。index 从 0 开始。 */
export interface EraInfo {
  index: number;
  total: number;
  title: string;
  subtitle: string;
  /** 时代导语:信息卡上的第二行小字(可缺省)。 */
  intro?: string;
  themeColor: string;
}

/** 时间轴节点数据(与 §8 契约里的内联结构的等价具名类型)。 */
export interface TimelineEra {
  title: string;
  themeColor: string;
}

/** 一个 DOM 热点。 */
export interface HotspotItem {
  kpId: string;
  title: string;
  themeColor: string;
}

/** renderer 每帧喂给热点层的屏幕坐标,单位为画布 CSS 像素。 */
export interface HotspotFrame {
  kpId: string;
  x: number;
  y: number;
  visible: boolean;
  scale: number;
}

/** 数据浮层里的一行数据。source 若含 URL 会渲染成新窗口链接。 */
export interface ModalDataRow {
  label: string;
  value: string;
  source?: string;
}

/** 数据浮层内容。 */
export interface ModalContent {
  title: string;
  body: string;
  themeColor: string;
  eraTitle: string;
  data: ModalDataRow[];
}
