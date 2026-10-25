/** S-C:时代 7(智能)道具。见开发契约 §7.4。 */
import type { PropBuilder, Vec3 } from '../primitives';

const ACCENT = '#7C4DFF'; // 主题色:科技紫
const PLATE = '#E2E8F0';
const WHITE = '#F2F5FA';
const INK = '#2B3341';
const STEEL = '#8C97A8';
const MINT = '#9BD4C3';
const LEAF = '#6FBF8B';
const GLASSCAR = '#2B3B55';
const CYAN = '#5FE3FF';

const glowAccent = { emissive: ACCENT, emissiveIntensity: 1.3 } as const;
const glowMint = { emissive: '#5EE0B0', emissiveIntensity: 0.9 } as const;
const glowBlue = { emissive: '#5FBCFF', emissiveIntensity: 0.9 } as const;
const glowRed = { emissive: '#FF6B5E', emissiveIntensity: 1.0 } as const;
const glowCyan = { emissive: CYAN, emissiveIntensity: 1.4 } as const;

/** 把局部偏移 (dx,dy,dz) 绕 X 轴旋转 tilt 后加到 center,用于倾斜面贴片。 */
function tiltedPoint(center: Vec3, tilt: number, dx: number, dy: number, dz: number): Vec3 {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return [center[0] + dx, center[1] + dy * c - dz * s, center[2] + dy * s + dz * c];
}

