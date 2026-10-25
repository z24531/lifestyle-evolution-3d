/** 把 3D 锚点投影成 DOM 热点坐标(纯函数,便于单测)。 */
import type * as THREE from 'three';
import type { HotspotTarget } from '../scene/SceneRenderer';

export interface HotspotFrame {
  kpId: string;
  /** CSS 像素坐标(相对视口左上角)。 */
  x: number;
  y: number;
  visible: boolean;
  /** 视觉缩放(也用于淡出,0 = 隐藏)。 */
  scale: number;
}

export function projectHotspots(
  camera: THREE.PerspectiveCamera,
  targets: HotspotTarget[],
  width: number,
  height: number,
): HotspotFrame[] {
  return targets.map((target) => {
    const projected = target.position.clone().project(camera);
    const inFront = projected.z > -1 && projected.z < 1;
    const onScreen = Math.abs(projected.x) < 1.02 && Math.abs(projected.y) < 1.02 && inFront;
    return {
      kpId: target.kpId,
      x: (projected.x * 0.5 + 0.5) * width,
      y: (-projected.y * 0.5 + 0.5) * height,
      visible: onScreen,
      scale: 1,
    };
  });
}
