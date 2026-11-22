# 拆分与还原说明

## 1. 线上产物

| 项目 | 值 |
| --- | --- |
| 页面 | `https://gtashenzhen.com/`，`index.html` 7,773 B |
| 主 bundle | `/assets/index-BQNgYKyh.js`，971,535 B |
| SHA-256 | `84208699daf170fed691b8e0ff3f935320402d921590881098be973fc33e0e6e` |
| Sourcemap | 无（`.js.map` 404） |
| 构建形态 | Vite / Rollup 扁平输出，三方库与业务代码在同一个模块作用域 |
| 版本标识 | `路线 D 第 5 轮 · v0.5.0` |

格式化后的完整 bundle 保存在 `reference/index.pretty.js`（39,735 行），可用于和拆分结果对照。

## 2. bundle 内部布局

按格式化文本的字节偏移切分：

| 区间（字节） | 内容 |
| --- | --- |
| `[0, 833386)` | three.js r187 核心：常量、数学类、`BufferGeometry`、材质、`WebGLRenderer`、着色器 |
| `[834378, 842003)` | `BufferGeometryUtils`（`mergeGeometries` 等） |
| `[918339, 986640)` | `GLTFLoader` 及其 DRACO/KTX2 辅助逻辑，止于 `function sp(e)` 之前 |
| 其余 | 业务代码：城市解析、地形、建筑、树、角色、载具、交通、搜索、HUD、启动 |

关键坑：Rollup 会把多个声明合并进同一个 `var` 语句，存在一个**跨越库与业务边界的巨型声明**（three 的 `WebGLRenderer` 结束后直接接 `nd = { x: -367.6 … }` 莲花山数据）。因此拆分必须按 **declarator（单个声明符）** 的起始偏移分组，不能按语句或按行切。

## 3. 还原步骤

1. 用 Prettier 将 949 KB 单行 bundle 格式化为 `reference/index.pretty.js`，`node --check` 通过。
2. 用 Babel AST 解析，按声明符偏移把节点分到 `three` / `game` 两组。
3. 对程序顶层作用域执行 `scope.rename()`，把 three 的压缩别名改成官方类名（见下表）；业务代码里的同名局部变量不受影响，因为 Babel 只重命名真实绑定引用。
4. 生成 `src/three.js`：库代码 + `export { … }` 表（只导出业务实际引用的 52 个名字）。
5. 生成 `src/game.js`：顶部 `import { … } from './three.js'` + 业务代码。
6. 抽出内联 CSS 为 `styles.css`，把 `<script src="/assets/index-…js">` 改为 `<script type="module" src="./src/main.js">`。
7. 用 `node --check` 做 ESM 语法校验，再用无头 Chromium 与原站镜像做渲染对照。

## 4. three 别名映射（节选）

| 压缩名 | 还原名 | 压缩名 | 还原名 |
| --- | --- | --- | --- |
| `td` | `WebGLRenderer` | `In` | `Scene` |
| `us` | `PerspectiveCamera` | `hs` | `OrthographicCamera` |
| `X` | `Color` | `Y` | `Matrix4` |
| `Nt` | `Matrix3` | `At` | `Quaternion` |
| `J` | `Vector3` | `q` | `Vector2` |
| `Yt` | `Vector4` | `un` | `Euler` |
| `Zn` | `Box3` | `kr` | `BufferGeometry` |
| `hr` | `BufferAttribute` | `Z` | `Float32BufferAttribute` |
| `ri` | `Mesh` | `ki` | `InstancedMesh` |
| `On` | `Group` | `ca` | `BoxGeometry` |
| `ua` | `CylinderGeometry` | `Qa` | `SphereGeometry` |
| `Za` | `PlaneGeometry` | `la` | `CapsuleGeometry` |
| `da` | `ConeGeometry` | `Xa` | `IcosahedronGeometry` |
| `$a` | `TorusGeometry` | `co` | `ShaderMaterial` |
| `Gr` | `MeshBasicMaterial` | `ia` | `CanvasTexture` |
| `_i` | `DataTexture` | `aa` | `DepthTexture` |
| `Zt` | `WebGLRenderTarget` | `_s` | `DirectionalLight` |
| `Qo` | `HemisphereLight` | `fc` | `PMREMGenerator` |
| `Ts` | `Clock` | `Hs` | `AnimationMixer` |
| `qa` | `ShapeUtils` | `Rt` | `ColorManagement` |
| `of` | `GLTFLoader` | `ld` | `mergeGeometries` |
| `Ue` | `DynamicDrawUsage` | `Oe` | `LoopOnce` |
| `h` | `UnsignedIntType` | `T` | `RGBAFormat` |
| `t` | `RepeatWrapping` | `n` | `ClampToEdgeWrapping` |
| `s` | `LinearFilter` | `i` | `NearestFilter` |
| `l` | `LinearMipmapLinearFilter` | `Le` | `SRGBColorSpace` |

