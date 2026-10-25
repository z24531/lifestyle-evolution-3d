/** S-A:时代 2（农耕）低模道具。图元 API 见开发契约 §5，归属见 §7.2。 */
import type { BuildCtx, PropBuilder } from '../primitives';
import { num, str } from '../primitives';

const THEME = '#8FAE3B';
const WOOD = '#7A5533';
const WOOD_DARK = '#5B3E24';
const SOIL = '#6B4A2E';
const SOIL_DARK = '#4A3420';
const STONE = '#9A968A';

/** 带辐条的低模车轮：轮面在 XY 平面、轴向 +Z。 */
function spokedWheel(
  ctx: BuildCtx,
  center: [number, number, number],
  radius: number,
  spokes: number,
  rimSegments: number,
  wood: string,
  rimWood: string,
  hub: string,
): void {
  const [cx, cy, cz] = center;
  ctx.cyl(radius * 0.1, radius * 0.1, radius * 0.24, hub, [cx, cy, cz], [Math.PI / 2, 0, 0], 6);
  const segLen = radius * 0.94 * Math.tan(Math.PI / rimSegments) * 2.2;
  for (let i = 0; i < rimSegments; i += 1) {
    const a = (i / rimSegments) * Math.PI * 2;
    ctx.box(
      radius * 0.12,
      segLen,
      radius * 0.2,
      rimWood,
      [cx + Math.cos(a) * radius * 0.94, cy + Math.sin(a) * radius * 0.94, cz],
      [0, 0, a],
    );
  }
  for (let i = 0; i < spokes; i += 1) {
    const a = (i / spokes) * Math.PI * 2;
    ctx.box(
      radius * 0.06,
      radius * 0.88,
      radius * 0.08,
      wood,
      [cx + Math.cos(a) * radius * 0.46, cy + Math.sin(a) * radius * 0.46, cz],
      [0, 0, a - Math.PI / 2],
    );
  }
}

/** 陶罐：底 + 鼓腹 + 颈 + 口沿 + 主题色纹带 + 双耳。 */
function clayPot(ctx: BuildCtx, x: number, y: number, z: number, s: number): void {
  ctx.cyl(0.18 * s, 0.26 * s, 0.16 * s, '#C8875A', [x, y + 0.08 * s, z], undefined, 6);
  ctx.sphere(0.33 * s, '#C8875A', [x, y + 0.42 * s, z], 6);
  ctx.cyl(0.18 * s, 0.17 * s, 0.24 * s, '#C8875A', [x, y + 0.66 * s, z], undefined, 6);
  ctx.cyl(0.23 * s, 0.19 * s, 0.09 * s, '#A86741', [x, y + 0.81 * s, z], undefined, 6);
  ctx.cyl(0.16 * s, 0.16 * s, 0.05 * s, WOOD_DARK, [x, y + 0.86 * s, z], undefined, 6);
  ctx.cyl(0.35 * s, 0.35 * s, 0.08 * s, THEME, [x, y + 0.5 * s, z], undefined, 6);
  for (const sx of [-1, 1]) {
    ctx.box(
      0.05 * s,
      0.2 * s,
      0.07 * s,
      '#A86741',
      [x + sx * 0.3 * s, y + 0.62 * s, z],
      [0, 0, sx * -0.35],
    );
  }
}

