/**
 * 道具注册入口:把各时代 props 文件注册进全局注册表。
 * 新增道具文件时,在这里加一行 import + registerProps。
 */
import type { PropBuilder } from '../primitives';
import { registerProps } from './registry';

import { builders as era1 } from './era1-hunter';
import { builders as era2 } from './era2-agri';
import { builders as era3 } from './era3-iron';
import { builders as era4 } from './era4-steam';
import { builders as era5 } from './era5-electric';
import { builders as era6 } from './era6-info';
import { builders as era7 } from './era7-smart';

registerProps(era1, 'era1-hunter.ts');
registerProps(era2, 'era2-agri.ts');
registerProps(era3, 'era3-iron.ts');
registerProps(era4, 'era4-steam.ts');
registerProps(era5, 'era5-electric.ts');
registerProps(era6, 'era6-info.ts');
registerProps(era7, 'era7-smart.ts');

export { getProp, propTypes, hasProp } from './registry';
export type { PropBuilder };
