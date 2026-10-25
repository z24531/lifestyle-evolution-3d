/** 相机 rig:把连续关键帧位置应用到 PerspectiveCamera,带极轻微的手持感。 */
import * as THREE from 'three';
import type { TimelineMap } from './TimelineMap';

export class CameraRig {
  private readonly lookTarget = new THREE.Vector3();
  private readonly basePosition = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly timeline: TimelineMap,
  ) {}

  apply(f: number): void {
    const pose = this.timeline.poseAt(f);
    this.basePosition.set(pose.position[0], pose.position[1], pose.position[2]);
    this.lookTarget.set(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);

    // 极轻微漂移,避免画面「死板」(幅度 < 0.05,不影响截图判断)
    const time = performance.now() / 1000;
    this.camera.position.set(
      this.basePosition.x + Math.sin(time * 0.45) * 0.04,
      this.basePosition.y + Math.sin(time * 0.62 + 1.1) * 0.05,
      this.basePosition.z,
    );
    this.camera.lookAt(this.lookTarget);
  }
}
