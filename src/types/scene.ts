/** 场景声明式 schema(对应开发契约 §4)。每个时代一份 scenes/<era-id>.json。 */

export type Vec3 = [number, number, number];

export interface SceneScatter {
  /** 自动随机散布的道具类型(须在 props 注册表中存在)。 */
  type: string;
  count: number;
}

export interface SceneGround {
  /** 顶面(地表)颜色。 */
  top: string;
  /** 盘侧土层颜色。 */
  side: string;
  /** 底部岩石颜色。 */
  underside?: string;
  /** 自动散布的装饰物(草簇/碎石等),确定性随机落点。 */
  scatter?: SceneScatter;
}

export interface ScenePropSpec {
  /** 道具类型 id(props 注册表 key)。 */
  type: string;
  /** [x, y, z],y=0 为地面。 */
  pos?: Vec3;
  /** 绕 Y 轴旋转(弧度)。 */
  rotY?: number;
  /** 统一缩放。 */
  scale?: number;
  /** 热点锚点 id,须等于某 knowledgePoint 的 anchor.mesh。 */
  anchorId?: string;
  /** 道具自定义参数(由 builder 自行解释)。 */
  params?: Record<string, unknown>;
}

export interface EraSceneSpec {
  eraId: string;
  ground: SceneGround;
  props: ScenePropSpec[];
}
