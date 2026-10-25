/** 沙盘布局常量(纯数据,不依赖 Three.js,便于单测与相机/场景共用)。 */

/** 每层平台半径(世界单位 = 米)。 */
export const PLATFORM_RADIUS = 14;

/** 相邻时代平台在 Y 轴上的间距。 */
export const ERA_SPACING = 28;

/** 时代 index → 平台中心 Y 坐标(高 = 远古,低 = 现代)。 */
export function eraCenterY(index: number): number {
  return -index * ERA_SPACING;
}
