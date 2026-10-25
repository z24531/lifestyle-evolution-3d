/**
 * 时代 1(采集狩猎)道具 + 跨时代共享自然道具。
 * 归属人:Lead。共享池清单见开发契约 §7.1:
 * fire / cave / rock / tree-conifer / tree-broadleaf / bush-berry / grass-tuft /
 * cloud / hunter / spear / deer / tent-hide / stone-tool
 */
import type { PropBuilder, BuildCtx } from '../primitives';
import { bool, num } from '../primitives';

const STONE = '#6E6459';
const STONE_DARK = '#5A524A';
const WOOD = '#5A4230';
const SKIN = '#C98E63';
const FUR = '#6B4B32';

/** 绕 Y 轴均匀摆一圈的辅助:返回极坐标点。 */
function ring(radius: number, angle: number): [number, number] {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function fire(ctx: BuildCtx, params: Record<string, unknown>): { anchorY: number } {
  const h = num(params, 'h', 1);
  // 灰烬底盘
  ctx.cyl(0.95, 1.1, 0.16, '#3E3934', [0, 0.08, 0]);
  // 围石
  for (let i = 0; i < 8; i += 1) {
    const [x, z] = ring(1.25, (i / 8) * Math.PI * 2 + ctx.rand() * 0.2);
    ctx.ico(0.2 + ctx.rand() * 0.08, i % 2 ? STONE : STONE_DARK, [x, 0.13, z], 0);
  }
  // 交叉柴堆
  ctx.cyl(0.09, 0.11, 1.25, '#4A3423', [0, 0.22, 0], [0, 0, 1.35]);
  ctx.cyl(0.09, 0.11, 1.25, '#3E2C1D', [0, 0.2, 0], [0, 0, -1.25]);
  ctx.cyl(0.07, 0.09, 1.1, '#4A3423', [0, 0.26, 0], [0.35, 0, 1.5]);
  // 火焰(三层,emissive)
  const fh = 1.3 * h;
  // 光晕
  ctx.sphere(1.05 * h, '#FFB35C', [0, 0.62 * h, 0], 8, {
    emissive: '#FF8A2E',
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.16,
  });
  ctx.cone(0.46, fh, '#F0782F', [0, 0.3 + fh / 2, 0], undefined, 6, {
    emissive: '#E0561A',
    emissiveIntensity: 1.15,
  });
  ctx.cone(0.3, fh * 0.68, '#FFC24D', [0.02, 0.3 + fh * 0.34, -0.02], [0, 0.15, 0], 6, {
    emissive: '#FF9A2E',
    emissiveIntensity: 1.5,
  });
  ctx.cone(0.15, fh * 0.42, '#FFE9A8', [0, 0.3 + fh * 0.21, 0], undefined, 5, {
    emissive: '#FFD060',
    emissiveIntensity: 2,
  });
  // 火星
  for (let i = 0; i < 4; i += 1) {
    const a = ctx.rand() * Math.PI * 2;
    const r = 0.2 + ctx.rand() * 0.5;
    ctx.ico(
      0.05 + ctx.rand() * 0.03,
      '#FFB266',
      [Math.cos(a) * r, 0.5 + ctx.rand() * 0.7, Math.sin(a) * r],
      0,
      {
        emissive: '#FF7A1F',
        emissiveIntensity: 2,
      },
    );
  }
  return { anchorY: 1.3 };
}

function cave(ctx: BuildCtx): { anchorY: number } {
  // 主岩体(几个低模岩块堆成山丘)
  const mound = ctx.ico(3.1, STONE, [0, 1.7, -0.5], 1);
  mound.scale.set(1.25, 1.0, 1.15);
  const left = ctx.ico(2.0, STONE_DARK, [-2.3, 1.1, 0.4], 1);
  left.scale.set(1.0, 0.85, 1.0);
  const right = ctx.ico(2.3, STONE, [2.3, 1.2, 0.2], 1);
  right.scale.set(1.0, 0.9, 1.05);
  // 洞口(暗面 + 上方悬岩)
  ctx.box(2.3, 2.2, 0.5, '#14100C', [0, 1.1, 2.05]);
  const brow = ctx.ico(1.5, STONE_DARK, [0, 2.5, 2.05], 1);
  brow.scale.set(1.15, 0.55, 0.9);
  // 洞前地面碎石
  ctx.ico(0.34, STONE, [-1.5, 0.16, 2.5], 0);
  ctx.ico(0.26, STONE_DARK, [1.6, 0.13, 2.7], 0);
  // 岩壁上的赭红涂绘(信息图层线索:洞穴壁画)
  ctx.plane(0.5, 0.35, '#B5522E', [-1.0, 1.7, 2.62]);
  ctx.plane(0.3, 0.3, '#8F3B22', [-0.3, 1.3, 2.62]);
  ctx.plane(0.22, 0.22, '#B5522E', [1.2, 2.0, 2.62]);
  return { anchorY: 3.5 };
}

function rock(ctx: BuildCtx, params: Record<string, unknown>): { anchorY: number } {
  const count = Math.max(1, Math.round(num(params, 'count', 3)));
  const size = num(params, 'size', 1);
  for (let i = 0; i < count; i += 1) {
    const a = ctx.rand() * Math.PI * 2;
    const r = ctx.rand() * 0.9 * size;
    const s = (0.32 + ctx.rand() * 0.42) * size;
    const m = ctx.ico(
      s,
      i % 2 ? STONE : STONE_DARK,
      [Math.cos(a) * r, s * 0.45, Math.sin(a) * r],
      0,
    );
    m.scale.set(1, 0.8 + ctx.rand() * 0.35, 1);
    m.rotation.set(ctx.rand() * 0.4, ctx.rand() * Math.PI, ctx.rand() * 0.4);
  }
  return { anchorY: 0.9 };
}

function treeConifer(ctx: BuildCtx): { anchorY: number } {
  ctx.cyl(0.13, 0.2, 1.3, WOOD, [0, 0.65, 0]);
  const layers: [number, number, number, string][] = [
    [1.15, 1.6, 1.55, '#3F6B3F'],
    [0.88, 1.35, 2.25, '#4E7A45'],
    [0.58, 1.05, 2.9, '#5D8A4E'],
  ];
  for (const [r, h, y, c] of layers) ctx.cone(r, h, c, [0, y, 0], undefined, 7);
  return { anchorY: 2.6 };
}

function treeBroadleaf(ctx: BuildCtx): { anchorY: number } {
  ctx.cyl(0.16, 0.25, 1.7, WOOD, [0, 0.85, 0]);
  ctx.ico(1.05, '#6E9B4E', [0, 2.15, 0], 1);
  ctx.ico(0.72, '#7FAF5A', [0.65, 1.85, 0.25], 1);
  ctx.ico(0.62, '#5E8A42', [-0.55, 2.45, -0.3], 1);
  return { anchorY: 2.3 };
}

function bushBerry(ctx: BuildCtx): { anchorY: number } {
  ctx.ico(0.55, '#4F7A45', [0, 0.5, 0], 1);
  ctx.ico(0.4, '#5E8A4E', [0.35, 0.38, 0.2], 1);
  ctx.ico(0.36, '#46703D', [-0.3, 0.42, -0.15], 1);
  for (let i = 0; i < 6; i += 1) {
    const a = ctx.rand() * Math.PI * 2;
    const p = 0.3 + ctx.rand() * 0.2;
    ctx.ico(0.075, '#C63C3C', [Math.cos(a) * p, 0.45 + ctx.rand() * 0.3, Math.sin(a) * p], 0);
  }
  return { anchorY: 1.0 };
}

function grassTuft(ctx: BuildCtx): { anchorY: number } {
  const blades = 3 + Math.floor(ctx.rand() * 3);
  for (let i = 0; i < blades; i += 1) {
    const a = ctx.rand() * Math.PI * 2;
    const tilt = 0.25 + ctx.rand() * 0.3;
    ctx.cone(
      0.05,
      0.42 + ctx.rand() * 0.3,
      i % 2 ? '#6E8A4A' : '#7D9B52',
      [Math.cos(a) * 0.07, 0.22, Math.sin(a) * 0.07],
      [Math.cos(a) * tilt, 0, Math.sin(a) * tilt],
      4,
    );
  }
  return { anchorY: 0.4 };
}

function cloud(ctx: BuildCtx): { anchorY: number } {
  const c = '#E7EDF6';
  const glow = { emissive: '#4A5568', emissiveIntensity: 0.5 };
  ctx.ico(1.6, c, [0, 0, 0], 1, glow);
  ctx.ico(1.15, c, [1.5, -0.2, 0.3], 1, glow);
  ctx.ico(1.0, c, [-1.5, -0.25, -0.2], 1, glow);
  ctx.ico(0.8, c, [0.6, 0.55, -0.4], 1, glow);
  return { anchorY: 1.2 };
}

function hunter(ctx: BuildCtx, params: Record<string, unknown>): { anchorY: number } {
  const pose = String(params?.pose ?? 'stand');
  const walking = pose === 'walk';
  const legSwing = walking ? 0.38 : 0.06;
  // 腿
  ctx.box(0.15, 0.78, 0.17, FUR, [-0.11, 0.39, 0], [legSwing, 0, 0]);
  ctx.box(0.15, 0.78, 0.17, FUR, [0.11, 0.39, 0], [-legSwing, 0, 0]);
  // 脚
  ctx.box(0.17, 0.1, 0.26, '#4A3423', [-0.11, 0.06, walking ? 0.12 : 0.03]);
  ctx.box(0.17, 0.1, 0.26, '#4A3423', [0.11, 0.06, walking ? -0.12 : 0.03]);
  // 躯干(兽皮衣)
  ctx.box(0.5, 0.62, 0.3, FUR, [0, 1.06, 0]);
  ctx.box(0.52, 0.16, 0.32, '#7C5A3C', [0, 0.8, 0]);
  // 手臂
  ctx.box(0.13, 0.55, 0.14, SKIN, [-0.31, 1.02, 0], [0, 0, walking ? 0.28 : 0.1]);
  ctx.box(0.13, 0.55, 0.14, SKIN, [0.31, 1.02, 0], [0, 0, walking ? -0.28 : -0.1]);
  // 头 + 头发
  ctx.sphere(0.17, SKIN, [0, 1.56, 0], 7);
  const hair = ctx.ico(0.18, '#2E241C', [0, 1.62, -0.03], 1);
  hair.scale.set(1, 0.85, 1);
  // 随手一根矛(便于读作"狩猎者")
  if (bool(params, 'spear', true)) {
    ctx.cyl(0.035, 0.04, 1.9, WOOD, [0.42, 0.95, 0.02], [0, 0, 0.08]);
    ctx.cone(0.08, 0.26, STONE, [0.5, 1.94, 0.02], [0, 0, 0.08], 5);
  }
  return { anchorY: 1.9 };
}

function spear(ctx: BuildCtx): { anchorY: number } {
  ctx.cyl(0.035, 0.045, 1.9, WOOD, [0, 0.95, 0], [0, 0, 1.35]);
  ctx.cone(0.085, 0.28, STONE, [0.24, 1.94, 0], [0, 0, 1.35 - Math.PI / 2], 5);
  ctx.box(0.05, 0.06, 0.05, '#3E2C1D', [0, 1.35, 0.01]);
  return { anchorY: 1.4 };
}

function deer(ctx: BuildCtx): { anchorY: number } {
  const body = '#8A6A46';
  const dark = '#5C452E';
  // 躯干 + 脖颈 + 头
  ctx.box(0.52, 0.42, 1.05, body, [0, 0.86, 0]);
  ctx.box(0.34, 0.5, 0.3, body, [0, 1.15, 0.5], [0.5, 0, 0]);
  ctx.box(0.28, 0.26, 0.5, body, [0, 1.38, 0.72]);
  ctx.box(0.2, 0.16, 0.22, dark, [0, 1.36, 0.98]);
  // 耳朵
  ctx.box(0.06, 0.16, 0.04, dark, [-0.14, 1.56, 0.66], [0, 0, -0.35]);
  ctx.box(0.06, 0.16, 0.04, dark, [0.14, 1.56, 0.66], [0, 0, 0.35]);
  // 鹿角
  for (const s of [-1, 1]) {
    ctx.cyl(0.025, 0.03, 0.38, '#C9B48A', [s * 0.1, 1.66, 0.62], [0, 0, s * -0.5]);
    ctx.cyl(0.02, 0.02, 0.22, '#C9B48A', [s * 0.19, 1.83, 0.6], [0, 0, s * -0.9]);
  }
  // 四条腿
  for (const [x, z] of [
    [-0.18, 0.36],
    [0.18, 0.36],
    [-0.18, -0.36],
    [0.18, -0.36],
  ]) {
    ctx.box(0.11, 0.7, 0.12, dark, [x, 0.35, z]);
  }
  // 尾巴
  ctx.ico(0.11, '#E8DCC8', [0, 0.95, -0.55], 0);
  return { anchorY: 1.7 };
}

function tentHide(ctx: BuildCtx): { anchorY: number } {
  ctx.cone(1.45, 2.15, '#9A7B58', [0, 1.07, 0], undefined, 7);
  // 门帘缺口:用深色小锥面近似
  ctx.cone(0.42, 1.1, '#3A2C1E', [0, 0.55, 1.05], [0.12, 0, 0], 4);
  // 支撑杆
  ctx.cyl(0.04, 0.05, 2.5, WOOD, [0, 1.2, 0], [0.18, 0, 0.18]);
  ctx.cyl(0.04, 0.05, 2.5, WOOD, [0, 1.2, 0], [-0.18, 0, -0.18]);
  // 压边石
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    ctx.ico(0.12, STONE, [Math.cos(a) * 1.3, 0.07, Math.sin(a) * 1.3], 0);
  }
  return { anchorY: 2.4 };
}

