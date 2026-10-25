/** S-C:时代 6(信息)道具。见开发契约 §7.4。 */
import type { PropBuilder, Vec3 } from '../primitives';

const THEME = '#2E86DE'; // 主题色:数字蓝
const INK = '#2B3341';
const INK2 = '#3C4759';
const STEEL = '#8C97A8';
const PLATE = '#DCE3EC';
const WHITE = '#EFF3F8';
const GLASS = '#2B3B55';
const CYAN = '#5FE3FF';
const CONTAINER_COLORS = [THEME, '#E0A458', '#6FBF8B', '#D8DEE7'];

const screenGlow = { emissive: '#8FD9FF', emissiveIntensity: 1.6 } as const;
const glowTheme = { emissive: THEME, emissiveIntensity: 1.25 } as const;
const glowGreen = { emissive: '#54D98C', emissiveIntensity: 1.1 } as const;
const glowCyan = { emissive: CYAN, emissiveIntensity: 1.35 } as const;

/** 把局部偏移 (dx,dy,dz) 绕 X 轴旋转 tilt 后加到 center,用于倾斜面贴片。 */
function tiltedPoint(center: Vec3, tilt: number, dx: number, dy: number, dz: number): Vec3 {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return [center[0] + dx, center[1] + dy * c - dz * s, center[2] + dy * s + dz * c];
}

