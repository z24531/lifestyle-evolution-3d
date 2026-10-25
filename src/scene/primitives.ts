/** 基础图元 API:道具 builder 的唯一画布(见开发契约 §5)。 */
import * as THREE from 'three';

export type Vec3 = [number, number, number];

export interface MatOptions {
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
}

export type PropParams = Record<string, unknown>;

export interface PropBuildResult {
  /** 热点锚点相对道具原点的 Y 高度,默认 1.2。 */
  anchorY?: number;
}

export type PropBuilder = (ctx: BuildCtx, params: PropParams) => void | PropBuildResult;

export interface BuildCtx {
  readonly root: THREE.Group;
  /** 确定性随机(同一道具每次生成结果一致)。 */
  readonly rand: () => number;
  mat(color: string, opts?: MatOptions): THREE.Material;
  addMesh(
    geo: THREE.BufferGeometry,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    scale?: Vec3,
    opts?: MatOptions,
  ): THREE.Mesh;
  box(
    w: number,
    h: number,
    d: number,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    opts?: MatOptions,
  ): THREE.Mesh;
  cyl(
    rTop: number,
    rBottom: number,
    h: number,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    seg?: number,
    opts?: MatOptions,
  ): THREE.Mesh;
  cone(
    r: number,
    h: number,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    seg?: number,
    opts?: MatOptions,
  ): THREE.Mesh;
  sphere(r: number, color: string, pos?: Vec3, seg?: number, opts?: MatOptions): THREE.Mesh;
  ico(r: number, color: string, pos?: Vec3, detail?: number, opts?: MatOptions): THREE.Mesh;
  /** 水平平面(rotation.x = -PI/2),用于水面/地面色块/阴影。 */
  plane(w: number, d: number, color: string, pos?: Vec3, rot?: Vec3, opts?: MatOptions): THREE.Mesh;
}

const geoCache = new Map<string, THREE.BufferGeometry>();

function cachedGeo(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let geo = geoCache.get(key);
  if (!geo) {
    geo = make();
    geoCache.set(key, geo);
  }
  return geo;
}

const matCache = new Map<string, THREE.Material>();

function materialKey(color: string, opts?: MatOptions): string {
  if (!opts) return color;
  return `${color}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? ''}|${opts.transparent ? 1 : 0}|${opts.opacity ?? ''}|${opts.side ?? ''}`;
}

export class PropCtx implements BuildCtx {
  private readonly materials = matCache;
  private seeded: number;

  constructor(
    readonly root: THREE.Group,
    seed: number,
  ) {
    this.seeded = seed >>> 0;
  }

  /** mulberry32 确定性 PRNG。 */
  rand = (): number => {
    let t = (this.seeded += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  mat(color: string, opts?: MatOptions): THREE.Material {
    const key = materialKey(color, opts);
    let mat = this.materials.get(key);
    if (!mat) {
      mat = new THREE.MeshLambertMaterial({
        color,
        flatShading: true,
        ...(opts?.emissive ? { emissive: opts.emissive } : {}),
        ...(opts?.emissiveIntensity !== undefined
          ? { emissiveIntensity: opts.emissiveIntensity }
          : {}),
        ...(opts?.transparent ? { transparent: true } : {}),
        ...(opts?.opacity !== undefined ? { opacity: opts.opacity } : {}),
        ...(opts?.side !== undefined ? { side: opts.side } : {}),
      });
      this.materials.set(key, mat);
    }
    return mat;
  }

  addMesh(
    geo: THREE.BufferGeometry,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    scale?: Vec3,
    opts?: MatOptions,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, this.mat(color, opts));
    if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }

  box(
    w: number,
    h: number,
    d: number,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    opts?: MatOptions,
  ): THREE.Mesh {
    return this.addMesh(
      cachedGeo(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
      color,
      pos,
      rot,
      undefined,
      opts,
    );
  }

  cyl(
    rTop: number,
    rBottom: number,
    h: number,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    seg = 7,
    opts?: MatOptions,
  ): THREE.Mesh {
    return this.addMesh(
      cachedGeo(
        `cyl:${rTop}:${rBottom}:${h}:${seg}`,
        () => new THREE.CylinderGeometry(rTop, rBottom, h, seg),
      ),
      color,
      pos,
      rot,
      undefined,
      opts,
    );
  }

  cone(
    r: number,
    h: number,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    seg = 6,
    opts?: MatOptions,
  ): THREE.Mesh {
    return this.addMesh(
      cachedGeo(`cone:${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
      color,
      pos,
      rot,
      undefined,
      opts,
    );
  }

  sphere(r: number, color: string, pos?: Vec3, seg = 7, opts?: MatOptions): THREE.Mesh {
    return this.addMesh(
      cachedGeo(`sphere:${r}:${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(4, seg - 1))),
      color,
      pos,
      undefined,
      undefined,
      opts,
    );
  }

  ico(r: number, color: string, pos?: Vec3, detail = 0, opts?: MatOptions): THREE.Mesh {
    return this.addMesh(
      cachedGeo(`ico:${r}:${detail}`, () => new THREE.IcosahedronGeometry(r, detail)),
      color,
      pos,
      undefined,
      undefined,
      opts,
    );
  }

  plane(
    w: number,
    d: number,
    color: string,
    pos?: Vec3,
    rot?: Vec3,
    opts?: MatOptions,
  ): THREE.Mesh {
    const geo = cachedGeo(`plane:${w}:${d}`, () => new THREE.PlaneGeometry(w, d));
    const mesh = new THREE.Mesh(geo, this.mat(color, opts));
    if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot?.[0] ?? -Math.PI / 2, rot?.[1] ?? 0, rot?.[2] ?? 0);
    mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }
}

export function num(params: PropParams | undefined, key: string, fallback: number): number {
  const v = params?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function str(params: PropParams | undefined, key: string, fallback: string): string {
  const v = params?.[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

export function bool(params: PropParams | undefined, key: string, fallback: boolean): boolean {
  const v = params?.[key];
  return typeof v === 'boolean' ? v : fallback;
}

/** 道具组的种子:eraId + 序号,保证同一场景每次生成一致。 */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
