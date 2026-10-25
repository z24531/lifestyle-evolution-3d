/** S-B:时代 4(蒸汽工业)道具。见开发契约 §7.3。 */
import type { BuildCtx, PropBuilder, Vec3 } from '../primitives';
import { num } from '../primitives';

const THEME = '#6B6B6B';
const BRICK = '#8C5B45';
const BRICK_DARK = '#7A4E3B';
const STONE = '#8A857C';
const IRON = '#4E555C';
const BRASS = '#B98A4B';
const COAL = '#2B2F34';
const WOOD = '#6B5238';
const GLOW = '#F5C86B';
const GLOW_MAT = { emissive: '#F0A83C', emissiveIntensity: 1.1 };
const SMOKE = '#C4C7CB';

/** 在两点之间架一段圆柱(电线 / 悬链线 / 斜撑通用)。 */
function strut(ctx: BuildCtx, a: Vec3, b: Vec3, radius: number, color: string, seg = 4): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 0.001;
  // 圆柱默认沿 +Y;解出把 +Y 旋到 (dx,dy,dz) 的欧拉角(Three.js 默认 XYZ 顺序)。
  const rotZ = Math.asin(-dx / len);
  const rotX = Math.atan2(dz, dy);
  ctx.cyl(
    radius,
    radius,
    len,
    color,
    [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    [rotX, 0, rotZ],
    seg,
  );
}

/** 悬链线(抛物线近似),返回 n 段折线的 n+1 个端点。 */
function catenary(a: Vec3, b: Vec3, sag: number, n: number): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const drop = sag * 4 * t * (1 - t);
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - drop, a[2] + (b[2] - a[2]) * t]);
  }
  return pts;
}

/** 灰烟:一摞低模灰球,越往上越大越淡。 */
function smoke(ctx: BuildCtx, base: Vec3, n: number, scale = 1): void {
  for (let i = 0; i < n; i += 1) {
    const t = i / Math.max(1, n - 1);
    ctx.ico(
      (0.28 + t * 0.42) * scale,
      SMOKE,
      [
        base[0] + (ctx.rand() - 0.5) * 0.24 + t * 0.5 * scale,
        base[1] + i * 0.52 * scale,
        base[2] + (ctx.rand() - 0.5) * 0.24,
      ],
      0,
      { transparent: true, opacity: 0.62 - t * 0.28 },
    );
  }
}

