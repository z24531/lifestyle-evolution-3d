/** 环境:天空、星空、主光 + 跟随当前时代的阴影,给浮空沙盘一层「时间空间」的氛围。 */
import * as THREE from 'three';
import { eraCenter } from './SceneRenderer';

export class Environment {
  readonly sun: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly fill: THREE.DirectionalLight;
  private readonly stars: THREE.Points;
  private readonly sky: THREE.Mesh;

  constructor(private readonly scene: THREE.Scene) {
    scene.background = new THREE.Color('#0A0C12');
    scene.fog = new THREE.Fog('#0A0C12', 240, 900);

    this.sky = this.createSky();
    scene.add(this.sky);

    this.stars = this.createStars();
    scene.add(this.stars);

    this.hemi = new THREE.HemisphereLight('#CBDCF7', '#3A3126', 1.2);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#FFF2DA', 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 140;
    this.sun.shadow.camera.left = -24;
    this.sun.shadow.camera.right = 24;
    this.sun.shadow.camera.top = 24;
    this.sun.shadow.camera.bottom = -24;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // 底部补光:让浮空岛的岩石底座不至于全黑
    this.fill = new THREE.DirectionalLight('#7E93B8', 0.5);
    scene.add(this.fill);
    scene.add(this.fill.target);
  }

  /** 把主光与阴影相机绑到当前时代平台(只给视野内的平台算阴影)。 */
  follow(eraIndex: number): void {
    const center = eraCenter(eraIndex);
    this.sun.position.set(center.x + 17, center.y + 29, center.z + 15);
    this.sun.target.position.copy(center);
    this.sun.target.updateMatrixWorld();
    this.fill.position.set(center.x - 6, center.y - 34, center.z + 12);
    this.fill.target.position.copy(center);
    this.fill.target.updateMatrixWorld();
  }

  /** 星空跟随相机,制造无限空间感。 */
  update(camera: THREE.PerspectiveCamera): void {
    this.stars.position.copy(camera.position);
    this.stars.rotation.y += 0.00006;
    this.sky.position.copy(camera.position);
  }

  private createSky(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, '#05070C');
      gradient.addColorStop(0.55, '#0C111C');
      gradient.addColorStop(0.82, '#182136');
      gradient.addColorStop(1, '#272B38');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 4, 256);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(620, 24, 16),
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    mesh.name = 'sky';
    return mesh;
  }

  private createStars(): THREE.Points {
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 180 + Math.random() * 260;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#A9BCD6',
      size: 1.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      fog: false,
    });
    return new THREE.Points(geometry, material);
  }

  dispose(): void {
    this.scene.remove(
      this.sky,
      this.stars,
      this.hemi,
      this.sun,
      this.sun.target,
      this.fill,
      this.fill.target,
    );
  }
}
