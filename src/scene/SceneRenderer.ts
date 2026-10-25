/**
 * SceneRenderer —— 声明式场景解释器(设计文档 §13.2 的深模块)。
 *
 * 调用者只给「内容数据」,它负责:
 *  - 把 7 份 EraSceneSpec 搭成 7 层浮空沙盘(几何合并降 draw call)
 *  - 建立 anchorId → 世界坐标 的热点锚点表
 *  - 平台/道具的材质、阴影、合并、缓存
 *
 * 时代内容永远不进代码 —— 要改场景,改 src/content/scenes/*.json。
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ContentSchema, Era } from '../types/content';
import type { EraSceneSpec } from '../types/scene';
import { PropCtx, seedFrom } from './primitives';
import { getProp } from './props';
import { scenes } from '../content';
import { ERA_SPACING, PLATFORM_RADIUS, eraCenterY } from './layout';

export { ERA_SPACING, PLATFORM_RADIUS, eraCenterY };

export function eraCenter(index: number): THREE.Vector3 {
  return new THREE.Vector3(0, eraCenterY(index), 0);
}

export interface HotspotTarget {
  kpId: string;
  anchorId: string;
  position: THREE.Vector3;
}

interface EraVisual {
  era: Era;
  group: THREE.Group;
  /** anchorId → 相对平台原点的坐标。 */
  anchors: Map<string, THREE.Vector3>;
}

interface MergeBucket {
  emissive: string;
  emissiveIntensity: number;
  transparent: boolean;
  opacity: number;
  side: THREE.Side;
  parts: THREE.BufferGeometry[];
}

/**
 * 把 group 内的所有 Mesh 按材质特征合并成少数几个 Mesh(顶点色烘焙)。
 * 每个道具通常 1~2 次 draw call,7 层平台合计约 250 次而非 1500 次。
 */
function mergeStaticMeshes(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const meshes: THREE.Mesh[] = [];
  group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
  });
  if (meshes.length === 0) return;

  const buckets = new Map<string, MergeBucket>();
  const mergedSources: THREE.Mesh[] = [];

  for (const mesh of meshes) {
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!(material instanceof THREE.MeshLambertMaterial)) continue;
    const key = [
      material.emissive.getHexString(),
      material.emissiveIntensity,
      material.transparent ? 1 : 0,
      material.opacity,
      material.side,
    ].join('|');
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        emissive: material.emissive.getHexString(),
        emissiveIntensity: material.emissiveIntensity,
        transparent: material.transparent,
        opacity: material.opacity,
        side: material.side,
        parts: [],
      };
      buckets.set(key, bucket);
    }
    // 烘焙到 group 局部空间
    const relative = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    const baseGeometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    baseGeometry.applyMatrix4(relative);
    // 顶点色 = 材质色(linear),合并后共用一个材质
    const color = material.color;
    const count = baseGeometry.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    baseGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    bucket.parts.push(baseGeometry);
    mergedSources.push(mesh);
  }

  if (mergedSources.length === 0) return;
  for (const mesh of mergedSources) mesh.parent?.remove(mesh);

  for (const bucket of buckets.values()) {
    const merged = mergeGeometries(bucket.parts, false);
    if (!merged) {
      // 合并失败时保留原对象(极端兜底:把几何体还原回场景会很麻烦,直接丢弃是安全的,因为不会发生在标准图元上)
      console.warn('[SceneRenderer] 几何合并失败,已跳过该材质组');
      continue;
    }
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      transparent: bucket.transparent,
      opacity: bucket.opacity,
      side: bucket.side,
    });
    if (bucket.emissive !== '000000') {
      material.emissive = new THREE.Color(`#${bucket.emissive}`);
      material.emissiveIntensity = bucket.emissiveIntensity;
    }
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    for (const part of bucket.parts) part.dispose();
  }
}