function stoneTool(ctx: BuildCtx): { anchorY: number } {
  // 石斧
  ctx.cyl(0.04, 0.05, 0.95, WOOD, [-0.15, 0.12, 0], [0, 0, 1.45]);
  const head = ctx.ico(0.2, '#8C857C', [0.32, 0.1, 0], 1);
  head.scale.set(1.1, 0.7, 0.9);
  ctx.box(0.05, 0.07, 0.2, '#3E2C1D', [0.22, 0.1, 0]);
  // 石核与石片
  ctx.ico(0.3, STONE_DARK, [-0.55, 0.16, 0.5], 1);
  ctx.ico(0.16, '#8C857C', [0.15, 0.08, 0.72], 0);
  ctx.ico(0.12, '#7C7570', [-0.2, 0.06, 0.95], 0);
  // 待加工的石块
  ctx.ico(0.26, '#6E6459', [0.7, 0.14, -0.55], 0);
  return { anchorY: 0.7 };
}

function mammoth(ctx: BuildCtx): { anchorY: number } {
  const coat = '#4B3B2C';
  const coatLight = '#5F4B38';
  const ivory = '#E6D8BC';
  // 身体
  const body = ctx.ico(1.45, coat, [0, 1.75, 0], 1);
  body.scale.set(1.5, 1.15, 1.05);
  // 背部隆起
  const hump = ctx.ico(1.0, coatLight, [0, 2.75, -0.35], 1);
  hump.scale.set(1.25, 0.75, 0.95);
  // 头
  const head = ctx.ico(0.95, coat, [0, 2.15, 1.75], 1);
  head.scale.set(1.0, 1.15, 0.9);
  // 耳朵
  const earL = ctx.ico(0.5, coatLight, [-0.85, 2.35, 1.55], 1);
  earL.scale.set(0.3, 1.0, 0.9);
  const earR = ctx.ico(0.5, coatLight, [0.85, 2.35, 1.55], 1);
  earR.scale.set(0.3, 1.0, 0.9);
  // 长鼻(三段渐细)
  ctx.cyl(0.3, 0.42, 0.8, coat, [0, 1.75, 2.35], [0.35, 0, 0]);
  ctx.cyl(0.22, 0.3, 0.8, coat, [0, 1.15, 2.65], [0.15, 0, 0]);
  ctx.cyl(0.15, 0.22, 0.7, coat, [0, 0.62, 2.78], [-0.2, 0, 0]);
  // 象牙
  for (const side of [-1, 1]) {
    ctx.cyl(0.1, 0.14, 0.9, ivory, [side * 0.42, 1.55, 2.4], [0.9, 0, side * 0.35], 6);
    ctx.cone(0.09, 0.7, ivory, [side * 0.62, 1.15, 2.9], [2.1, 0, side * 0.5], 5);
  }
  // 四腿
  for (const [x, z] of [
    [-0.72, 0.75],
    [0.72, 0.75],
    [-0.72, -0.75],
    [0.72, -0.75],
  ]) {
    ctx.cyl(0.32, 0.38, 1.15, coat, [x, 0.58, z], undefined, 6);
    ctx.cyl(0.36, 0.36, 0.16, '#3A2E22', [x, 0.08, z], undefined, 6);
  }
  // 尾巴
  ctx.cone(0.1, 0.4, '#3A2E22', [0, 2.2, -1.35], [1.1, 0, 0], 4);
  return { anchorY: 3.2 };
}