export const builders: Record<string, PropBuilder> = {
  /** 个人电脑(CRT 显示器 + 主机 + 键盘鼠标),约 1.5 高;屏幕亮蓝发光。 */
  computer: (ctx) => {
    // 书桌
    ctx.box(1.6, 0.09, 0.9, '#C8A47C', [0, 0.82, 0]);
    const legs: readonly [number, number][] = [
      [-0.68, -0.34],
      [0.68, -0.34],
      [-0.68, 0.34],
      [0.68, 0.34],
    ];
    for (const [x, z] of legs) ctx.cyl(0.045, 0.055, 0.78, '#6E5A44', [x, 0.39, z], undefined, 6);

    // CRT 显示器:厚实机身 + 大块亮蓝屏幕
    ctx.box(0.72, 0.6, 0.52, '#E7DFCE', [0, 1.15, -0.12]);
    ctx.box(0.62, 0.48, 0.06, INK, [0, 1.15, 0.16]);
    ctx.box(0.52, 0.38, 0.03, '#8FD9FF', [0, 1.15, 0.2], undefined, screenGlow);
    // 屏幕 UI 色块(主题色)
    ctx.box(0.2, 0.06, 0.01, THEME, [-0.12, 1.27, 0.22], undefined, glowTheme);
    ctx.box(0.3, 0.05, 0.01, '#EAF6FF', [0.08, 1.14, 0.22]);
    ctx.box(0.3, 0.05, 0.01, '#EAF6FF', [0.08, 1.05, 0.22]);
    ctx.cyl(0.07, 0.15, 0.12, '#D8CFBC', [0, 0.9, 0.02], undefined, 6);

    // 键盘 / 鼠标 / 主机
    ctx.box(0.7, 0.05, 0.26, PLATE, [0, 0.895, 0.3]);
    for (let i = 0; i < 5; i += 1) {
      ctx.box(0.5, 0.012, 0.035, '#AEB7C6', [0, 0.925, 0.22 + i * 0.04]);
    }
    ctx.box(0.11, 0.05, 0.15, PLATE, [0.48, 0.895, 0.32]);
    ctx.box(0.28, 0.55, 0.44, '#C4CCD8', [0.64, 0.31, -0.06]);
    ctx.box(0.03, 0.05, 0.02, THEME, [0.79, 0.42, 0.05], undefined, glowTheme); // 电源灯
    return { anchorY: 1.8 };
  },

  /** 集成电路:电路板 + 芯片本体 + 16 根引脚 + 发光核心。 */
  chip: (ctx) => {
    ctx.box(1.7, 0.22, 1.25, '#26513C', [0, 0.11, 0]);
    ctx.box(1.55, 0.06, 1.1, '#2F6B4F', [0, 0.25, 0]);

    // 电路走线(主题色)
    ctx.box(0.44, 0.015, 0.05, THEME, [-0.46, 0.288, -0.36], undefined, glowTheme);
    ctx.box(0.44, 0.015, 0.05, THEME, [0.46, 0.288, 0.36], undefined, glowTheme);
    ctx.box(0.05, 0.015, 0.42, THEME, [-0.22, 0.288, 0.4]);
    ctx.box(0.05, 0.015, 0.42, THEME, [0.22, 0.288, -0.4]);

    // 芯片本体 + 发光核心
    ctx.box(0.6, 0.16, 0.6, '#232B38', [0, 0.36, 0]);
    ctx.box(0.44, 0.06, 0.44, '#2F3A4C', [0, 0.46, 0]);
    ctx.box(0.26, 0.02, 0.26, '#8FD3FF', [0, 0.497, 0], undefined, glowTheme);

    // 四侧引脚(每侧 4 根)
    const sides: readonly [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [ux, uz] of sides) {
      for (const t of [-0.18, -0.06, 0.06, 0.18]) {
        const px = ux !== 0 ? ux * 0.35 : t;
        const pz = uz !== 0 ? uz * 0.35 : t;
        ctx.box(ux !== 0 ? 0.14 : 0.05, 0.05, uz !== 0 ? 0.14 : 0.05, '#C9D1DC', [px, 0.3, pz]);
      }
    }
    return { anchorY: 1.8 };
  },

  /** 服务器机柜(2.2 高):正面 LED 点阵 + 顶部风扇格栅 + 侧板散热缝。 */
  server: (ctx) => {
    // 机柜主体
    ctx.box(1.05, 2.2, 0.8, '#333E4E', [0, 1.1, 0]);
    ctx.box(1.12, 0.1, 0.88, '#4A586D', [0, 2.26, 0]);
    ctx.box(0.92, 0.06, 0.78, '#1E242E', [0, 0.05, 0]);
    // 正面门板
    ctx.box(0.94, 2.02, 0.06, '#28323F', [0, 1.13, 0.42]);

    // 6 个服务器单元 + 指示灯
    for (let i = 0; i < 6; i += 1) {
      const y = 0.32 + i * 0.32;
      ctx.box(0.82, 0.26, 0.05, '#39465A', [0, y, 0.45]);
      ctx.box(0.52, 0.05, 0.03, '#1B222B', [0.08, y + 0.05, 0.48]); // 硬盘槽
      ctx.box(0.05, 0.05, 0.02, CYAN, [-0.32, y, 0.48], undefined, glowCyan);
      ctx.box(0.05, 0.05, 0.02, CYAN, [-0.22, y, 0.48], undefined, glowCyan);
      ctx.box(0.04, 0.04, 0.02, '#54D98C', [-0.13, y, 0.48], undefined, glowGreen);
    }

    // 顶部风扇格栅
    for (const x of [-0.28, 0.28]) {
      ctx.cyl(0.2, 0.2, 0.08, '#20272F', [x, 2.34, 0], undefined, 8);
      ctx.cyl(0.14, 0.14, 0.05, CYAN, [x, 2.38, 0], undefined, 6, {
        transparent: true,
        opacity: 0.55,
        emissive: CYAN,
        emissiveIntensity: 0.7,
      });
    }

    // 侧面散热缝 + 理线
    for (let i = 0; i < 4; i += 1) {
      ctx.box(0.03, 0.04, 0.58, '#4A586D', [0.53, 0.6 + i * 0.34, 0]);
    }
    ctx.box(0.12, 0.5, 0.12, '#1B222B', [0.42, 0.3, 0.42]);
    return { anchorY: 2.6 };
  },

  /** 卫星天线:立柱 + 倾斜抛物面(层层内凹) + 馈源 + 主题色边环。 */
  'satellite-dish': (ctx) => {
    const tilt = 0.95;
    const dish: Vec3 = [0, 1.95, 0.32];
    const at = (d: number): Vec3 => tiltedPoint(dish, tilt, 0, d, 0);

    // 底座 + 立柱 + 方位转台 + 俯仰支架
    ctx.cyl(1.0, 1.18, 0.16, '#A9B3C2', [0, 0.08, 0], undefined, 8);
    ctx.cyl(0.16, 0.3, 1.15, '#6F7A8C', [0, 0.65, 0], undefined, 6);
    ctx.box(0.7, 0.18, 0.7, '#7E8A9C', [0, 1.3, 0]);
    ctx.box(0.5, 0.55, 0.18, '#8C97A8', [0, 1.5, -0.2]);

    // 背面外壳(浅盘)
    ctx.cyl(0.32, 1.12, 0.2, '#C7D2DF', at(-0.06), [tilt, 0, 0], 10);
    // 凹面:由外向内层层后退的圆盘,形成碟形
    const bowl: readonly [number, number, string][] = [
      [0.45, 0.98, '#F2F6FB'],
      [0.33, 0.76, '#D7E1EE'],
      [0.21, 0.52, '#B3C4DA'],
      [0.09, 0.28, '#8FA6C4'],
    ];
    for (const [d, r, color] of bowl) {
      ctx.cyl(r, r, 0.05, color, at(d), [tilt, 0, 0], 10);
    }
    // 边缘环(8 段,浅蓝金属)
    for (let i = 0; i < 8; i += 1) {
      const phi = (i / 8) * Math.PI * 2;
      const beta = Math.atan2(-Math.cos(phi), -Math.sin(phi));
      ctx.box(
        0.95,
        0.1,
        0.12,
        '#8FB8D8',
        tiltedPoint(dish, tilt, 1.1 * Math.cos(phi), 0.5, 1.1 * Math.sin(phi)),
        [tilt, beta, 0],
      );
    }
    // 馈源支臂 + 馈源
    ctx.cyl(0.035, 0.035, 0.9, '#C9D1DC', at(0.95), [tilt, 0, 0], 5);
    ctx.box(0.22, 0.18, 0.22, THEME, at(1.42), [tilt, 0, 0], glowTheme);
    ctx.cyl(0.12, 0.05, 0.16, '#C9D1DC', at(1.28), [tilt, 0, 0], 6);
    return { anchorY: 4.3 };
  },

  /** 喷气客机(约 3 高,飞行姿态):后掠翼 + 双发 + 舷窗 + 主题色腰线。 */
  jet: (ctx) => {
    ctx.cyl(0.44, 0.44, 4.2, WHITE, [0, 1.55, 0], [Math.PI / 2, 0, 0], 8);
    ctx.cone(0.44, 1.2, WHITE, [0, 1.55, 2.7], [Math.PI / 2, 0, 0], 8);
    ctx.cone(0.44, 1.0, WHITE, [0, 1.55, -2.6], [-Math.PI / 2, 0, 0], 8);

    // 后掠主翼 + 翼尖小翼 + 尾翼
    ctx.box(2.5, 0.11, 1.05, WHITE, [-1.45, 1.42, -0.15], [0, -0.16, 0.05]);
    ctx.box(2.5, 0.11, 1.05, WHITE, [1.45, 1.42, -0.15], [0, 0.16, -0.05]);
    ctx.box(0.1, 0.42, 0.5, THEME, [-2.66, 1.6, -0.28], [0.2, -0.16, 0], glowTheme);
    ctx.box(0.1, 0.42, 0.5, THEME, [2.66, 1.6, -0.28], [0.2, 0.16, 0], glowTheme);
    ctx.box(1.1, 0.08, 0.5, WHITE, [-0.75, 1.7, -2.0], [0, -0.2, 0]);
    ctx.box(1.1, 0.08, 0.5, WHITE, [0.75, 1.7, -2.0], [0, 0.2, 0]);
    ctx.box(0.09, 0.95, 0.7, WHITE, [0, 2.2, -2.1], [-0.35, 0, 0]);

    // 发动机 + 尾部喷口
    for (const s of [-1, 1]) {
      ctx.cyl(0.24, 0.26, 1.0, '#C3CBD8', [s * 1.1, 1.2, 0.35], [Math.PI / 2, 0, 0], 7);
      ctx.cyl(0.2, 0.2, 0.06, INK2, [s * 1.1, 1.2, 0.86], [Math.PI / 2, 0, 0], 7);
      ctx.cyl(0.16, 0.16, 0.08, '#FFB35C', [s * 1.1, 1.2, -0.18], [Math.PI / 2, 0, 0], 6, {
        emissive: '#FF8A3D',
        emissiveIntensity: 1.1,
      });
    }

    // 舷窗 + 主题色腰线
    for (const s of [-1, 1]) {
      ctx.box(0.03, 0.1, 2.2, '#BFE4FF', [s * 0.42, 1.66, 0.15], undefined, {
        emissive: '#7FCBFF',
        emissiveIntensity: 0.8,
      });
      ctx.box(0.03, 0.13, 3.4, THEME, [s * 0.43, 1.4, 0.1], undefined, glowTheme);
    }
    return { anchorY: 4.4 };
  },

  /** 高速列车(流线车头 + 车厢 + 轨道),约 3 高。 */
  'bullet-train': (ctx) => {
    // 道床 + 双轨
    ctx.box(1.9, 0.14, 7.6, '#4C5462', [0, 0.07, 0]);
    for (const s of [-1, 1]) ctx.box(0.14, 0.08, 7.6, '#98A3B4', [s * 0.52, 0.18, 0]);

    // 车厢 + 流线车头/车尾
    ctx.cyl(0.58, 0.58, 5.2, WHITE, [0, 1.16, -0.5], [Math.PI / 2, 0, 0], 8);
    ctx.cone(0.58, 1.9, WHITE, [0, 1.16, 3.05], [Math.PI / 2, 0, 0], 8);
    ctx.cone(0.58, 0.9, WHITE, [0, 1.16, -3.1], [-Math.PI / 2, 0, 0], 8);
    ctx.box(0.46, 0.26, 0.6, GLASS, [0, 1.48, 1.85], [-0.45, 0, 0]); // 驾驶室风挡

    // 舷窗带 + 主题色腰线
    for (const s of [-1, 1]) {
      ctx.box(0.03, 0.13, 4.0, GLASS, [s * 0.55, 1.28, -0.5]);
      ctx.box(0.03, 0.1, 4.8, THEME, [s * 0.565, 1.0, -0.5], undefined, glowTheme);
    }

    // 车顶 + 受电弓
    ctx.box(0.9, 0.12, 4.6, '#C9D2DE', [0, 1.78, -0.5]);
    ctx.cyl(0.04, 0.04, 0.3, STEEL, [0, 1.98, -1.1], undefined, 5);
    ctx.cyl(0.04, 0.04, 0.3, STEEL, [0, 1.98, -0.5], undefined, 5);
    ctx.box(0.7, 0.06, 0.12, STEEL, [0, 2.16, -0.8]);

    // 转向架 + 车轮
    for (const z of [-1.9, 1.3]) {
      ctx.box(1.1, 0.28, 1.2, '#333B49', [0, 0.7, z]);
      for (const s of [-1, 1]) {
        ctx.cyl(0.3, 0.3, 0.16, INK, [s * 0.5, 0.52, z], [0, 0, Math.PI / 2], 8);
      }
    }
    return { anchorY: 3.9 };
  },

  /** 集装箱货轮:船体 + 驾驶楼 + 彩色集装箱堆。 */
  'container-ship': (ctx) => {
    // 船体 + 尖艏 + 船艉
    ctx.box(2.3, 0.9, 5.4, '#3C4A5E', [0, 0.45, 0]);
    ctx.box(2.3, 0.16, 5.4, '#5A6B82', [0, 0.96, 0]);
    ctx.box(1.5, 0.9, 1.5, '#3C4A5E', [0, 0.45, 2.85], [0, Math.PI / 4, 0]);
    ctx.box(2.0, 0.9, 0.7, '#3C4A5E', [0, 0.45, -3.0]);

    // 集装箱堆(2 层 × 3 列 × 3 行)
    const rows = [-1.2, -0.1, 1.0];
    const cols = [-0.66, 0, 0.66];
    for (let t = 0; t < 2; t += 1) {
      for (let r = 0; r < rows.length; r += 1) {
        for (let c = 0; c < cols.length; c += 1) {
          const color = CONTAINER_COLORS[(r + c + t) % CONTAINER_COLORS.length];
          ctx.box(0.64, 0.4, 1.05, color, [cols[c], 1.26 + t * 0.42, rows[r]]);
        }
      }
    }

    // 驾驶楼 + 烟囱
    ctx.box(1.7, 1.15, 1.0, '#E7ECF3', [0, 1.6, -2.2]);
    ctx.box(1.72, 0.26, 0.05, GLASS, [0, 1.75, -1.69]);
    ctx.cyl(0.2, 0.24, 0.62, '#B7C0CD', [0, 2.4, -2.3], undefined, 6);
    ctx.cyl(0.22, 0.22, 0.12, THEME, [0, 2.52, -2.3], undefined, 6, glowTheme);
    return { anchorY: 4.6 };
  },

  /** 摩天办公楼(约 12 高):三段收分 + 玻璃带 + 主题色竖向线条。 */
  'office-tower': (ctx) => {
    ctx.plane(5.4, 5.4, '#59616E', [0, 0.02, 0]);
    ctx.box(4.0, 0.36, 4.0, '#B7C0CD', [0, 0.18, 0]);
    ctx.box(3.6, 1.1, 3.6, '#CDD5E1', [0, 0.91, 0]);
    ctx.box(1.05, 0.95, 0.08, GLASS, [0, 0.86, 1.82], undefined, {
      emissive: '#4E7FAA',
      emissiveIntensity: 0.4,
    });

    const secs: readonly { w: number; h: number; y: number }[] = [
      { w: 2.7, h: 4.0, y: 3.46 },
      { w: 2.2, h: 3.2, y: 7.06 },
      { w: 1.7, h: 2.6, y: 9.96 },
    ];
    for (const s of secs) {
      ctx.box(s.w, s.h, s.w, PLATE, [0, s.y, 0]);
      const glassOpts = { emissive: '#5C93C4', emissiveIntensity: 0.5 };
      ctx.box(
        s.w * 0.82,
        s.h * 0.2,
        s.w + 0.04,
        GLASS,
        [0, s.y + s.h * 0.22, 0],
        undefined,
        glassOpts,
      );
      ctx.box(
        s.w + 0.04,
        s.h * 0.2,
        s.w * 0.82,
        GLASS,
        [0, s.y - s.h * 0.24, 0],
        undefined,
        glassOpts,
      );
      ctx.box(0.16, s.h, 0.06, THEME, [0, s.y, s.w / 2 + 0.03], undefined, glowTheme);
    }

    // 屋顶 + 天线 + 航空障碍灯
    ctx.box(1.9, 0.3, 1.9, '#AEB7C6', [0, 11.41, 0]);
    ctx.cyl(0.07, 0.11, 1.1, '#98A3B4', [0, 12.11, 0], undefined, 6);
    ctx.sphere(0.14, THEME, [0, 12.72, 0], 6, glowTheme);
    return { anchorY: 14.0 };
  },

  /** 平板电视 + 电视柜,屏幕有 UI 色块。 */
  tv: (ctx) => {
    ctx.box(1.7, 0.5, 0.62, '#6C5B49', [0, 0.25, 0]);

    ctx.box(1.75, 1.05, 0.12, INK, [0, 1.2, -0.06]);
    ctx.box(1.55, 0.86, 0.03, '#8FD9FF', [0, 1.2, 0.005], undefined, screenGlow);
    // 屏幕 UI
    ctx.box(0.42, 0.3, 0.01, THEME, [-0.5, 1.38, 0.03], undefined, glowTheme);
    ctx.box(0.62, 0.06, 0.01, '#EAF4FF', [0.3, 1.44, 0.03]);
    ctx.box(0.62, 0.06, 0.01, '#EAF4FF', [0.3, 1.32, 0.03]);
    ctx.box(0.5, 0.08, 0.01, '#54D98C', [-0.42, 0.98, 0.03], undefined, glowGreen);

    // 支架 + 底座 + 音箱
    ctx.box(0.16, 0.3, 0.16, INK2, [0, 0.66, 0]);
    ctx.box(0.8, 0.05, 0.4, INK2, [0, 0.53, 0]);
    ctx.box(0.18, 0.5, 0.18, INK2, [1.02, 0.25, 0]);
    return { anchorY: 2.4 };
  },

  /** 高速公路:路面 + 发光车道线 + 护栏 + 主题色龙门路牌 + 两辆小车 + 数据光带。 */
  highway: (ctx) => {
    // 道路基底 + 数据光带装饰
    ctx.plane(7.4, 4.2, '#3E4552', [0, 0.02, 0]);
    ctx.box(6.0, 0.18, 3.2, '#4A505C', [0, 0.09, 0]);
    ctx.plane(5.9, 3.1, '#565E6C', [0, 0.185, 0]);
    ctx.plane(0.55, 3.1, THEME, [-3.05, 0.2, 0], undefined, {
      transparent: true,
      opacity: 0.55,
      emissive: THEME,
      emissiveIntensity: 1.0,
    });
    ctx.plane(0.18, 3.1, CYAN, [-2.85, 0.21, 0], undefined, {
      transparent: true,
      opacity: 0.8,
      emissive: CYAN,
      emissiveIntensity: 1.2,
    });
    for (let i = -2; i <= 2; i += 1) {
      ctx.box(0.72, 0.02, 0.1, '#EDF2F8', [i * 1.12, 0.196, 0]);
    }

    // 护栏
    for (const s of [-1, 1]) {
      ctx.box(6.0, 0.06, 0.07, '#B8C1CE', [0, 0.5, s * 1.62]);
      for (const x of [-2.2, 0, 2.2]) {
        ctx.cyl(0.05, 0.05, 0.5, STEEL, [x, 0.25, s * 1.62], undefined, 6);
      }
    }

    // 龙门架 + 主题色路牌
    for (const z of [-1.2, 1.2]) ctx.cyl(0.08, 0.08, 2.5, STEEL, [2.7, 1.25, z], undefined, 6);
    ctx.box(0.16, 0.16, 2.6, STEEL, [2.7, 2.5, 0]);
    ctx.box(0.1, 0.72, 1.5, THEME, [2.66, 2.05, 0], undefined, glowTheme);

    // 两辆简化小车
    const cars: readonly [number, number, string][] = [
      [1.2, -0.45, '#E3E9F1'],
      [-1.5, 0.5, '#C4CCD8'],
    ];
    for (const [cx, cz, cc] of cars) {
      ctx.box(1.1, 0.34, 0.52, cc, [cx, 0.38, cz]);
      ctx.box(0.6, 0.24, 0.46, GLASS, [cx - 0.05, 0.64, cz], undefined, {
        emissive: '#3E5F82',
        emissiveIntensity: 0.35,
      });
      ctx.cyl(0.16, 0.16, 0.68, INK, [cx, 0.16, cz], [Math.PI / 2, 0, 0], 8);
    }
    return { anchorY: 4.2 };
  },
};
