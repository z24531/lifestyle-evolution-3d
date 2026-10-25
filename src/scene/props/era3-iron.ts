/** S-A:时代 3（手工业/铁器）低模道具。图元 API 见开发契约 §5，归属见 §7.2。 */
import type { BuildCtx, PropBuilder } from '../primitives';
import { num, str } from '../primitives';

const THEME = '#A8662A';
const WOOD = '#6B4A2C';
const WOOD_DARK = '#4A3524';
const STONE = '#9C8E74';
const STONE_LIGHT = '#B7A98A';
const METAL = '#565B63';
const CREAM = '#E8DCC0';

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

export const builders: Record<string, PropBuilder> = {
  /** 冶炼炉（关键锚点）：石砌炉基 + 鼓腹炉身 + 炉口火光（emissive）+ 出铁口铁水 + 烟囱 + 风箱 + 炭堆。 */
  furnace: (ctx) => {
    // 石砌基座
    ctx.cyl(1.5, 1.8, 0.55, '#6F675C', [0, 0.275, 0], undefined, 7);
    // 炉底余烬缝（任意视角都能看到橙光）
    ctx.cyl(1.52, 1.56, 0.09, '#FF6A1F', [0, 0.62, 0], undefined, 7, {
      emissive: '#FF4A0F',
      emissiveIntensity: 1.3,
    });
    // 鼓腹炉身
    ctx.cyl(1.05, 1.45, 2.0, '#8B8175', [0, 1.55, 0], undefined, 7);
    // 砖带 + 主题色环
    ctx.cyl(1.46, 1.46, 0.18, '#6B4A2C', [0, 0.86, 0], undefined, 7);
    ctx.cyl(1.14, 1.18, 0.2, THEME, [0, 2.25, 0], undefined, 7);
    // 炉口（深色炉膛 + 明亮火焰）
    ctx.box(1.06, 1.0, 0.46, '#241D18', [0, 1.5, 1.35]);
    ctx.box(0.86, 0.72, 0.18, '#FF7A2F', [0, 1.46, 1.62], undefined, {
      emissive: '#FF4A0F',
      emissiveIntensity: 2.4,
    });
    ctx.cone(0.3, 0.66, '#FFC24A', [0, 1.4, 1.78], [1.45, 0, 0], 6, {
      emissive: '#FF9A2E',
      emissiveIntensity: 2.1,
    });
    ctx.cone(0.16, 0.48, '#FFE7A8', [0, 1.34, 1.82], [1.45, 0, 0], 5, {
      emissive: '#FFD27A',
      emissiveIntensity: 1.8,
    });
    // 火星
    ctx.ico(0.08, '#FFD27A', [0.2, 1.95, 1.62], 0, {
      emissive: '#FFAA33',
      emissiveIntensity: 1.6,
    });
    ctx.ico(0.06, '#FF9A3C', [-0.18, 2.12, 1.5], 0, {
      emissive: '#FF7A1F',
      emissiveIntensity: 1.4,
    });
    // 烟囱 + 口沿 + 顶端余火
    ctx.cyl(0.5, 0.68, 1.1, '#77706A', [0, 3.1, 0], undefined, 7);
    ctx.cyl(0.58, 0.58, 0.16, '#5A524A', [0, 3.72, 0], undefined, 7);
    ctx.cyl(0.38, 0.38, 0.07, '#FFAA33', [0, 3.7, 0], undefined, 7, {
      emissive: '#FF7A1F',
      emissiveIntensity: 1.5,
    });
    // 出铁口 + 铁水 + 锭模
    ctx.box(0.44, 0.26, 0.32, '#3A332C', [0.5, 0.92, 1.36]);
    ctx.box(0.46, 0.1, 0.68, '#FF7A2F', [0.5, 0.42, 1.55], undefined, {
      emissive: '#FF4A0F',
      emissiveIntensity: 2.2,
    });
    ctx.box(0.64, 0.16, 0.54, '#4A4038', [0.5, 0.08, 1.92]);
    // 风箱
    ctx.box(0.95, 0.52, 0.52, WOOD, [-2.0, 0.52, 0.5], [0, 0.3, 0]);
    ctx.box(0.76, 0.36, 0.38, '#8A5A30', [-2.1, 0.9, 0.56], [0, 0.3, 0]);
    ctx.box(0.16, 0.58, 0.12, WOOD_DARK, [-1.32, 0.74, 0.5], [0, 0.3, 0]);
    ctx.cyl(0.06, 0.07, 0.95, METAL, [-1.38, 0.64, 0.66], [0, 0.3, Math.PI / 2], 5);
    // 炭堆 / 矿石
    ctx.ico(0.42, '#3A332C', [2.0, 0.36, 0.62], 0);
    ctx.ico(0.32, '#4A4038', [1.8, 0.27, -0.85], 0);
    ctx.ico(0.25, '#6B5A48', [2.35, 0.21, 0.15], 0);
    return { anchorY: 4.7 };
  },

  /** 铁砧：木墩 + 铁砧 + 砧角 + 热铁坯（emissive）+ 锤子 + 水桶。 */
  anvil: (ctx) => {
    ctx.cyl(0.42, 0.5, 0.85, WOOD, [0, 0.425, 0], undefined, 7);
    ctx.box(0.5, 0.2, 0.5, '#3E434A', [0, 1.05, 0]);
    ctx.box(0.36, 0.3, 0.95, METAL, [0, 1.3, 0]);
    ctx.cone(0.17, 0.44, METAL, [0, 1.3, 0.68], [Math.PI / 2, 0, 0], 6);
    ctx.box(0.3, 0.07, 0.12, '#FF8A3C', [0.02, 1.47, 0], undefined, {
      emissive: '#FF5A1F',
      emissiveIntensity: 1.5,
    });
    ctx.cyl(0.03, 0.04, 0.62, WOOD, [0.42, 1.5, 0.2], [0, 0, 0.9], 5);
    ctx.box(0.14, 0.12, 0.26, '#3E434A', [0.68, 1.62, 0.2], [0, 0, 0.9]);
    ctx.cyl(0.16, 0.13, 0.28, '#4E6B6A', [-0.58, 0.14, 0.28], undefined, 6);
    ctx.cyl(0.14, 0.14, 0.04, '#6FA39A', [-0.58, 0.27, 0.28], undefined, 6);
    return { anchorY: 2.5 };
  },

  /** 城墙：夯土石墙段 + 砌缝 + 城垛 + 箭窗 + 主题色旗帜。 */
  'city-wall': (ctx, params) => {
    const len = num(params, 'length', 6.4);
    const d = 0.95;
    const h = 2;
    ctx.box(len + 0.2, 0.3, d + 0.36, STONE, [0, 0.15, 0]);
    ctx.box(len, h, d, STONE_LIGHT, [0, 0.3 + h / 2, 0]);
    for (let i = 0; i < 4; i += 1) {
      ctx.box(len * 0.98, 0.1, d + 0.05, '#A89877', [0, 0.62 + i * 0.42, 0]);
    }
    const merlons = 7;
    for (let i = 0; i < merlons; i += 1) {
      const x = -len / 2 + (len / merlons) * (i + 0.5);
      ctx.box((len / merlons) * 0.58, 0.5, d * 0.92, '#A89877', [x, 0.3 + h + 0.25, 0]);
    }
    for (let i = 0; i < 3; i += 1) {
      ctx.box(0.16, 0.5, 0.1, '#3A332C', [-len / 3 + (i * len) / 3, 1.5, d / 2 + 0.02]);
    }
    ctx.cyl(0.04, 0.05, 1.3, WOOD_DARK, [len * 0.34, 0.3 + h + 0.5, 0], undefined, 5);
    ctx.box(0.62, 0.4, 0.04, THEME, [len * 0.34 + 0.33, 0.3 + h + 1.0, 0]);
    return { anchorY: 4.6 };
  },

  /** 瞭望塔：石台基 + 圆形塔身 + 箭窗 + 城垛 + 主题色旗帜。 */
  tower: (ctx, params) => {
    const flag = str(params, 'flag', THEME);
    ctx.cyl(1.3, 1.5, 0.35, STONE, [0, 0.175, 0], undefined, 8);
    ctx.cyl(0.95, 1.2, 3.4, '#B0A184', [0, 0.35 + 1.7, 0], undefined, 8);
    for (let i = 0; i < 3; i += 1) {
      ctx.cyl(
        1.02 - i * 0.06,
        1.05 - i * 0.06,
        0.08,
        '#A89877',
        [0, 1.1 + i * 0.95, 0],
        undefined,
        8,
      );
    }
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      ctx.box(
        0.14,
        0.44,
        0.12,
        '#3A332C',
        [Math.cos(a) * 0.95, 2.3, Math.sin(a) * 0.95],
        [0, -a, 0],
      );
    }
    ctx.cyl(1.42, 1.2, 0.3, '#A89877', [0, 3.9, 0], undefined, 8);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.box(0.44, 0.5, 0.3, '#A89877', [Math.cos(a) * 1.24, 4.3, Math.sin(a) * 1.24], [0, -a, 0]);
    }
    ctx.cyl(0.04, 0.05, 1.3, WOOD_DARK, [0, 5.2, 0], undefined, 5);
    ctx.box(0.6, 0.38, 0.04, flag, [0.32, 5.5, 0]);
    return { anchorY: 6.8 };
  },

  /** 神庙：石砌前广场 + 多层台基 + 双排柱廊 + 额枋 + 主题色饰带 + 双坡屋顶。 */
  temple: (ctx) => {
    // 前广场（平台顶面的铺装色块细节）
    ctx.plane(6.8, 5.4, '#BFB49A', [0, 0.015, 0.8]);
    const W = 4;
    const D = 2.8;
    const colH = 2.1;
    ctx.box(W + 0.9, 0.22, D + 0.9, '#B8AE97', [0, 0.11, 0]);
    ctx.box(W + 0.55, 0.2, D + 0.55, '#C4BBA5', [0, 0.32, 0]);
    ctx.box(W + 0.2, 0.18, D + 0.2, '#CFC6B0', [0, 0.51, 0]);
    const floorY = 0.6;
    for (let i = 0; i < 4; i += 1) {
      const x = -W / 2 + 0.32 + (i * (W - 0.64)) / 3;
      for (const sz of [-1, 1]) {
        const z = sz * (D / 2 - 0.3);
        ctx.box(0.42, 0.14, 0.42, '#CFC6B0', [x, floorY + 0.07, z]);
        ctx.cyl(0.16, 0.2, colH, '#D8D2C4', [x, floorY + 0.14 + colH / 2, z], undefined, 6);
      }
    }
    const topY = floorY + 0.14 + colH;
    ctx.box(W - 0.3, colH, 0.16, '#B8AE97', [0, floorY + colH / 2, -D / 2 + 0.32]);
    ctx.box(0.9, 1.5, 0.2, '#3A332C', [0, floorY + 0.75, -D / 2 + 0.38]);
    ctx.box(W + 0.25, 0.36, D + 0.25, '#C4BBA5', [0, topY + 0.18, 0]);
    ctx.box(W + 0.32, 0.14, D + 0.32, THEME, [0, topY + 0.42, 0]);
    const roofH = 0.95;
    const half = D / 2 + 0.35;
    const slope = Math.atan2(roofH, half);
    const slabLen = Math.hypot(half, roofH) + 0.16;
    for (const sz of [-1, 1]) {
      ctx.box(
        W + 0.5,
        0.14,
        slabLen,
        '#9A6138',
        [0, topY + 0.49 + roofH / 2, sz * (D / 4 + 0.175)],
        [sz * slope, 0, 0],
      );
    }
    ctx.box(W + 0.6, 0.14, 0.2, '#7C4A29', [0, topY + 0.49 + roofH + 0.02, 0]);
    for (const sx of [-1, 1]) {
      ctx.box(0.1, roofH * 0.55, D * 0.55, '#C4BBA5', [
        sx * (W / 2 - 0.02),
        topY + 0.49 + roofH * 0.28,
        0,
      ]);
      ctx.box(0.1, roofH * 0.28, D * 0.28, '#C4BBA5', [
        sx * (W / 2 - 0.02),
        topY + 0.49 + roofH * 0.66,
        0,
      ]);
    }
    return { anchorY: 5.4 };
  },

  /** 市场摊位：四柱 + 柜台 + 主题色条纹遮阳篷 + 篮子果子布卷。 */
  'market-stall': (ctx, params) => {
    const awning = str(params, 'awning', THEME);
    const w = 2.8;
    const d = 1.8;
    const postH = 2;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        ctx.cyl(
          0.05,
          0.06,
          postH,
          WOOD,
          [sx * (w / 2 - 0.06), postH / 2, sz * (d / 2 - 0.06)],
          undefined,
          5,
        );
      }
    }
    ctx.box(w - 0.15, 0.12, d * 0.52, '#9A7448', [0, 0.86, d * 0.16]);
    ctx.box(w - 0.12, 0.1, d * 0.52, '#8A673D', [0, 0.34, d * 0.16]);
    for (const sx of [-1, 1]) {
      ctx.box(0.1, 0.86, 0.1, WOOD_DARK, [sx * (w / 2 - 0.3), 0.43, d * 0.42]);
    }
    const tilt = 0.24;
    for (let i = 0; i < 4; i += 1) {
      const x = -w / 2 + (w / 4) * (i + 0.5);
      ctx.box(
        w / 4 + 0.02,
        0.07,
        d + 0.4,
        i % 2 === 0 ? awning : CREAM,
        [x, postH + 0.3, 0],
        [tilt, 0, 0],
      );
    }
    ctx.cyl(0.3, 0.36, 0.3, '#B08A55', [-0.7, 1.07, 0.24], undefined, 6);
    ctx.cyl(0.27, 0.27, 0.05, '#8A673D', [-0.7, 1.24, 0.24], undefined, 6);
    ctx.ico(0.14, '#C85A4A', [-0.82, 1.32, 0.24], 0);
    ctx.ico(0.13, '#D9A33C', [-0.58, 1.31, 0.24], 0);
    ctx.ico(0.12, '#8FAE3B', [-0.7, 1.32, 0.04], 0);
    ctx.cyl(0.11, 0.11, 0.55, '#C46A4E', [0.55, 1.02, 0.26], [0, 0, Math.PI / 2], 6);
    ctx.cyl(0.11, 0.11, 0.55, '#E8DCC0', [0.55, 1.02, 0.04], [0, 0, Math.PI / 2], 6);
    return { anchorY: 3.2 };
  },

  /** 马拉车：双轮车斗 + 主题色饰条 + 辕杆 + 低模马。 */
  'horse-cart': (ctx) => {
    const wheelR = 0.52;
    const bedY = 0.92;
    ctx.box(1.5, 0.12, 1.0, '#8A673D', [-0.7, bedY, 0]);
    ctx.box(1.5, 0.4, 0.1, WOOD, [-0.7, bedY + 0.24, 0.46]);
    ctx.box(1.5, 0.4, 0.1, WOOD, [-0.7, bedY + 0.24, -0.46]);
    ctx.box(0.1, 0.4, 0.9, WOOD, [-1.42, bedY + 0.24, 0]);
    ctx.box(1.52, 0.08, 0.06, THEME, [-0.7, bedY + 0.1, 0.48]);
    for (const sz of [-1, 1]) {
      spokedWheel(ctx, [-0.7, wheelR + 0.08, sz * 0.62], wheelR, 4, 7, WOOD, '#8A6339', WOOD_DARK);
    }
    ctx.cyl(0.06, 0.06, 1.34, WOOD_DARK, [-0.7, wheelR + 0.08, 0], [Math.PI / 2, 0, 0], 5);
    ctx.box(1.3, 0.09, 1.0, WOOD_DARK, [0.2, bedY - 0.02, 0], [0, 0, 0.04]);
    const hy = 1.16;
    ctx.box(1.2, 0.5, 0.48, '#9A6538', [1.05, hy, 0]);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        ctx.box(0.1, hy - 0.2, 0.1, '#8A5A30', [1.05 + sx * 0.44, (hy - 0.2) / 2, sz * 0.16]);
      }
    }
    ctx.box(0.2, 0.52, 0.24, '#9A6538', [1.75, hy + 0.34, 0], [0, 0, -0.35]);
    ctx.box(0.42, 0.24, 0.22, '#9A6538', [1.98, hy + 0.56, 0], [0, 0, -0.3]);
    ctx.box(0.2, 0.14, 0.18, '#C4A784', [2.16, hy + 0.5, 0], [0, 0, -0.3]);
    ctx.cone(0.05, 0.16, '#9A6538', [1.84, hy + 0.66, 0.1], [0, 0, -0.2], 4);
    ctx.cone(0.05, 0.16, '#9A6538', [1.84, hy + 0.66, -0.1], [0, 0, -0.2], 4);
    ctx.box(0.1, 0.5, 0.08, '#6B4A2C', [1.55, hy + 0.36, 0]);
    ctx.cyl(0.04, 0.06, 0.5, '#6B4A2C', [0.42, hy - 0.06, 0], [0, 0, 0.5], 5);
    return { anchorY: 3.0 };
  },

  /** 帆船：船坞水面 + 船体 + 甲板 + 尾舵楼 + 桅杆横桁 + 主题色帆带 + 旗 + 舵桨。 */
  'sailing-ship': (ctx) => {
    // 水面（让船读作停泊在水上）
    ctx.plane(5.4, 2.8, '#2F5A6B', [0, 0.02, 0]);
    ctx.box(4.8, 0.02, 0.12, '#4E8794', [0, 0.032, 0.75]);
    ctx.box(4.2, 0.02, 0.1, '#4E8794', [0, 0.032, -0.8]);
    // 船坞垫木（贴地）
    for (const sx of [-1.1, 1.1]) {
      ctx.box(0.5, 0.36, 1.5, WOOD_DARK, [sx, 0.18, 0]);
    }
    // 船体
    ctx.box(4.2, 0.72, 1.4, '#7A5230', [0, 0.72, 0]);
    ctx.box(1.3, 0.66, 1.1, '#8A5F38', [2.5, 0.74, 0], [0, 0.32, 0]);
    ctx.box(1.2, 0.62, 1.05, '#8A5F38', [-2.45, 0.7, 0], [0, -0.3, 0]);
    // 甲板 + 舷墙
    ctx.box(3.9, 0.12, 1.2, '#A67C46', [0, 1.14, 0]);
    ctx.box(4.1, 0.34, 0.12, WOOD, [0, 1.32, 0.64]);
    ctx.box(4.1, 0.34, 0.12, WOOD, [0, 1.32, -0.64]);
    // 船尾舵楼 + 顶盖
    ctx.box(0.9, 0.7, 1.0, '#8A5F38', [-1.7, 1.5, 0]);
    ctx.box(0.9, 0.1, 1.1, '#6B4A2C', [-1.7, 1.9, 0]);
    // 桅杆 + 横桁
    ctx.cyl(0.06, 0.09, 2.6, WOOD, [0.2, 2.4, 0], undefined, 6);
    ctx.box(0.08, 0.08, 2.4, WOOD_DARK, [0.2, 3.45, 0]);
    // 主帆 + 主题色横条
    ctx.box(0.06, 1.5, 2.2, CREAM, [0.2, 2.6, 0]);
    ctx.box(0.08, 0.16, 2.2, THEME, [0.2, 3.0, 0]);
    // 前帆
    ctx.box(0.05, 1.1, 0.85, '#F2E9D4', [1.55, 2.2, 0]);
    // 旗
    ctx.box(0.5, 0.3, 0.04, THEME, [0.45, 3.72, 0]);
    // 舵桨
    ctx.cyl(0.05, 0.05, 1.25, WOOD_DARK, [-2.7, 0.85, 0.55], [0, 0, 0.55], 5);
    // 舷侧盾片
    for (const sz of [-1, 1]) {
      for (const sx of [-0.9, 0.4, 1.5]) {
        ctx.box(0.26, 0.26, 0.08, '#8A5F38', [sx, 1.05, sz * 0.74]);
      }
    }
    return { anchorY: 4.6 };
  },

  /** 水车：带桨叶的立轮 + 木质支架 + 引水槽 + 水面。 */
  'water-wheel': (ctx) => {
    const R = 1.15;
    const cy = 1.45;
    for (const sz of [-1, 1]) {
      ctx.box(0.16, cy, 0.16, WOOD, [0, cy / 2, sz * 0.52]);
      ctx.box(0.6, 0.14, 0.32, WOOD_DARK, [0, 0.07, sz * 0.52]);
      ctx.box(0.1, cy * 0.9, 0.1, '#5B3E24', [0.3, cy * 0.5, sz * 0.52], [0, 0, -0.3]);
    }
    spokedWheel(ctx, [0, cy, 0], R, 6, 10, WOOD, '#8A6339', WOOD_DARK);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.box(
        0.3,
        0.5,
        0.62,
        '#8A6339',
        [Math.cos(a) * (R + 0.1), cy + Math.sin(a) * (R + 0.1), 0],
        [0, 0, a],
      );
    }
    ctx.cyl(0.08, 0.08, 1.3, WOOD_DARK, [0, cy, 0], [Math.PI / 2, 0, 0], 6);
    ctx.box(1.6, 0.12, 0.8, '#8A8578', [-2.1, cy * 0.5, 0], [0, 0, 0.28]);
    ctx.box(1.6, 0.34, 0.1, '#7C7468', [-2.1, cy * 0.5 + 0.34, 0.36], [0, 0, 0.28]);
    ctx.box(1.6, 0.34, 0.1, '#7C7468', [-2.1, cy * 0.5 + 0.34, -0.36], [0, 0, 0.28]);
    ctx.plane(2.2, 1.6, '#6FA39A', [0, 0.06, 0], undefined, {
      transparent: true,
      opacity: 0.85,
    });
    return { anchorY: 3.6 };
  },

  /** 纸（关键锚点）：书案 + 纸堆 + 主题色系带卷轴 + 摊开的纸 + 毛笔砚台。 */
  paper: (ctx) => {
    ctx.box(1.9, 0.12, 1.1, '#8A673D', [0, 0.78, 0]);
    for (const sx of [-0.78, 0.78]) {
      for (const sz of [-0.4, 0.4]) {
        ctx.box(0.12, 0.72, 0.12, WOOD, [sx, 0.36, sz]);
      }
    }
    for (let i = 0; i < 5; i += 1) {
      ctx.box(
        0.72,
        0.035,
        0.5,
        '#F0E7D2',
        [-0.42, 0.86 + i * 0.04, 0.16],
        [0, (ctx.rand() - 0.5) * 0.08, 0],
      );
    }
    ctx.cyl(0.11, 0.11, 0.95, '#F0E7D2', [0.4, 1.0, -0.24], [0, 0, Math.PI / 2], 7);
    for (const sx of [-0.52, 0.52]) {
      ctx.cyl(0.055, 0.055, 0.16, WOOD_DARK, [0.4 + sx, 1.0, -0.24], [0, 0, Math.PI / 2], 5);
    }
    ctx.box(0.1, 0.26, 0.26, THEME, [0.4, 1.0, -0.24]);
    ctx.box(0.8, 0.03, 0.56, '#F5EEDC', [0.5, 0.86, 0.24], [0, 0.2, 0]);
    ctx.cyl(0.02, 0.026, 0.5, '#8A5A30', [-0.5, 0.92, -0.3], [0, 0, 1.15], 5);
    ctx.cone(0.03, 0.14, '#3A332C', [-0.27, 0.86, -0.3], [0, 0, 1.15], 5);
    ctx.box(0.26, 0.07, 0.18, METAL, [0.62, 0.86, -0.3]);
    ctx.box(0.3, 0.06, 0.1, WOOD_DARK, [-0.5, 0.83, -0.3]);
    return { anchorY: 2.4 };
  },

  /** 灯笼：石座 + 木柱 + 挑臂 + 发光灯身（emissive）+ 灯顶 + 主题色流苏。 */
  lantern: (ctx) => {
    const glow = { emissive: '#FFB347', emissiveIntensity: 1.5 };
    ctx.cyl(0.44, 0.52, 0.16, '#8E8578', [0, 0.08, 0], undefined, 6);
    ctx.cyl(0.1, 0.14, 1.6, '#7A6A5A', [0, 0.96, 0], undefined, 6);
    ctx.box(0.95, 0.1, 0.1, '#6B5A48', [0.4, 1.86, 0]);
    ctx.cyl(0.05, 0.05, 0.12, '#3A332C', [0.82, 1.82, 0], undefined, 5);
    ctx.box(0.42, 0.5, 0.42, '#FFD98A', [0.82, 1.5, 0], undefined, glow);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        ctx.box(0.05, 0.56, 0.05, '#5A4A3A', [0.82 + sx * 0.21, 1.5, sz * 0.21]);
      }
    }
    ctx.box(0.5, 0.06, 0.5, '#5A4A3A', [0.82, 1.78, 0]);
    ctx.box(0.5, 0.06, 0.5, '#5A4A3A', [0.82, 1.22, 0]);
    ctx.cone(0.4, 0.28, '#5A4A3A', [0.82, 1.95, 0], undefined, 4);
    ctx.box(0.06, 0.26, 0.06, THEME, [0.82, 1.06, 0]);
    return { anchorY: 3.2 };
  },
};