function bonePile(ctx: BuildCtx): { anchorY: number } {
  const bone = '#E0D3B8';
  ctx.cyl(0.06, 0.07, 1.1, bone, [-0.1, 0.12, 0], [1.35, 0.2, 0.2], 5);
  ctx.cyl(0.06, 0.07, 0.9, bone, [0.25, 0.1, 0.2], [1.5, -0.3, 0.5], 5);
  ctx.ico(0.14, '#CFC0A2', [-0.55, 0.1, -0.2], 0);
  ctx.ico(0.11, '#D8CAAE', [0.5, 0.09, 0.45], 0);
  ctx.ico(0.16, '#8A7C68', [0.05, 0.12, -0.45], 1);
  return { anchorY: 0.6 };
}

function roastSpit(ctx: BuildCtx): { anchorY: number } {
  const wood = '#4A3423';
  // 三脚架
  ctx.cyl(0.05, 0.06, 1.9, wood, [-0.55, 0.9, 0.3], [0, 0, 0.5]);
  ctx.cyl(0.05, 0.06, 1.9, wood, [0.55, 0.9, 0.3], [0, 0, -0.5]);
  ctx.cyl(0.05, 0.06, 1.9, wood, [0, 0.9, -0.6], [0.45, 0, 0]);
  // 横杆
  ctx.cyl(0.04, 0.04, 1.4, wood, [0, 1.55, 0.05], [0, 0, Math.PI / 2], 5);
  // 烤肉(两块)
  const meat = ctx.ico(0.28, '#8A4B33', [0.05, 1.2, 0.05], 1);
  meat.scale.set(1.2, 1.0, 0.7);
  const meat2 = ctx.ico(0.2, '#7A3F2A', [-0.35, 1.15, 0.05], 1);
  meat2.scale.set(1.0, 0.9, 0.7);
  // 滴落的余烬/火星
  ctx.ico(0.06, '#FFB266', [0.1, 0.75, 0.05], 0, { emissive: '#FF7A1F', emissiveIntensity: 2 });
  ctx.ico(0.05, '#FF9A3C', [-0.3, 0.55, 0.1], 0, { emissive: '#FF7A1F', emissiveIntensity: 2 });
  return { anchorY: 2.0 };
}

export const builders: Record<string, PropBuilder> = {
  fire,
  cave,
  rock,
  'tree-conifer': treeConifer,
  'tree-broadleaf': treeBroadleaf,
  'bush-berry': bushBerry,
  'grass-tuft': grassTuft,
  cloud,
  hunter,
  spear,
  deer,
  'tent-hide': tentHide,
  'stone-tool': stoneTool,
  mammoth,
  'bone-pile': bonePile,
  'roast-spit': roastSpit,
};
