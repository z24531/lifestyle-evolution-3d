/** eras.json 的内容 schema(对应设计文档 §13.4)。 */

export type AxisKey = 'energy-tool' | 'food' | 'shelter' | 'transport';

export interface DataPoint {
  label: string;
  value: string;
  source?: string;
}

export interface KnowledgePoint {
  id: string;
  anchor: { mesh: string; offset?: [number, number, number] };
  title: string;
  body: string;
  data: DataPoint[];
}

export interface ElementItem {
  id: string;
  label: string;
  note?: string;
}

export interface Axis {
  key: AxisKey;
  label: string;
  elements: ElementItem[];
}

export interface InfoLayerItem {
  id: string;
  label: string;
}

export interface Era {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  themeColor: string;
  model: string;
  axes: Axis[];
  knowledgePoints: KnowledgePoint[];
  infoLayer: { items: InfoLayerItem[] };
}

export interface ContentSchema {
  schemaVersion: number;
  eras: Era[];
}
