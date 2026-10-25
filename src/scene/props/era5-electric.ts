/** S-B:时代 5(电气)道具。见开发契约 §7.3。 */
import type { BuildCtx, PropBuilder, Vec3 } from '../primitives';

const THEME = '#F2B705';
const CREAM = '#EFE9D6';
const CONCRETE = '#CFC9B8';
const STEEL = '#9FA6AD';
const IRON = '#3F464C';
const GLASS = '#DCE9EA';
const GOLD = '#C9A05A';
const GLOW = '#FFE9A8';
const GLASS_MAT = { transparent: true, opacity: 0.34 };
const WINDOW_MAT = { emissive: '#FFC24A', emissiveIntensity: 1.3 };
const LAMP_MAT = { emissive: '#FFC24A', emissiveIntensity: 2.2 };

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

/** 白烟 / 蒸汽:一摞低模球。 */
function puff(ctx: BuildCtx, base: Vec3, n: number, scale = 1): void {
  for (let i = 0; i < n; i += 1) {
    const t = i / Math.max(1, n - 1);
    ctx.ico(
      (0.3 + t * 0.35) * scale,
      '#E8EAED',
      [base[0] + t * 0.3 * scale, base[1] + i * 0.5 * scale, base[2]],
      0,
      { transparent: true, opacity: 0.42 - t * 0.2 },
    );
  }
}

