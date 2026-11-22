# GTA Shenzhen · 可二次编辑源码工程

这是对 `https://gtashenzhen.com/` 线上版本的**反编译重建工程**，不是作者原始的 TypeScript 源码。
线上只发布了一个 Vite 打包后的单文件 bundle（`assets/index-BQNgYKyh.js`，971,535 字节），且没有 sourcemap。
本工程把该 bundle 拆成「三方库」与「业务代码」两部分，格式化、补齐模块边界，并把 three.js 的压缩别名还原成官方类名，使代码可以直接阅读、修改和运行。

## 快速运行

必须通过 HTTP 服务打开（ES Module 和 `fetch` 不能用 `file://`）：

```bash
# 方式一：Python（零依赖）
python3 tools/serve.py 8899

# 方式二：Node（零依赖）
node tools/serve.js 8899

# 方式三：Vite（需要 npm install）
npm install
npm run dev
```

然后访问 <http://127.0.0.1:8899/>。Windows 可直接双击 `run.bat`，macOS/Linux 用 `./run.sh`。

在线房间：

- **可玩页面**：<https://bear20252026.github.io/gtashenzhen/>
- **房间封面**：<https://bear20252026.github.io/gtashenzhen/room.html>
- **总馆入口**：<https://bear20252026.github.io/frontier-atlas/#rooms>（第 10 个房间）
- **源码**：<https://github.com/bear20252026/gtashenzhen>

## 目录结构

```
index.html              页面骨架（DOM / HUD / 搜索框 / 小地图）
styles.css              从原页面内联 <style> 抽出的样式
src/
  main.js               入口，只负责 import './game.js'
  game.js               业务逻辑：地形、楼块、树、角色、载具、交通、搜索、HUD、启动
  three.js              vendor：three r187 核心 + BufferGeometryUtils + GLTFLoader + 导出表
city.json               深圳 OSM 数据（83,182 栋楼 / 62,088 条路 / 15,093 个区域，约 30 MB）
models/                 53 个 GLB/贴图资源（车辆、行人、树、宇航员、地标建筑等）
tools/serve.py|serve.js 零依赖静态服务器
reference/              线上原始文件，供对照（不参与运行）
docs/architecture.md    拆分方法、符号映射、代码地图、验证记录
```

## 可以改什么

- **场景/玩法**：`src/game.js`。搜索 `loadmsg`、`city.json`、`astronaut.glb`、`./models/cars/` 等字符串即可定位对应区块；文件开头有区块行号索引。
- **页面与 HUD**：`index.html` + `styles.css`，DOM id 与原版一致。
- **渲染器/加载器**：`src/three.js` 是三方库副本，一般不要改；要升级 three 时，建议改成 npm 依赖并保留 `game.js` 顶部的具名导入。
- **城市数据**：`city.json`。结构见 `docs/architecture.md`，替换数据时保持同 schema。
- **调试入口**：浏览器控制台里的 `window.__futian` 暴露了 scene、camera、renderer、player、setNight、search、igniteTarget、launchWave 等句柄；URL 支持 `?night=1`、`?hud=0`。

## 已知限制

- 业务代码的**局部变量名**仍是压缩后的短名（如 `V_`、`Wd`、`$`）；three 的顶层类名已还原为 `WebGLRenderer`、`Scene`、`Mesh` 等官方名称。这是把压缩产物转成可编辑代码时能做到的安全还原，未改动控制流。
- `game.js` 通过 `import { ... } from './three.js'` 使用三方库；`three.js` 末尾有显式 `export {}` 表。
- 资源路径已改为页面相对路径（`./city.json`、`./models/...`），因此工程可以直接放在 GitHub Pages 的子路径下运行；仍应保持 `index.html` 与 `city.json` 在同一目录。
- 反编译代码与原始作者源码可能存在细微格式差异；逻辑按线上产物 1:1 保留。

## 验证

在无头 Chromium（SwiftShader）中对比「原始镜像」与「本工程」：

- 白天首屏截图逐字节相同（MD5 一致，1,024,000 像素零差异）。
- 夜景稳定帧仅 264 个像素有 ≤2 级色差，属于灯光过渡时序差异。
- 两次运行均无 console error / 页面异常；`loadmsg=完成`、`window.__futian` 正常、渲染约 7,157,614 个三角形 / 1,179 draw calls。

## 来源与版权

- 页面与代码来自 `gtashenzhen.com`（版本 `v0.5.0`，bundle SHA-256 `84208699…e0e6e`）。
- 地图数据 © OpenStreetMap contributors（ODbL）；三维模型与代码版权归原站作者。
- 本工程仅用于学习、研究与二次开发参考，请勿用于商业用途或去除原作者的版权声明。