export const builders: Record<string, PropBuilder> = {
  /** 光伏板阵列:倾斜面板 + 支架 + 网格 + 主题色边框。 */
  'solar-panel': (ctx) => {
    const tilt = 0.5;
    const frame: Vec3 = [0, 1.02, 0];
    const panel = tiltedPoint(frame, tilt, 0, 0.09, 0);

    // 支架(后高前低)
    for (const s of [-1, 1]) {
      ctx.cyl(0.07, 0.08, 1.35, STEEL, [s * 0.95, 0.68, -0.5], undefined, 6);
      ctx.cyl(0.06, 0.07, 0.76, STEEL, [s * 0.95, 0.38, 0.45], undefined, 6);
      ctx.box(0.3, 0.1, 0.3, '#B7C0CD', [s * 0.95, 0.05, -0.5]);
    }
    ctx.box(0.12, 0.12, 1.6, '#AEB7C6', [0, 0.95, -0.1], [tilt, 0, 0]);

    // 边框 + 面板
    ctx.box(2.62, 0.1, 1.5, '#B9C2CE', frame, [tilt, 0, 0]);
    ctx.box(2.46, 0.06, 1.36, '#2B3F6B', panel, [tilt, 0, 0]);

    // 网格(2 横 3 竖)
    for (const dz of [-0.34, 0.34]) {
      ctx.box(2.46, 0.02, 0.03, '#4C6FB0', tiltedPoint(frame, tilt, 0, 0.13, dz), [tilt, 0, 0]);
    }
    for (const dx of [-0.66, 0, 0.66]) {
      ctx.box(0.03, 0.02, 1.36, '#4C6FB0', tiltedPoint(frame, tilt, dx, 0.13, 0), [tilt, 0, 0]);
    }

    // 主题色边框光条 + 逆变器
    ctx.box(
      2.46,
      0.05,
      0.06,
      ACCENT,
      tiltedPoint(frame, tilt, 0, 0.14, 0.72),
      [tilt, 0, 0],
      glowAccent,
    );
    ctx.box(0.5, 0.6, 0.26, '#DCE3EC', [1.58, 0.3, 0.1]);
    ctx.box(0.16, 0.08, 0.02, '#5EE0B0', [1.58, 0.42, 0.24], undefined, glowMint);
    return { anchorY: 2.6 };
  },

  /** 风力发电机(塔筒 + 机舱 + 3 片深灰白尖叶片)。 */
  'wind-turbine': (ctx) => {
    ctx.cyl(1.4, 1.7, 0.3, '#CBD3DF', [0, 0.15, 0], undefined, 8);
    ctx.cyl(0.18, 0.38, 7.8, WHITE, [0, 4.2, 0], undefined, 8);
    ctx.box(0.85, 0.6, 1.5, '#EDF1F7', [0, 8.35, -0.1]);
    ctx.cyl(0.17, 0.17, 0.5, '#D5DCE6', [0, 8.35, 0.72], [Math.PI / 2, 0, 0], 8);

    const hubY = 8.35;
    const hubZ = 0.95;
    for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      ctx.box(3.4, 0.24, 0.1, '#5A6571', [1.7 * dx, hubY + 1.7 * dy, hubZ], [0, 0, a]);
      ctx.box(0.5, 0.24, 0.1, WHITE, [3.25 * dx, hubY + 3.25 * dy, hubZ], [0, 0, a]);
    }
    return { anchorY: 13.0 };
  },

  /** 人形机器人(约 2.2 高):头/躯干/双臂 + 紫色胸屏 + 青色头部光点。 */
  robot: (ctx) => {
    // 双脚 + 双腿
    for (const s of [-1, 1]) {
      ctx.box(0.34, 0.12, 0.55, INK, [s * 0.26, 0.06, 0.08]);
      ctx.cyl(0.1, 0.12, 0.45, '#C6CEDA', [s * 0.26, 0.34, 0], undefined, 6);
      ctx.cyl(0.13, 0.13, 0.2, '#E9EEF4', [s * 0.26, 0.66, 0], undefined, 6);
      ctx.cyl(0.11, 0.1, 0.42, '#C6CEDA', [s * 0.26, 0.98, 0], undefined, 6);
    }

    // 躯干 + 胸屏 + 胸口青色指示灯
    ctx.box(0.72, 0.7, 0.46, WHITE, [0, 1.52, 0]);
    ctx.box(0.76, 0.16, 0.48, INK, [0, 1.14, 0]);
    ctx.box(0.46, 0.32, 0.04, ACCENT, [0, 1.56, 0.24], undefined, glowAccent);
    ctx.box(0.3, 0.05, 0.02, '#EAF2FF', [0, 1.62, 0.27]);
    ctx.box(0.3, 0.05, 0.02, CYAN, [0, 1.5, 0.27], undefined, glowCyan);

    // 双臂(肩球 + 上臂 + 手)
    for (const s of [-1, 1]) {
      ctx.ico(0.16, '#D5DCE6', [s * 0.46, 1.78, 0], 0);
      ctx.cyl(0.08, 0.07, 0.5, '#C6CEDA', [s * 0.52, 1.45, 0], undefined, 6);
      ctx.ico(0.11, INK, [s * 0.55, 1.16, 0], 0);
    }

    // 头部 + 紫色面罩 + 青色眼睛 + 天线
    ctx.box(0.48, 0.36, 0.42, WHITE, [0, 2.04, 0]);
    ctx.box(0.4, 0.15, 0.04, ACCENT, [0, 2.06, 0.22], undefined, glowAccent);
    ctx.box(0.05, 0.05, 0.02, CYAN, [-0.1, 2.16, 0.23], undefined, glowCyan);
    ctx.box(0.05, 0.05, 0.02, CYAN, [0.1, 2.16, 0.23], undefined, glowCyan);
    ctx.cyl(0.03, 0.03, 0.24, STEEL, [0.15, 2.34, 0], undefined, 6);
    ctx.sphere(0.06, CYAN, [0.15, 2.48, 0], 6, glowCyan);
    ctx.sphere(0.06, '#58D68D', [-0.15, 2.32, 0], 6, glowMint);
    return { anchorY: 3.7 };
  },

  /** 智能手机(展台上的大屏):紫色/青色 UI 色块 + 摄像头 + 侧键。 */
  smartphone: (ctx) => {
    // 展台
    ctx.cyl(0.62, 0.78, 0.24, '#C6CEDA', [0, 0.12, 0], undefined, 8);
    ctx.cyl(0.2, 0.26, 0.35, '#AEB7C6', [0, 0.41, -0.12], undefined, 6);

    const tilt = -0.12;
    const body: Vec3 = [0, 1.52, 0.06];
    ctx.box(1.45, 2.2, 0.16, '#1E2633', body, [tilt, 0, 0]);
    // 屏幕底板(深紫,带自发光)
    ctx.box(1.28, 2.0, 0.04, '#3A2A6B', tiltedPoint(body, tilt, 0, 0, 0.1), [tilt, 0, 0], {
      emissive: ACCENT,
      emissiveIntensity: 0.4,
    });

    const ui = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      color: string,
      opts?: { emissive: string; emissiveIntensity: number },
    ) => {
      ctx.box(w, h, 0.02, color, tiltedPoint(body, tilt, dx, dy, 0.132), [tilt, 0, 0], opts);
    };
    // 状态栏 / 主题色渐变块 / 青色区块 / App 网格 / 底栏
    ui(0, 0.86, 1.04, 0.08, '#EAF4FF');
    ui(0, 0.52, 1.04, 0.48, ACCENT, glowAccent);
    ui(0, 0.06, 1.04, 0.28, CYAN, glowCyan);
    ui(-0.25, -0.34, 0.32, 0.26, '#9BD4C3');
    ui(0.25, -0.34, 0.32, 0.26, '#F2F5FA');
    ui(-0.25, -0.68, 0.32, 0.26, '#FFCC66');
    ui(0.25, -0.68, 0.32, 0.26, CYAN);
    ui(0, -0.92, 1.0, 0.1, '#EAF4FF');

    // 摄像头条 + 侧键 + 底部光晕
    ctx.box(0.3, 0.06, 0.02, '#0E1420', tiltedPoint(body, tilt, 0, 1.02, 0.16), [tilt, 0, 0]);
    ctx.box(0.05, 0.3, 0.1, '#3C4759', [0.76, 1.6, 0.06]);
    ctx.box(
      1.2,
      0.07,
      0.02,
      ACCENT,
      tiltedPoint(body, tilt, 0, -1.02, 0.14),
      [tilt, 0, 0],
      glowAccent,
    );
    return { anchorY: 2.8 };
  },

  /** 电动车:流线车身 + 玻璃 + 四轮 + 主题色充电口/车灯。 */
  'ev-car': (ctx) => {
    ctx.box(3.9, 0.52, 1.86, '#E7EDF4', [0, 0.63, 0]);
    ctx.box(2.2, 0.6, 1.62, '#D9E1EB', [-0.15, 1.15, 0]);
    ctx.box(0.7, 0.56, 1.58, GLASSCAR, [0.95, 1.13, 0], [0, 0, -0.55]);
    ctx.box(0.6, 0.56, 1.58, GLASSCAR, [-1.28, 1.13, 0], [0, 0, 0.6]);
    for (const s of [-1, 1]) ctx.box(1.5, 0.36, 0.03, GLASSCAR, [-0.15, 1.18, s * 0.82]);

    // 车轮
    for (const x of [-1.25, 1.25]) {
      for (const z of [-0.95, 0.95]) {
        ctx.cyl(0.34, 0.34, 0.24, INK, [x, 0.34, z], [Math.PI / 2, 0, 0], 8);
        ctx.cyl(0.16, 0.16, 0.26, '#AEB7C6', [x, 0.34, z], [Math.PI / 2, 0, 0], 6);
      }
    }

    // 车灯 + 充电口 + 车顶传感器
    ctx.box(0.06, 0.14, 0.4, '#BFE4FF', [1.96, 0.7, 0], undefined, glowBlue);
    ctx.box(0.06, 0.12, 0.4, '#FF6B5E', [-1.96, 0.7, 0], undefined, glowRed);
    ctx.box(0.05, 0.18, 0.28, ACCENT, [1.9, 0.48, 0.5], undefined, glowAccent);
    ctx.cyl(0.12, 0.12, 0.1, INK, [-0.2, 1.5, 0], undefined, 6);
    ctx.cyl(0.14, 0.14, 0.04, ACCENT, [-0.2, 1.56, 0], undefined, 8, glowAccent);
    return { anchorY: 2.7 };
  },

  /** 垂直绿化建筑(约 9 高):三段退台 + 玻璃带 + 屋顶花园 + 主题色线条。 */
  'green-building': (ctx) => {
    ctx.plane(4.6, 4.6, '#55606E', [0, 0.02, 0]);
    ctx.box(3.8, 0.3, 3.8, '#C4CCD8', [0, 0.15, 0]);
    ctx.box(0.95, 0.9, 0.06, '#2E4A6E', [0, 0.75, 1.92], undefined, {
      emissive: '#4E7FAA',
      emissiveIntensity: 0.4,
    });

    const secs: readonly [number, number][] = [
      [3.2, 3.0],
      [2.5, 2.6],
      [1.9, 2.2],
    ];
    let y = 0.3;
    let plantSeed = 0;
    for (const [w, h] of secs) {
      const cy = y + h / 2;
      ctx.box(w, h, w, PLATE, [0, cy, 0]);
      ctx.box(w + 0.06, 0.5, w * 0.84, '#9CC6E8', [0, cy + h * 0.18, 0], undefined, {
        emissive: '#6FA9D8',
        emissiveIntensity: 0.35,
      });
      ctx.box(w * 0.84, 0.5, w + 0.06, '#9CC6E8', [0, cy - h * 0.2, 0], undefined, {
        emissive: '#6FA9D8',
        emissiveIntensity: 0.35,
      });
      // 退台绿化
      const nw = w + 0.36;
      ctx.box(nw, 0.14, nw, LEAF, [0, y + h + 0.07, 0]);
      for (const s of [-1, 1]) {
        const px = s * (nw / 2 - 0.35);
        ctx.ico(0.26, plantSeed % 2 === 0 ? LEAF : MINT, [px, y + h + 0.3, nw / 2 - 0.4], 0);
        ctx.ico(0.22, plantSeed % 2 === 0 ? MINT : LEAF, [px, y + h + 0.28, -nw / 2 + 0.4], 0);
      }
      plantSeed += 1;
      y += h;
    }

    // 主题色竖向线条 + 屋顶设备 + 微型风机
    ctx.box(0.12, 2.6, 0.06, ACCENT, [1.32, 1.75, 1.63], undefined, glowAccent);
    ctx.box(1.2, 0.28, 1.2, '#AEB7C6', [0, y + 0.14, 0]);
    ctx.cyl(0.04, 0.05, 1.1, STEEL, [0.2, y + 0.83, 0], undefined, 5);
    for (const a of [0.4, 0.4 + (2 * Math.PI) / 3, 0.4 + (4 * Math.PI) / 3]) {
      ctx.box(
        0.75,
        0.04,
        0.04,
        WHITE,
        [0.2 + 0.37 * Math.cos(a), y + 1.38 + 0.37 * Math.sin(a), 0],
        [0, 0, a],
      );
    }
    ctx.sphere(0.1, ACCENT, [0, y + 0.36, 0], 6, glowAccent);
    return { anchorY: 11.0 };
  },

  /** 5G 基站:塔杆 + 顶部三面天线 + 主题色发光环 + 底部设备柜。 */
  '5g-tower': (ctx) => {
    ctx.box(1.1, 0.3, 1.1, '#C6CEDA', [0, 0.15, 0]);
    ctx.cyl(0.12, 0.22, 6.4, '#8C97A8', [0, 3.5, 0], undefined, 6);
    ctx.box(1.05, 0.12, 1.05, '#AEB7C6', [0, 6.75, 0]);

    // 三面天线板
    for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
      const px = Math.cos(a) * 0.45;
      const pz = Math.sin(a) * 0.45;
      ctx.box(0.5, 1.15, 0.1, '#E9EEF4', [px, 7.35, pz], [0, Math.PI / 2 - a, 0]);
      ctx.box(0.5, 0.14, 0.12, ACCENT, [px, 7.92, pz], [0, Math.PI / 2 - a, 0], glowAccent);
    }

    // 主题色发光环 + 顶部避雷针
    ctx.cyl(0.34, 0.34, 0.06, ACCENT, [0, 6.92, 0], undefined, 8, glowAccent);
    ctx.cyl(0.34, 0.34, 0.06, ACCENT, [0, 6.6, 0], undefined, 8, glowAccent);
    ctx.cyl(0.03, 0.03, 0.7, STEEL, [0, 8.3, 0], undefined, 5);

    // 底部设备柜 + 线缆
    ctx.box(0.55, 0.7, 0.4, '#DCE3EC', [0.75, 0.35, 0.35]);
    ctx.box(0.1, 0.08, 0.02, '#54D98C', [0.75, 0.5, 0.56], undefined, glowMint);
    ctx.box(0.05, 0.05, 1.3, INK, [-0.05, 0.6, 0.3]);
    return { anchorY: 9.6 };
  },

  /** 数据中心:低矮厂房 + 屋顶空调 + 服务器指示灯带 + 主题色条。 */
  'data-center': (ctx) => {
    ctx.box(5.2, 0.3, 3.6, '#B9C2CE', [0, 0.15, 0]);
    ctx.box(4.9, 2.0, 3.3, '#E4EAF1', [0, 1.3, 0]);
    ctx.box(5.05, 0.16, 3.45, '#C6CEDA', [0, 2.38, 0]);

    // 屋顶空调机组
    for (const x of [-1.5, 0, 1.5]) {
      ctx.box(1.0, 0.5, 1.5, '#D3DBE5', [x, 2.7, 0]);
      ctx.cyl(0.3, 0.3, 0.06, STEEL, [x, 2.98, 0.2], undefined, 8);
    }

    // 正面服务器指示灯带
    for (let i = 0; i < 5; i += 1) {
      const c = i % 2 === 0 ? ACCENT : '#54D98C';
      ctx.box(0.06, 0.1, 0.03, c, [-1.8 + i * 0.9, 1.95, 1.66], undefined, {
        emissive: c,
        emissiveIntensity: 1.0,
      });
    }

    // 冷却风扇(正面)+ 主题色横条 + 门
    for (const x of [-1.3, 1.3]) {
      ctx.cyl(0.34, 0.34, 0.08, '#5C6473', [x, 0.85, 1.68], [Math.PI / 2, 0, 0], 8);
      ctx.cyl(0.12, 0.12, 0.1, MINT, [x, 0.85, 1.73], [Math.PI / 2, 0, 0], 6);
    }
    ctx.box(4.96, 0.1, 0.06, ACCENT, [0, 2.2, 1.67], undefined, glowAccent);
    ctx.box(0.7, 1.1, 0.05, '#2E4A6E', [2.05, 0.85, 1.66], undefined, {
      emissive: '#4E7FAA',
      emissiveIntensity: 0.35,
    });
    return { anchorY: 4.2 };
  },

  /** 智能温室:种植床 + 拱形玻璃棚 + 内部植株 + 主题色补光灯。 */
  'smart-greenhouse': (ctx) => {
    // 种植床 + 土壤
    ctx.box(3.8, 0.34, 2.6, '#7A5C3E', [0, 0.17, 0]);
    ctx.box(3.6, 0.1, 2.4, '#5C4330', [0, 0.35, 0]);

    // 拱形棚体(横置半透明圆柱)+ 顶脊
    ctx.cyl(1.15, 1.15, 3.4, '#BEE3F0', [0, 1.5, 0], [0, 0, Math.PI / 2], 8, {
      transparent: true,
      opacity: 0.45,
    });
    ctx.cyl(0.05, 0.05, 3.5, '#E7ECF3', [0, 2.65, 0], [0, 0, Math.PI / 2], 6);

    // 前后拱框
    for (const z of [-1.25, 1.25]) {
      for (const s of [-1, 1]) {
        ctx.box(2.5, 0.07, 0.07, '#E7ECF3', [s * 0.575, 1.52, z], [0, 0, s * -1.1]);
      }
    }

    // 内部植株(两排)
    for (const z of [-0.55, 0.55]) {
      for (const x of [-1.2, 0, 1.2]) {
        ctx.ico(0.24, x < 0 ? LEAF : MINT, [x, 0.58, z], 0);
      }
    }

    // 主题色补光灯 + 门框 + 传感器
    for (const z of [-0.35, 0.35]) {
      ctx.box(3.2, 0.05, 0.1, ACCENT, [0, 2.3, z], undefined, glowAccent);
    }
    ctx.box(0.72, 1.35, 0.06, '#E7ECF3', [0, 1.02, 1.18]);
    ctx.cyl(0.03, 0.03, 0.5, STEEL, [1.45, 0.85, 1.0], undefined, 5);
    ctx.sphere(0.07, ACCENT, [1.45, 1.12, 1.0], 6, glowAccent);
    return { anchorY: 3.9 };
  },

  /** 物流/巡检无人机:起降垫 + 四旋翼 + 云台相机,贴垫悬浮。 */
  drone: (ctx) => {
    ctx.box(1.7, 0.08, 1.7, '#59616E', [0, 0.04, 0]);
    ctx.cyl(0.62, 0.62, 0.03, '#2B3341', [0, 0.085, 0], undefined, 8);
    ctx.cyl(0.4, 0.4, 0.02, ACCENT, [0, 0.1, 0], undefined, 8, {
      emissive: ACCENT,
      emissiveIntensity: 0.7,
    });

    const y0 = 0.72;
    const corners: readonly [number, number][] = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    ctx.box(0.62, 0.2, 0.62, '#3C4759', [0, y0, 0]);
    ctx.box(0.34, 0.08, 0.34, PLATE, [0, y0 + 0.13, 0]);

    for (const [sx, sz] of corners) {
      ctx.box(
        0.62,
        0.05,
        0.08,
        '#8C97A8',
        [sx * 0.33, y0, sz * 0.33],
        [0, (-Math.PI / 4) * sx * sz, 0],
      );
      ctx.cyl(0.05, 0.05, 0.12, '#5C6473', [sx * 0.6, y0 + 0.08, sz * 0.6], undefined, 6);
      ctx.cyl(0.4, 0.4, 0.02, '#C6CEDA', [sx * 0.6, y0 + 0.16, sz * 0.6], undefined, 8, {
        transparent: true,
        opacity: 0.5,
      });
      ctx.box(0.06, 0.03, 0.06, ACCENT, [sx * 0.6, y0 + 0.03, sz * 0.6], undefined, glowAccent);
    }

    // 云台相机 + 起落架
    ctx.sphere(0.11, '#232B38', [0, y0 - 0.16, 0.08], 6);
    ctx.cyl(0.04, 0.04, 0.05, ACCENT, [0, y0 - 0.24, 0.08], undefined, 6, glowAccent);
    for (const s of [-1, 1]) {
      ctx.cyl(0.025, 0.025, 0.3, '#8C97A8', [s * 0.22, y0 - 0.28, 0], undefined, 5);
    }
    return { anchorY: 2.4 };
  },
};