export class SceneRenderer {
  private readonly visuals: EraVisual[] = [];
  private readonly root = new THREE.Group();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly content: ContentSchema,
  ) {
    this.root.name = 'timeline-tower';
    scene.add(this.root);
  }

  get eraCount(): number {
    return this.visuals.length;
  }

  get eras(): Era[] {
    return this.visuals.map((visual) => visual.era);
  }

  /** 搭建全部 7 层平台。一次完成,后续滚动只移动相机。 */
  build(): void {
    const eras = [...this.content.eras].sort((a, b) => a.index - b.index);
    eras.forEach((era, index) => {
      const spec = scenes[era.id];
      const group = new THREE.Group();
      group.name = `era-${era.id}`;
      group.position.set(0, eraCenterY(index), 0);
      const anchors = new Map<string, THREE.Vector3>();

      this.buildPlatform(group, spec);
      if (spec) {
        this.buildProps(group, spec, anchors);
      } else {
        console.warn(`[SceneRenderer] 缺少场景数据:${era.id}`);
      }

      // 整层一次性合并:每层最终只剩 1~5 个 draw call
      mergeStaticMeshes(group);
      this.root.add(group);
      this.visuals.push({ era, group, anchors });
    });
  }

  /** 平台 = 顶面圆盘 + 侧壁 + 向下收拢的岩石底座(浮空岛)。 */
  private buildPlatform(group: THREE.Group, spec: EraSceneSpec | undefined): void {
    const top = spec?.ground.top ?? '#5C5346';
    const side = spec?.ground.side ?? '#463C31';
    const underside = spec?.ground.underside ?? '#2C241C';
    const segments = 16;
    const shell = new THREE.Group();
    shell.name = 'platform';

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATFORM_RADIUS, PLATFORM_RADIUS, 1.1, segments),
      new THREE.MeshLambertMaterial({ color: top, flatShading: true }),
    );
    cap.position.y = -0.55;
    cap.receiveShadow = true;
    cap.castShadow = true;
    shell.add(cap);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATFORM_RADIUS, PLATFORM_RADIUS - 0.6, 2.2, segments),
      new THREE.MeshLambertMaterial({ color: side, flatShading: true }),
    );
    band.position.y = -2.2;
    band.receiveShadow = true;
    shell.add(band);

    // 顶缘高光带:让平台从远处看也有清晰的"岸线"
    const rimColor = new THREE.Color(top).lerp(new THREE.Color('#FFFFFF'), 0.22);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATFORM_RADIUS + 0.02, PLATFORM_RADIUS + 0.02, 0.34, segments),
      new THREE.MeshLambertMaterial({ color: rimColor, flatShading: true }),
    );
    rim.position.y = -0.62;
    rim.receiveShadow = true;
    shell.add(rim);

    const keel = new THREE.Mesh(
      new THREE.ConeGeometry(PLATFORM_RADIUS - 0.6, 12, segments),
      new THREE.MeshLambertMaterial({ color: underside, flatShading: true }),
    );
    keel.rotation.x = Math.PI;
    keel.position.y = -9.3;
    keel.receiveShadow = true;
    shell.add(keel);

    // 底座边缘的碎石,打破完美圆锥轮廓
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 + 0.4;
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.1 + (i % 2) * 0.5, 0),
        new THREE.MeshLambertMaterial({ color: underside, flatShading: true }),
      );
      rock.position.set(Math.cos(angle) * 11.5, -4.6 - (i % 3) * 1.1, Math.sin(angle) * 11.5);
      rock.scale.set(1, 1.4, 1);
      shell.add(rock);
    }

    group.add(shell);
  }

  private buildProps(
    group: THREE.Group,
    spec: EraSceneSpec,
    anchors: Map<string, THREE.Vector3>,
  ): void {
    const missing = new Set<string>();

    spec.props.forEach((propSpec, index) => {
      const builder = getProp(propSpec.type);
      const position = propSpec.pos ?? [0, 0, 0];
      if (!builder) {
        if (!missing.has(propSpec.type)) {
          missing.add(propSpec.type);
          console.warn(`[SceneRenderer] 道具类型未注册:"${propSpec.type}"(${spec.eraId})`);
        }
        return;
      }
      const propGroup = new THREE.Group();
      const scale = propSpec.scale ?? 1;
      propGroup.name = propSpec.type;
      propGroup.position.set(position[0], position[1], position[2]);
      propGroup.rotation.y = propSpec.rotY ?? 0;
      propGroup.scale.setScalar(scale);

      const ctx = new PropCtx(propGroup, seedFrom(`${spec.eraId}:${index}:${propSpec.type}`));
      const result = builder(ctx, propSpec.params ?? {}) ?? {};

      group.add(propGroup);

      if (propSpec.anchorId) {
        const anchorY = result.anchorY ?? 1.2;
        anchors.set(
          propSpec.anchorId,
          new THREE.Vector3(position[0], position[1] + anchorY * scale, position[2]),
        );
      }
    });

    // 自动散布的小装饰(草簇/碎石),整体合并成 1 个 draw call
    const scatter = spec.ground.scatter;
    if (scatter && getProp(scatter.type)) {
      const deco = new THREE.Group();
      const decoBuilder = getProp(scatter.type);
      if (decoBuilder) {
        const seed = seedFrom(`scatter:${spec.eraId}`);
        for (let i = 0; i < scatter.count; i += 1) {
          const ctx = new PropCtx(deco, seed + i * 7919);
          const angle = ctx.rand() * Math.PI * 2;
          const radius = 2.4 + Math.sqrt(ctx.rand()) * (PLATFORM_RADIUS - 4.5);
          const item = new THREE.Group();
          item.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
          item.rotation.y = ctx.rand() * Math.PI * 2;
          item.scale.setScalar(0.7 + ctx.rand() * 0.6);
          const itemCtx = new PropCtx(item, seed + i * 104729);
          decoBuilder(itemCtx, {});
          deco.add(item);
        }
        group.add(deco);
      }
    }
  }

  /** 某时代的全部热点锚点(世界坐标),供 HotspotProjector 投影。 */
  hotspotTargets(eraIndex: number): HotspotTarget[] {
    const visual = this.visuals[eraIndex];
    if (!visual) return [];
    const offset = visual.group.position;
    return visual.era.knowledgePoints
      .map((kp) => {
        const anchorId = kp.anchor?.mesh;
        const local = anchorId ? visual.anchors.get(anchorId) : undefined;
        if (!anchorId || !local) return null;
        return {
          kpId: kp.id,
          anchorId,
          position: new THREE.Vector3(local.x + offset.x, local.y + offset.y, local.z + offset.z),
        };
      })
      .filter((item): item is HotspotTarget => item !== null);
  }

  dispose(): void {
    this.root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const material = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const item of material) item.dispose();
      }
    });
    this.scene.remove(this.root);
    this.visuals.length = 0;
  }
}
