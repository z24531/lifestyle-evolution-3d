import * as THREE from 'three';

export interface CameraRigOptions {
  /** 垂直时间轴起点(高空鸟瞰)。 */
  top: THREE.Vector3;
  /** 垂直时间轴终点(智能时代)。 */
  bottom: THREE.Vector3;
}

/**
 * 相机下降 rig:把 [0,1] 滚动进度映射为相机沿垂直时间轴的位姿。
 * 深模块 —— 调用者只喂进度,内部消化缓动、停留、关键帧。
 */
export class CameraRig {
  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly options: CameraRigOptions,
  ) {}

  setProgress(progress: number): void {
    const p = Math.min(1, Math.max(0, progress));
    this.camera.position.lerpVectors(this.options.top, this.options.bottom, p);
    this.camera.lookAt(0, 0, 0);
    // TODO: 在停留区减速悬停,并按时代切换 lookAt 目标
  }
}