> 单字母常量在业务代码里可能被局部变量遮蔽，Babel 的绑定级重命名会自动避开这些局部绑定，不需要手工改。

## 5. 业务代码地图（`src/game.js` 近似行号）

| 位置 | 内容 |
| --- | --- |
| 开头 | 模块头注释、`import` 表 |
| ≈490 | 小地图 2D canvas 初始化 |
| ≈1306 | `Bd` 多边形解析、`Wd` 楼块/屋顶构建 |
| ≈2015 | `sp` 伪随机 / 噪声工具 |
| ≈2420 | `/models/trees/` 树木加载与卡片 |
| ≈3902 | `astronaut.glb` 宇航员与动画 |
| ≈4217 | `fp-arms/arm.glb` 第一人称手臂 |
| ≈5194 | `/models/cars/` 载具（sedan/suv/taxi/bus/truck/mpv） |
| ≈5369 | `ped/ped.glb` 行人 |
| ≈10883 | `async function V_()` 启动：加载 `city.json`、建场景、绑定 HUD |
| ≈10893 | `fetch('/city.json')` |
| ≈11194 | 搜索框 `#searchin` 与地点检索 UI |
| ≈11321 | `window.__futian` 调试句柄 |
| 末尾 | `V_().catch(...)` 自动启动 |

> 行号会随编辑漂移，建议配合字符串搜索（`city.json`、`loadmsg`、`astronaut.glb`、`setNight`、`igniteTarget`）定位。

## 6. 运行时接口

`window.__futian` 主要键：

`avatar`、`grid2`、`terrainHeight`、`buildingAt`、`player`、`scene`、`camera`、`renderer`、`city`、`shadows`、`setHud`、`towers`、`trees`、`ground`、`traffic`、`settle`、`setNight`、`G`、`showTextCanvas`、`astro`、`showTargets`、`igniteTarget`、`igniteReset`、`launchWave`、`search`、`logos`。

- `setNight(on, immediate)`：第二参为 `true` 时立即切换，不做过渡。
- URL：`?night=1` 直接夜景，`?hud=0` 隐藏 HUD。

## 7. 验证记录

环境：Linux + Chromium headless（`--use-angle=swiftshader --enable-unsafe-swiftshader`），1280×800。

| 指标 | 原始镜像 | 重建工程 |
| --- | --- | --- |
| `loadmsg` | 完成 | 完成 |
| `window.__futian` | 存在 | 存在 |
| 相机坐标 | `(-155.71, 260.00, 1619.09)` | 相同 |
| draw calls / triangles | 1,172 / 7,152,082 | 1,179 / 7,157,614 |
| 白天截图 | MD5 `201729…56d` | 同 MD5，逐像素零差异 |
| 夜景稳定帧 | — | 264 个像素 ≤2 级色差 |
| console error | 0 | 0 |

draw call 的个位数差异来自交通/行人的随机实例化时序，截图与稳定帧证明渲染结果等价。

## 8. 二次开发建议

- 想模块化：可以按 `src/game.js` 里的区块拆成 `terrain.js`、`buildings.js`、`vehicles.js`，共享 `three.js` 的具名导入即可。
- 想换数据：保持 `city.json` 的 `buildings/roads/areas/waterLines/rails/landmarks` 字段结构，或修改 `V_()` 里的加载逻辑。
- 想升级 three：`npm i three`，把 `import … from './three.js'` 改为 `from 'three'`，并为 `GLTFLoader`、`mergeGeometries` 增加 `three/addons/...` 导入；注意 r187 之后的 API 变化。