export const builders: Record<string, PropBuilder> = {
  /** 汽轮机房 + 拱形屋顶 + 双烟囱 + 冷却塔(约 6 高,暖色混凝土)。 */
  'power-plant': (ctx) => {
    // 沥青厂院(贴地色块)
    ctx.plane(5.6, 4.3, '#6A6557', [0, 0.02, 0]);
    // 厂区基座 + 汽轮机房 + 拱形屋顶(横置半圆柱)
    ctx.box(5.0, 0.36, 3.8, '#8F8A7C', [0, 0.18, 0]);
    ctx.box(4.2, 3.0, 3.0, CONCRETE, [-0.2, 1.86, 0.1]);
    ctx.cyl(1.4, 1.4, 4.3, '#DCD5C3', [-0.2, 3.36, 0.1], [0, 0, Math.PI / 2], 8);
    // 高窗(暖黄发光一排)
    for (let i = 0; i < 5; i += 1) {
      ctx.box(0.56, 0.86, 0.07, GLOW, [-1.7 + i * 0.75, 2.3, 1.62], undefined, WINDOW_MAT);
    }
    // 两根烟囱(主题金箍)+ 烟
    for (const x of [-1.75, 1.25]) {
      ctx.cyl(0.42, 0.58, 5.2, '#C2BBA9', [x, 3.0, -1.35], undefined, 8);
      ctx.cyl(0.46, 0.46, 0.3, THEME, [x, 4.9, -1.35], undefined, 8);
      ctx.cyl(0.62, 0.56, 0.2, IRON, [x, 5.7, -1.35], undefined, 7);
      puff(ctx, [x, 5.95, -1.35], 2, 0.7);
    }
    // 冷却塔(两段圆台拼出收腰)+ 主题金环 + 白色蒸汽
    ctx.cyl(0.9, 1.2, 1.5, '#D8D2C0', [2.0, 1.1, 1.3], undefined, 8);
    ctx.cyl(1.1, 0.9, 1.3, '#E0DAC8', [2.0, 2.5, 1.3], undefined, 8);
    ctx.cyl(1.13, 1.13, 0.14, THEME, [2.0, 3.2, 1.3], undefined, 8);
    puff(ctx, [2.0, 3.5, 1.3], 2, 0.75);
    // 变压器 + 绝缘子
    ctx.box(0.9, 1.0, 0.8, STEEL, [-1.9, 0.86, 1.55]);
    for (const dx of [-0.26, 0.26]) {
      ctx.cyl(0.06, 0.09, 0.36, '#F2EFE4', [-1.9 + dx, 1.55, 1.55], undefined, 5);
    }
    return { anchorY: 7.8 };
  },

  /** 两座输电塔 + 双层横担 + 三根悬链线(约 6.9 高)。 */
  pylon: (ctx) => {
    const col = '#9FA6AD';
    const crossings: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (const tx of [-1.9, 1.9]) {
      // 四根主腿(下宽上窄)
      for (const [cx, cz] of crossings) {
        strut(ctx, [tx + cx * 0.58, 0, cz * 0.58], [tx + cx * 0.24, 5.9, cz * 0.24], 0.052, col, 4);
      }
      // 两道水平横撑
      for (const y of [1.7, 3.7]) {
        const r = 0.58 + (0.24 - 0.58) * (y / 5.9);
        strut(ctx, [tx - r, y, -r], [tx + r, y, -r], 0.032, col, 4);
        strut(ctx, [tx - r, y, r], [tx + r, y, r], 0.032, col, 4);
      }
      // 横担(垂直于导线方向)+ 顶部避雷针
      ctx.box(0.16, 0.12, 2.5, col, [tx, 5.5, 0]);
      ctx.box(0.12, 0.1, 1.7, col, [tx, 6.25, 0]);
      ctx.cyl(0.03, 0.05, 0.7, '#F2EFE4', [tx, 6.6, 0], undefined, 4);
      // 金绝缘子(主题色点缀)
      for (const iz of [-1.0, 0, 1.0]) {
        ctx.box(0.09, 0.22, 0.09, THEME, [tx, 5.32, iz]);
      }
    }
    // 三根悬链线跨两塔
    for (const iz of [-1.0, 0, 1.0]) {
      const pts = catenary([-1.9, 5.25, iz], [1.9, 5.25, iz], 0.85, 4);
      for (let i = 0; i < pts.length - 1; i += 1) {
        strut(ctx, pts[i], pts[i + 1], 0.02, '#3A3D42', 3);
      }
    }
    return { anchorY: 7.9 };
  },

  /** 电灯展台:石台 + 金色灯柱 + 一颗大发光灯泡(约 4.6 高)。 */
  lightbulb: (ctx) => {
    // 石质展台
    ctx.cyl(1.2, 1.4, 0.32, '#C9BEA4', [0, 0.16, 0], undefined, 8);
    ctx.cyl(0.95, 1.15, 0.44, '#B8AC90', [0, 0.54, 0], undefined, 8);
    // 金色灯柱 + 托盘
    ctx.cyl(0.24, 0.34, 1.25, GOLD, [0, 1.38, 0], undefined, 8);
    ctx.cyl(0.44, 0.38, 0.2, GOLD, [0, 2.0, 0], undefined, 8);
    // 螺旋灯座(黄铜)
    ctx.cyl(0.5, 0.56, 0.32, '#D9B978', [0, 2.2, 0], undefined, 8);
    for (let i = 0; i < 3; i += 1) {
      ctx.cyl(0.53, 0.53, 0.07, '#E8CC8E', [0, 2.12 + i * 0.12, 0], undefined, 8);
    }
    // 泡颈 + 大玻璃泡(暖黄发光)
    ctx.cyl(0.4, 0.5, 0.24, '#FFF3C8', [0, 2.52, 0], undefined, 8, {
      emissive: THEME,
      emissiveIntensity: 1.5,
    });
    ctx.sphere(1.05, '#FFF6D0', [0, 3.42, 0], 8, {
      emissive: '#FFC24A',
      emissiveIntensity: 1.9,
    });
    // 灯丝
    ctx.box(0.07, 0.55, 0.07, '#FFFFFF', [0, 3.3, 0], undefined, {
      emissive: '#FFD24A',
      emissiveIntensity: 2,
    });
    // 光晕
    ctx.sphere(1.3, '#FFE9A8', [0, 3.42, 0], 8, {
      transparent: true,
      opacity: 0.2,
      emissive: '#FFC24A',
      emissiveIntensity: 1,
    });
    return { anchorY: 5.6 };
  },

  /** 早期内燃机汽车:亮红车身 + 4 轮 + 车窗 + 车灯(约 2 高)。 */
  car: (ctx) => {
    // 木质底盘
    ctx.box(2.9, 0.16, 0.9, '#4A3A2E', [0, 0.62, 0]);
    // 车轮:后大前小(金色轮毂 + 辐条)
    const wheel = (x: number, z: number, r: number): void => {
      ctx.cyl(r, r, 0.18, '#2E2B28', [x, r, z], [Math.PI / 2, 0, 0], 7);
      ctx.cyl(r * 0.45, r * 0.45, 0.2, THEME, [x, r, z], [Math.PI / 2, 0, 0], 6);
      ctx.box(0.05, r * 1.7, 0.06, '#E8E2CE', [x, r, z], [0, 0, Math.PI / 3]);
    };
    wheel(-0.82, -0.62, 0.64);
    wheel(-0.82, 0.62, 0.64);
    wheel(0.92, -0.58, 0.46);
    wheel(0.92, 0.58, 0.46);
    // 亮红车身 + 金色腰线 + 米色车厢
    ctx.box(1.55, 0.55, 1.14, '#B5482F', [-0.42, 1.02, 0]);
    ctx.box(1.6, 0.12, 1.18, THEME, [-0.42, 0.8, 0]);
    ctx.box(1.15, 0.62, 1.06, CREAM, [-0.5, 1.55, 0]);
    // 车窗(前挡 + 两侧玻璃)
    ctx.box(0.06, 0.36, 0.94, GLASS, [0.06, 1.6, 0], undefined, GLASS_MAT);
    ctx.box(0.72, 0.34, 0.05, GLASS, [-0.6, 1.6, 0.52], undefined, GLASS_MAT);
    ctx.box(0.72, 0.34, 0.05, GLASS, [-0.6, 1.6, -0.52], undefined, GLASS_MAT);
    // 米色布顶(薄的弧形顶,压在车厢上沿,避免看起来像一块平板)
    ctx.box(1.2, 0.07, 1.1, '#F4EFE0', [-0.5, 1.88, 0]);
    ctx.box(1.26, 0.04, 1.16, THEME, [-0.5, 1.83, 0]);
    // 前部机罩 + 黄铜散热器
    ctx.box(0.86, 0.55, 0.8, STEEL, [0.98, 0.98, 0]);
    ctx.cyl(0.22, 0.22, 0.16, GOLD, [1.42, 1.02, 0], [0, 0, Math.PI / 2], 6);
    // 车灯(暖黄发光)
    for (const z of [-0.3, 0.3]) {
      ctx.sphere(0.12, '#FFF3C8', [1.38, 1.24, z], 6, {
        emissive: '#FFD24A',
        emissiveIntensity: 2,
      });
    }
    return { anchorY: 3.1 };
  },

  /** 双翼飞机(莱特兄弟式):双翼 + 双螺旋桨 + 滑橇(约 2.2 高)。 */
  airplane: (ctx) => {
    // 滑橇(贴地)+ 前后翘
    for (const z of [-0.55, 0.55]) {
      ctx.box(2.1, 0.09, 0.09, '#7A5A3A', [-0.05, 0.06, z]);
      ctx.box(0.4, 0.09, 0.09, '#7A5A3A', [1.15, 0.24, z], [0, 0, -0.65]);
      ctx.box(0.5, 0.09, 0.09, '#7A5A3A', [-1.1, 0.22, z], [0, 0, 0.6]);
    }
    // 上下双翼(米白)
    ctx.box(0.95, 0.08, 3.2, '#F4EFE0', [0, 1.28, 0]);
    ctx.box(0.95, 0.08, 3.2, '#F4EFE0', [0, 1.96, 0]);
    // 翼间支柱
    for (const x of [-0.34, 0.34]) {
      for (const z of [-1.28, 0, 1.28]) {
        ctx.box(0.06, 0.72, 0.06, '#7A5A3A', [x, 1.62, z]);
      }
    }
    // 前升降舵(鸭翼)+ 支柱
    ctx.box(0.55, 0.07, 1.35, '#F4EFE0', [1.2, 1.3, 0]);
    ctx.box(0.05, 0.05, 1.35, '#7A5A3A', [1.2, 1.62, 0]);
    ctx.box(0.05, 0.36, 0.05, '#7A5A3A', [1.2, 1.45, -0.6]);
    ctx.box(0.05, 0.36, 0.05, '#7A5A3A', [1.2, 1.45, 0.6]);
    // 尾舵
    ctx.box(0.07, 0.85, 0.6, '#F4EFE0', [-1.12, 1.72, 0]);
    ctx.box(0.05, 0.05, 0.6, '#7A5A3A', [-1.12, 1.3, 0]);
    // 双引擎 + 十字桨叶(主题金桨毂)
    for (const z of [-0.5, 0.5]) {
      ctx.box(0.36, 0.3, 0.28, IRON, [0.05, 1.6, z]);
      ctx.cyl(0.1, 0.13, 0.2, THEME, [0.26, 1.6, z], [0, 0, Math.PI / 2], 6);
      ctx.box(0.05, 1.35, 0.11, '#C9A05A', [0.34, 1.6, z], [0.6, 0, 0]);
      ctx.box(0.05, 1.35, 0.11, '#C9A05A', [0.34, 1.6, z], [-0.6, 0, 0]);
    }
    // 驾驶员
    ctx.box(0.22, 0.46, 0.28, '#3E4348', [-0.25, 1.55, 0.16]);
    ctx.sphere(0.12, '#D8B48A', [-0.25, 1.83, 0.16], 6);
    return { anchorY: 3.1 };
  },

  /** 摩天楼群:三段收分主塔 + 金顶 + 暖黄窗带(约 12.7 高)。 */
  skyline: (ctx) => {
    // 星光广场 + 裙楼(暖米石)
    ctx.plane(6.0, 6.0, '#7E796B', [0, 0.02, 0]);
    ctx.box(5.6, 0.3, 5.6, '#B8AF9A', [0, 0.15, 0]);
    ctx.box(4.6, 1.1, 4.6, '#C9BEA4', [0, 0.85, 0]);
    // 主塔(三段收分)+ 金色檐带 + 金色尖顶
    ctx.box(2.0, 6.2, 2.0, '#DCD5C3', [0, 3.4, 0]);
    ctx.box(2.12, 0.16, 2.12, THEME, [0, 6.45, 0]);
    ctx.box(1.5, 2.4, 1.5, '#E8E1CE', [0, 7.7, 0]);
    ctx.box(1.62, 0.14, 1.62, THEME, [0, 8.85, 0]);
    ctx.box(1.0, 1.5, 1.0, '#F0EADA', [0, 9.65, 0]);
    ctx.cone(0.56, 2.0, THEME, [0, 11.4, 0], undefined, 4);
    // 主塔暖黄窗带(四面各 3 段)
    for (const [wx, wz] of [
      [0, 1.02],
      [0, -1.02],
      [1.02, 0],
      [-1.02, 0],
    ]) {
      for (let k = 0; k < 3; k += 1) {
        ctx.box(
          wx === 0 ? 0.8 : 0.07,
          1.15,
          wz === 0 ? 0.8 : 0.07,
          GLOW,
          [wx, 2.1 + k * 1.5, wz],
          undefined,
          WINDOW_MAT,
        );
      }
    }
    // 左塔(阶梯收分 + 金顶 + 窗)
    ctx.box(1.5, 4.4, 1.5, '#C9BEA4', [-1.85, 2.5, -0.95]);
    ctx.box(1.1, 1.7, 1.1, '#DCD5C3', [-1.85, 5.55, -0.95]);
    ctx.cone(0.42, 1.4, THEME, [-1.85, 7.1, -0.95], undefined, 4);
    for (const k of [1.6, 2.7, 3.8]) {
      ctx.box(0.5, 0.4, 0.06, GLOW, [-1.85, k, -0.18], undefined, WINDOW_MAT);
    }
    // 右塔
    ctx.box(1.6, 3.6, 1.6, '#B8AC90', [1.8, 2.1, 1.0]);
    ctx.box(1.2, 1.3, 1.2, '#C9BEA4', [1.8, 4.55, 1.0]);
    for (const k of [1.5, 2.6]) {
      ctx.box(0.5, 0.4, 0.06, GLOW, [1.8, k, 1.83], undefined, WINDOW_MAT);
    }
    // 后塔
    ctx.box(1.2, 4.6, 1.2, '#CFC9B8', [0.4, 2.6, -1.85]);
    // 顶部航空灯
    ctx.sphere(0.12, '#FF6B4A', [0, 12.6, 0], 6, {
      emissive: '#FF3B1F',
      emissiveIntensity: 2,
    });
    return { anchorY: 14.1 };
  },

  /** 有轨电车:米白车厢 + 暖黄车窗 + 受电弓 + 架空线(约 3.6 高)。 */
  tram: (ctx) => {
    // 轨道 + 枕木
    ctx.box(4.6, 0.1, 1.7, '#6E6A63', [0, 0.05, 0]);
    for (const z of [-0.55, 0.55]) {
      ctx.box(4.6, 0.08, 0.12, STEEL, [0, 0.14, z]);
    }
    for (let i = 0; i < 5; i += 1) {
      ctx.box(0.14, 0.06, 1.5, '#5A4636', [-1.8 + i * 0.9, 0.1, 0]);
    }
    // 车轮
    for (const x of [-1.15, 1.15]) {
      for (const z of [-0.52, 0.52]) {
        ctx.cyl(0.26, 0.26, 0.14, IRON, [x, 0.44, z], [Math.PI / 2, 0, 0], 7);
      }
    }
    // 车身(米白)+ 赭红裙边 + 金色腰线 + 米白弧形车顶
    ctx.box(3.0, 1.25, 1.3, CREAM, [0, 1.2, 0]);
    ctx.box(3.04, 0.3, 1.34, '#A8705A', [0, 0.78, 0]);
    ctx.box(3.06, 0.14, 1.36, THEME, [0, 1.05, 0]);
    ctx.box(3.12, 0.16, 1.44, '#E3DCC9', [0, 1.92, 0]);
    ctx.box(3.16, 0.05, 0.1, THEME, [0, 1.99, 0.68]);
    ctx.box(3.16, 0.05, 0.1, THEME, [0, 1.99, -0.68]);
    // 侧窗(暖黄发光)
    for (let i = 0; i < 4; i += 1) {
      const x = -1.02 + i * 0.68;
      ctx.box(0.5, 0.56, 0.06, GLOW, [x, 1.42, 0.67], undefined, WINDOW_MAT);
      ctx.box(0.5, 0.56, 0.06, GLOW, [x, 1.42, -0.67], undefined, WINDOW_MAT);
    }
    // 前挡风玻璃 + 路线牌(金,发光)+ 头灯
    ctx.box(0.06, 0.5, 1.0, GLASS, [1.52, 1.42, 0], undefined, GLASS_MAT);
    ctx.box(0.06, 0.24, 0.95, THEME, [1.55, 1.78, 0], undefined, LAMP_MAT);
    ctx.sphere(0.11, '#FFF3C8', [1.54, 1.2, 0], 6, {
      emissive: '#FFD24A',
      emissiveIntensity: 2,
    });
    // 受电弓(双斜杆 + 金横担)
    strut(ctx, [-0.5, 2.0, 0], [0.05, 3.02, 0], 0.05, IRON, 4);
    strut(ctx, [0.5, 2.0, 0], [0.05, 3.02, 0], 0.05, IRON, 4);
    ctx.box(0.62, 0.09, 0.1, THEME, [0.05, 3.05, 0]);
    // 架空线 + 两侧电杆
    ctx.cyl(0.018, 0.018, 4.6, '#3A3D42', [0, 3.2, 0], [0, 0, Math.PI / 2], 4);
    for (const px of [-2.15, 2.15]) {
      ctx.cyl(0.05, 0.07, 3.3, IRON, [px, 1.65, 0], undefined, 5);
      ctx.cyl(0.12, 0.12, 0.08, THEME, [px, 3.24, 0], undefined, 4);
    }
    return { anchorY: 4.5 };
  },

  /** 电话亭(电气时代通讯符号):暖红木亭 + 金色招牌 + 壁挂话机(约 2.8 高)。 */
  telephone: (ctx) => {
    // 地垫 + 底座
    ctx.plane(1.9, 1.9, '#6E6152', [0, 0.02, 0]);
    ctx.box(1.3, 0.16, 1.3, '#6B4A32', [0, 0.08, 0]);
    ctx.box(1.1, 0.1, 1.1, '#9C4238', [0, 0.2, 0]);
    // 四角木柱(暖红)
    for (const [x, z] of [
      [-0.55, -0.55],
      [0.55, -0.55],
      [0.55, 0.55],
      [-0.55, 0.55],
    ]) {
      ctx.box(0.12, 2.0, 0.12, '#9C4238', [x, 1.2, z]);
    }
    // 三面玻璃 + 门框
    ctx.box(1.02, 1.7, 0.05, GLASS, [0, 1.32, -0.5], undefined, GLASS_MAT);
    ctx.box(0.05, 1.7, 1.02, GLASS, [-0.5, 1.32, 0], undefined, GLASS_MAT);
    ctx.box(0.05, 1.7, 1.02, GLASS, [0.5, 1.32, 0], undefined, GLASS_MAT);
    ctx.box(1.12, 0.1, 0.1, '#9C4238', [0, 0.32, 0.5]);
    // 顶部金色招牌(发光)
    ctx.box(1.14, 0.36, 1.14, '#8C3A32', [0, 2.3, 0]);
    for (const [x, z, w, d] of [
      [0, 0.58, 1.16, 0.08],
      [0, -0.58, 1.16, 0.08],
      [0.58, 0, 0.08, 1.16],
      [-0.58, 0, 0.08, 1.16],
    ]) {
      ctx.box(w, 0.24, d, THEME, [x, 2.34, z], undefined, {
        emissive: THEME,
        emissiveIntensity: 0.9,
      });
    }
    ctx.cone(0.85, 0.34, '#8C3A32', [0, 2.64, 0], undefined, 4);
    // 亭内暖光 + 壁挂话机
    ctx.box(0.06, 0.42, 0.42, GLOW, [-0.44, 1.6, 0], undefined, LAMP_MAT);
    ctx.box(0.3, 0.5, 0.14, '#2E2B28', [0, 1.52, -0.38]);
    ctx.cyl(0.05, 0.05, 0.3, '#1F1D1B', [-0.02, 1.52, -0.28], [0, 0, 0.35], 5);
    return { anchorY: 3.8 };
  },

  /** 华丽街灯:铸铁灯柱 + 双臂暖黄灯球(约 4.5 高)。 */
  'street-lamp': (ctx) => {
    ctx.cyl(0.24, 0.36, 0.3, IRON, [0, 0.15, 0], undefined, 8);
    ctx.cyl(0.12, 0.2, 0.5, '#343A40', [0, 0.55, 0], undefined, 8);
    ctx.cyl(0.07, 0.1, 3.5, '#343A40', [0, 2.55, 0], undefined, 8);
    // 主题金装饰环
    ctx.cyl(0.16, 0.16, 0.16, THEME, [0, 1.1, 0], undefined, 8);
    ctx.cyl(0.16, 0.16, 0.16, THEME, [0, 3.3, 0], undefined, 8);
    // 双臂 + 暖黄灯球(发光)
    for (const s of [-1, 1]) {
      strut(ctx, [0, 3.82, 0], [s * 0.82, 4.06, 0], 0.06, '#343A40', 4);
      ctx.cyl(0.08, 0.08, 0.14, '#343A40', [s * 0.82, 3.9, 0], undefined, 4);
      ctx.sphere(0.24, '#FFF3C2', [s * 0.82, 3.74, 0], 7, LAMP_MAT);
      ctx.cone(0.14, 0.16, THEME, [s * 0.82, 3.54, 0], undefined, 5);
    }
    // 顶部尖饰
    ctx.cone(0.15, 0.5, '#343A40', [0, 4.22, 0], undefined, 5);
    ctx.sphere(0.1, THEME, [0, 4.52, 0], 5, { emissive: THEME, emissiveIntensity: 1.2 });
    return { anchorY: 5.5 };
  },

  /** 铸铁散热器(家电):上下横管与 8 片竖鳍齐平 + 金阀轮(约 1.2 高)。 */
  radiator: (ctx) => {
    const body = '#E8DFC9';
    const edge = '#CFC3A6';
    // 上下横管(与鳍片齐平,不伸出成"把手")
    for (const y of [0.2, 1.0]) {
      ctx.cyl(0.08, 0.08, 1.12, edge, [0.02, y, 0], [0, 0, Math.PI / 2], 7);
    }
    // 8 片铸铁竖鳍
    for (let i = 0; i < 8; i += 1) {
      ctx.box(0.13, 0.86, 0.52, body, [-0.49 + i * 0.14, 0.6, 0]);
    }
    // 支脚
    for (const x of [-0.42, 0.46]) {
      ctx.box(0.12, 0.2, 0.34, '#B8AC90', [x, 0.1, 0]);
    }
    // 侧向进水管(落到地面)+ 金色阀轮
    ctx.cyl(0.06, 0.06, 0.26, edge, [-0.66, 0.13, 0], undefined, 6);
    ctx.cyl(0.06, 0.06, 0.36, edge, [-0.66, 0.32, 0], [0, 0, Math.PI / 2], 6);
    ctx.cyl(0.13, 0.13, 0.08, THEME, [-0.66, 0.55, 0], undefined, 6);
    // 一缕水汽
    ctx.ico(0.16, '#F2EFE4', [0.2, 1.22, 0.06], 0, { transparent: true, opacity: 0.35 });
    return { anchorY: 2.2 };
  },
};