export const builders: Record<string, PropBuilder> = {
  /** 砖砌厂房,锯齿屋顶 + 高窗 + 排烟管(约 6.5 高)。 */
  factory: (ctx) => {
    // 煤渣地坪(贴地色块,打破平台单调)
    ctx.plane(6.2, 5.2, '#575047', [0, 0.02, 0]);
    // 石基 + 砖砌体
    ctx.box(5.2, 0.5, 4.5, STONE, [0, 0.25, 0]);
    ctx.box(4.8, 3.3, 4.1, BRICK, [0, 2.05, 0]);
    // 四角砖柱
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        ctx.box(0.44, 3.5, 0.44, BRICK_DARK, [sx * 2.26, 2.25, sz * 1.9]);
      }
    }
    // 锯齿屋顶:3 组斜面板 + 竖向挡板(主题灰)
    for (let i = 0; i < 3; i += 1) {
      const x = -1.62 + i * 1.62;
      ctx.box(1.64, 0.16, 4.32, THEME, [x, 4.32, 0], [0, 0, 0.62]);
      ctx.box(0.16, 0.92, 4.32, BRICK_DARK, [x + 0.8, 4.5, 0]);
    }
    // 檐口
    ctx.box(5.0, 0.18, 4.34, IRON, [0, 3.74, 0]);
    // 高窗(两侧发光)
    for (let i = 0; i < 3; i += 1) {
      const x = -1.5 + i * 1.5;
      ctx.box(0.62, 0.8, 0.08, GLOW, [x, 2.5, 2.07], undefined, GLOW_MAT);
      ctx.box(0.62, 0.8, 0.08, GLOW, [x, 2.5, -2.07], undefined, GLOW_MAT);
    }
    // 大门 + 门楣
    ctx.box(1.5, 2.0, 0.12, '#3E4348', [0, 1.25, 2.05]);
    ctx.box(1.9, 0.26, 0.16, THEME, [0, 2.4, 2.06]);
    // 屋顶排烟管 + 烟
    ctx.cyl(0.34, 0.46, 2.1, BRICK_DARK, [1.5, 5.25, -1.1], undefined, 8);
    ctx.cyl(0.5, 0.36, 0.3, IRON, [1.5, 6.4, -1.1], undefined, 8);
    smoke(ctx, [1.5, 6.7, -1.1], 3, 0.8);
    return { anchorY: 9.0 };
  },

  /** 砖砌大烟囱:锥形筒身 + 主题灰箍带 + 冒烟(默认约 7.7 高)。 */
  chimney: (ctx, params) => {
    const h = num(params, 'h', 1);
    const stackH = 5.0 * h;
    const baseY = 2.3;
    // 基座 + 束腰
    ctx.cyl(1.15, 1.4, 0.9, STONE, [0, 0.45, 0], undefined, 8);
    ctx.cyl(0.9, 1.15, 1.4, BRICK_DARK, [0, 1.6, 0], undefined, 8);
    // 锥形砖砌筒身
    ctx.cyl(0.5, 0.9, stackH, BRICK, [0, baseY + stackH / 2, 0], undefined, 8);
    // 主题灰箍带(2 道)
    for (const f of [0.32, 0.7]) {
      const r = 0.9 + (0.5 - 0.9) * f + 0.035;
      ctx.cyl(r, r, 0.24 * h, THEME, [0, baseY + stackH * f, 0], undefined, 8);
    }
    // 筒口
    ctx.cyl(0.62, 0.52, 0.32, IRON, [0, baseY + stackH + 0.1, 0], undefined, 8);
    smoke(ctx, [0, baseY + stackH + 0.3, 0], 3, 0.9 * h);
    return { anchorY: baseY + stackH + 2.8 };
  },

  /** 瓦特式横梁蒸汽机:锅炉 + 汽包 + 摆梁 + 飞轮(约 3 高)。 */
  'steam-engine': (ctx) => {
    // 石基座
    ctx.box(3.4, 0.5, 2.6, STONE, [0, 0.25, 0]);
    ctx.box(3.0, 0.32, 2.2, '#6F6A62', [0, 0.66, 0]);
    // 横置锅炉(沿 X)+ 主题灰箍带
    ctx.cyl(0.52, 0.52, 2.5, IRON, [-0.4, 1.45, 0], [0, 0, Math.PI / 2], 8);
    for (const x of [-1.2, -0.4, 0.4]) {
      ctx.cyl(0.56, 0.56, 0.16, THEME, [x, 1.45, 0], [0, 0, Math.PI / 2], 8);
    }
    ctx.cyl(0.54, 0.54, 0.12, BRASS, [0.89, 1.45, 0], [0, 0, Math.PI / 2], 8);
    // 汽包 + 安全阀
    ctx.cyl(0.3, 0.3, 0.34, BRASS, [-0.7, 1.82, 0], undefined, 8);
    ctx.sphere(0.3, BRASS, [-0.7, 2.0, 0], 6);
    ctx.cyl(0.1, 0.15, 0.46, BRASS, [0.1, 1.98, 0], undefined, 6);
    // 竖向蒸汽缸 + 活塞杆
    ctx.cyl(0.32, 0.32, 0.95, IRON, [1.2, 1.15, 0], undefined, 8);
    ctx.box(0.12, 0.9, 0.12, '#9AA1A8', [1.2, 1.8, 0]);
    // 摆梁立柱 + 摆梁
    ctx.box(0.26, 2.1, 0.26, WOOD, [-1.15, 1.7, 0]);
    ctx.box(2.4, 0.16, 0.24, THEME, [-0.3, 2.86, 0], [0, 0, -0.14]);
    // 连杆
    strut(ctx, [-1.42, 2.66, 0], [-1.42, 1.4, 0], 0.06, '#9AA1A8', 4);
    // 飞轮(竖直放置,轴沿 Z)+ 轮毂 + 辐条
    ctx.cyl(1.0, 1.0, 0.2, THEME, [1.6, 1.52, 0], [Math.PI / 2, 0, 0], 8);
    ctx.cyl(0.32, 0.32, 0.28, BRASS, [1.6, 1.52, 0], [Math.PI / 2, 0, 0], 8);
    for (let i = 0; i < 3; i += 1) {
      ctx.box(0.09, 1.9, 0.09, '#5A4A3C', [1.6, 1.52, 0], [0, 0, (i * Math.PI) / 3]);
    }
    // 离心调速器
    ctx.cyl(0.05, 0.05, 0.5, '#9AA1A8', [-0.35, 2.6, 0], undefined, 4);
    ctx.sphere(0.13, BRASS, [-0.35, 2.92, 0], 6);
    return { anchorY: 4.1 };
  },

  /** 蒸汽机车:锅炉 + 烟囱 + 驾驶室 + 6 动轮 2 导轮(约 3 高)。 */
  locomotive: (ctx) => {
    // 车架 + 缓冲梁 + 排障器
    ctx.box(3.4, 0.34, 1.0, '#3A3F45', [0, 0.78, 0]);
    ctx.box(0.16, 0.34, 1.1, '#8C2F2F', [1.78, 0.92, 0]);
    ctx.cone(0.52, 0.62, '#5A6168', [1.95, 0.6, 0], [0, 0, -Math.PI / 2], 5);
    // 锅炉(沿 X)+ 主题灰箍带
    ctx.cyl(0.52, 0.52, 2.2, IRON, [-0.4, 1.42, 0], [0, 0, Math.PI / 2], 8);
    for (const x of [-1.0, 0.15]) {
      ctx.cyl(0.55, 0.55, 0.14, THEME, [x, 1.42, 0], [0, 0, Math.PI / 2], 8);
    }
    // 烟箱 + 烟囱
    ctx.cyl(0.56, 0.56, 0.34, '#2F3438', [0.72, 1.42, 0], [0, 0, Math.PI / 2], 8);
    ctx.cyl(0.2, 0.26, 0.62, '#2F3438', [0.62, 2.02, 0], undefined, 8);
    ctx.cyl(0.4, 0.22, 0.3, '#2F3438', [0.62, 2.46, 0], undefined, 8);
    // 汽包(黄铜)+ 安全阀
    ctx.cyl(0.3, 0.36, 0.34, BRASS, [-0.6, 1.98, 0], undefined, 8);
    ctx.cyl(0.1, 0.13, 0.3, BRASS, [-1.2, 1.9, 0], undefined, 6);
    // 驾驶室 + 弧形车顶(主题灰)
    ctx.box(1.3, 1.4, 1.26, '#7A4E3B', [-1.6, 1.85, 0]);
    ctx.cyl(0.72, 0.72, 1.34, THEME, [-1.6, 2.55, 0], [0, 0, Math.PI / 2], 8);
    // 驾驶室侧窗(发光)
    ctx.box(0.5, 0.5, 0.06, GLOW, [-1.6, 2.1, 0.64], undefined, GLOW_MAT);
    ctx.box(0.5, 0.5, 0.06, GLOW, [-1.6, 2.1, -0.64], undefined, GLOW_MAT);
    // 车轮:6 动轮 + 2 小导轮(轴沿 Z)
    for (const x of [-1.05, 0.05, 1.0]) {
      for (const z of [-0.56, 0.56]) {
        ctx.cyl(0.46, 0.46, 0.16, '#8C2F2F', [x, 0.46, z], [Math.PI / 2, 0, 0], 6);
      }
    }
    for (const z of [-0.56, 0.56]) {
      ctx.cyl(0.28, 0.28, 0.14, '#3A3F45', [1.55, 0.28, z], [Math.PI / 2, 0, 0], 6);
    }
    // 烟囱冒汽
    smoke(ctx, [0.62, 2.6, 0], 2, 0.55);
    return { anchorY: 4.3 };
  },

  /** 一段铁轨:道砟 + 枕木 + 双钢轨(约 6.4 长)。 */
  'rail-track': (ctx) => {
    // 道砟 + 枕木
    ctx.box(6.4, 0.18, 2.0, '#6E6A63', [0, 0.09, 0]);
    for (let i = 0; i < 7; i += 1) {
      ctx.box(0.34, 0.14, 1.5, WOOD, [-2.7 + i * 0.9, 0.24, 0]);
    }
    // 双钢轨 + 轨底垫板(主题灰)
    for (const z of [-0.52, 0.52]) {
      ctx.box(6.4, 0.1, 0.16, '#9AA1A8', [0, 0.36, z]);
      ctx.box(6.4, 0.05, 0.24, THEME, [0, 0.29, z]);
    }
    // 扣件
    for (let i = 0; i < 5; i += 1) {
      ctx.box(0.1, 0.08, 0.1, '#3A3F45', [-2.0 + i * 1.0, 0.42, 0.52]);
      ctx.box(0.1, 0.08, 0.1, '#3A3F45', [-2.0 + i * 1.0, 0.42, -0.52]);
    }
    return { anchorY: 1.3 };
  },

  /** 电报房 + 两根电杆 + 三根悬链线(约 4.6 高)。 */
  telegraph: (ctx) => {
    // 电报房
    ctx.box(2.2, 0.3, 1.8, STONE, [0, 0.15, -0.65]);
    ctx.box(2.0, 1.5, 1.6, BRICK, [0, 1.05, -0.65]);
    ctx.box(1.3, 0.12, 1.9, IRON, [-0.52, 2.0, -0.65], [0, 0, 0.6]);
    ctx.box(1.3, 0.12, 1.9, IRON, [0.52, 2.0, -0.65], [0, 0, -0.6]);
    ctx.box(0.6, 1.0, 0.08, '#3E4348', [0, 0.85, 0.16]);
    ctx.box(0.5, 0.45, 0.08, GLOW, [0.68, 1.35, 0.16], undefined, GLOW_MAT);
    // 两根电杆 + 横担 + 绝缘子
    for (const px of [-1.5, 1.5]) {
      ctx.cyl(0.1, 0.14, 4.5, WOOD, [px, 2.25, 0.55], undefined, 6);
      ctx.box(0.1, 0.1, 1.9, WOOD, [px, 4.05, 0.55]);
      ctx.box(0.09, 0.09, 1.2, THEME, [px, 3.5, 0.55]);
      for (const pz of [0.1, 0.55, 1.0]) {
        ctx.cyl(0.07, 0.045, 0.16, '#E8E4D8', [px, 4.17, pz], undefined, 5);
      }
    }
    // 三根悬链线
    for (const pz of [0.1, 0.55, 1.0]) {
      const pts = catenary([-1.5, 4.24, pz], [1.5, 4.24, pz], 0.5, 3);
      for (let i = 0; i < pts.length - 1; i += 1) {
        strut(ctx, pts[i], pts[i + 1], 0.022, '#3A3D42', 3);
      }
    }
    // 引入线(接到电报房屋檐)
    strut(ctx, [-1.5, 4.0, 0.1], [0, 2.35, -1.5], 0.022, '#3A3D42', 3);
    return { anchorY: 5.5 };
  },

  /** 工业城市街块:四栋砖楼 + 烟囱 + 发光窗(约 5.9 高)。 */
  city: (ctx) => {
    // 街块基座 + 街面
    ctx.box(5.6, 0.24, 5.6, '#6E6A63', [0, 0.12, 0]);
    ctx.box(5.6, 0.04, 0.95, '#55524C', [0, 0.26, 0]);
    // A 排屋(西南)
    ctx.box(1.7, 3.2, 1.5, BRICK, [-1.7, 1.75, 0.95]);
    ctx.box(1.85, 0.18, 1.65, THEME, [-1.7, 3.44, 0.95]);
    ctx.box(0.55, 0.7, 0.06, GLOW, [-1.7, 2.2, 1.72], undefined, GLOW_MAT);
    // B 排屋(西北,双坡顶)
    ctx.box(1.5, 2.6, 1.5, BRICK_DARK, [-1.55, 1.45, -1.45]);
    ctx.box(1.0, 0.12, 1.6, IRON, [-1.95, 3.05, -1.45], [0, 0, 0.62]);
    ctx.box(1.0, 0.12, 1.6, IRON, [-1.15, 3.05, -1.45], [0, 0, -0.62]);
    ctx.box(0.55, 0.7, 0.06, GLOW, [-1.55, 1.9, -0.68], undefined, GLOW_MAT);
    // C 高楼(东南)
    ctx.box(1.7, 4.2, 1.7, '#9A6A4F', [1.45, 2.35, 1.35]);
    ctx.box(1.85, 0.2, 1.85, THEME, [1.45, 4.55, 1.35]);
    ctx.box(0.5, 0.8, 0.06, GLOW, [1.45, 2.6, 2.22], undefined, GLOW_MAT);
    // D 楼(东北)+ 烟囱
    ctx.box(1.5, 3.6, 1.4, BRICK, [1.55, 1.95, -1.4]);
    ctx.box(1.65, 0.18, 1.55, THEME, [1.55, 3.84, -1.4]);
    ctx.box(0.5, 0.7, 0.06, GLOW, [1.55, 2.4, -0.71], undefined, GLOW_MAT);
    ctx.cyl(0.24, 0.34, 2.3, BRICK_DARK, [1.95, 4.7, -1.65], undefined, 6);
    smoke(ctx, [1.95, 5.95, -1.65], 2, 0.6);
    return { anchorY: 7.7 };
  },

  /** 煤堆:木挡板 + 低模煤块 + 铁锹(约 1.6 高)。 */
  'coal-pile': (ctx) => {
    // 撒落的煤渣地面
    ctx.plane(3.4, 2.8, '#3A3631', [0, 0.025, 0]);
    ctx.box(2.5, 0.18, 1.8, '#5A4636', [0, 0.09, 0]);
    ctx.box(2.3, 0.3, 0.14, WOOD, [0, 0.24, 0.82]);
    ctx.box(2.3, 0.3, 0.14, WOOD, [0, 0.24, -0.82]);
    ctx.box(0.16, 0.3, 1.8, WOOD, [1.2, 0.24, 0]);
    ctx.box(0.16, 0.3, 1.8, WOOD, [-1.2, 0.24, 0]);
    // 煤块堆
    ctx.ico(0.95, COAL, [0, 0.62, 0], 1);
    ctx.ico(0.62, '#3A3F45', [0.7, 0.45, 0.15], 0);
    ctx.ico(0.56, '#22262B', [-0.62, 0.42, -0.2], 0);
    ctx.ico(0.44, '#3A3F45', [0.12, 1.2, -0.12], 0);
    ctx.ico(0.34, COAL, [-0.48, 1.02, 0.28], 0);
    // 铁锹
    strut(ctx, [1.35, 0.16, 0.45], [1.8, 1.0, 0.7], 0.035, WOOD, 4);
    ctx.box(0.24, 0.28, 0.05, '#9AA1A8', [1.85, 1.08, 0.74], [0.5, 0, 0.15]);
    return { anchorY: 2.6 };
  },

  /** 铸铁煤气路灯:灯柱 + 发光玻璃灯头(约 4 高)。 */
  'gas-lamp': (ctx) => {
    ctx.cyl(0.26, 0.38, 0.32, IRON, [0, 0.16, 0], undefined, 8);
    ctx.cyl(0.14, 0.24, 0.4, '#3A4046', [0, 0.62, 0], undefined, 8);
    ctx.cyl(0.08, 0.12, 2.5, '#3A4046', [0, 1.95, 0], undefined, 8);
    // 主题灰箍环
    ctx.cyl(0.19, 0.19, 0.16, THEME, [0, 1.3, 0], undefined, 8);
    ctx.cyl(0.19, 0.19, 0.16, THEME, [0, 2.9, 0], undefined, 8);
    // 灯头:四棱玻璃罩(发光)+ 罩顶 + 尖顶
    ctx.cyl(0.34, 0.24, 0.5, '#FFE9B0', [0, 3.35, 0], undefined, 4, {
      emissive: '#FFC24A',
      emissiveIntensity: 1.4,
    });
    ctx.cone(0.4, 0.32, IRON, [0, 3.76, 0], undefined, 4);
    ctx.cyl(0.035, 0.035, 0.18, THEME, [0, 3.98, 0], undefined, 4);
    // 灯架 4 根小柱
    for (let i = 0; i < 4; i += 1) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      ctx.box(0.045, 0.5, 0.045, IRON, [Math.cos(a) * 0.29, 3.35, Math.sin(a) * 0.29]);
    }
    return { anchorY: 5.0 };
  },

  /** 砖砌仓库:山墙屋顶 + 装卸台 + 酒桶板条箱(约 4.8 高)。 */
  warehouse: (ctx) => {
    // 仓前夯土地坪
    ctx.plane(5.2, 5.6, '#5C554A', [0, 0.04, 0]);
    // 石基 + 砖仓
    ctx.box(4.6, 0.4, 5.0, STONE, [0, 0.2, 0]);
    ctx.box(4.2, 3.0, 4.6, BRICK, [0, 1.9, 0]);
    // 山墙填充 + 双坡屋顶(脊沿 Z,主题灰)
    ctx.box(3.6, 0.8, 4.66, BRICK_DARK, [0, 3.55, 0]);
    ctx.box(2.6, 0.16, 4.9, THEME, [-1.05, 4.05, 0], [0, 0, 0.6]);
    ctx.box(2.6, 0.16, 4.9, THEME, [1.05, 4.05, 0], [0, 0, -0.6]);
    // 大门 + 装卸台
    ctx.box(1.9, 2.2, 0.12, '#4A3A2C', [0, 1.4, 2.35]);
    ctx.box(2.1, 0.2, 0.2, THEME, [0, 2.6, 2.37]);
    ctx.box(2.7, 0.36, 1.0, WOOD, [0, 0.18, 2.95]);
    // 高窗 ×2(发光)
    ctx.box(0.7, 0.8, 0.08, GLOW, [-1.5, 2.5, 2.32], undefined, GLOW_MAT);
    ctx.box(0.7, 0.8, 0.08, GLOW, [1.5, 2.5, 2.32], undefined, GLOW_MAT);
    // 侧面招牌
    ctx.box(0.12, 0.5, 1.7, THEME, [2.12, 2.9, 0]);
    // 酒桶 + 板条箱
    ctx.cyl(0.3, 0.34, 0.66, WOOD, [-2.45, 0.33, 2.35], undefined, 7);
    ctx.box(0.62, 0.62, 0.62, '#8A6B45', [2.3, 0.31, 2.65]);
    return { anchorY: 5.9 };
  },
};