export const builders: Record<string, PropBuilder> = {
  /** 农田：深色翻耕土垄 + 主题色作物条带 + 麦穗簇 + 田埂。 */
  field: (ctx, params) => {
    const rows = Math.max(2, Math.round(num(params, 'rows', 4)));
    const w = 4.6;
    const d = 3.6;
    const step = d / rows;
    ctx.box(w + 0.4, 0.18, d + 0.4, SOIL, [0, 0.09, 0]);
    for (let i = 0; i < rows; i += 1) {
      const z = -d / 2 + step * (i + 0.5);
      ctx.box(w, 0.26, step * 0.56, SOIL_DARK, [0, 0.22, z]);
      ctx.box(w * 0.98, 0.1, step * 0.24, THEME, [0, 0.38, z]);
      for (let k = 0; k < 5; k += 1) {
        const x = -w / 2 + (w / 6) * (k + 1) + (ctx.rand() - 0.5) * 0.3;
        const h = 0.3 + ctx.rand() * 0.14;
        ctx.cone(0.085, h, '#D9C46A', [x, 0.43 + h / 2, z], undefined, 5);
      }
    }
    ctx.box(w + 0.5, 0.28, 0.24, '#8A6A45', [0, 0.14, -d / 2 - 0.12]);
    ctx.box(w + 0.5, 0.28, 0.24, '#8A6A45', [0, 0.14, d / 2 + 0.12]);
    return { anchorY: 2.2 };
  },

  /** 水稻田：泥底 + 深蓝绿水面 + 高于水面的土埂 + 成排绿色秧苗（无棚顶）。 */
  'rice-paddy': (ctx, params) => {
    const w = 4.4;
    const d = 3.4;
    const rows = Math.max(2, Math.round(num(params, 'rows', 3)));
    const cols = 5;
    ctx.box(w, 0.36, d, '#6E6A48', [0, 0.18, 0]);
    // 水面明显低于埂顶，读作水田而不是棚架
    ctx.plane(w - 0.44, d - 0.44, '#376E6C', [0, 0.31, 0]);
    ctx.box(w - 1.0, 0.014, 0.1, '#5E9C98', [0, 0.322, -d * 0.18]);
    ctx.box(w - 1.5, 0.014, 0.08, '#5E9C98', [0.08, 0.322, d * 0.22]);
    // 四边土埂（高于水面）
    ctx.box(w + 0.4, 0.52, 0.3, '#8A7448', [0, 0.26, -d / 2 - 0.07]);
    ctx.box(w + 0.4, 0.52, 0.3, '#8A7448', [0, 0.26, d / 2 + 0.07]);
    ctx.box(0.3, 0.52, d, '#8A7448', [-w / 2 - 0.07, 0.26, 0]);
    ctx.box(0.3, 0.52, d, '#8A7448', [w / 2 + 0.07, 0.26, 0]);
    // 埂顶草色（主题色）
    ctx.box(w + 0.4, 0.06, 0.26, THEME, [0, 0.49, -d / 2 - 0.07]);
    ctx.box(w + 0.4, 0.06, 0.26, THEME, [0, 0.49, d / 2 + 0.07]);
    // 成排稻秧
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = -w / 2 + 0.6 + (c * (w - 1.2)) / (cols - 1) + (ctx.rand() - 0.5) * 0.1;
        const z = -d / 2 + 0.65 + (r * (d - 1.3)) / (rows - 1) + (ctx.rand() - 0.5) * 0.1;
        const h = 0.42 + ctx.rand() * 0.22;
        ctx.cone(0.09, h, THEME, [x, 0.31 + h / 2, z], undefined, 5);
        ctx.cone(0.06, h * 0.8, '#5E8F33', [x + 0.07, 0.31 + h * 0.4, z + 0.05], undefined, 4);
      }
    }
    return { anchorY: 2.1 };
  },

  /** 定居村落土坯房：石基 + 木骨土墙 + 双坡草顶 + 门窗 + 山墙 + 石阶。 */
  'village-house': (ctx, params) => {
    const roofColor = str(params, 'roof', '#9A6138');
    const w = 3;
    const d = 2.6;
    const wallH = 1.9;
    const roofH = 1.15;
    const eave = 0.35;
    const baseY = 0.22;
    ctx.box(w + 0.4, baseY, d + 0.4, STONE, [0, baseY / 2, 0]);
    ctx.box(w, wallH, d, '#C7A97A', [0, baseY + wallH / 2, 0]);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        ctx.box(0.16, wallH, 0.16, WOOD, [
          sx * (w / 2 - 0.02),
          baseY + wallH / 2,
          sz * (d / 2 - 0.02),
        ]);
      }
    }
    ctx.box(0.7, 1.1, 0.12, WOOD_DARK, [0, baseY + 0.55, d / 2 + 0.02]);
    ctx.box(0.46, 0.42, 0.1, '#4A3524', [-0.98, baseY + 1.3, d / 2 + 0.02]);
    ctx.box(0.46, 0.42, 0.1, '#4A3524', [0.98, baseY + 1.3, d / 2 + 0.02]);
    ctx.box(1.0, 0.14, 0.16, WOOD, [0, baseY + 1.16, d / 2 + 0.04]);
    const roofY = baseY + wallH;
    const half = d / 2 + eave;
    const slope = Math.atan2(roofH, half);
    const slabLen = Math.hypot(half, roofH) + 0.14;
    for (const sz of [-1, 1]) {
      ctx.box(
        w + 0.6,
        0.14,
        slabLen,
        roofColor,
        [0, roofY + roofH / 2, sz * (d / 4 + eave / 2)],
        [sz * slope, 0, 0],
      );
    }
    ctx.box(w + 0.72, 0.14, 0.22, '#7C4A29', [0, roofY + roofH + 0.02, 0]);
    for (const sx of [-1, 1]) {
      ctx.box(0.12, roofH * 0.55, d * 0.6, '#C7A97A', [
        sx * (w / 2 - 0.03),
        roofY + roofH * 0.28,
        0,
      ]);
      ctx.box(0.12, roofH * 0.28, d * 0.3, '#C7A97A', [
        sx * (w / 2 - 0.03),
        roofY + roofH * 0.68,
        0,
      ]);
    }
    ctx.box(0.9, 0.12, 0.42, '#A8A395', [0, 0.06, d / 2 + 0.28]);
    return { anchorY: 4.4 };
  },

  /** 粮仓：架空木柱 + 圆形仓体 + 草顶 + 木梯 + 粮袋。 */
  granary: (ctx) => {
    const legH = 0.9;
    const baseTop = 0.16;
    ctx.box(2.6, baseTop, 2.6, STONE, [0, baseTop / 2, 0]);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        ctx.box(0.18, legH, 0.18, WOOD, [sx * 0.92, baseTop + legH / 2, sz * 0.92]);
        ctx.box(0.46, 0.1, 0.46, '#A8A395', [sx * 0.92, baseTop + legH + 0.05, sz * 0.92]);
      }
    }
    const platformY = baseTop + legH + 0.2;
    ctx.box(2.5, 0.2, 2.5, '#8A673D', [0, platformY, 0]);
    const bodyY = platformY + 0.1;
    ctx.cyl(1.0, 1.12, 1.5, '#C9A46E', [0, bodyY + 0.75, 0], undefined, 7);
    ctx.cyl(1.06, 1.06, 0.14, '#A86741', [0, bodyY + 0.12, 0], undefined, 7);
    ctx.cone(1.38, 0.86, '#8C6239', [0, bodyY + 1.5 + 0.43, 0], undefined, 7);
    ctx.cyl(0.05, 0.08, 0.36, WOOD_DARK, [0, bodyY + 1.5 + 0.86 + 0.18, 0], undefined, 5);
    ctx.box(0.07, 1.7, 0.07, WOOD, [1.26, 0.85, 0.5], [0, 0, -0.22]);
    ctx.box(0.07, 1.7, 0.07, WOOD, [1.26, 0.85, 0.86], [0, 0, -0.22]);
    for (let i = 0; i < 4; i += 1) {
      ctx.box(0.06, 0.05, 0.42, WOOD_DARK, [1.44 - i * 0.1, 0.32 + i * 0.4, 0.68]);
    }
    ctx.ico(0.26, '#C9A46E', [-1.5, 0.26, 0.7], 0);
    ctx.box(0.42, 0.36, 0.4, '#B08A55', [-1.55, 0.18, -0.1]);
    return { anchorY: 4.9 };
  },

  /** 水井：石砌井圈 + 水面 + 木架 + 卷绳 + 木桶 + 小顶棚。 */
  well: (ctx) => {
    ctx.cyl(0.95, 1.05, 0.95, '#8E8A7C', [0, 0.475, 0], undefined, 8);
    ctx.cyl(0.74, 0.74, 0.08, '#4E7C7A', [0, 0.86, 0], undefined, 8);
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      ctx.box(
        0.5,
        0.16,
        0.34,
        '#A8A395',
        [Math.cos(a) * 0.92, 0.98, Math.sin(a) * 0.92],
        [0, a, 0],
      );
    }
    for (const sx of [-1, 1]) {
      ctx.cyl(0.08, 0.1, 2.1, WOOD, [sx * 0.92, 1.05, 0], undefined, 6);
    }
    ctx.cyl(0.06, 0.06, 2.1, WOOD_DARK, [0, 1.85, 0], [0, 0, Math.PI / 2], 6);
    ctx.cyl(0.018, 0.018, 0.8, '#B9A98C', [0, 1.45, 0], undefined, 4);
    ctx.cyl(0.16, 0.12, 0.24, WOOD, [0, 1.02, 0], undefined, 6);
    for (const sz of [-1, 1]) {
      ctx.box(2.3, 0.1, 0.62, '#8C6239', [0, 2.32, sz * 0.28], [sz * 0.5, 0, 0]);
    }
    ctx.box(2.4, 0.1, 0.14, '#7C4A29', [0, 2.44, 0]);
    return { anchorY: 3.5 };
  },

  /** 车轮（关键锚点）：8 辐条立轮 + 展示木架 + 轴 + 斜撑。 */
  wheel: (ctx) => {
    ctx.plane(2.6, 2.4, '#8C7A50', [0, 0.012, 0]);
    const radius = 0.95;
    const cy = radius + 0.03;
    spokedWheel(ctx, [0, cy, 0], radius, 8, 12, WOOD, '#8A6339', WOOD_DARK);
    for (const sz of [-1, 1]) {
      ctx.box(0.14, cy, 0.14, WOOD_DARK, [0, cy / 2, sz * 0.4]);
      ctx.box(0.72, 0.12, 0.5, WOOD, [0, 0.06, sz * 0.4]);
    }
    ctx.cyl(0.075, 0.075, 0.98, WOOD_DARK, [0, cy, 0], [Math.PI / 2, 0, 0], 6);
    ctx.box(0.1, 0.9, 0.1, WOOD, [0.34, 0.4, 0.4], [0, 0, -0.62]);
    ctx.box(0.1, 0.9, 0.1, WOOD, [-0.34, 0.4, 0.4], [0, 0, 0.62]);
    ctx.box(0.1, 0.9, 0.1, WOOD, [0.34, 0.4, -0.4], [0, 0, -0.62]);
    ctx.box(0.1, 0.9, 0.1, WOOD, [-0.34, 0.4, -0.4], [0, 0, 0.62]);
    return { anchorY: 3.0 };
  },

  /** 牛车：双辐条轮 + 车斗 + 辕杆横轭 + 草捆粮袋。 */
  'ox-cart': (ctx) => {
    ctx.plane(5.0, 2.3, '#8C7A50', [0.3, 0.012, 0]);
    const wheelR = 0.6;
    const bedY = 1.02;
    ctx.box(1.9, 0.14, 1.1, '#8A673D', [0, bedY, 0]);
    for (const sz of [-1, 1]) {
      ctx.box(1.9, 0.46, 0.1, WOOD, [0, bedY + 0.28, sz * 0.5]);
    }
    ctx.box(0.1, 0.46, 1.0, WOOD, [-0.9, bedY + 0.28, 0]);
    for (const sz of [-1, 1]) {
      spokedWheel(ctx, [0, wheelR + 0.02, sz * 0.66], wheelR, 6, 8, WOOD, '#8A6339', WOOD_DARK);
    }
    ctx.cyl(0.07, 0.07, 1.44, WOOD_DARK, [0, wheelR + 0.02, 0], [Math.PI / 2, 0, 0], 6);
    ctx.box(1.4, 0.1, 0.1, WOOD_DARK, [1.45, bedY - 0.12, 0], [0, 0, -0.12]);
    ctx.box(0.12, 0.12, 1.2, WOOD_DARK, [2.1, bedY - 0.24, 0]);
    ctx.ico(0.3, '#C9A46E', [-0.5, bedY + 0.28, 0], 0);
    ctx.box(0.62, 0.42, 0.56, '#B08A55', [0.42, bedY + 0.28, 0]);
    return { anchorY: 2.6 };
  },

  /** 家畜牛：躯干 + 四腿 + 头颈 + 牛角 + 皮毛花纹 + 尾巴。 */
  cattle: (ctx, params) => {
    const coat = str(params, 'coat', '#D8CDB6');
    const y = 0.72;
    ctx.box(1.32, 0.6, 0.64, coat, [0, y, 0]);
    ctx.box(0.34, 0.28, 0.06, '#8A6A4A', [0.18, y + 0.12, 0.33]);
    ctx.box(0.26, 0.22, 0.06, '#8A6A4A', [-0.34, y - 0.08, 0.33]);
    for (const sx of [-0.46, 0.46]) {
      for (const sz of [-0.2, 0.2]) {
        ctx.box(0.14, 0.46, 0.14, '#C4B79E', [sx, 0.23, sz]);
      }
    }
    ctx.box(0.36, 0.36, 0.36, coat, [0.8, y + 0.16, 0]);
    ctx.box(0.3, 0.22, 0.3, '#C9B8A0', [1.04, y + 0.06, 0]);
    ctx.cone(0.055, 0.3, '#EDE6D4', [0.78, y + 0.52, 0.2], [0.45, 0, -0.35], 5);
    ctx.cone(0.055, 0.3, '#EDE6D4', [0.78, y + 0.52, -0.2], [-0.45, 0, -0.35], 5);
    ctx.box(0.18, 0.07, 0.06, coat, [0.72, y + 0.32, 0.24], [0, 0, 0.4]);
    ctx.box(0.18, 0.07, 0.06, coat, [0.72, y + 0.32, -0.24], [0, 0, 0.4]);
    ctx.cyl(0.03, 0.045, 0.52, '#B9A98C', [-0.72, y - 0.1, 0], [0, 0, 0.4], 5);
    return { anchorY: 2.4 };
  },

  /** 陶器组合：两只主题色纹带陶罐 + 一只陶碗。 */
  pottery: (ctx) => {
    clayPot(ctx, 0.05, 0, 0.1, 1);
    clayPot(ctx, 0.72, 0, -0.28, 0.66);
    ctx.cyl(0.26, 0.17, 0.2, '#C8875A', [-0.56, 0.1, -0.34], undefined, 6);
    ctx.cyl(0.21, 0.21, 0.04, '#8A5A33', [-0.56, 0.19, -0.34], undefined, 6);
    return { anchorY: 2.2 };
  },

  /** 泥板（关键锚点）：立式楔形文字泥板 + 石座 + 芦苇笔 + 备用小泥板。 */
  tablet: (ctx) => {
    ctx.box(1.25, 0.22, 0.8, STONE, [0, 0.11, 0]);
    ctx.box(1.0, 0.14, 0.6, '#8A8578', [0, 0.29, 0]);
    ctx.box(0.9, 1.28, 0.14, '#C8A56E', [0, 1.02, 0], [-0.08, 0, 0]);
    ctx.box(0.96, 1.34, 0.06, '#B08A55', [0, 1.02, -0.06], [-0.08, 0, 0]);
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const y = 0.72 + r * 0.24;
        ctx.box(
          0.12,
          0.06,
          0.035,
          '#6B4A2C',
          [-0.28 + c * 0.19, y, 0.09 - 0.08 * (y - 1.02)],
          [-0.08, 0, 0],
        );
      }
    }
    ctx.box(0.46, 0.09, 0.42, '#C8A56E', [-0.66, 0.37, 0.22], [0, 0.5, 0]);
    ctx.cyl(0.022, 0.03, 0.66, '#C2A05A', [0.66, 0.45, 0.28], [0.25, 0, 0.95], 5);
    ctx.cone(0.035, 0.12, '#6B4A2C', [0.88, 0.33, 0.34], [0.25, 0, 0.95], 5);
    return { anchorY: 2.8 };
  },

  /** 木栅栏（编篱）：立柱 + 横向编织条 + 斜向藤条。 */
  'wattle-fence': (ctx, params) => {
    const length = num(params, 'length', 3.2);
    const height = num(params, 'height', 1.05);
    const posts = Math.max(3, Math.round(num(params, 'posts', 5)));
    for (let i = 0; i < posts; i += 1) {
      const x = -length / 2 + (length / (posts - 1)) * i;
      const h = height + (i % 2 === 0 ? 0.12 : 0) + (ctx.rand() - 0.5) * 0.1;
      ctx.cyl(0.055, 0.075, h, WOOD, [x, h / 2, 0], undefined, 5);
      ctx.cyl(0.05, 0.05, 0.06, WOOD_DARK, [x, h - 0.01, 0], undefined, 5);
    }
    for (let k = 0; k < 3; k += 1) {
      const y = 0.26 + k * 0.28;
      const z = k % 2 === 0 ? 0.035 : -0.035;
      ctx.cyl(0.032, 0.032, length, '#A67C46', [0, y, z], [0, 0, Math.PI / 2], 5);
    }
    ctx.cyl(
      0.03,
      0.03,
      length * 0.98,
      '#9A7038',
      [0, height * 0.5, 0.055],
      [0, 0, Math.PI / 2 + 0.3],
      5,
    );
    ctx.cyl(
      0.03,
      0.03,
      length * 0.98,
      '#9A7038',
      [0, height * 0.5, -0.055],
      [0, 0, Math.PI / 2 - 0.3],
      5,
    );
    return { anchorY: 1.9 };
  },
};
