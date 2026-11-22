/**
 * GTA Shenzhen 业务逻辑（由线上 bundle 反编译整理，非官方原始源码）
 * 入口：文件末尾的 V_() 启动函数；运行时调试句柄：window.__futian。
 * 依赖：./three.js（three r187 + GLTFLoader 等），样式与 DOM 见 ../index.html、../styles.css。
 * 主要区块（行号为当前文件近似值）：
 *   着色器/工具函数 → 地形与楼块(≈1300) → 树(≈2420) → 宇航员(≈3900) → 第一人称手臂(≈4220)
 *   → 载具(≈5190) → 行人(≈5370) → 交通/小地图 → 加载 city.json(≈10890) → 启动(≈10880) → 搜索/HUD(≈11190+)
 */

import {
  AnimationMixer,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  ClampToEdgeWrapping,
  Clock,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DepthTexture,
  DirectionalLight,
  DynamicDrawUsage,
  Euler,
  Float32BufferAttribute,
  GLTFLoader,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  LoopOnce,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  ShapeUtils,
  SphereGeometry,
  TorusGeometry,
  UnsignedIntType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
  mergeGeometries,
} from './three.js';

var nd = {
    x: -367.6,
    z: -1450.9,
    ele: 106
  },
  rd = 10,
  id = [[0, 0, 1, 210, 260], [60, 220, 0.42, 200, 170], [-150, 120, 0.3, 170, 190], [120, -140, 0.25, 160, 150], [-90, -200, 0.22, 170, 140]],
  ad = 1;

function od(e) {
  e && (nd = {
    x: e.x,
    z: e.z,
    ele: e.ele || 106
  }), ad = 1, ad = sd(nd.x, nd.z);
}

function sd(e, t) {
  let n = 0;
  for (let [r, i, a, o, s] of id) {
    let c = (e - nd.x - r) / o,
      l = (t - nd.z - i) / s;
    n += a * Math.exp(-(c * c + l * l) * 1.6);
  }
  return n;
}

function cd() {
  return nd;
}

function $(e, t) {
  let n = e - nd.x,
    r = t - nd.z,
    i = n * n + r * r;
  if (i > 577600) return 0;
  let a = Math.sqrt(i),
    o = sd(e, t) / ad * (nd.ele - rd);
  o += (Math.sin(e * 0.031) * Math.cos(t * 0.027) + Math.sin(e * 0.07 + t * 0.05) * 0.5) * 2 * Math.min(1, o / 15);
  let s = Math.min(1, Math.max(0, (760 - a) / 220));
  return o *= s * s * (3 - 2 * s), Math.max(0, o - 0.6);
}

od(null);

var fd = new Vector3(-0.52, 0.64, 0.57).normalize(),
  pd = e => new Vector3((e >> 16 & 255) / 255, (e >> 8 & 255) / 255, (e & 255) / 255),
  md = 11127278,
  hd = pd(md),
  gd = {
    uSunDir: {
      value: fd
    },
    uHaze: {
      value: hd
    },
    uSkyMap: {
      value: null
    },
    uShadow0: {
      value: null
    },
    uShadow1: {
      value: null
    },
    uShadowMat0: {
      value: new Matrix4()
    },
    uShadowMat1: {
      value: new Matrix4()
    },
    uShadowInfo: {
      value: new Vector4(0.2, 1, 0, 0)
    },
    uNight: {
      value: 0
    },
    uTextTex: {
      value: null
    },
    uSloganTex: {
      value: null
    },
    uIgn: {
      value: Array.from({
        length: 32
      }, () => new Vector4())
    },
    uIgnB: {
      value: Array.from({
        length: 32
      }, () => new Vector4())
    },
    uBeamT: {
      value: [1e9, 1e9, 1e9, 1e9]
    },
    uWave: {
      value: new Vector4(0, 0, 1e9, 0)
    },
    uTime: {
      value: 0
    },
    uTreeNear: {
      value: 0
    }
  },
  _d = (e = {}) => ({
    ...gd,
    ...e
  }),
  vd = `
precision highp sampler2DShadow;
uniform sampler2DShadow uShadow0;
uniform sampler2DShadow uShadow1;
uniform mat4 uShadowMat0;
uniform mat4 uShadowMat1;
uniform vec4 uShadowInfo;
float ftShadowTap(sampler2DShadow m, vec3 c){
  const float r = 1.0 / 2048.0;
  float s = texture(m, vec3(c.xy + vec2(-0.6, -0.3) * r, c.z));
  s += texture(m, vec3(c.xy + vec2(0.6, 0.3) * r, c.z));
  s += texture(m, vec3(c.xy + vec2(-0.3, 0.6) * r, c.z));
  s += texture(m, vec3(c.xy + vec2(0.3, -0.6) * r, c.z));
  return s * 0.25;
}
float sunShadowOff(vec3 wp, vec3 n, float extra){
  if (uShadowInfo.z < 0.5) return 1.0;
  vec3 c = (uShadowMat0 * vec4(wp + n * (uShadowInfo.x * 2.0 + extra), 1.0)).xyz;
  if (c.x > 0.015 && c.x < 0.985 && c.y > 0.015 && c.y < 0.985 && c.z > 0.0 && c.z < 1.0) {
    c.z -= 0.00004;
    return ftShadowTap(uShadow0, c);
  }
  c = (uShadowMat1 * vec4(wp + n * (uShadowInfo.y * 2.0 + extra), 1.0)).xyz;
  if (c.x > 0.0 && c.x < 1.0 && c.y > 0.0 && c.y < 1.0 && c.z > 0.0 && c.z < 1.0) {
    c.z -= 0.00012;
    float s = ftShadowTap(uShadow1, c);
    vec2 e = abs(c.xy - 0.5) * 2.0;
    return mix(s, 1.0, smoothstep(0.88, 1.0, max(e.x, e.y)));
  }
  return 1.0;
}
float sunShadow(vec3 wp, vec3 n){ return sunShadowOff(wp, n, 0.0); }
`,
  yd = `
uniform vec3 uHaze;
uniform float uNight;
vec3 atmo(vec3 col, vec3 wp){
  float d = distance(wp, cameraPosition);
  float f = 1.0 - exp(-d * mix(0.00009, 0.00012, uNight));
  f *= mix(1.0, 0.55, clamp(wp.y / 600.0, 0.0, 1.0));
  // 夜里的霭是被城市灯光染成的紫橙色，不是黑
  return mix(col, mix(uHaze, vec3(0.150, 0.085, 0.080), uNight), clamp(f, 0.0, 0.85));
}
`,
  bd = `
uniform vec3 uSunDir;
uniform sampler2D uSkyMap;
uniform float uTime;
// 光球点亮：从击中点向外以 85 m/s 扩散，只作用在目标楼的圆柱范围内。返回 (已点亮程度, 扩散前沿的亮带)
uniform vec4 uIgn[32];
uniform vec4 uIgnB[32];
// 冲击波半径（米）：起步每秒 260m，越跑越快（加速度 180 m/s²），约 12 秒传遍三区。负数表示没有冲击波
uniform vec4 uWave;
float waveRadius(){ float t = uTime - uWave.z; return t < 0.0 ? -1.0 : 260.0 * t + 90.0 * t * t; }
vec2 ignition(vec3 wp){
  float lit = 0.0, fr = 0.0;
  // 冲击波扫到的参演楼全部点亮（不占 32 个单栋名额），波前是一道亮带
  float wr = waveRadius();
  if (wr >= 0.0) {
    float dw = distance(wp.xz, uWave.xy);
    lit = 1.0 - smoothstep(wr - 70.0, wr, dw);
    fr = exp(-pow((dw - wr) / 45.0, 2.0));
  }
  for (int i = 0; i < 32; i++) {
    vec4 b = uIgnB[i];
    if (b.w <= 0.0) continue;
    vec2 dxz = wp.xz - b.xy;
    if (dot(dxz, dxz) > b.w * b.w) continue;
    float r = (uTime - b.z) * 85.0;
    if (r < 0.0) continue;
    float d = distance(wp, uIgn[i].xyz);
    lit = max(lit, 1.0 - smoothstep(r - 16.0, r, d));
    fr = max(fr, exp(-pow((d - r) / 9.0, 2.0)));
  }
  return vec2(lit, fr);
}
${vd}
${yd}
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
// 烘焙好的天空（含积云），显示空间颜色；a = 云的透过率
vec4 skyTex(vec3 d){
  float az = atan(d.z, d.x);
  float v = sqrt(clamp((d.y + 0.05) / 1.05, 0.0, 1.0));
  vec4 t = texture2D(uSkyMap, vec2(az / 6.28318530718 + 0.5, v));
  if (uNight > 0.0) {
    // 夜空：天顶深蓝，地平线一圈城市光污染；云被城市从下面照成暗紫色
    float y = max(d.y, 0.0);
    // 第 5 轮打磨：天顶深紫蓝，往下过渡到暗玫红，地平线一圈暖红橙的雾（参考《深圳夜之城》的航拍夜景）
    vec3 ng = mix(vec3(0.24, 0.10, 0.16), vec3(0.020, 0.022, 0.070), pow(y, 0.42));
    ng += vec3(0.40, 0.17, 0.09) * pow(1.0 - y, 9.0) + vec3(0.18, 0.09, 0.03) * pow(1.0 - y, 30.0);
    vec3 cl = mix(vec3(0.10, 0.07, 0.12), vec3(0.30, 0.15, 0.13), pow(1.0 - y, 3.0));
    t.rgb = mix(t.rgb, mix(cl, ng, t.a), uNight);
  }
  return t;
}
vec3 skyColor(vec3 d){ return skyTex(d).rgb; }
vec3 toLin(vec3 c){ return pow(max(c, 0.0), vec3(2.2)); }
vec3 toneMap(vec3 x){
  x = 1.0 - exp(-x * 0.78);
  x = pow(x, vec3(1.0 / 2.2));
  float l = dot(x, vec3(0.299, 0.587, 0.114));
  return clamp(mix(vec3(l), x, 1.14), 0.0, 1.0);
}
const vec3 SUN_E = vec3(2.55, 2.42, 2.18);
// 夜里太阳换成同方向的月光（阴影贴图照用），环境光换成偏暖的城市漫反射
vec3 sunE(){ return mix(SUN_E, vec3(0.085, 0.115, 0.20), uNight); }
vec3 ambientLin(vec3 n){
  vec3 day = mix(vec3(0.26, 0.25, 0.22), vec3(0.50, 0.64, 0.86), n.y * 0.5 + 0.5) * 0.92;
  vec3 night = mix(vec3(0.075, 0.050, 0.030), vec3(0.024, 0.030, 0.058), n.y * 0.5 + 0.5);
  return mix(day, night, uNight);
}
// 窗内灯光：一格一格独立亮灭，暖黄为主，少量冷白和电视蓝
vec3 winLight(vec2 id, float seed){
  // 第 5 轮打磨：更密（约六成半亮）、以琥珀色为主，少量暖白，极少冷白
  float h = hash21(id * 1.13 + seed * 71.0);
  float on = step(0.36, h);
  vec3 c = h > 0.975 ? vec3(0.62, 0.80, 1.0) : (h > 0.88 ? vec3(1.0, 0.90, 0.70) : (h > 0.62 ? vec3(1.0, 0.72, 0.34) : vec3(1.0, 0.60, 0.22)));
  return c * on * (0.55 + 0.7 * hash21(id + seed + 5.0));
}
vec3 hsv2rgb(float h, float s, float v){ vec3 k = clamp(abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); return v * mix(vec3(1.0), k, s); }
// ---------------- 深圳灯光秀：60 秒一轮，四幕，各 15 秒，幕间 1.5 秒过渡 ----------------
//   一幕「潮汐」青蓝色光带自下而上，沿深南大道由西向东推进
//   二幕「像素雨」紫红色竖列下落，金色雨头
//   三幕「红金」全城同拍呼吸，金色横条缓缓上升
//   四幕「彩虹」色相随东西位置变化，整条天际线横向扫过
// id = 幕墙分格号（当作 LED 像素），hgt = 离地高度，wp = 世界坐标，ph = 每栋楼的随机相位
vec3 showAct(int a, vec2 id, float hgt, vec3 wp, float ph){
  if (a == 0) {
    float w = sin(hgt * 0.045 - uTime * 1.7 + wp.x * 0.0016);
    float band = smoothstep(0.15, 0.9, w);
    vec3 c = mix(vec3(0.0, 0.05, 0.28), vec3(0.10, 0.92, 1.0), band);
    return c + vec3(0.8, 1.0, 1.0) * step(0.985, hash21(id + floor(uTime * 6.0)));
  } else if (a == 1) {
    float ch = hash11(id.x * 3.1 + ph * 90.0);
    float y = fract(id.y * 0.03 + uTime * (0.22 + 0.3 * ch) + ch);
    vec3 c = mix(vec3(0.10, 0.0, 0.20), vec3(0.98, 0.14, 0.74), pow(y, 3.0));
    return c + vec3(1.0, 0.82, 0.3) * smoothstep(0.93, 1.0, y);
  } else if (a == 2) {
    float beat = 0.5 + 0.5 * sin(uTime * 2.4);
    float bars = step(0.5, fract(id.y * 0.125 - uTime * 0.3));
    return mix(vec3(0.80, 0.05, 0.04), vec3(1.0, 0.74, 0.16), bars * 0.85) * (0.55 + 0.45 * beat);
  }
  float h = fract(wp.x * 0.0009 + wp.z * 0.0004 - uTime * 0.08);
  return hsv2rgb(h, 0.85, 1.0) * (0.6 + 0.4 * sin(hgt * 0.16 + uTime * 3.0 + ph * 6.0));
}
vec3 showColor(vec2 id, float hgt, vec3 wp, float ph){
  float t = mod(uTime, 60.0) / 15.0;
  int a = int(floor(t));
  float k = smoothstep(0.9, 1.0, fract(t));
  vec3 c0 = showAct(a, id, hgt, wp, ph);
  if (k <= 0.0) return c0;
  return mix(c0, showAct(a == 3 ? 0 : a + 1, id, hgt, wp, ph), k);
}
// ---------------- 灯光秀楼体大字（第 5 轮）----------------
// 字形图集：一行 12 格 = A P E C 空格 来 了 就 是 深 圳 人（用系统中文字体画到画布上，见 makeShowTextTexture）
uniform sampler2D uTextTex;
uniform sampler2D uSloganTex;
// 字形图集是 8×8 格，gi = 格号；guv 是格内坐标（y 朝上）
float glyphAt(float gi, vec2 guv){
  if (gi < -0.5 || guv.y < 0.0 || guv.y > 1.0) return 0.0;
  float c = mod(gi, 8.0), j = floor(gi / 8.0);
  return texture2D(uTextTex, vec2((c + clamp(guv.x, 0.03, 0.97)) / 8.0, 1.0 - (j + 1.0 - clamp(guv.y, 0.03, 0.97)) / 8.0)).r;
}
// 第 k 句的第 r 个字的格号；空位返回 -1
float sloganGlyph(float k, float r){
  if (r < -0.5 || r > 30.5) return -1.0;
  float v = texture2D(uSloganTex, vec2((r + 0.5) / 32.0, (k + 0.5) / 8.0)).r * 255.0;
  return v > 200.0 ? -1.0 : floor(v + 0.5);
}
float sloganLen(float k){ return floor(texture2D(uSloganTex, vec2(31.5 / 32.0, (k + 0.5) / 8.0)).r * 255.0 + 0.5); }
// 幕墙贴图坐标在屏幕上是否左右镜像（各栋楼的绕向不一样；镜像了就把字翻回来，保证汉字不会反）
float uvFlip(vec2 p){ return (dFdx(p.x) * dFdy(p.y) - dFdy(p.x) * dFdx(p.y)) < 0.0 ? -1.0 : 1.0; }
// 竖排：一列字从上往下读，整列持续上移（每秒 0.55 个字高）；s = 字高（米）；每 6 个字宽重复一列。
// k = 这栋楼起始的文案号。每 16 行是一段（最长的一句 13 个字，其余是句间空行），一段滚完换下一句，8 句轮着来。
// 返回 (字的亮度, 是否在字列的深色底板里, 当前是第几句)
// wm = 两列字之间隔几个字宽（普通楼 6；春笋的专用字带 4）
vec3 showTextV(vec2 p, float s, float k, float wm){
  float W = wm * s;
  float u = (mod(p.x + W * 0.5, W) - W * 0.5) * uvFlip(p);
  float panel = 1.0 - smoothstep(s * 0.60, s * 0.68, abs(u));
  if (panel <= 0.0) return vec3(0.0);
  float yy = p.y / s - uTime * 0.55;
  float rowAbs = -floor(yy) - 1.0;                    // 行号，越往下越大
  float slot = floor(rowAbs / 16.0);
  float kk = mod(k + slot, 8.0);
  float gi = sloganGlyph(kk, rowAbs - slot * 16.0);
  return vec3(glyphAt(gi, vec2(u / s + 0.5, fract(yy))), panel, kk);
}
// 横排：一行字居中，整行往上滚（每秒 0.4 个字高）；每滚过一行换下一句
vec3 showTextH(vec2 p, float s, float k){
  float u = p.x * uvFlip(p);
  float q = (p.y - uTime * 0.4 * s) / (4.0 * s);
  float kk = mod(k - floor(q), 8.0);
  float yy = fract(q) * 4.0 - 2.0;
  float len = sloganLen(kk);
  float panel = step(-0.25, yy) * step(yy, 1.25) * step(abs(u), 6.9 * s);
  float ci = floor(u / s + len * 0.5);
  float gi = (ci < 0.0 || ci > len - 0.5) ? -1.0 : sloganGlyph(kk, ci);
  return vec3(glyphAt(gi, vec2(fract(u / s + len * 0.5), yy)), panel, kk);
}
// 轮廓灯带的颜色：按相位分白金 / 青 / 品红，或者跟着灯光秀走
vec3 stripColor(float ph, vec3 wp){
  if (ph < 0.25) return vec3(1.0, 0.86, 0.55);
  if (ph < 0.5) return vec3(0.15, 0.95, 1.0);
  if (ph < 0.75) return vec3(1.0, 0.25, 0.75);
  // 塔冠等：青白色，缓慢呼吸（不再跟着表演色块变色）
  return vec3(0.35, 0.95, 1.0) * (0.75 + 0.25 * sin(uTime * 0.8 + wp.y * 0.01));
}
float gShadow = 1.0;
// albedo 为线性；返回显示空间
vec3 lightLin(vec3 alb, vec3 n, float sh, float ao){
  float ndl = max(dot(n, uSunDir), 0.0);
  return toneMap(alb * (sunE() * ndl * sh + ambientLin(n) * ao));
}
// albedo 为显示空间颜色（沿用旧代码里的调色），返回显示空间
vec3 lightIt(vec3 albedo, vec3 n){ return lightLin(toLin(albedo), n, gShadow, 1.0); }
// 反射环境：天空 + 一圈假的对面楼群（低仰角处），让玻璃有东西可反射
vec3 envRefl(vec3 R, float worldY){
  vec3 sky = skyColor(vec3(R.x, max(R.y, 0.0), R.z));
  float az = atan(R.z, R.x);
  float cell = floor(az * 7.0);
  float f = fract(az * 7.0);
  float hgt = (0.03 + 0.34 * hash11(cell * 1.31 + 5.0) * hash11(cell * 0.73 + 1.7)) * clamp(1.15 - worldY / 320.0, 0.15, 1.0);
  float gap = step(0.12, f) * step(f, 0.88);
  float m = (1.0 - smoothstep(hgt - 0.012, hgt, R.y)) * gap;
  m = max(m, 1.0 - smoothstep(-0.01, 0.015, R.y));
  vec3 b = mix(vec3(0.33, 0.43, 0.55), vec3(0.62, 0.66, 0.70), hash11(cell * 3.1 + 0.5));
  b *= 0.86 + 0.14 * step(0.5, fract(R.y * 55.0));
  vec3 ground = vec3(0.24, 0.30, 0.24);
  // 夜里对面楼群是暗的，带一格一格亮着的窗
  b = mix(b, vec3(0.03, 0.035, 0.06) + step(0.62, hash21(vec2(cell, floor(R.y * 55.0)))) * vec3(0.75, 0.55, 0.30), uNight);
  ground = mix(ground, vec3(0.10, 0.07, 0.05), uNight);
  b = mix(ground, b, smoothstep(-0.06, 0.0, R.y));
  return mix(sky, b, m * 0.9);
}
`;

function xd({
  color: e = 16777215,
  map: t = null,
  alphaTest: n = 0,
  side: r = 0,
  emissive: i = 0,
  spec: a = 0
} = {}) {
  let o = new Color(e);
  return new ShaderMaterial({
    uniforms: _d({
      uColor: {
        value: new Vector3(o.r, o.g, o.b)
      },
      uMap: {
        value: t
      },
      uEmis: {
        value: i
      },
      uSpec: {
        value: a
      }
    }),
    defines: t ? {
      USE_FT_MAP: 1,
      FT_ALPHATEST: n.toFixed(3)
    } : {},
    side: r,
    vertexShader: `
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec2 vUv;
      void main(){
        vec4 lp = vec4(position, 1.0); vec3 ln = normal;
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
        #endif
        vec4 wp = modelMatrix * lp; vWorld = wp.xyz; vN = normalize(mat3(modelMatrix) * ln);
        vCol = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #endif
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      ${bd}
      uniform vec3 uColor; uniform float uEmis; uniform float uSpec;
      #ifdef USE_FT_MAP
      uniform sampler2D uMap;
      #endif
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec2 vUv;
      void main(){
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        vec3 alb = uColor * vCol;
        #ifdef USE_FT_MAP
          vec4 t = texture2D(uMap, vUv);
          if (t.a < FT_ALPHATEST) discard;
          alb *= toLin(t.rgb);
        #endif
        float sh = sunShadow(vWorld, n);
        vec3 col = lightLin(alb, n, sh, 1.0);
        if (uSpec > 0.0) {
          vec3 V = normalize(vWorld - cameraPosition);
          col += uSpec * sh * pow(max(dot(n, normalize(uSunDir - V)), 0.0), 50.0) * 0.5;
        }
        // 自发光只在夜里起作用（路灯灯头等）
        col = mix(col, pow(alb, vec3(1.0 / 2.2)) * 1.25, uEmis * uNight);
        gl_FragColor = vec4(atmo(col, vWorld), 1.0);
      }`
  });
}

var Sd = [`APEC 来了就是深圳人`, `来了就是深圳人`, `我们都是深圳人`, `时间就是金钱 效率就是生命`, `深圳速度`, `敢闯敢试 敢为天下先`, `空谈误国 实干兴邦`, `你好，鹏城`];

Sd[0];

function Cd() {
  let e = [];
  for (let t of Sd) for (let n of t) n !== ` ` && !e.includes(n) && e.push(n);
  e.length > 64 && console.warn(`[futian] 灯光秀文案的字超过 64 个，图集放不下`, e.length);
  let t = document.createElement(`canvas`);
  t.width = t.height = 1024;
  let r = t.getContext(`2d`);
  r.fillStyle = `#000`, r.fillRect(0, 0, t.width, t.height), r.fillStyle = `#fff`, r.textAlign = `center`, r.textBaseline = `middle`, e.forEach((e, t) => {
    let n = e.charCodeAt(0) < 128;
    r.font = `${n ? 900 : 700} ${n ? 118 : 108}px "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif`;
    let i = (t % 8 + 0.5) * 128 + (e === `，` ? 28.16 : 0),
      a = (Math.floor(t / 8) + 0.53) * 128 - (e === `，` ? 12.8 : 0);
    r.fillText(e, i, a, 117.76);
  });
  let a = new CanvasTexture(t);
  a.wrapS = a.wrapT = ClampToEdgeWrapping, a.generateMipmaps = !0, a.minFilter = LinearMipmapLinearFilter, a.anisotropy = 8, gd.uTextTex.value = a;
  let o = new Uint8Array(1024).fill(255);
  Sd.forEach((t, n) => {
    let r = [...t];
    r.length > 16 && console.warn(`[futian] 文案超过 16 个字，竖排一段放不下：`, t), r.forEach((t, r) => {
      r < 31 && (o[(n * 32 + r) * 4] = t === ` ` ? 255 : e.indexOf(t));
    }), o[(n * 32 + 31) * 4] = r.length;
  });
  let s = new DataTexture(o, 32, 8, RGBAFormat);
  return s.minFilter = s.magFilter = NearestFilter, s.needsUpdate = !0, gd.uSloganTex.value = s, t.__glyphs = e.join(``), t;
}

var wd = 0;

function Td(e, t, n = 0) {
  let r = wd;
  wd = (wd + 1) % 32, gd.uIgn.value[r].set(e.x, e.y, e.z, 0), gd.uIgnB.value[r].set(t.x, t.z, gd.uTime.value - n, t.R), t.beam != null && (gd.uBeamT.value[t.beam] = gd.uTime.value - n + 0.8), t.lit = !0;
}

var Ed = e => e < 0 ? -1 : 260 * e + 90 * e * e,
  Dd = e => (-260 + Math.sqrt(67600 + 360 * e)) / 180;

function Od(e, t, n = 0, r = []) {
  let i = gd.uTime.value + n;
  gd.uWave.value.set(e, t, i, 0);
  for (let n of r) n.beam != null && (gd.uBeamT.value[n.beam] = Math.min(gd.uBeamT.value[n.beam], i + Dd(Math.hypot(n.x - e, n.z - t)) + 0.5));
  return i;
}

function kd(e) {
  gd.uWave.value.set(0, 0, 1e9, 0);
  for (let e = 0; e < 32; e++) gd.uIgnB.value[e].set(0, 0, 0, 0);
  for (let e = 0; e < 4; e++) gd.uBeamT.value[e] = 1e9;
  if (wd = 0, e) for (let t of e) t.lit = !1;
}

var Ad = [];

function jd({
  color: e = [1, 0.78, 0.45],
  size: t = 5,
  local: n = [0, 0, 0],
  gain: r = 1
} = {}) {
  return new ShaderMaterial({
    uniforms: _d({
      uGlowCol: {
        value: new Vector3(...e)
      },
      uSize: {
        value: t
      },
      uLocal: {
        value: new Vector3(...n)
      },
      uGain: {
        value: r
      }
    }),
    transparent: !0,
    depthWrite: !1,
    blending: 2,
    vertexShader: `
      uniform float uSize; uniform vec3 uLocal;
      varying vec2 vP; varying float vFade;
      void main(){
        vec4 c = vec4(uLocal, 1.0);
        #ifdef USE_INSTANCING
          c = instanceMatrix * c;
        #endif
        vec4 mv = viewMatrix * modelMatrix * c;
        // 远处光晕保持一个最小的屏幕尺寸，像真实的灯点
        float sz = max(uSize, -mv.z * 0.004);
        vFade = clamp(uSize / sz, 0.25, 1.0);
        mv.xy += position.xy * sz;
        vP = position.xy * 2.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uGlowCol; uniform float uNight; uniform float uGain;
      varying vec2 vP; varying float vFade;
      void main(){
        float r = length(vP);
        float a = pow(max(1.0 - r, 0.0), 2.4) + 0.6 * pow(max(1.0 - r * 3.0, 0.0), 2.0);
        gl_FragColor = vec4(uGlowCol * a * uNight * uGain * vFade * 1.35, 1.0);
      }`
  });
}

function Md(e) {
  e.onBeforeCompile = e => {
    Object.assign(e.uniforms, {
      uShadow0: gd.uShadow0,
      uShadow1: gd.uShadow1,
      uShadowMat0: gd.uShadowMat0,
      uShadowMat1: gd.uShadowMat1,
      uShadowInfo: gd.uShadowInfo,
      uHaze: gd.uHaze,
      uNight: gd.uNight
    }), e.vertexShader = e.vertexShader.replace(`#include <common>`, `#include <common>
varying vec3 vFtWorld;`).replace(`#include <project_vertex>`, `#include <project_vertex>
{ vec4 ftP = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
ftP = instanceMatrix * ftP;
#endif
vFtWorld = (modelMatrix * ftP).xyz; }`), e.fragmentShader = e.fragmentShader.replace(`#include <common>`, `#include <common>\nvarying vec3 vFtWorld;\n${vd}\n${yd}`).replace(`#include <lights_fragment_end>`, `#include <lights_fragment_end>
        { vec3 ftN = normalize(cross(dFdx(vFtWorld), dFdy(vFtWorld)));
          if (dot(ftN, cameraPosition - vFtWorld) < 0.0) ftN = -ftN;
          float ftSh = sunShadow(vFtWorld, ftN);
          reflectedLight.directDiffuse *= ftSh; reflectedLight.directSpecular *= ftSh; }`).replace(`#include <dithering_fragment>`, `#include <dithering_fragment>
gl_FragColor.rgb = atmo(gl_FragColor.rgb, vFtWorld);`);
  }, e.customProgramCacheKey = () => `ft-std`, e.needsUpdate = !0;
}

function Nd() {
  return new ShaderMaterial({
    uniforms: _d(),
    depthWrite: !1,
    polygonOffset: !0,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
    vertexShader: `
      attribute vec4 aRoad;
      varying vec2 vUv; varying vec4 vRoad; varying vec3 vWorld;
      void main(){
        vUv = uv; vRoad = aRoad;
        vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      ${bd}
      varying vec2 vUv; varying vec4 vRoad; varying vec3 vWorld;
      float line(float x, float c, float hw, float fw){ return 1.0 - smoothstep(hw - fw, hw + fw, abs(x - c)); }
      void main(){
        float width = vRoad.x, lanes = vRoad.y, oneway = vRoad.z, ped = vRoad.w;
        float across = vUv.y * width * 0.5;      // 米，-w/2..w/2
        float along = vUv.x;
        float fw = fwidth(across) * 1.0 + 0.01;
        float lod = clamp(fwidth(along) * 0.6, 0.0, 1.0);
        vec3 col;
        if (ped > 0.5) {
          vec2 t = fract(vec2(along, across) / 0.6);
          float joint = (1.0 - lod) * (step(0.92, t.x) + step(0.92, t.y));
          col = vec3(0.70,0.67,0.61) * (0.92 + vnoise(vWorld.xz*0.6)*0.12) * (1.0 - joint*0.12);
          if (ped > 1.5) col = vec3(0.60,0.36,0.30) * (0.9 + vnoise(vWorld.xz*0.5)*0.15); // 自行车道
        } else {
          // 沥青：粗细两层噪声 + 车道中间磨亮的轮迹
          float nz = vnoise(vWorld.xz*0.9)*0.07 + vnoise(vWorld.xz*0.08)*0.10 + (hash21(floor(vWorld.xz*6.0)) - 0.5) * 0.05 * (1.0 - lod);
          col = vec3(0.285,0.295,0.315) * (0.88 + nz);
          float m = 0.0; vec3 mc = vec3(0.95);
          float hw = width * 0.5;
          // 路缘白线
          m = max(m, line(across, -hw + 0.6, 0.08, fw));
          m = max(m, line(across, hw - 0.6, 0.08, fw));
          float dash = step(0.5, fract(along / 9.0));
          if (lanes >= 2.0) {
            if (oneway < 0.5) {
              // 双向：中央黄色双实线 + 两侧车道虚线
              float y = max(line(across, -0.18, 0.07, fw), line(across, 0.18, 0.07, fw));
              col = mix(col, vec3(0.90,0.72,0.20), y * (1.0-lod));
              float per = max(1.0, floor(lanes/2.0));
              float lw = (hw - 0.6) / per;
              for (int i = 1; i < 4; i++) {
                if (float(i) >= per) break;
                m = max(m, dash * line(abs(across), float(i)*lw, 0.07, fw));
              }
            } else {
              float lw = (width - 1.2) / lanes;
              for (int i = 1; i < 6; i++) {
                if (float(i) >= lanes) break;
                m = max(m, dash * line(across, -hw + 0.6 + float(i)*lw, 0.07, fw));
                // 轮迹
              }
              float lanePos = fract((across + hw - 0.6) / lw);
              col *= 1.0 + 0.05 * (1.0 - lod) * (smoothstep(0.15, 0.3, lanePos) - smoothstep(0.7, 0.85, lanePos));
            }
          }
          col = mix(col, mc, m * (1.0 - lod) * 0.9);
        }
        vec3 n = vec3(0.0, 1.0, 0.0);
        gShadow = sunShadow(vWorld, n);
        float lum0 = dot(col, vec3(0.333));
        col = lightIt(col, n);
        if (uNight > 0.0) {
          // 路灯光斑：沿路每 32m 一团暖光
          float pool = exp(-pow((mod(along + 16.0, 32.0) - 16.0) / 10.0, 2.0));
          col += uNight * vec3(1.0, 0.72, 0.38) * (0.09 + 0.34 * pool) * (0.5 + lum0 * 1.6);
          if (ped < 0.5) {
            // 路面反光：朝相机方向拉长的霓虹倒影（青 / 品红 / 琥珀），掠射角越小越亮
            vec3 Vd = normalize(vWorld - cameraPosition);
            vec2 vd = normalize(Vd.xz + vec2(1e-5));
            float s = dot(vWorld.xz, vec2(-vd.y, vd.x)) * 0.10;
            float hc = hash11(floor(s) + 3.0);
            float streak = smoothstep(0.50, 1.0, vnoise(vec2(s, dot(vWorld.xz, vd) * 0.018))) * smoothstep(0.0, 0.25, fract(s)) * (1.0 - smoothstep(0.75, 1.0, fract(s)));
            vec3 neon = hc < 0.16 ? vec3(0.10, 0.80, 1.0) : (hc < 0.30 ? vec3(1.0, 0.25, 0.20) : vec3(1.0, 0.66, 0.24));
            float fres = pow(1.0 - max(-Vd.y, 0.0), 5.0);
            col += uNight * neon * streak * fres * 0.55;
          }
        }
        gl_FragColor = vec4(atmo(col, vWorld), 1.0);
      }`
  });
}

function Pd(e, t) {
  return new ShaderMaterial({
    uniforms: _d({
      uMap: {
        value: e
      },
      uRect: {
        value: new Vector4(t.x0, t.z0, t.x1 - t.x0, t.z1 - t.z0)
      }
    }),
    vertexShader: `
      varying vec3 vWorld; varying vec3 vN;
      void main(){
        vN = normal;
        vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      ${bd}
      uniform sampler2D uMap; uniform vec4 uRect;
      varying vec3 vWorld; varying vec3 vN;
      void main(){
        vec2 uv = (vWorld.xz - uRect.xy) / uRect.zw;
        vec3 c = texture2D(uMap, vec2(uv.x, 1.0 - uv.y)).rgb;
        bool outside = uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0;
        if (outside) {
          // 数据范围外：示意性的街区肌理（屋顶灰、道路、零星绿地）
          vec2 cell = floor(vWorld.xz / 70.0); vec2 f = fract(vWorld.xz / 70.0);
          float h = hash21(cell);
          vec3 blk = h < 0.3 ? vec3(0.30,0.46,0.22) : mix(vec3(0.60,0.59,0.56), vec3(0.72,0.70,0.66), hash21(cell + 3.0));
          float road = step(f.x, 0.12) + step(f.y, 0.12);
          c = mix(blk, vec3(0.36,0.37,0.39), min(road, 1.0));
          c = mix(c, vec3(0.50,0.54,0.48), smoothstep(1500.0, 5000.0, distance(vWorld.xz, cameraPosition.xz)));
        }
        vec3 n = normalize(vN);
        vec3 V = normalize(vWorld - cameraPosition);
        float dist = distance(vWorld, cameraPosition);
        float nearF = 1.0 - smoothstep(40.0, 400.0, dist);
        float green = outside ? 0.0 : smoothstep(0.05, 0.14, c.g - max(c.r, c.b));
        float water = smoothstep(0.04, 0.10, c.b - c.g) * step(c.r, c.g);
        float lum = dot(c, vec3(0.333));
        float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
        float paved = smoothstep(0.56, 0.62, lum) * (1.0 - smoothstep(0.07, 0.12, sat));
        // 草地：修剪条纹 + 多尺度斑驳 + 近处草叶颗粒
        if (green > 0.0) {
          float g1 = vnoise(vWorld.xz * 0.045), g2 = vnoise(vWorld.xz * 0.35 + 7.0), g3 = vnoise(vWorld.xz * 0.012 + 3.0);
          vec3 lush = vec3(0.22,0.39,0.14), mid = vec3(0.29,0.46,0.17), dry = vec3(0.40,0.50,0.22);
          vec3 gcol = mix(lush, mid, smoothstep(0.25, 0.75, g1));
          gcol = mix(gcol, dry, smoothstep(0.62, 0.9, g3) * 0.45);
          gcol *= 0.90 + 0.20 * g2;
          gcol *= 1.0 + nearF * ((hash21(floor(vWorld.xz * 9.0)) - 0.5) * 0.20 + (vnoise(vWorld.xz * 3.0) - 0.5) * 0.16);
          // 林地更深
          gcol *= mix(1.0, 0.78, smoothstep(0.52, 0.42, c.g));
          c = mix(c, gcol, green);
        }
        // 铺装：0.6m 方砖 + 4.8m 分仓缝 + 色差 + 污渍
        if (paved > 0.0) {
          vec2 q = vWorld.xz / 0.6;
          vec2 fw = fwidth(q);
          float lodp = clamp(max(fw.x, fw.y) * 1.5, 0.0, 1.0);
          vec2 f = fract(q);
          float joint = (1.0 - smoothstep(0.0, fw.x * 1.5 + 0.03, min(f.x, 1.0 - f.x))) + (1.0 - smoothstep(0.0, fw.y * 1.5 + 0.03, min(f.y, 1.0 - f.y)));
          float tileVar = (hash21(floor(q)) - 0.5) * 0.10;
          vec2 q2 = vWorld.xz / 4.8; vec2 f2 = fract(q2); vec2 fw2 = fwidth(q2);
          float band = (1.0 - smoothstep(0.0, fw2.x * 1.5 + 0.02, min(f2.x, 1.0 - f2.x))) + (1.0 - smoothstep(0.0, fw2.y * 1.5 + 0.02, min(f2.y, 1.0 - f2.y)));
          float lod2 = clamp(max(fw2.x, fw2.y) * 1.5, 0.0, 1.0);
          vec3 pc = c * (0.94 + 0.10 * vnoise(vWorld.xz * 0.03));
          pc *= 1.0 + (1.0 - lodp) * (tileVar - min(joint, 1.0) * 0.14);
          pc *= 1.0 - (1.0 - lod2) * min(band, 1.0) * 0.16;
          pc *= 1.0 - 0.08 * smoothstep(0.55, 1.0, vnoise(vWorld.xz * 0.07));
          c = mix(c, pc, paved);
        }
        gShadow = sunShadow(vWorld, n);
        vec3 col = lightIt(c, n);
        // 水面：反射天空 + 细波纹
        if (water > 0.0) {
          vec2 wv = vWorld.xz * 0.35;
          vec3 wn = normalize(vec3((vnoise(wv + 3.1) - 0.5) * 0.10 + (vnoise(wv * 3.7) - 0.5) * 0.05, 1.0, (vnoise(wv + 9.7) - 0.5) * 0.10 + (vnoise(wv * 3.3 + 5.0) - 0.5) * 0.05));
          vec3 R = reflect(V, wn);
          float fres = 0.06 + 0.94 * pow(1.0 - max(dot(-V, wn), 0.0), 4.0);
          vec3 deep = vec3(0.07, 0.24, 0.30) * (0.6 + 0.4 * gShadow);
          vec3 wcol = mix(deep, skyColor(R), clamp(fres + 0.12, 0.0, 1.0));
          wcol += gShadow * pow(max(dot(wn, normalize(uSunDir - V)), 0.0), 300.0) * 0.8;
          col = mix(col, wcol, water);
        }
        gl_FragColor = vec4(atmo(col, vWorld), 1.0);
      }`
  });
}

function Fd() {
  let e = new Uint8Array(262144),
    n = 1234567,
    r = () => (n = Math.imul(n, 1664525) + 1013904223 >>> 0, n >>> 24),
    i = new Uint8Array(65536);
  for (let e = 0; e < 65536; e++) i[e] = r();
  for (let t = 0; t < 256; t++) for (let n = 0; n < 256; n++) {
    let a = (t * 256 + n) * 4;
    e[a] = i[t * 256 + n], e[a + 1] = i[(t - 17 & 255) * 256 + (n - 37 & 255)], e[a + 2] = r(), e[a + 3] = 255;
  }
  let a = new DataTexture(e, 256, 256, RGBAFormat);
  return a.wrapS = a.wrapT = RepeatWrapping, a.minFilter = a.magFilter = LinearFilter, a.needsUpdate = !0, a;
}

function Id(e, r = 2048, i = 768) {
  let a = e.capabilities.maxTextureSize;
  r = Math.min(r, a);
  let o = new WebGLRenderTarget(r, i, {
      depthBuffer: !1,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: RepeatWrapping,
      wrapT: ClampToEdgeWrapping,
      generateMipmaps: !1
    }),
    c = Fd(),
    l = new ShaderMaterial({
      uniforms: {
        uNoise: {
          value: c
        },
        uSunDir: {
          value: fd
        },
        uHaze: {
          value: hd
        }
      },
      depthTest: !1,
      depthWrite: !1,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
      uniform sampler2D uNoise; uniform vec3 uSunDir; uniform vec3 uHaze;
      varying vec2 vUv;
      float n3(vec3 x){
        vec3 p = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
        vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
        vec2 rg = texture2D(uNoise, (uv + 0.5) / 256.0).yx;
        return mix(rg.x, rg.y, f.z);
      }
      float fbm4(vec3 p){ return n3(p)*0.5 + n3(p*2.03+7.1)*0.25 + n3(p*4.11+3.3)*0.125 + n3(p*8.3+1.7)*0.0625; }
      const float CB = 1500.0, CT = 3100.0;
      // 覆盖度：大尺度成团，留出大片蓝天
      float coverage(vec2 xz){
        float a = n3(vec3(xz / 4200.0, 0.3));
        float b = n3(vec3(xz / 1600.0 + 11.0, 4.7));
        return a * 0.62 + b * 0.38;
      }
      float density(vec3 p, float cov, bool fine){
        float hgt = (p.y - CB) / (CT - CB);
        float c = smoothstep(0.54, 0.76, cov);
        if (c <= 0.0) return 0.0;
        float top = 0.28 + 0.72 * c;                 // 覆盖度高的地方云更高（云塔）
        float prof = smoothstep(0.0, 0.07, hgt) * (1.0 - smoothstep(top * 0.45, top, hgt));
        float shape = fbm4(p / 900.0 + vec3(0.0, 0.0, 2.0));
        float d = shape * (0.55 + 0.75 * c) + c * 0.38 - 0.60 - (1.0 - prof) * 0.55;
        if (fine && d > -0.1) d -= (1.0 - n3(p / 130.0)) * 0.10 + (1.0 - n3(p / 61.0)) * 0.05;
        return clamp(d * 3.2, 0.0, 1.0);
      }
      vec3 skyGrad(vec3 d){
        float y = max(d.y, 0.0);
        vec3 zen = vec3(0.085, 0.27, 0.70), mid = vec3(0.20, 0.47, 0.90), hor = vec3(0.60, 0.79, 0.97);
        vec3 c = mix(mid, zen, smoothstep(0.0, 0.75, y));
        c = mix(c, hor, pow(1.0 - y, 7.0));
        float s = max(dot(d, uSunDir), 0.0);
        c += vec3(1.0, 0.92, 0.75) * (pow(s, 6.0) * 0.08 + pow(s, 60.0) * 0.12 + pow(s, 1800.0) * 0.5);
        return c;
      }
      void main(){
        float y = vUv.y * vUv.y * 1.05 - 0.05;
        float az = (vUv.x - 0.5) * 6.28318530718;
        float ch = sqrt(max(1.0 - y * y, 0.0));
        vec3 d = vec3(cos(az) * ch, y, sin(az) * ch);
        vec3 col = skyGrad(d);
        float T = 1.0; vec3 acc = vec3(0.0);
        if (d.y > 0.012) {
          float t0 = CB / d.y, t1 = min(CT / d.y, 60000.0);
          if (t0 < 60000.0) {
            const int N = 56;
            float dt = (t1 - t0) / float(N);
            float jit = texture2D(uNoise, gl_FragCoord.xy / 256.0).b;
            float t = t0 + dt * jit;
            float mu = dot(d, uSunDir);
            float phase = 0.75 + 0.6 * pow(max(mu, 0.0), 6.0);
            for (int i = 0; i < N; i++) {
              vec3 p = d * t;
              float cov = coverage(p.xz);
              float den = density(p, cov, true);
              if (den > 0.002) {
                // 朝太阳方向取 4 个样本估算自遮挡
                float od = 0.0;
                for (int j = 1; j <= 4; j++) {
                  vec3 q = p + uSunDir * (float(j) * 150.0);
                  od += density(q, coverage(q.xz), false) * 150.0;
                }
                float hgt = clamp((p.y - CB) / (CT - CB), 0.0, 1.0);
                float sunT = exp(-od * 0.0075) * 0.80 + exp(-od * 0.0016) * 0.26;
                vec3 amb = mix(vec3(0.66, 0.72, 0.84), vec3(0.84, 0.91, 1.0), smoothstep(0.0, 0.5, hgt));
                vec3 L = vec3(1.0, 0.97, 0.92) * sunT * phase * 0.80 + amb * 0.66;
                float a = 1.0 - exp(-den * dt * 0.011);
                acc += T * a * L;
                T *= 1.0 - a;
                if (T < 0.02) break;
              }
              t += dt;
            }
            // 远处的云融进地平线
            float far = 1.0 - exp(-t0 / 26000.0);
            vec3 cl = mix(acc, (1.0 - T) * mix(uHaze, vec3(0.80, 0.88, 0.97), 0.5), far * 0.85);
            col = col * T + cl;
            T = mix(T, 1.0, far * 0.3);
          }
        }
        // 地平线：一圈淡蓝色远山 + 以下的地面霭色
        float hill = 0.012 + 0.016 * n3(vec3(az * 6.0, 1.3, 0.7)) + 0.012 * n3(vec3(az * 19.0, 4.1, 2.2));
        float hm = 1.0 - smoothstep(hill - 0.004, hill + 0.002, d.y);
        col = mix(col, mix(vec3(0.42, 0.58, 0.72), uHaze, 0.45), hm);
        col = mix(col, uHaze * vec3(0.93, 0.97, 0.97), 1.0 - smoothstep(-0.03, 0.0, d.y));
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), T);
      }`
    }),
    u = new Mesh(new PlaneGeometry(2, 2), l);
  u.frustumCulled = !1;
  let d = new Scene();
  d.add(u);
  let f = new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    p = e.getRenderTarget();
  return e.setRenderTarget(o), e.render(d, f), e.setRenderTarget(p), l.dispose(), u.geometry.dispose(), c.dispose(), gd.uSkyMap.value = o.texture, o.texture;
}

function Ld() {
  let e = new Mesh(new SphereGeometry(3e4, 48, 24), new ShaderMaterial({
    side: 1,
    depthWrite: !1,
    uniforms: _d(),
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      ${bd}
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        vec4 s = skyTex(d);
        vec3 c = s.rgb;
        float sd = max(dot(d, uSunDir), 0.0);
        // 白天是太阳，夜里同一位置是月亮；夜里再加星星（被云和光污染压掉一部分）
        c += mix(vec3(1.0, 0.96, 0.85), vec3(0.85, 0.90, 1.0) * 0.9, uNight) * smoothstep(mix(0.99985, 0.99975, uNight), 0.99995, sd) * s.a;
        vec3 q = floor(d * 520.0);
        float st = step(0.9990, hash21(q.xy + q.z * 17.0)) * smoothstep(0.10, 0.5, d.y) * s.a;
        c += uNight * st * vec3(0.8, 0.85, 1.0) * (0.35 + 0.5 * hash21(q.xy + 3.0));
        gl_FragColor = vec4(c, 1.0);
      }`
  }));
  return e.frustumCulled = !1, e.renderOrder = -10, e;
}

function Rd() {
  return new ShaderMaterial({
    uniforms: _d(),
    vertexShader: `
      attribute vec4 aInfo;
      varying vec2 vUv;
      varying vec4 vInfo;
      varying vec3 vN;
      varying vec3 vWorld;
      void main(){
        vUv = uv; vInfo = aInfo; vN = normal;
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      ${bd}
      varying vec2 vUv;
      varying vec4 vInfo;
      varying vec3 vN;
      varying vec3 vWorld;

      // 抗锯齿矩形窗遮罩：cell 尺寸、窗占比、偏移(0..1)
      float box2(vec2 f, vec2 lo, vec2 hi, vec2 fw){
        vec2 m = smoothstep(lo - fw, lo + fw, f) * (1.0 - smoothstep(hi - fw, hi + fw, f));
        return m.x * m.y;
      }
      float grid(vec2 p, vec2 cell, vec2 win, out vec2 id){
        vec2 q = p / cell; id = floor(q); vec2 f = fract(q);
        vec2 fw = fwidth(q) * 1.2 + 1e-4;
        vec2 lo = (1.0 - win) * 0.5;
        return box2(f, lo, 1.0 - lo, fw);
      }
      // 细线：周期 per，线宽 w（米）
      float lines(float x, float per, float w){
        float f = fract(x / per) * per;
        float fw = fwidth(x) * 1.0 + 1e-4;
        return 1.0 - smoothstep(w - fw, w + fw, min(f, per - f) * 2.0);
      }
      vec3 glassTint(float t){
        if (t < 0.26) return vec3(0.10,0.26,0.48);   // 蓝
        if (t < 0.44) return vec3(0.10,0.32,0.40);   // 青绿
        if (t < 0.58) return vec3(0.26,0.34,0.44);   // 银蓝
        if (t < 0.66) return vec3(0.27,0.24,0.20);   // 茶色
        if (t < 0.78) return vec3(0.08,0.13,0.20);   // 深蓝灰
        return vec3(0.20,0.40,0.52);                 // 浅蓝绿
      }
      float gLodF = 1.0;
      // 玻璃：每块玻璃略微不平（反射在分格处错开），反射烘焙天空里的蓝天白云和假的对面楼群
      vec3 glassShade(vec3 tint, vec3 n, vec3 V, vec2 id, float seed, float strength){
        vec2 j = (vec2(hash21(id + seed*17.0), hash21(id*1.7 + seed*5.0)) - 0.5) * 0.05 * gLodF;
        vec3 t1 = normalize(vec3(-n.z, 0.0, n.x) + vec3(1e-4, 0.0, 0.0));
        vec3 np = normalize(n + t1 * j.x + vec3(0.0, j.y, 0.0));
        vec3 R = reflect(V, np);
        vec3 refl = envRefl(R, vWorld.y);
        float fres = pow(1.0 - max(dot(-V, n), 0.0), 4.0);
        float var = (hash21(id + seed*17.0) - 0.5) * 0.07 * gLodF;
        // 内部：部分窗拉了浅色窗帘（远处淡化，防止噪点）
        float blind = step(0.82, hash21(id*1.31 + seed*3.0)) * 0.10 * gLodF;
        float ndl = max(dot(n, uSunDir), 0.0) * gShadow;
        vec3 g = (tint + var + blind) * (0.62 + 0.75 * ndl);
        // 夜景：窗内灯光（远处淡化成平均亮度，防止闪烁）
        vec3 wl = uNight * mix(vec3(0.18, 0.11, 0.045), winLight(id, seed), gLodF) * 1.1;
        // 玻璃染色也会染反射
        vec3 rc = refl * mix(vec3(1.0), tint * 1.6 + 0.35, 0.45);
        return mix(g, rc, clamp((0.42 + fres * 0.55) * strength, 0.0, 1.0) * (1.0 - 0.6 * uNight)) + wl;
      }

      void main(){
        int kind = int(vInfo.x + 0.5);
        float seed = vInfo.y;
        float H = vInfo.z;
        vec3 n = normalize(vN);
        vec3 V = normalize(vWorld - cameraPosition);
        vec3 col;
        float spec = 0.0;
        bool isRoof = n.y > 0.5;
        vec2 p = vUv;
        float lod = clamp(length(fwidth(p)) * 0.7, 0.0, 1.0); // 远处淡化细节
        float lodF = 1.0 - lod;
        gLodF = clamp(1.0 - lod * 2.5, 0.0, 1.0);
        float h1 = hash11(seed*13.0), h2 = hash11(seed*29.0), h3 = hash11(seed*47.0);
        gShadow = sunShadow(vWorld, n);

        if (isRoof) {
          vec3 rc = mix(vec3(0.50,0.50,0.49), vec3(0.62,0.60,0.57), seed);
          if (kind == 2) {
            // 城中村屋面：水泥、隔热砖、杂物
            rc = mix(vec3(0.56,0.52,0.47), vec3(0.45,0.44,0.43), h1);
            if (h2 > 0.7) rc = vec3(0.62,0.40,0.32);  // 红色隔热砖
            vec2 t = fract(vWorld.xz / 0.5);
            rc *= 1.0 - 0.08 * lodF * (step(0.9, t.x) + step(0.9, t.y));
          }
          if (kind == 0) rc = mix(vec3(0.34,0.37,0.40), vec3(0.52,0.53,0.54), h2);
          if (kind == 5) rc = vec3(0.46,0.47,0.48);
          if (kind == 1) rc = mix(vec3(0.55,0.55,0.53), vec3(0.42,0.47,0.44), step(0.75, h3)); // 少数屋顶绿化
          float nz = vnoise(vWorld.xz*0.35)*0.12 + vnoise(vWorld.xz*0.05)*0.1;
          float box = step(0.86, hash21(floor(vWorld.xz/3.5)+seed*13.0));
          col = rc * (0.92 + nz) * (1.0 - box*0.16*lodF);
          col = lightIt(col, n);
        } else {
          vec3 wall, glass; vec2 id; float w;
          bool parapet = p.y > H + 0.05;
          if (kind == 0) {
            // ---------- 写字楼：5 种幕墙 ----------
            int style = int(h1 * 5.0);
            float floorH = 3.9 + floor(h2 * 3.0) * 0.2;
            glass = glassTint(hash11(seed*37.0));
            wall = mix(vec3(0.66,0.68,0.70), vec3(0.84,0.83,0.80), h3);
            float fl = fract(p.y / floorH);
            vec2 cid = vec2(floor(p.x / 1.5), floor(p.y / floorH));
            vec3 g = glassShade(glass, n, V, cid, seed, 1.0);
            vec3 frame = lightIt(wall, n);
            float spandrel = smoothstep(0.80, 0.82, fl);
            if (style == 0) {
              // 单元式玻璃幕墙：细竖梃 + 层间深色窗槛
              float mull = lines(p.x, 1.5, 0.10) * lodF;
              col = mix(g, g * 0.65 + glass * 0.2, spandrel * lodF);
              col = mix(col, frame * 0.85, mull * 0.8);
              col = mix(col, frame * 0.7, lines(p.y, floorH, 0.12) * lodF * 0.6);
              spec = 1.0;
            } else if (style == 1) {
              // 竖向石材/铝板线条（福田大量 2000 年代塔楼）
              float per = 3.0 + floor(h3 * 2.0);
              float pier = 1.0 - smoothstep(0.0, fwidth(p.x)*1.5 + 0.02, abs(fract(p.x / per) - 0.5) * per - (per*0.5 - 0.35 - h2*0.4));
              pier = clamp(pier, 0.0, 1.0);
              col = mix(g, g * 0.7, spandrel * 0.6 * lodF);
              col = mix(col, frame, mix(pier, 0.35, lod));
              spec = 0.7;
            } else if (style == 2) {
              // 横向带窗：铝板窗槛 + 通长玻璃
              float band = smoothstep(0.62, 0.64, fl) ;
              col = mix(g, frame * 0.95, mix(band, 0.35, lod));
              col = mix(col, frame * 0.8, lines(p.x, 1.8, 0.07) * lodF * (1.0 - band));
              spec = 0.6;
            } else if (style == 3) {
              // 花岗岩方窗（九十年代深南大道老写字楼）
              wall = mix(vec3(0.72,0.64,0.58), vec3(0.62,0.62,0.62), h3);
              w = grid(p, vec2(3.0, floorH), vec2(0.58, 0.55), id);
              vec3 base = lightIt(wall * (0.95 + vnoise(p*0.7)*0.08), n);
              col = mix(base, glassShade(glass, n, V, id, seed, 0.8), mix(w, 0.35, lod));
              spec = 0.3;
            } else {
              // 双层幕墙：密竖梃 + 隔层深色横带
              float mull = lines(p.x, 1.2, 0.07) * lodF;
              float b2 = step(0.5, fract(p.y / (floorH * 2.0)));
              col = mix(g, g * (0.85 + 0.1 * b2), 0.5);
              col = mix(col, frame * 0.9, mull * 0.7);
              col = mix(col, frame * 0.6, lines(p.y, floorH, 0.2) * lodF * 0.7);
              spec = 1.0;
            }
            // 避难层/设备层：每 15 层一道百叶带
            if (H > 90.0) {
              float rf = floorH * 15.0;
              float ry = p.y - floor(p.y / rf) * rf;
              if (p.y > rf * 0.9 && ry < floorH) {
                float louv = 0.88 + 0.12 * lines(p.y, 0.35, 0.12) * lodF;
                col = mix(col, lightIt(mix(wall, vec3(0.70,0.72,0.74), 0.5), n) * louv, 0.75);
              }
            }
            // 大堂：底部两层通高玻璃 + 雨棚
            if (p.y < 8.0) {
              vec3 lob = glassShade(vec3(0.20,0.24,0.26), n, V, vec2(floor(p.x/3.0), 0.0), seed, 0.5) + 0.04;
              lob = mix(lob, frame * 0.8, lines(p.x, 3.0, 0.18) * lodF);
              col = mix(col, lob, 0.85);
              if (p.y > 7.2) col = lightIt(wall * 0.85, n);
            }
            if (parapet) col = mix(col, frame * 0.92, 0.25);
          } else if (kind == 1) {
            // ---------- 住宅：3 种 ----------
            int style = int(h1 * 3.0);
            float t = hash11(seed*11.0);
            wall = t < 0.25 ? vec3(0.88,0.86,0.80) : (t < 0.45 ? vec3(0.84,0.78,0.70) : (t < 0.6 ? vec3(0.78,0.70,0.64) : (t < 0.8 ? vec3(0.76,0.78,0.80) : vec3(0.86,0.82,0.74))));
            vec3 accent = h2 < 0.4 ? vec3(0.62,0.48,0.40) : (h2 < 0.7 ? vec3(0.55,0.57,0.60) : vec3(0.72,0.62,0.48));
            glass = vec3(0.20,0.25,0.30);
            float floorH = 2.95;
            float fl = fract(p.y / floorH);
            vec3 base = lightIt(wall, n);
            if (style == 0) {
              w = grid(p, vec2(3.3, floorH), vec2(0.55, 0.55), id);
              col = mix(base, glassShade(glass, n, V, id, seed, 0.4), mix(w, 0.35, lod));
              // 阳台：白色栏板横带 + 每两开间一个
              float bal = (1.0 - smoothstep(0.20, 0.23, fl)) * step(0.5, fract(p.x / 6.6 + seed));
              col = mix(col, base * 1.05, bal * lodF);
              col = mix(col, base * 0.55, (smoothstep(0.20,0.23,fl) - smoothstep(0.26,0.29,fl)) * step(0.5, fract(p.x / 6.6 + seed)) * lodF);
            } else if (style == 1) {
              // 飘窗 + 竖向色带
              w = grid(p, vec2(2.8, floorH), vec2(0.72, 0.62), id);
              col = mix(base, glassShade(glass, n, V, id, seed, 0.5), mix(w, 0.45, lod));
              float acc = step(0.86, fract(p.x / 11.2 + seed));
              col = mix(col, lightIt(accent, n), acc);
              // 空调百叶
              float ac = step(0.5, fract(p.x/5.6 + seed*2.0)) * (1.0 - step(0.18, fl)) * lodF;
              col = mix(col, base * (0.75 + 0.25 * lines(p.y, 0.15, 0.06)), ac * 0.7);
            } else {
              // 玻璃栏板阳台（新住宅）
              w = grid(p, vec2(3.9, floorH), vec2(0.82, 0.70), id);
              col = mix(base, glassShade(glass + 0.05, n, V, id, seed, 0.7), mix(w, 0.5, lod));
              float slab = 1.0 - smoothstep(0.08, 0.11, fl);
              col = mix(col, lightIt(vec3(0.9), n), slab * lodF);
            }
            col *= 1.0 - 0.06 * smoothstep(0.55, 1.0, vnoise(vec2(p.x*0.6, p.y*0.05))); // 雨渍
            // 底商
            if (p.y < 5.0) {
              vec3 shop = glassShade(vec3(0.18,0.20,0.22), n, V, vec2(floor(p.x/4.0),0.0), seed, 0.4) + 0.05;
              col = mix(col, shop, 0.8);
              if (p.y > 4.0) col = lightIt(accent * 0.9, n);
            }
            // 屋顶构架
            if (p.y > H - 4.0 && !parapet) col = mix(col, lightIt(accent, n), 0.35);
            if (parapet) col = lightIt(accent * 1.05, n);
            spec = 0.2;
          } else if (kind == 2) {
            // ---------- 城中村握手楼 ----------
            float t = hash11(seed*23.0);
            wall = t < 0.18 ? vec3(0.90,0.89,0.84) : (t < 0.32 ? vec3(0.82,0.70,0.58) : (t < 0.46 ? vec3(0.74,0.74,0.71) :
                   (t < 0.58 ? vec3(0.86,0.72,0.70) : (t < 0.70 ? vec3(0.70,0.78,0.78) : (t < 0.80 ? vec3(0.88,0.82,0.62) : (t < 0.9 ? vec3(0.66,0.60,0.56) : vec3(0.80,0.84,0.88)))))));
            // 不同楼层翻新的杂色瓷砖
            float patchSel = step(0.72, hash21(vec2(floor(p.y/9.0), seed*5.0)));
            wall = mix(wall, wall.zxy * 0.95, patchSel * 0.6);
            // 马赛克小瓷砖
            vec2 tf = fract(p / vec2(0.12, 0.12));
            float joint = step(0.86, max(tf.x, tf.y)) * (1.0 - clamp(lod*3.0, 0.0, 1.0));
            wall *= (0.92 + vnoise(p*vec2(0.5,0.8))*0.14) * (1.0 - joint*0.08);
            glass = vec3(0.14,0.16,0.18);
            float floorH = 2.9 + h2 * 0.3;
            vec2 q = p + vec2(seed*7.0, 0.0);
            vec2 cell = vec2(2.2 + h3 * 0.8, floorH);
            w = grid(q, cell, vec2(0.52, 0.50), id);
            float has = step(0.12, hash21(id + seed*31.0));
            w *= has;
            vec2 cf = fract(q / cell);
            vec3 base = lightIt(wall, n);
            // 窗内：深色 + 偶尔亮
            vec3 win = glass + step(0.85, hash21(id*2.3+seed)) * vec3(0.10,0.09,0.06) + uNight * winLight(id, seed + 2.0) * 0.9;
            col = mix(base, win, mix(w, 0.3, lod));
            // 防盗网：不锈钢方格框，比窗略大
            float cage = box2(cf, vec2(0.2, 0.18), vec2(0.8, 0.80), fwidth(q/cell)*1.2+1e-4) * has * step(0.3, hash21(id*0.7 + seed*3.3));
            float bars = max(lines(q.x, 0.13, 0.025), lines(q.y, 0.45, 0.04));
            float cageEdge = cage * (1.0 - box2(cf, vec2(0.23,0.21), vec2(0.77,0.77), fwidth(q/cell)*1.2+1e-4));
            col = mix(col, lightIt(vec3(0.72,0.73,0.74), n), clamp(cage * bars * 0.85 + cageEdge, 0.0, 1.0) * lodF);
            // 晾衣：防盗网下沿挂的彩色衣物
            float hang = step(0.62, hash21(id*3.7 + seed*1.3)) * cage;
            float cloth = step(0.22, cf.y) * (1.0 - step(0.42, cf.y)) * step(0.5, fract(q.x * 2.3 + hash21(id)*3.0));
            vec3 cc = vec3(hash21(id+1.0), hash21(id+2.0), hash21(id+3.0)) * 0.7 + 0.25;
            col = mix(col, lightIt(cc, n), hang * cloth * lodF);
            // 空调外机（窗旁小白块）
            float ac = step(0.55, hash21(id*1.7 + seed)) * box2(cf, vec2(0.80, 0.08), vec2(0.98, 0.30), fwidth(q/cell)*1.2+1e-4);
            col = mix(col, lightIt(vec3(0.86,0.86,0.84), n) * (0.85 + 0.15*lines(q.y, 0.05, 0.02)), ac * lodF);
            // 外露管线
            col = mix(col, base * 0.6, lines(q.x + 1.1, cell.x * 3.0, 0.08) * lodF * step(0.5, h1));
            // 雨水污渍 / 黑色水痕
            col *= 1.0 - 0.18 * smoothstep(0.55, 1.0, vnoise(vec2(p.x*0.9, p.y*0.06 + seed*10.0)));
            // 底层：卷帘门 + 招牌
            if (p.y < 3.6) {
              float shutter = step(0.35, hash21(vec2(floor(p.x/3.2), seed)));
              vec3 sh = shutter > 0.5 ? vec3(0.55,0.57,0.58) * (0.85 + 0.15 * lines(p.y, 0.12, 0.05)) : vec3(0.12,0.11,0.10) + vec3(0.25,0.20,0.12) * step(0.6, hash21(vec2(floor(p.x), 3.0)));
              col = lightIt(sh, n);
            } else if (p.y < 4.6) {
              float si = hash21(vec2(floor(p.x / 4.5), seed * 9.0));
              vec3 sc = si < 0.3 ? vec3(0.78,0.12,0.10) : (si < 0.5 ? vec3(0.95,0.78,0.15) : (si < 0.7 ? vec3(0.12,0.35,0.70) : (si < 0.85 ? vec3(0.10,0.55,0.30) : vec3(0.92,0.92,0.90))));
              float txt = step(0.55, hash21(floor(p * vec2(1.6, 2.5)) + seed)) * box2(fract(vec2(p.x/4.5, (p.y-3.6))), vec2(0.1, 0.2), vec2(0.9, 0.8), vec2(0.02));
              col = lightIt(mix(sc, vec3(1.0) - sc * 0.6, txt * lodF), n);
            }
            if (parapet) col = base * 0.92;
            spec = 0.05;
          } else if (kind == 4) {
            wall = mix(vec3(0.88,0.86,0.80), vec3(0.85,0.80,0.72), seed);
            glass = vec3(0.25,0.30,0.34);
            float floorH = 3.6;
            w = grid(p, vec2(3.6, floorH), vec2(0.70, 0.45), id);
            vec3 base = lightIt(wall, n);
            col = mix(base, glassShade(glass, n, V, id, seed, 0.4), mix(w, 0.35, lod));
            float stripe = step(0.9, fract(p.y/floorH)) * step(0.5, h3);
            col = mix(col, lightIt(vec3(0.72,0.36,0.25), n), stripe*lodF);
            spec = 0.1;
          } else if (kind == 5) {
            // 屋顶机房：百叶 + 金属板
            wall = mix(vec3(0.62,0.63,0.64), vec3(0.74,0.74,0.72), h2);
            col = lightIt(wall * (0.82 + 0.18 * lines(p.y, 0.3, 0.12)), n);
            col = mix(col, col * 0.8, lines(p.x, 2.4, 0.08) * lodF);
            spec = 0.3;
          } else if (kind == 6) {
            // 塔冠：铝合金竖向格栅，透出背后天空
            float fin = lines(p.x, 1.2, 0.35);
            vec3 sky = skyColor(normalize(vec3(V.x, 0.25, V.z)));
            col = mix(sky * 0.85, lightIt(vec3(0.80,0.82,0.84), n), mix(fin, 0.6, lod));
            col = mix(col, lightIt(vec3(0.70), n), lines(p.y, 3.0, 0.25) * lodF);
            spec = 0.8;
          } else {
            // ---------- 商业 / 裙楼：3 种 ----------
            int style = int(h1 * 3.0);
            float t = hash11(seed*13.0);
            wall = t < 0.35 ? vec3(0.74,0.71,0.66) : (t < 0.6 ? vec3(0.60,0.61,0.62) : (t < 0.8 ? vec3(0.80,0.76,0.68) : vec3(0.52,0.50,0.48)));
            glass = glassTint(hash11(seed*5.0));
            float floorH = 4.5;
            float fl = fract(p.y / floorH);
            vec3 base = lightIt(wall, n);
            if (style == 0) {
              float band = smoothstep(0.30, 0.33, fl) * (1.0 - smoothstep(0.86, 0.89, fl));
              float mull = 1.0 - 0.6 * lines(p.x, 2.0, 0.12) * lodF;
              col = mix(base, glassShade(glass, n, V, vec2(floor(p.x/2.0), floor(p.y/floorH)), seed, 0.8), mix(band * mull, 0.45, lod));
            } else if (style == 1) {
              // 整片玻璃盒子
              col = glassShade(glass, n, V, vec2(floor(p.x/1.8), floor(p.y/floorH)), seed, 1.0);
              col = mix(col, base, max(lines(p.x, 1.8, 0.08), lines(p.y, floorH, 0.25)) * lodF * 0.8);
              spec = 0.6;
            } else {
              // 金属板 + 竖条窗
              col = base * (0.95 + 0.05 * lines(p.y, 1.2, 0.04));
              w = grid(p, vec2(2.4, floorH), vec2(0.28, 0.75), id);
              col = mix(col, glassShade(glass, n, V, id, seed, 0.6), mix(w, 0.2, lod));
            }
            // 商铺橱窗 + 招牌带
            if (p.y < 5.0) {
              col = glassShade(vec3(0.20,0.22,0.24), n, V, vec2(floor(p.x/5.0), 0.0), seed, 0.4) + vec3(0.10,0.08,0.05) * step(0.5, hash21(vec2(floor(p.x/5.0), seed)));
              col = mix(col, base * 0.7, lines(p.x, 5.0, 0.3) * lodF);
            } else if (p.y < 6.4 && h3 > 0.35) {
              float si = hash21(vec2(floor(p.x / 9.0), seed * 9.0));
              vec3 sc = si < 0.3 ? vec3(0.80,0.15,0.12) : (si < 0.55 ? vec3(0.20,0.22,0.25) : (si < 0.8 ? vec3(0.10,0.30,0.62) : vec3(0.95,0.95,0.92)));
              col = lightIt(sc, n);
            }
            if (parapet) col = base * 0.95;
            spec = max(spec, 0.35);
          }
          // 底部 AO
          col *= 0.74 + 0.26 * smoothstep(0.0, 5.0, p.y);
          // 夜景：路灯把底下几层照暖；非写字楼的底商亮着灯
          col += uNight * vec3(0.28, 0.18, 0.08) * exp(-max(p.y, 0.0) / 10.0) * 0.8;
          if (kind != 0 && p.y < 4.2 && p.y > 0.4) col += uNight * step(0.35, hash21(vec2(floor(p.x / 4.0), seed * 7.0))) * vec3(0.55, 0.42, 0.24) * lodF;
          // 太阳高光
          vec3 Hh = normalize(uSunDir - V);
          col += spec * gShadow * pow(max(dot(n, Hh), 0.0), 60.0) * 0.45;
        }
        gl_FragColor = vec4(atmo(col, vWorld), 1.0);
      }`
  });
}

var zd = 400;

function Bd(e) {
  let t = [];
  for (let n = 0; n < e.length; n += 2) t.push(new Vector2(e[n], e[n + 1]));
  return t;
}

function Vd(e) {
  let t = Math.sin(e * 127.1 + 311.7) * 43758.5453;
  return t - Math.floor(t);
}

function Hd(e, t, n, r) {
  return e.map(e => new Vector2(t + (e.x - t) * r, n + (e.y - n) * r));
}

function Ud(e, t) {
  return e.every(e => tf(e.x, e.y, t));
}

function Wd(e, t = new Set(), n = {}) {
  let r = new Map(),
    i = [],
    a = {
      village: [],
      roofs: []
    },
    o = -1;
  for (let s of e.buildings) {
    if (o++, t && t.has(o) || n.only && !n.only.has(o)) continue;
    let [e, c, l, u, d, f] = s,
      p = Bd(d[0]);
    if (p.length < 3) continue;
    let m = d.slice(1).map(Bd).filter(e => e.length >= 3),
      h = 1 / 0,
      g = 0,
      _ = 0,
      v = 1 / 0,
      y = -1 / 0,
      b = 1 / 0,
      x = -1 / 0;
    for (let e of p) h = Math.min(h, $(e.x, e.y)), g += e.x, _ += e.y, v = Math.min(v, e.x), y = Math.max(y, e.x), b = Math.min(b, e.y), x = Math.max(x, e.y);
    g /= p.length, _ /= p.length;
    let S = Math.abs(ShapeUtils.area(p)),
      C = h + l - (l > 0 ? 0 : 1.5),
      w = [],
      T = [],
      E = [],
      D = [],
      O = [],
      k = (e, t, n, r, i, a, o) => {
        let s = 0,
          c = e.length;
        for (let l = 0; l < c; l++) {
          let d = e[l],
            f = e[(l + 1) % c],
            p = f.x - d.x,
            m = f.y - d.y,
            g = Math.hypot(p, m);
          if (g < 0.01) continue;
          let _ = m / g,
            v = -p / g;
          t && (_ = -_, v = -v), o && (_ = -_, v = -v);
          let y = w.length / 3;
          w.push(d.x, n, d.y, f.x, n, f.y, f.x, r, f.y, d.x, r, d.y);
          for (let e = 0; e < 4; e++) T.push(_, 0, v), D.push(i, u, a, 0);
          let b = n - h,
            x = r - h;
          E.push(s, b, s + g, b, s + g, x, s, x), !t == !!o ? O.push(y, y + 1, y + 2, y, y + 2, y + 3) : O.push(y, y + 2, y + 1, y, y + 3, y + 2), s += g;
        }
      },
      A = (e, t, n, r, i) => {
        try {
          let a = ShapeUtils.triangulateShape(e, t),
            o = e.concat(...t),
            s = w.length / 3;
          for (let e of o) w.push(e.x, n, e.y), T.push(0, 1, 0), E.push(e.x, e.y), D.push(r, u, i, 1);
          for (let e of a) O.push(s + e[0], s + e[2], s + e[1]);
        } catch {}
      },
      j = (e, t, n, r, i, a) => {
        let o = ShapeUtils.area(e) < 0,
          s = h + r;
        k(e, o, n, s + a, i, r, !1);
        for (let e of t) k(e, ShapeUtils.area(e) > 0, n, s + a, i, r, !1);
        a > 0.3 && k(e, o, s, s + a, i, r, !0), A(e, t, s, i, r);
      },
      M = Vd(u * 91.7),
      ee = Vd(u * 53.3),
      N = Vd(u * 17.9),
      P = [],
      F = c,
      te = p;
    if (e === 0 && c >= 60 && l === 0 && S > 700 && !m.length) {
      let e = p,
        t = 0;
      if (M < 0.7 && S > 1100) {
        let n = 0.74 + ee * 0.12,
          r = Hd(p, g, _, n);
        Ud(r, p) && (t = 14 + Math.floor(N * 4) * 4.5, j(p, [], C, t, 3, 1.2), P.push([p, C, h + t]), e = r);
      }
      let n = Math.floor(N * 4),
        r = t > 0 ? h + t - 0.5 : C;
      if (n === 0 && c > 100) {
        let t = c * (0.86 + M * 0.06),
          n = Hd(e, g, _, 0.86);
        j(e, [], r, t, 0, 1), j(n, [], h + t - 0.3, c, 0, 2.5), P.push([e, r, h + t], [n, h + t, h + c]), te = n;
      } else if (n === 1) {
        j(e, [], r, c, 0, 0.8);
        let t = 6 + ee * 8;
        k(e, ShapeUtils.area(e) < 0, h + c, h + c + t, 6, c + t + 1, !1), k(e, ShapeUtils.area(e) < 0, h + c, h + c + t, 6, c + t + 1, !0), P.push([e, r, h + c]), te = e;
      } else j(e, [], r, c, 0, n === 3 ? 3.5 : 1.4), P.push([e, r, h + c]), te = e;
      F = c, (n === 2 || n === 0) && j(Hd(te, g, _, 0.42 + ee * 0.15), [], h + F - 0.2, F + 4 + M * 4, 5, 0);
    } else if (e === 1 && c >= 30 && !m.length) j(p, m, C, c, 1, 1.2), P.push([p, C, h + c]), j(Hd(p, g, _, 0.3 + ee * 0.12), [], h + c - 0.2, c + 3.5, 5, 0);else if (e === 2) {
      if (j(p, m, C, c, 2, 1.1), P.push([p, C, h + c]), a.village.push({
        ring: p,
        base: h,
        h: c,
        seed: u,
        cx: g,
        cz: _,
        area: S
      }), S > 60 && M < 0.75) {
        let e = p[Math.floor(ee * p.length)],
          t = Hd(p, g + (e.x - g) * 0.5, _ + (e.y - _) * 0.5, 0.32);
        Ud(t, p) && j(t, [], h + c - 0.2, c + 2.8, 2, 0.4);
      }
    } else if (j(p, m, C, c, e, e === 3 && c > 15 ? 1.4 : 1), P.push([p, C, h + c]), e === 3 && S > 1500 && M < 0.6) {
      let e = Hd(p, g, _, 0.35);
      Ud(e, p) && j(e, [], h + c - 0.2, c + 4, 5, 0);
    }
    e !== 2 && c > 12 && a.roofs.push({
      ring: te,
      base: h,
      h: F,
      seed: u,
      cx: g,
      cz: _,
      kind: e
    });
    let I = new BufferGeometry();
    I.setAttribute(`position`, new Float32BufferAttribute(w, 3)), I.setAttribute(`normal`, new Float32BufferAttribute(T, 3)), I.setAttribute(`uv`, new Float32BufferAttribute(E, 2)), I.setAttribute(`aInfo`, new Float32BufferAttribute(D, 4)), I.setIndex(O), Gd(I);
    let ne = n.keyOf ? n.keyOf.get(o) : Math.floor(g / zd) + `,` + Math.floor(_ / zd);
    r.has(ne) || r.set(ne, []), r.get(ne).push(I);
    for (let [e, t, n] of P) {
      let r = 1 / 0,
        a = -1 / 0,
        o = 1 / 0,
        s = -1 / 0;
      for (let t of e) r = Math.min(r, t.x), a = Math.max(a, t.x), o = Math.min(o, t.y), s = Math.max(s, t.y);
      i.push({
        rings: e === p ? [p, ...m] : [e],
        minX: r,
        maxX: a,
        minZ: o,
        maxZ: s,
        bottom: t + (l > 0 || t > C ? 0 : 1.5),
        top: n,
        name: f,
        h: c
      });
    }
  }
  let s = Rd(),
    c = new Group(),
    l = 0,
    u = new Map();
  for (let [e, t] of r) {
    let n = mergeGeometries(t, !1);
    t.forEach(e => e.dispose()), n.computeBoundingSphere(), n.computeBoundingBox(), l += n.index.count / 3;
    let r = new Mesh(n, s);
    r.renderOrder = 5, r.userData.key = e, u.set(e, r), c.add(r);
  }
  return c.userData.tris = l, {
    group: c,
    colliders: i,
    material: s,
    details: a,
    byKey: u
  };
}

function Gd(e) {
  let t = e.index.array,
    n = e.attributes.position.array,
    r = e.attributes.normal.array,
    i = new Vector3(),
    a = new Vector3(),
    o = new Vector3(),
    s = new Vector3();
  for (let e = 0; e < t.length; e += 3) {
    let c = t[e],
      l = t[e + 1],
      u = t[e + 2];
    r[c * 3 + 1] < 0.5 || (i.fromArray(n, c * 3), a.fromArray(n, l * 3), o.fromArray(n, u * 3), s.subVectors(a, i).cross(o.clone().sub(i)), s.y < 0 && (t[e + 1] = u, t[e + 2] = l));
  }
}

var Kd = new Map();

function qd(e) {
  let t = e.roadClasses,
    n = new Set([`pedestrian`, `footway`, `path`, `steps`, `track`]),
    r = new Set([`cycleway`]),
    i = new Set([`motorway`, `trunk`, `primary`, `secondary`]),
    a = {
      ped: [[], [], [], [], []],
      minor: [[], [], [], [], []],
      major: [[], [], [], [], []],
      bridge: [[], [], [], [], []]
    },
    o = {
      P: [],
      N: [],
      I: []
    },
    s = [],
    c = 0,
    l = 0,
    u = (e, t) => Math.round(e * 2) + `,` + Math.round(t * 2),
    d = new Map();
  for (let i of e.roads) {
    if (!i[5] || n.has(t[i[0]]) || r.has(t[i[0]])) continue;
    let e = i[4];
    for (let t of [u(e[0], e[1]), u(e[e.length - 2], e[e.length - 1])]) d.set(t, (d.get(t) || 0) + 1);
  }
  let f = (e, t, n, r, i, a, s) => {
    let {
        P: c,
        N: l,
        I: u
      } = o,
      d = c.length / 3;
    c.push(...e, ...t, ...n, ...r);
    for (let e = 0; e < 4; e++) l.push(i, a, s);
    u.push(d, d + 1, d + 2, d, d + 2, d + 3, d, d + 2, d + 1, d, d + 3, d + 2);
  };
  for (let o of e.roads) {
    let [e, p, m, h, g, _, v] = o,
      y = t[e],
      b = n.has(y) || r.has(y) ? `ped` : i.has(y) ? `major` : `minor`;
    if (b === `ped` && _) continue;
    let x = n.has(y) ? 1 : r.has(y) ? 2 : 0,
      S = [];
    for (let e = 0; e < g.length; e += 2) {
      let t = g[e],
        n = g[e + 1];
      if (S.length) {
        let [e, r] = S[S.length - 1],
          i = Math.hypot(t - e, n - r),
          a = Math.floor(i / 15);
        for (let i = 1; i < a; i++) S.push([e + (t - e) * i / a, r + (n - r) * i / a]);
      }
      S.push([t, n]);
    }
    if (S.length < 2) continue;
    let C = [0];
    for (let e = 1; e < S.length; e++) C.push(C[e - 1] + Math.hypot(S[e][0] - S[e - 1][0], S[e][1] - S[e - 1][1]));
    let w = C[C.length - 1],
      T = Array(S.length).fill(0);
    if (_ && b !== `ped`) {
      let e = (d.get(u(g[0], g[1])) || 0) > 1,
        t = (d.get(u(g[g.length - 2], g[g.length - 1])) || 0) > 1,
        n = 6.5 * Math.max(1, v || 1),
        r = Math.min(110, w * 0.45);
      if (w > 50 || e || t) {
        let i = e => (e = Math.max(0, Math.min(1, e)), e * e * (3 - 2 * e));
        for (let a = 0; a < S.length; a++) {
          let o = e ? 1 : i(C[a] / r),
            s = t ? 1 : i((w - C[a]) / r);
          T[a] = n * Math.min(o, s);
        }
        b = `bridge`, l++, Kd.set(o, {
          acc: C,
          elev: T
        });
      }
    }
    let [E, D, O, k, A] = a[b],
      j = b === `major` || b === `bridge` ? 0.12 : b === `minor` ? 0.09 : 0.06,
      M = p / 2,
      ee = E.length / 3,
      N = null,
      P = null,
      F = -100;
    for (let e = 0; e < S.length; e++) {
      let [t, n] = S[e],
        r = 0,
        i = 0;
      if (e > 0) {
        let a = t - S[e - 1][0],
          o = n - S[e - 1][1],
          s = Math.hypot(a, o) || 1;
        r += a / s, i += o / s;
      }
      if (e < S.length - 1) {
        let a = S[e + 1][0] - t,
          o = S[e + 1][1] - n,
          s = Math.hypot(a, o) || 1;
        r += a / s, i += o / s;
      }
      let a = Math.hypot(r, i) || 1;
      r /= a, i /= a;
      let o = 1;
      if (e > 0 && e < S.length - 1) {
        let a = t - S[e - 1][0],
          s = n - S[e - 1][1],
          c = Math.hypot(a, s) || 1,
          l = a / c * r + s / c * i;
        o = Math.min(2.5, 1 / Math.max(0.4, l));
      }
      let c = -i * M * o,
        l = r * M * o,
        u = T[e],
        d = $(t + c, n + l) + j + u,
        g = $(t - c, n - l) + j + u;
      if (E.push(t + c, d, n + l, t - c, g, n - l), D.push(0, 1, 0, 0, 1, 0), O.push(C[e], -1, C[e], 1), k.push(p, m, h, x, p, m, h, x), e > 0) {
        let t = ee + (e - 1) * 2;
        A.push(t, t + 2, t + 1, t + 1, t + 2, t + 3);
      }
      if (b === `bridge`) {
        let a = [t + c, d, n + l],
          o = [t - c, g, n - l];
        if (N && (u > 0.8 || T[e - 1] > 0.8)) {
          let e = [c / M, 0, l / M];
          for (let [t, n, r] of [[N, a, 1], [P, o, -1]]) f([t[0], t[1] - 1.3, t[2]], [n[0], n[1] - 1.3, n[2]], [n[0], n[1] + 1, n[2]], [t[0], t[1] + 1, t[2]], e[0] * r, 0, e[2] * r);
          f([N[0], N[1] - 1.3, N[2]], [a[0], a[1] - 1.3, a[2]], [o[0], o[1] - 1.3, o[2]], [P[0], P[1] - 1.3, P[2]], 0, -1, 0);
        }
        u > 3.5 && C[e] - F > 28 && (F = C[e], s.push([t, n, $(t, n), u - 1.2 + j, Math.atan2(r, i), p])), N = a, P = o;
      }
    }
    c++;
  }
  let p = Nd(),
    m = Nd();
  m.depthWrite = !0;
  let h = new Group(),
    g = {
      ped: 1,
      minor: 2,
      major: 3,
      bridge: 5
    };
  for (let e of [`ped`, `minor`, `major`, `bridge`]) {
    let [t, n, r, i, o] = a[e];
    if (!t.length) continue;
    let s = new BufferGeometry();
    s.setAttribute(`position`, new Float32BufferAttribute(t, 3)), s.setAttribute(`normal`, new Float32BufferAttribute(n, 3)), s.setAttribute(`uv`, new Float32BufferAttribute(r, 2)), s.setAttribute(`aRoad`, new Float32BufferAttribute(i, 4)), s.setIndex(o), s.computeBoundingSphere();
    let c = new Mesh(s, e === `bridge` ? m : p);
    c.renderOrder = g[e], e === `bridge` && (c.userData.cast = !0), h.add(c);
  }
  let _ = xd({
    color: 12170928,
    side: 2
  });
  if (o.P.length) {
    let e = new BufferGeometry();
    e.setAttribute(`position`, new Float32BufferAttribute(o.P, 3)), e.setAttribute(`normal`, new Float32BufferAttribute(o.N, 3)), e.setIndex(o.I), e.computeBoundingSphere();
    let t = new Mesh(e, _);
    t.userData.cast = !0, h.add(t);
  }
  if (s.length) {
    let e = new BoxGeometry(1, 1, 1);
    e.translate(0, 0.5, 0);
    let t = new BoxGeometry(1, 1, 1);
    t.translate(0, 0.5, 0);
    let n = new InstancedMesh(e, _, s.length),
      r = new InstancedMesh(t, _, s.length),
      i = new Matrix4(),
      a = new Quaternion(),
      o = new Vector3(0, 1, 0);
    s.forEach(([e, t, s, c, l, u], d) => {
      a.setFromAxisAngle(o, l), i.compose(new Vector3(e, s, t), a, new Vector3(Math.min(3.5, u * 0.25), Math.max(0.5, c - 1.2), 1.8)), n.setMatrixAt(d, i), i.compose(new Vector3(e, s + c - 1.2, t), a, new Vector3(u * 0.8, 1.2, 2.2)), r.setMatrixAt(d, i);
    }), n.userData.cast = r.userData.cast = !0, h.add(n, r);
  }
  return h.userData.count = c, h.userData.bridges = l, h;
}

var Jd = new WeakMap();

function Yd(e) {
  let t = Jd.get(e);
  if (!t) {
    let n = 1 / 0,
      r = -1 / 0,
      i = 1 / 0,
      a = -1 / 0;
    for (let t = 0; t < e.length; t += 2) e[t] < n && (n = e[t]), e[t] > r && (r = e[t]), e[t + 1] < i && (i = e[t + 1]), e[t + 1] > a && (a = e[t + 1]);
    t = [n, r, i, a], Jd.set(e, t);
  }
  return t;
}

function Xd(e) {
  let t = e.bounds,
    n = t.x0 - 400,
    r = t.x1 + 400,
    i = t.z0 - 400,
    a = t.z1 + 400,
    o = Math.max(r - n, a - i),
    s = (n + r) / 2,
    c = (i + a) / 2;
  return {
    x0: s - o / 2,
    x1: s + o / 2,
    z0: c - o / 2,
    z1: c + o / 2
  };
}

function Zd(e, t, n, r = {}) {
  let i = document.createElement(`canvas`);
  i.width = i.height = n;
  let a = i.getContext(`2d`),
    o = n / (t.x1 - t.x0),
    s = n / (t.z1 - t.z0),
    c = e => (e - t.x0) * o,
    l = e => (e - t.z0) * s,
    u = e => {
      let n = Yd(e);
      return n[1] >= t.x0 - 30 && n[0] <= t.x1 + 30 && n[3] >= t.z0 - 30 && n[2] <= t.z1 + 30;
    },
    d = (t.x1 - t.x0) / n > 3,
    f = e.buildings.filter(e => u(e[4][0])),
    p = e.areas.filter(e => u(e[1][0])),
    m = e.roads.filter(e => u(e[4]));
  a.fillStyle = r.base || `#4f8a35`, a.fillRect(0, 0, n, n);
  let h = e => {
      a.beginPath();
      for (let t of e) {
        for (let e = 0; e < t.length; e += 2) {
          let n = c(t[e]),
            r = l(t[e + 1]);
          e === 0 ? a.moveTo(n, r) : a.lineTo(n, r);
        }
        a.closePath();
      }
    },
    g = r.areaColors || {
      park: `#4c8632`,
      grass: `#55903a`,
      wood: `#3a702c`,
      pitch: `#4a8a3c`,
      water: `#2f6f96`,
      plaza: `#bdb7ab`,
      civicplaza: `#c6bfb2`
    },
    _ = [`plaza`, `park`, `grass`, `pitch`, `wood`, `water`, `civicplaza`];
  if (r.villageAlleys !== !1) {
    a.fillStyle = `#6e6862`, a.strokeStyle = `#6e6862`, a.lineWidth = 6 * o, a.lineJoin = `round`;
    for (let e of f) e[0] === 2 && (h(e[4]), a.fill(`evenodd`), a.stroke());
  }
  if (r.aprons !== !1 && !d) {
    a.fillStyle = `#b6b1a6`, a.strokeStyle = `#b6b1a6`, a.lineJoin = `round`;
    for (let e of f) e[0] !== 2 && (a.lineWidth = (e[0] === 0 || e[0] === 3 ? 18 : 11) * o, h([e[4][0]]), a.fill(), a.stroke());
  }
  for (let e of _) {
    a.fillStyle = g[e];
    for (let [t, n] of p) t === e && (h(n), a.fill(`evenodd`));
  }
  if (r.plazaPattern !== !1) for (let [e, t] of p) {
    if (e !== `civicplaza`) continue;
    a.save(), h(t), a.clip(`evenodd`);
    let n = t[0],
      r = 1 / 0,
      i = -1 / 0,
      u = 1 / 0,
      d = -1 / 0;
    for (let e = 0; e < n.length; e += 2) r = Math.min(r, n[e]), i = Math.max(i, n[e]), u = Math.min(u, n[e + 1]), d = Math.max(d, n[e + 1]);
    let f = (r + i) / 2;
    a.fillStyle = `#52903a`;
    for (let e = u + 12; e < d - 20; e += 46) for (let t of [-1, 1]) for (let n = 0; n < 4; n++) {
      let r = f + t * (22 + n * 46);
      a.fillRect(c(Math.min(r, r + t * 34)), l(e), Math.abs(34 * o), 30 * s);
    }
    a.strokeStyle = `rgba(120,112,100,0.55)`, a.lineWidth = Math.max(1, 0.6 * o);
    for (let e = Math.floor(r / 12) * 12; e < i; e += 12) a.beginPath(), a.moveTo(c(e), l(u)), a.lineTo(c(e), l(d)), a.stroke();
    for (let e = Math.floor(u / 12) * 12; e < d; e += 12) a.beginPath(), a.moveTo(c(r), l(e)), a.lineTo(c(i), l(e)), a.stroke();
    a.fillStyle = `#a69e92`, a.fillRect(c(f - 9), l(u), 18 * o, (d - u) * s), a.restore();
  }
  let v = cd();
  if (r.hill !== !1) {
    let e = a.createRadialGradient(c(v.x), l(v.z), 0, c(v.x), l(v.z), 570 * o);
    e.addColorStop(0, `rgba(54,108,42,1)`), e.addColorStop(0.75, `rgba(58,112,44,0.9)`), e.addColorStop(1, `rgba(70,120,52,0)`), a.fillStyle = e, a.beginPath(), a.arc(c(v.x), l(v.z), 570 * o, 0, Math.PI * 2), a.fill();
  }
  if (e.sea) {
    let n = e.sea;
    a.fillStyle = g.water;
    let r = Math.max(0, Math.floor((t.z0 - n.z0) / n.cell)),
      i = Math.min(n.h - 1, Math.ceil((t.z1 - n.z0) / n.cell));
    for (let e = r; e <= i; e++) {
      let r = n.rows[e];
      for (let i = 0; i < r.length; i += 2) {
        let u = n.x0 + r[i] * n.cell,
          d = u + r[i + 1] * n.cell;
        d < t.x0 || u > t.x1 || a.fillRect(c(u) - 0.5, l(n.z0 + e * n.cell) - 0.5, (d - u) * o + 1, n.cell * s + 1);
      }
    }
  }
  a.lineCap = `round`, a.lineJoin = `round`, a.strokeStyle = g.water;
  for (let [t, n] of e.waterLines) {
    a.lineWidth = t * o, a.beginPath();
    for (let e = 0; e < n.length; e += 2) {
      let t = c(n[e]),
        r = l(n[e + 1]);
      e ? a.lineTo(t, r) : a.moveTo(t, r);
    }
    a.stroke();
  }
  if (r.sidewalks !== !1 && !d) {
    let t = new Set([`pedestrian`, `footway`, `path`, `steps`, `track`, `cycleway`]),
      n = new Set([`trunk`, `primary`, `secondary`]);
    a.strokeStyle = `#4f8a35`;
    for (let t of m) {
      if (!n.has(e.roadClasses[t[0]])) continue;
      a.lineWidth = (t[1] + 20) * o, a.beginPath();
      let r = t[4];
      for (let e = 0; e < r.length; e += 2) {
        let t = c(r[e]),
          n = l(r[e + 1]);
        e ? a.lineTo(t, n) : a.moveTo(t, n);
      }
      a.stroke();
    }
    a.strokeStyle = `#d2cec6`;
    for (let n of m) {
      if (t.has(e.roadClasses[n[0]])) continue;
      a.lineWidth = (n[1] + 8.4) * o, a.beginPath();
      let r = n[4];
      for (let e = 0; e < r.length; e += 2) {
        let t = c(r[e]),
          n = l(r[e + 1]);
        e ? a.lineTo(t, n) : a.moveTo(t, n);
      }
      a.stroke();
    }
    a.strokeStyle = r.sidewalk || `#aea89d`;
    for (let n of m) {
      let r = e.roadClasses[n[0]];
      if (t.has(r)) continue;
      a.lineWidth = (n[1] + 7.6) * o, a.beginPath();
      let i = n[4];
      for (let e = 0; e < i.length; e += 2) {
        let t = c(i[e]),
          n = l(i[e + 1]);
        e ? a.lineTo(t, n) : a.moveTo(t, n);
      }
      a.stroke();
    }
  }
  a.strokeStyle = `#5a5550`;
  for (let [, t] of e.rails) {
    a.lineWidth = 6 * o, a.beginPath();
    for (let e = 0; e < t.length; e += 2) {
      let n = c(t[e]),
        r = l(t[e + 1]);
      e ? a.lineTo(n, r) : a.moveTo(n, r);
    }
    a.stroke();
  }
  if (r.drawRoads) for (let t of m) {
    let n = e.roadClasses[t[0]],
      i = [`motorway`, `trunk`, `primary`, `secondary`].includes(n),
      s = [`pedestrian`, `footway`, `path`, `steps`, `track`, `cycleway`].includes(n);
    if (s && !r.drawPaths) continue;
    a.strokeStyle = i ? `#f0c060` : s ? `#c8c2b8` : `#e8e4dc`, a.lineWidth = Math.max(1, t[1] * o * (r.roadScale || 1)), a.beginPath();
    let u = t[4];
    for (let e = 0; e < u.length; e += 2) {
      let t = c(u[e]),
        n = l(u[e + 1]);
      e ? a.lineTo(t, n) : a.moveTo(t, n);
    }
    a.stroke();
  }
  if (r.drawBuildings) {
    a.fillStyle = r.drawBuildings;
    for (let e of f) h(e[4]), a.fill(`evenodd`);
  }
  return i;
}

var Qd = 1024,
  $d = class {
    constructor(e, t, r) {
      this.city = e, this.scene = r, this.aniso = t.capabilities.getMaxAnisotropy();
      let i = this.rect = Xd(e),
        a = Math.min(4096, t.capabilities.maxTextureSize),
        o = e => {
          let t = new CanvasTexture(e);
          return t.anisotropy = this.aniso, t.wrapS = t.wrapT = ClampToEdgeWrapping, t.generateMipmaps = !0, t.minFilter = LinearMipmapLinearFilter, t;
        };
      this.mk = o;
      let s = this.group = new Group(),
        c = new PlaneGeometry(9e4, 9e4, 1, 1);
      c.rotateX(-Math.PI / 2);
      let u = new Mesh(c, Pd(o(Zd(e, i, a)), i));
      u.position.y = -0.6, u.renderOrder = 0, s.add(u);
      let d = cd(),
        f = 1520,
        p = {
          x0: d.x - f / 2,
          x1: d.x + f / 2,
          z0: d.z - f / 2,
          z1: d.z + f / 2
        },
        m = new PlaneGeometry(f, f, 220, 220);
      m.rotateX(-Math.PI / 2);
      let h = m.attributes.position;
      for (let e = 0; e < h.count; e++) {
        let t = h.getX(e) + d.x,
          n = h.getZ(e) + d.z;
        h.setXYZ(e, t, $(t, n) + 0.03, n);
      }
      m.computeVertexNormals(), m.computeBoundingSphere();
      let g = new Mesh(m, Pd(o(Zd(e, p, 2048)), p));
      g.renderOrder = 0, s.add(g), this.tiles = new Map(), this.tileGeo = new PlaneGeometry(Qd, Qd, 1, 1), this.tileGeo.rotateX(-Math.PI / 2), r.add(s);
    }
    update(e) {
      let t = Math.min(3600, 1700 + Math.max(0, e.y) * 1.2),
        n = Math.floor(e.x / Qd),
        r = Math.floor(e.z / Qd),
        i = Math.ceil(t / Qd),
        a = null,
        o = 1 / 0;
      for (let s = n - i; s <= n + i; s++) for (let n = r - i; n <= r + i; n++) {
        let r = s * 100003 + n;
        if (this.tiles.has(r)) continue;
        let i = Math.hypot((s + 0.5) * Qd - e.x, (n + 0.5) * Qd - e.z);
        i < t + Qd * 0.5 && i < o && (o = i, a = [s, n, r]);
      }
      let s = 0;
      if (a) {
        let [e, t, n] = a,
          r = {
            x0: e * Qd,
            x1: (e + 1) * Qd,
            z0: t * Qd,
            z1: (t + 1) * Qd
          },
          i = this.city.bounds,
          o = {
            i: e,
            j: t,
            mesh: null
          };
        if (!(r.x1 < i.x0 - 400 || r.x0 > i.x1 + 400 || r.z1 < i.z0 - 400 || r.z0 > i.z1 + 400)) {
          let n = this.mk(Zd(this.city, r, 1024, {
              hill: !1
            })),
            i = new Mesh(this.tileGeo, Pd(n, r));
          i.position.set((e + 0.5) * Qd, 0, (t + 0.5) * Qd), i.renderOrder = 0, this.group.add(i), o.mesh = i, o.tex = n;
        }
        this.tiles.set(n, o), s = 1;
      }
      if (this.tiles.size > 70) for (let [n, r] of this.tiles) Math.hypot((r.i + 0.5) * Qd - e.x, (r.j + 0.5) * Qd - e.z) > t + 1600 && (r.mesh && (this.group.remove(r.mesh), r.tex.dispose(), r.mesh.material.dispose()), this.tiles.delete(n));
      return s;
    }
  };

function ef(e, t, n) {
  let r = !1,
    i = n.length / 2;
  for (let a = 0, o = i - 1; a < i; o = a++) {
    let i = n[a * 2],
      s = n[a * 2 + 1],
      c = n[o * 2],
      l = n[o * 2 + 1];
    s > t != l > t && e < (c - i) * (t - s) / (l - s) + i && (r = !r);
  }
  return r;
}

function tf(e, t, n) {
  let r = !1;
  for (let i = 0, a = n.length - 1; i < n.length; a = i++) {
    let o = n[i],
      s = n[a];
    o.y > t != s.y > t && e < (s.x - o.x) * (t - o.y) / (s.y - o.y) + o.x && (r = !r);
  }
  return r;
}

function nf(e, t, n) {
  if (e < n.minX || e > n.maxX || t < n.minZ || t > n.maxZ || !tf(e, t, n.rings[0])) return !1;
  for (let r = 1; r < n.rings.length; r++) if (tf(e, t, n.rings[r])) return !1;
  return !0;
}

function rf(e) {
  let t = new Map(),
    n = new Map(),
    r = e.clone();
  return af(e, r, function (e, r) {
    t.set(r, e), n.set(e, r);
  }), r.traverse(function (e) {
    if (!e.isSkinnedMesh) return;
    let r = e,
      i = t.get(e),
      a = i.skeleton.bones;
    r.skeleton = i.skeleton.clone(), r.bindMatrix.copy(i.bindMatrix), r.skeleton.bones = a.map(function (e) {
      return n.get(e);
    }), r.bind(r.skeleton, r.bindMatrix);
  }), r;
}

function af(e, t, n) {
  n(e, t);
  for (let r = 0; r < e.children.length; r++) af(e.children[r], t.children[r], n);
}

function sp(e) {
  return function () {
    e |= 0, e = e + 1831565813 | 0;
    let t = Math.imul(e ^ e >>> 15, 1 | e);
    return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function cp() {
  let e = document.createElement(`canvas`);
  e.width = e.height = 256;
  let n = e.getContext(`2d`),
    r = sp(2024);
  n.fillStyle = `rgb(92,110,72)`, n.fillRect(0, 0, 256, 256);
  for (let e = 0; e < 3; e++) {
    let t = e === 0 ? 1500 : 1300;
    for (let i = 0; i < t; i++) {
      let t = r() * 256,
        i = r() * 256,
        a = 6 + r() * 7,
        o = a * (0.38 + r() * 0.2),
        s = r() * Math.PI,
        c = (e === 0 ? 128 : e === 1 ? 158 : 190) + r() * 45,
        l = c * (0.86 + r() * 0.16),
        u = c,
        d = c * (0.72 + r() * 0.2);
      n.fillStyle = `rgb(${l | 0},${u | 0},${d | 0})`;
      for (let e of [-256, 0, 256]) for (let r of [-256, 0, 256]) t + e < -16 || t + e > 272 || i + r < -16 || i + r > 272 || (n.beginPath(), n.ellipse(t + e, i + r, a / 2, o / 2, s, 0, Math.PI * 2), n.fill());
    }
  }
  let i = new CanvasTexture(e);
  return i.wrapS = i.wrapT = RepeatWrapping, i.generateMipmaps = !0, i.minFilter = LinearMipmapLinearFilter, i.anisotropy = 4, i;
}

function lp(e, t, n) {
  let r = new BufferGeometry();
  return r.setAttribute(`position`, new Float32BufferAttribute(e, 3)), r.setAttribute(`normal`, new Float32BufferAttribute(t, 3)), r.setAttribute(`aTree`, new Float32BufferAttribute(n, 4)), r;
}

function up(e, t, n, r) {
  let i = [],
    a = [],
    o = [],
    s = 0,
    c = 0,
    l = 0,
    u = 0;
  for (let [t, n, r, i] of e) s += t * i, c += n * i, l += r * i, u += i;
  s /= u, c /= u, l /= u;
  let d = new Vector3();
  e.forEach(([e, u, f, p], m) => {
    let h = new IcosahedronGeometry(1, t),
      g = h.attributes.position,
      _ = r + m * 7.3;
    for (let t = 0; t < g.count; t++) {
      d.fromBufferAttribute(g, t).normalize();
      let r = p * (1 + 0.24 * (Math.sin(d.x * 5.1 + _) * Math.sin(d.y * 4.3 + _ * 1.7) * Math.sin(d.z * 4.7 + _ * 0.3)) + 0.09 * Math.sin(d.x * 11 + d.z * 9 + _ * 2.1)),
        m = e + d.x * r,
        h = u + d.y * r * n,
        v = f + d.z * r;
      i.push(m, h, v);
      let y = m - s,
        b = (h - c) * 1.2,
        x = v - l,
        S = Math.hypot(y, b, x) || 1,
        C = d.x * 0.45 + y / S * 0.55,
        w = d.y * 0.45 + b / S * 0.55,
        T = d.z * 0.45 + x / S * 0.55,
        E = Math.hypot(C, w, T) || 1;
      a.push(C / E, w / E, T / E), o.push(S, 0, 0, 0);
    }
    h.dispose();
  });
  let f = 1 / 0,
    p = -1 / 0,
    m = 0;
  for (let e = 0; e < i.length; e += 3) f = Math.min(f, i[e + 1]), p = Math.max(p, i[e + 1]), m = Math.max(m, o[e / 3 * 4]);
  for (let e = 0; e < i.length / 3; e++) {
    let t = (i[e * 3 + 1] - f) / (p - f),
      n = o[e * 4] / m;
    o[e * 4] = 0.3 + 0.7 * Math.max(0, Math.min(1, 0.62 * t + 0.62 * n - 0.18));
  }
  return lp(i, a, o);
}

function dp(e, t, n, r = 6, i = 0.75) {
  let a = new CylinderGeometry(n, t, e, r, 1, !0).toNonIndexed();
  a.translate(0, e / 2, 0);
  let o = a.attributes.position.count,
    s = new Float32Array(o * 4);
  for (let t = 0; t < o; t++) s[t * 4] = i - 0.35 * (a.attributes.position.getY(t) / e), s[t * 4 + 1] = 1;
  return a.deleteAttribute(`uv`), a.setAttribute(`aTree`, new BufferAttribute(s, 4)), a;
}

function fp(e, t, n, r, i, a) {
  let o = [];
  for (let s = 0; s < e; s++) {
    let e = i - s * a,
      c = new ConeGeometry(e, r * 1.5, t, 1, !1).toNonIndexed();
    c.translate(0, n + s * r + r * 0.75, 0);
    let l = c.attributes.position.count,
      u = new Float32Array(l * 4);
    for (let t = 0; t < l; t++) {
      let n = Math.hypot(c.attributes.position.getX(t), c.attributes.position.getZ(t)) / e;
      u[t * 4] = 0.35 + 0.65 * n;
    }
    c.deleteAttribute(`uv`), c.setAttribute(`aTree`, new BufferAttribute(u, 4)), o.push(c);
  }
  return mergeGeometries(o);
}

function pp(e, t, n, r) {
  let i = [],
    a = [],
    o = [],
    s = new Vector3(),
    c = new Vector3();
  new Vector3();
  let l = new Vector3(),
    u = (e, t, n, r, u, d) => {
      s.subVectors(t, e), c.subVectors(n, e), l.crossVectors(s, c).normalize(), l.y < 0 && l.negate();
      for (let [s, c] of [[e, r], [t, u], [n, d]]) i.push(s.x, s.y, s.z), a.push(l.x * 0.6, l.y * 0.6 + 0.4, l.z * 0.6), o.push(0.55 + 0.45 * c[0], 2, c[0], c[1]);
    };
  for (let i = 0; i < e; i++) {
    let a = i / e * Math.PI * 2 + i % 2 * 0.2,
      o = 0.75 - i % 3 * 0.32,
      s = r * (0.9 + i % 4 * 0.05),
      c = Math.cos(a),
      l = Math.sin(a),
      d = [],
      f = [];
    for (let e = 0; e <= t; e++) {
      let r = e / t,
        i = s * (r - 0.18 * r * r),
        a = n + s * (o * 0.42 * Math.sin(r * 1.9) - 0.48 * r * r);
      d.push(new Vector3(c * i, a, l * i)), f.push(0.12 + 1.15 * Math.sin(Math.PI * Math.min(1, r * 0.92 + 0.06)) ** 0.7);
    }
    for (let e = 0; e < t; e++) {
      let n = e / t,
        r = (e + 1) / t;
      for (let t of [-1, 1]) {
        let i = new Vector3(d[e].x - l * f[e] * t, d[e].y - 0.38 * f[e], d[e].z + c * f[e] * t),
          a = new Vector3(d[e + 1].x - l * f[e + 1] * t, d[e + 1].y - 0.38 * f[e + 1], d[e + 1].z + c * f[e + 1] * t);
        u(d[e], d[e + 1], a, [n, 0], [r, 0], [r, t]), u(d[e], a, i, [n, 0], [r, t], [n, t]);
      }
    }
  }
  return lp(i, a, o);
}

function mp(e) {
  return e.attributes.uv && e.deleteAttribute(`uv`), e;
}

function hp(e, t) {
  if (e === 5) return mergeGeometries([up(t ? [[0, 7, 0, 3], [2.8, 6.7, 0.5, 2.5], [-2.6, 6.8, 1.2, 2.5], [-0.6, 6.6, -2.8, 2.5], [1.4, 6.9, -2, 2.2]] : [[0, 6.9, 0, 3.6], [2.4, 6.6, 0.8, 2.8], [-2.3, 6.6, -1, 2.8]], +!!t, 0.55, 5.5), dp(5.6, 0.34, 0.2, t ? 6 : 4)]);
  let n = +!!t;
  if (e === 0) return mergeGeometries([up(t ? [[0, 7.3, 0, 3.4], [2.9, 6.6, 0.6, 2.8], [-2.6, 6.9, 1.6, 2.7], [-0.9, 6.5, -3, 2.8], [1.6, 7, -2.2, 2.4], [0.4, 6.3, 3, 2.3]] : [[0, 7.2, 0, 3.9], [2.6, 6.6, 1, 3], [-2.4, 6.7, -1.2, 3.1]], n, 0.72, 1.3), dp(5.2, 0.5, 0.34, t ? 7 : 4)]);
  if (e === 1) return mergeGeometries([up(t ? [[0, 7.6, 0, 2.7], [0.2, 10.3, 0.1, 2.1], [1.5, 7, 0.8, 2], [-1.4, 7.9, 0.6, 2], [0.1, 7.2, -1.6, 2]] : [[0, 7.6, 0, 3], [0.2, 10.1, 0.1, 2.2]], n, 0.95, 4.1), dp(5.6, 0.32, 0.2, t ? 6 : 4)]);
  if (e === 2) {
    let e = [pp(t ? 11 : 6, t ? 5 : 2, 10.9, 4.3), dp(9.6, 0.3, 0.2, t ? 7 : 4, 0.95)],
      n = dp(1.5, 0.2, 0.16, t ? 7 : 4, 1);
    return n.translate(0, 9.6, 0), e.push(n), mergeGeometries(e);
  }
  return mergeGeometries(e === 3 ? [up(t ? [[0, 4.9, 0, 2.3], [1.9, 4.5, 0.4, 1.8], [-1.3, 4.6, 1.5, 1.8], [-0.8, 4.4, -1.8, 1.8]] : [[0, 4.8, 0, 2.6], [1.4, 4.5, 0.8, 2]], n, 0.8, 8.8), dp(3.3, 0.24, 0.15, t ? 6 : 4)] : [mp(fp(t ? 7 : 3, t ? 9 : 6, 3, t ? 1.55 : 3.6, 2.9, t ? 0.36 : 0.85)), dp(13.5, 0.28, 0.06, t ? 6 : 4)]);
}

function gp(e, t, n) {
  return new ShaderMaterial({
    uniforms: _d({
      uLeaf: {
        value: e
      },
      uFlower: {
        value: new Vector4(...t)
      },
      uTrunk: {
        value: new Vector3(...n)
      }
    }),
    side: 2,
    vertexShader: `
      attribute vec4 aTree;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vObj; varying vec3 vCol; varying vec4 vTree;
      void main(){
        vec4 lp = vec4(position, 1.0); vec3 ln = normal;
        vCol = vec3(0.1, 0.25, 0.06);
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #endif
        vec4 wp = modelMatrix * lp; vWorld = wp.xyz; vN = normalize(mat3(modelMatrix) * ln);
        vObj = position; vTree = aTree;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      ${bd}
      uniform sampler2D uLeaf; uniform vec4 uFlower; uniform vec3 uTrunk;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vObj; varying vec3 vCol; varying vec4 vTree;
      void main(){
        vec3 n = normalize(vN);
        vec3 V = normalize(vWorld - cameraPosition);
        float part = vTree.y, ao = clamp(vTree.x, 0.0, 1.0);
        float dist = distance(vWorld, cameraPosition);
        vec3 col;
        if (part > 0.5 && part < 1.5) {
          if (dot(n, V) > 0.0) n = -n;
          vec3 alb = uTrunk * (0.75 + 0.5 * vnoise(vec2(atan(vObj.z, vObj.x) * 5.0, vObj.y * 1.3)));
          col = lightLin(alb, n, sunShadow(vWorld, n), ao);
        } else {
          vec4 tx;
          if (part > 1.5) {
            // 棕榈叶：按小叶镂空
            if (n.y < 0.0) n = -n;
            float u = vTree.z * 34.0 - abs(vTree.w) * 2.5;
            if (fwidth(u) < 0.8 && abs(vTree.w) > 0.10 && fract(u) > 0.62) discard;
            tx = vec4(vec3(0.66 + 0.2 * hash11(floor(u))), 1.0);
          } else {
            vec3 w = abs(n); w *= w; w /= (w.x + w.y + w.z);
            const float S = 0.27;
            tx = texture2D(uLeaf, vObj.zy * S) * w.x + texture2D(uLeaf, vObj.xz * S) * w.y + texture2D(uLeaf, vObj.xy * S) * w.z;
            // 轮廓处按叶片缝隙镂空，打碎多面体外形
            float rim = 1.0 - abs(dot(n, V));
            float nearF = 1.0 - smoothstep(90.0, 260.0, dist);
            float gapv = smoothstep(0.42, 0.54, dot(tx.rgb, vec3(0.333)));
            tx.a = gapv;
            // 越靠轮廓镂空越多，把多面体的直边咬碎
            if (gapv < smoothstep(0.30, 0.82, rim) * 0.95 * nearF) discard;
          }
          float cover = smoothstep(0.25, 0.85, tx.a);
          vec3 alb = vCol * toLin(tx.rgb) * 1.9 * mix(0.80, 1.0, cover);
          if (uFlower.a > 0.0 && part < 0.5) {
            float f = vnoise(vObj.xz * 1.1 + vObj.y * 0.7) * 0.6 + vnoise(vObj.xy * 2.7 + 3.0) * 0.4;
            float fm = smoothstep(1.0 - uFlower.a, 1.0 - uFlower.a + 0.12, f) * cover;
            alb = mix(alb, toLin(uFlower.rgb) * (0.6 + 0.8 * toLin(tx.rgb).g * 1.6), fm);
          }
          float ndl = dot(n, uSunDir);
          float wrap = clamp((ndl + 0.42) / 1.42, 0.0, 1.0);
          float sh = sunShadowOff(vWorld, n, 0.7);
          float back = pow(max(dot(V, uSunDir), 0.0), 2.0) * (1.0 - wrap);
          vec3 lin = alb * (sunE() * wrap * sh * (0.5 + 0.5 * ao) + ambientLin(n) * ao)
                   + alb * vec3(1.2, 1.4, 0.45) * back * sh * 0.55 * (1.0 - uNight * 0.94);
          col = toneMap(lin);
        }
        gl_FragColor = vec4(atmo(col, vWorld), 1.0);
      }`
  });
}

var _p = [{
  h: [0.285, 0.04],
  s: [0.46, 0.14],
  l: [0.15, 0.06],
  flower: [0, 0, 0, 0],
  trunk: [0.16, 0.12, 0.09]
}, {
  h: [0.265, 0.045],
  s: [0.46, 0.14],
  l: [0.17, 0.07],
  flower: [0, 0, 0, 0],
  trunk: [0.13, 0.1, 0.08]
}, {
  h: [0.27, 0.03],
  s: [0.48, 0.12],
  l: [0.2, 0.05],
  flower: [0, 0, 0, 0],
  trunk: [0.36, 0.34, 0.3]
}, {
  h: [0.29, 0.04],
  s: [0.44, 0.12],
  l: [0.17, 0.06],
  flower: [0.93, 0.33, 0.6, 0.46],
  trunk: [0.14, 0.11, 0.09]
}, {
  h: [0.35, 0.03],
  s: [0.4, 0.1],
  l: [0.12, 0.04],
  flower: [0, 0, 0, 0],
  trunk: [0.12, 0.09, 0.07]
}, {
  h: [0.27, 0.04],
  s: [0.46, 0.12],
  l: [0.17, 0.06],
  flower: [0.95, 0.3, 0.12, 0.5],
  trunk: [0.14, 0.11, 0.09]
}];

function vp(e) {
  return e === 0 ? up([[0, 6.9, 0, 5.2]], 0, 0.62, 1.3) : e === 1 ? up([[0, 8.4, 0, 3.6]], 0, 1.25, 4.1) : e === 3 ? up([[0, 4.7, 0, 3.2]], 0, 0.8, 8.8) : e === 5 ? up([[0, 6.6, 0, 4.6]], 0, 0.5, 5.5) : hp(e, !1);
}

var yp = [{
  name: `banyan`,
  H: 12.5,
  top: 0.6
}, {
  name: `mango`,
  H: 11.5,
  top: 0.62
}, {
  name: `royalpalm`,
  H: 15,
  top: 0.84
}, {
  name: `bauhinia`,
  H: 8,
  top: 0.66
}, {
  name: `araucaria`,
  H: 17,
  top: 0.3
}, {
  name: `flame`,
  H: 9.5,
  top: 0.66
}];

function bp(e, t, n, r) {
  let i = [],
    a = [],
    o = [],
    s = (e, t) => {
      let n = i.length / 3;
      e.forEach(([e, n, r, o, s]) => {
        i.push(e, n, r), a.push((t + o) / 3, s);
      }), o.push(n, n + 1, n + 2, n, n + 2, n + 3);
    },
    c = -t * e,
    l = c + e,
    u = e / 2;
  for (let [e, t] of [[0, 0], [Math.PI / 2, 1], [Math.PI / 4, 0], [Math.PI * 0.75, 1]]) {
    let n = Math.cos(e) * u,
      r = -Math.sin(e) * u;
    s([[-n, c, -r, 0, 0], [n, c, r, 1, 0], [n, l, r, 1, 1], [-n, l, -r, 0, 1]], t);
  }
  let d = n * r;
  s([[-u, d, u, 0, 0], [u, d, u, 1, 0], [u, d, -u, 1, 1], [-u, d, -u, 0, 1]], 2);
  let f = new BufferGeometry();
  return f.setAttribute(`position`, new Float32BufferAttribute(i, 3)), f.setAttribute(`uv`, new Float32BufferAttribute(a, 2)), f.setIndex(o), f.computeBoundingSphere(), f;
}

function xp(e) {
  return new ShaderMaterial({
    uniforms: _d({
      uCard: {
        value: e
      },
      uNearR: {
        value: 0
      }
    }),
    side: 2,
    vertexShader: `
      uniform float uNearR;
      varying vec2 vUv; varying vec3 vWorld; varying vec3 vCol;
      void main(){
        vec4 lp = vec4(position, 1.0); vCol = vec3(1.0);
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #endif
        vec4 wp = modelMatrix * lp; vWorld = wp.xyz; vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * wp;
        // 5j：离相机 uNearR 以内的树由三维网格接管，这棵的插片整棵不画
        #ifdef USE_INSTANCING
          vec3 org = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          if (uNearR > 0.0 && distance(org, cameraPosition) < uNearR) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        #endif
      }`,
    fragmentShader: `
      ${bd}
      uniform sampler2D uCard;
      varying vec2 vUv; varying vec3 vWorld; varying vec3 vCol;
      void main(){
        vec4 t = texture2D(uCard, vUv);
        if (t.a < 0.5) discard;
        // 水平那一片只给从上往下看用：平视时它是一条线，直接不画
        if (vUv.x > 0.6667 && abs(normalize(vWorld - cameraPosition).y) < 0.30) discard;
        // 贴图里已经带了明暗，这里只乘上太阳 / 环境光的整体强度和楼的投影
        vec3 up = vec3(0.0, 1.0, 0.0);
        float sh = sunShadowOff(vWorld, up, 1.2);
        vec3 lin = toLin(t.rgb) * vCol * (sunE() * 0.36 * (0.35 + 0.65 * sh) + ambientLin(up) * 0.95);
        gl_FragColor = vec4(atmo(toneMap(lin), vWorld), 1.0);
      }`
  });
}

function Sp() {
  let e = cp(),
    t = _p.map(t => gp(e, t.flower, t.trunk)),
    n = [[], [], []];
  for (let e = 0; e < 6; e++) n[0].push(hp(e, !0)), n[1].push(hp(e, !1)), n[2].push(vp(e));
  let r = {
      mats: t,
      geo: n,
      cards: [,,,,,,].fill(null),
      near: [,,,,,,].fill(null),
      onReady: null
    },
    i = new GLTFLoader();
  yp.forEach((e, t) => {
    i.loadAsync(`./models/trees/` + e.name + `-near.glb`).then(e => {
      let n = null;
      e.scene.updateMatrixWorld(!0), e.scene.traverse(e => {
        e.isMesh && !n && (n = e);
      });
      let i = n.geometry.clone().applyMatrix4(n.matrixWorld),
        a = n.material;
      a.metalness = 0, a.roughness = 1, a.side = 2, a.envMapIntensity = 0.45, Md(a);
      let o = new InstancedMesh(i, a, 150);
      o.instanceMatrix.setUsage(DynamicDrawUsage), o.frustumCulled = !1, o.count = 0, r.near[t] = o, r.onNear && r.onNear(o);
    }).catch(t => console.warn(`[futian] 近景树 ` + e.name + `-near.glb 加载失败，这一种近处继续用插片：`, t && t.message ? t.message : t));
  });
  let a = e => new Promise((t, n) => {
    let r = new Image();
    r.onload = () => t(r), r.onerror = () => n(Error(`图片加载失败 ` + e)), r.src = e;
  });
  return yp.forEach((e, t) => {
    let n = `./models/trees/` + e.name;
    Promise.all([fetch(n + `-card.json`).then(e => e.json()), a(n + `-front.png`), a(n + `-side.png`), a(n + `-top.png`)]).then(([n, i, a, o]) => {
      let s = document.createElement(`canvas`);
      s.width = 1536, s.height = 512;
      let c = s.getContext(`2d`);
      c.drawImage(i, 0, 0, 512, 512), c.drawImage(a, 512, 0, 512, 512), c.drawImage(o, 1024, 0, 512, 512);
      let u = new CanvasTexture(s);
      u.colorSpace = ``, u.generateMipmaps = !0, u.minFilter = LinearMipmapLinearFilter, u.anisotropy = 4, r.cards[t] = {
        geo: bp(n.frame * e.H, n.pad, e.top, e.H),
        mat: xp(u)
      }, r.onReady && r.onReady(e.name);
    }).catch(t => console.warn(`[futian] 树 ` + e.name + ` 的插片图加载失败，这一种继续用程序化的树：`, t && t.message ? t.message : t));
  }), r;
}

function Cp(e, t, n) {
  let r = sp(n),
    i = Array.from({
      length: 6
    }, () => []);
  for (let e of t) i[e[3] || 0].push(e);
  let a = new Group(),
    o = [[], [], []],
    s = [],
    c = [],
    l = new Matrix4(),
    u = new Quaternion(),
    d = new Vector3(),
    f = new Vector3(),
    p = new Color(),
    m = new Vector3(0, 1, 0);
  for (let t = 0; t < 6; t++) {
    let h = i[t];
    if (!h.length) continue;
    let g = e.cards[t],
      _ = new InstancedMesh(e.geo[0][t], e.mats[t], h.length),
      v = _p[t];
    h.forEach(([e, t, n], i) => {
      u.setFromAxisAngle(m, r() * 6.283);
      let a = n * (0.88 + r() * 0.28);
      d.set(a, n * (0.88 + r() * 0.26), a), f.set(e, $(e, t) - 0.15, t), l.compose(f, u, d), _.setMatrixAt(i, l), p.setHSL(v.h[0] + r() * v.h[1], v.s[0] + r() * v.s[1], v.l[0] + r() * v.l[1]), _.setColorAt(i, p);
    }), _.computeBoundingSphere(), s.push(_), c.push({
      sp: t,
      arr: _.instanceMatrix.array,
      n: h.length
    });
    let y = (e, t, n) => {
        let r = new InstancedMesh(e, t, h.length);
        return r.instanceMatrix = _.instanceMatrix, r.instanceColor = n, r.boundingSphere = _.boundingSphere, r;
      },
      b = y(e.geo[2][t], e.mats[t], _.instanceColor),
      x = y(e.geo[1][t], e.mats[t], _.instanceColor);
    if (x.layers.set(1), a.add(x), g) {
      let e = new Float32Array(h.length * 3);
      for (let t = 0; t < h.length; t++) {
        let r = 0.8 + (t * 7919 + n) % 97 / 97 * 0.26;
        e[t * 3] = r, e[t * 3 + 1] = r * (0.97 + t * 31 % 7 / 100), e[t * 3 + 2] = r * 0.96;
      }
      let t = y(g.geo, g.mat, new InstancedBufferAttribute(e, 3));
      t.visible = !1, b.visible = !1, o[0].push(t), o[1].push(t), o[2].push(b), a.add(t, b);
    } else {
      let n = y(e.geo[1][t], e.mats[t], _.instanceColor);
      for (let e of [_, n, b]) e.visible = !1;
      o[0].push(_), o[1].push(n), o[2].push(b), a.add(_, n, b);
    }
  }
  return {
    group: a,
    setLod: e => {
      for (let e = 0; e < 3; e++) for (let t of o[e]) t.visible = !1;
      for (let t of o[e]) t.visible = !0;
    },
    dispose: () => {
      for (let e of s) e.dispose();
    },
    count: t.length,
    inst: c
  };
}

var wp = 400,
  Tp = 300,
  Ep = 1500;

function Dp(e) {
  return function () {
    e |= 0, e = e + 1831565813 | 0;
    let t = Math.imul(e ^ e >>> 15, 1 | e);
    return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var Op = (e, t) => e * 100003 + t,
  kp = class {
    constructor(e, t, n, r) {
      this.city = e, this.grid = t, this.scene = n, this.onChange = r || (() => {}), this.kit = Sp(), this.kit.onReady = () => {
        this.dirty = !0;
      }, this.kit.onNear = e => {
        this.scene.add(e);
      }, this.nearCount = 0, this.nearR = 0, this.tiles = new Map(), this.count = 0;
      let i = e.roadClasses,
        a = new Set([`pedestrian`, `footway`, `path`, `steps`, `track`, `cycleway`]),
        o = this.segGrid = new Map(),
        s = this.SC = 40;
      for (let t of e.roads) {
        if (a.has(i[t[0]])) continue;
        let e = t[4],
          n = t[1] / 2 + 1.4;
        for (let t = 2; t < e.length; t += 2) {
          let r = [e[t - 2], e[t - 1], e[t], e[t + 1], n],
            i = Math.floor((Math.min(r[0], r[2]) - n) / s),
            a = Math.floor((Math.max(r[0], r[2]) + n) / s),
            c = Math.floor((Math.min(r[1], r[3]) - n) / s),
            l = Math.floor((Math.max(r[1], r[3]) + n) / s);
          for (let e = i; e <= a; e++) for (let t = c; t <= l; t++) {
            let n = e * 1e5 + t,
              i = o.get(n);
            i || o.set(n, i = []), i.push(r);
          }
        }
      }
      let c = (e, t, n, r, i, a) => {
          for (let o = Math.floor(t / wp); o <= Math.floor(n / wp); o++) for (let t = Math.floor(r / wp); t <= Math.floor(i / wp); t++) {
            let n = Op(o, t),
              r = e.get(n);
            r || e.set(n, r = []), r.push(a);
          }
        },
        l = e => {
          let t = 1 / 0,
            n = -1 / 0,
            r = 1 / 0,
            i = -1 / 0;
          for (let a = 0; a < e.length; a += 2) t = Math.min(t, e[a]), n = Math.max(n, e[a]), r = Math.min(r, e[a + 1]), i = Math.max(i, e[a + 1]);
          return [t, n, r, i];
        };
      this.roadsBy = new Map(), this.greenBy = new Map(), this.hardBy = new Map(), this.plazas = [], e.roads.forEach((e, t) => {
        let n = i[e[0]];
        if (![`trunk`, `primary`, `secondary`, `tertiary`].includes(n) || e[5]) return;
        let [r, a, o, s] = l(e[4]);
        c(this.roadsBy, r - 12, a + 12, o - 12, s + 12, t);
      }), e.areas.forEach((e, t) => {
        let [n, r] = e,
          i = l(r[0]);
        [`park`, `wood`, `grass`].includes(n) ? c(this.greenBy, i[0], i[1], i[2], i[3], {
          kind: n,
          rings: r,
          bb: i,
          ai: t
        }) : (c(this.hardBy, i[0], i[1], i[2], i[3], {
          f: r[0],
          bb: i,
          water: n === `water`
        }), n === `civicplaza` && this.plazas.push({
          f: r[0],
          bb: i
        }));
      }), this.sea = e.sea || null;
    }
    onRoad(e, t) {
      let n = this.segGrid.get(Math.floor(e / this.SC) * 1e5 + Math.floor(t / this.SC));
      if (!n) return !1;
      for (let [r, i, a, o, s] of n) {
        let n = a - r,
          c = o - i,
          l = n * n + c * c || 1,
          u = Math.max(0, Math.min(1, ((e - r) * n + (t - i) * c) / l)),
          d = r + n * u - e,
          f = i + c * u - t;
        if (d * d + f * f < s * s) return !0;
      }
      return !1;
    }
    inSea(e, t) {
      let n = this.sea;
      if (!n) return !1;
      let r = Math.floor((e - n.x0) / n.cell),
        i = Math.floor((t - n.z0) / n.cell);
      if (i < 0 || i >= n.h) return !1;
      let a = n.rows[i];
      for (let e = 0; e < a.length; e += 2) if (r >= a[e] && r < a[e] + a[e + 1]) return !0;
      return !1;
    }
    points(e, t) {
      let {
          city: n,
          grid: r
        } = this,
        i = e * wp,
        a = i + wp,
        o = t * wp,
        s = o + wp,
        c = n.bounds;
      if (a < c.x0 || i > c.x1 || s < c.z0 || o > c.z1) return [];
      let l = Op(e, t),
        u = Dp(l * 2654435761 | 0),
        d = [],
        f = (e, t) => e >= i && e < a && t >= o && t < s,
        p = (e, t) => r.query(e, t).some(n => n.bottom < 12 && nf(e, t, n)),
        m = (e, t) => this.onRoad(e, t) || p(e, t),
        h = (e, t, n) => p(e + n, t) || p(e - n, t) || p(e, t + n) || p(e, t - n),
        g = new Set(),
        _ = (this.hardBy.get(l) || []).filter(e => e.water),
        v = (e, t, n, r, i = 4) => {
          let a = Math.floor(e / i) * 100003 + Math.floor(t / i);
          if (g.has(a)) return !1;
          for (let n of _) if (e >= n.bb[0] && e <= n.bb[1] && t >= n.bb[2] && t <= n.bb[3] && ef(e, t, n.f)) return !1;
          return g.add(a), d.push([e, t, n, r]), !0;
        },
        y = e => e < 0.42 ? 0 : e < 0.72 ? 1 : e < 0.84 ? 3 : e < 0.93 ? 4 : 2,
        b = n.roadClasses;
      for (let e of this.roadsBy.get(l) || []) {
        let t = n.roads[e],
          r = b[t[0]] !== `tertiary`,
          i = t[4],
          a = t[1] / 2 + 2.8,
          o = t[7] || String(i[0]),
          s = 0;
        for (let e of o) s = s * 31 + e.charCodeAt(0) | 0;
        let c = Math.abs(s) % 6,
          l = o.includes(`深南`),
          u = l ? 0 : c === 0 ? 2 : +(c <= 2),
          d = u === 2 ? 7 : r ? 8 : 9,
          p = Dp(e * 7919 + 13),
          g = 0;
        for (let e = 2; e < i.length; e += 2) {
          let t = i[e - 2],
            n = i[e - 1],
            o = i[e],
            s = i[e + 1],
            c = Math.hypot(o - t, s - n);
          if (c < 0.1) continue;
          let _ = -(s - n) / c,
            y = (o - t) / c;
          for (let e = d - g; e < c; e += d) {
            let i = t + (o - t) * e / c,
              d = n + (s - n) * e / c;
            for (let e of [-1, 1]) {
              let t = p(),
                n = p(),
                o = p(),
                s = p(),
                c = i + _ * a * e,
                g = d + y * a * e;
              f(c, g) && !m(c, g) && !h(c, g, 2.5) && v(c, g, u === 2 ? 0.9 + t * 0.2 : (r ? 0.78 : 0.66) + t * 0.2, u, 5);
              let b = i + _ * (a + 6.5) * e,
                x = d + y * (a + 6.5) * e;
              r && n < 0.75 && f(b, x) && !m(b, x) && !h(b, x, 3) && v(b, x, 0.7 + o * 0.4, l ? s < 0.55 ? 3 : 1 : s < 0.3 ? 3 : +(s < 0.6), 5);
            }
          }
          g = (g + c) % d;
        }
      }
      for (let e of this.greenBy.get(l) || []) {
        let t = Math.max(i, e.bb[0]),
          n = Math.min(a, e.bb[1]),
          r = Math.max(o, e.bb[2]),
          c = Math.min(s, e.bb[3]);
        if (n <= t || c <= r) continue;
        let l = e.kind === `wood` ? 1 / 75 : e.kind === `park` ? 1 / 170 : 1 / 420,
          d = Math.min(2600, Math.floor((n - t) * (c - r) * l)),
          f = e.rings[0];
        for (let i = 0; i < d; i++) {
          let i = t + u() * (n - t),
            a = r + u() * (c - r),
            o = u(),
            s = u();
          if (!ef(i, a, f)) continue;
          let l = !1;
          for (let t = 1; t < e.rings.length; t++) if (ef(i, a, e.rings[t])) {
            l = !0;
            break;
          }
          l || m(i, a) || h(i, a, 3) || e.kind !== `wood` && Math.sin(i * 0.021 + 1.3) * Math.cos(a * 0.017 + 0.4) + Math.sin(i * 0.006 - a * 0.008) * 0.6 < -0.25 || v(i, a, 0.75 + o * 0.55, e.kind === `wood` ? s < 0.6 ? 0 : 1 : y(s));
        }
      }
      for (let e of this.plazas) {
        let [t, n, r, c] = e.bb;
        if (n < i || t > a || c < o || r > s) continue;
        let l = (t + n) / 2;
        for (let t = r + 10; t < c - 10; t += 9) for (let n of [-1, 1]) for (let r = 0; r < 5; r++) {
          let i = l + n * (20 + r * 46);
          f(i, t) && ef(i, t, e.f) && !m(i, t) && v(i, t, 0.62 + u() * 0.1, 1);
        }
      }
      let x = cd(),
        S = 760 * 0.72;
      if (a > x.x - S && i < x.x + S && s > x.z - S && o < x.z + S) {
        let e = Math.floor(wp * wp * 6500 / (Math.PI * S * S));
        for (let t = 0; t < e; t++) {
          let e = i + u() * wp,
            t = o + u() * wp,
            n = u(),
            r = u();
          Math.hypot(e - x.x, t - x.z) > S || $(e, t) < 4 || m(e, t) || v(e, t, 0.8 + n * 0.6, r < 0.65 ? 0 : 1);
        }
      }
      let C = this.hardBy.get(l) || [],
        w = Math.floor(wp * wp / 300);
      for (let e = 0; e < w; e++) {
        let e = i + u() * wp,
          t = o + u() * wp,
          n = u(),
          r = u();
        if (e < c.x0 || e > c.x1 || t < c.z0 || t > c.z1 || m(e, t) || h(e, t, 9) || p(e + 6, t + 6) || p(e - 6, t - 6) || p(e + 6, t - 6) || p(e - 6, t + 6) || this.onRoad(e + 3, t) || this.onRoad(e - 3, t) || this.onRoad(e, t + 3) || this.onRoad(e, t - 3)) continue;
        let a = !1;
        for (let n of C) if (e >= n.bb[0] && e <= n.bb[1] && t >= n.bb[2] && t <= n.bb[3] && ef(e, t, n.f)) {
          a = !0;
          break;
        }
        a || this.inSea(e, t) || v(e, t, 0.65 + n * 0.5, y(r), 6);
      }
      for (let e of d) e[3] === 3 && ((Math.floor(e[0] * 3.1) + Math.floor(e[1] * 1.7)) % 5 + 5) % 5 < 2 && (e[3] = 5);
      return d.filter(e => !this.inSea(e[0], e[1]));
    }
    updateNear(e, t, n) {
      let r = this.kit,
        i = [];
      for (let a = t - 1; a <= t + 1; a++) for (let t = n - 1; t <= n + 1; t++) {
        let n = this.tiles.get(Op(a, t));
        if (n && n.tile) for (let t of n.tile.inst) {
          if (!r.near[t.sp]) continue;
          let n = t.arr;
          for (let r = 0; r < t.n; r++) {
            let a = r * 16,
              o = n[a + 12] - e.x,
              s = n[a + 13] - e.y,
              c = n[a + 14] - e.z,
              l = o * o + s * s + c * c;
            l < 3844 && i.push([l, t.sp, n, a]);
          }
        }
      }
      let a = 62;
      i.length > 150 && (i.sort((e, t) => e[0] - t[0]), a = Math.sqrt(i[150][0]), i.length = 150);
      let o = Array(r.near.length).fill(0);
      for (let [, e, t, n] of i) r.near[e].instanceMatrix.array.set(t.subarray(n, n + 16), o[e] * 16), o[e]++;
      r.near.forEach((e, t) => {
        r.cards[t] && (r.cards[t].mat.uniforms.uNearR.value = e ? a : 0), e && (e.count = o[t], e.instanceMatrix.needsUpdate = !0);
      }), this.nearCount = i.length, this.nearR = a;
    }
    update(e) {
      if (this.dirty) {
        this.dirty = !1;
        for (let e of this.tiles.values()) e.tile && (this.scene.remove(e.tile.group), e.tile.dispose(), this.count -= e.tile.count);
        this.tiles.clear();
      }
      let t = Math.max(0, e.y),
        n = Math.min(2500, 1500 + t * 1.1),
        r = Math.floor(e.x / wp),
        i = Math.floor(e.z / wp),
        a = Math.ceil(n / wp),
        o = [];
      for (let s = r - a; s <= r + a; s++) for (let r = i - a; r <= i + a; r++) {
        let i = Math.hypot((s + 0.5) * wp - e.x, (r + 0.5) * wp - e.z);
        if (i > n) continue;
        let a = Op(s, r),
          c = this.tiles.get(a);
        if (c) {
          let e = i < Tp && t < 700 ? 0 : i < Ep ? 1 : 2;
          c.lod !== e && c.tile && (c.tile.setLod(e), c.lod = e);
        } else o.push([i, s, r, a]);
      }
      if (o.length) {
        o.sort((e, t) => e[0] - t[0]);
        let e = 0;
        for (let [n, r, i, a] of o) {
          let o = this.points(r, i),
            s = {
              i: r,
              j: i,
              tile: null,
              lod: -1
            };
          if (o.length && (s.tile = Cp(this.kit, o, a), s.lod = n < Tp && t < 700 ? 0 : n < Ep ? 1 : 2, s.tile.setLod(s.lod), this.scene.add(s.tile.group), this.count += o.length), this.tiles.set(a, s), ++e >= (this.fast ? 400 : 2)) break;
        }
        this.onChange();
      }
      if (this.updateNear(e, r, i), this.tiles.size > 260) for (let [t, r] of this.tiles) Math.hypot((r.i + 0.5) * wp - e.x, (r.j + 0.5) * wp - e.z) > n + 700 && (r.tile && (this.scene.remove(r.tile.group), r.tile.dispose(), this.count -= r.tile.count), this.tiles.delete(t));
      return o.length;
    }
  },
  Ap = class {
    constructor() {
      this.P = [], this.N = [], this.U = [], this.C = [], this.C2 = [], this.M = [], this.I = [], this.FX = [], this.fx = [0, 0];
    }
    quad(e, t, n, r, i, a, o) {
      let {
          P: s,
          N: c,
          U: l,
          C: u,
          C2: d,
          M: f,
          I: p
        } = this,
        m = s.length / 3,
        h = [t[0] - e[0], t[1] - e[1], t[2] - e[2]],
        g = [r[0] - e[0], r[1] - e[1], r[2] - e[2]],
        _ = h[1] * g[2] - h[2] * g[1],
        v = h[2] * g[0] - h[0] * g[2],
        y = h[0] * g[1] - h[1] * g[0],
        b = Math.hypot(_, v, y) || 1;
      if (_ /= b, v /= b, y /= b, !a) {
        if (Math.abs(v) > 0.85) a = [e, t, n, r].map(e => [e[0], e[2]]);else {
          let o = Math.hypot(h[0], h[2]);
          if (o > 1e-4) {
            let s = h[0] / o,
              c = h[2] / o,
              l = i.u0 || 0;
            a = [e, t, n, r].map(t => [l + (t[0] - e[0]) * s + (t[2] - e[2]) * c, t[1]]);
          } else {
            let i = Math.hypot(g[0], g[2]) || 1,
              o = g[0] / i,
              s = g[2] / i;
            a = [e, t, n, r].map(t => [(t[0] - e[0]) * o + (t[2] - e[2]) * s, t[1]]);
          }
        }
      }
      let x = [e, t, n, r],
        S = i.col || [0.8, 0.8, 0.8],
        C = i.col2 || [0.2, 0.3, 0.4],
        w = i.p || [1, 1, 0];
      for (let e = 0; e < 4; e++) s.push(x[e][0], x[e][1], x[e][2]), o ? c.push(...o[e]) : c.push(_, v, y), l.push(a[e][0], a[e][1]), u.push(S[0], S[1], S[2]), d.push(C[0], C[1], C[2]), f.push(i.mat || 0, w[0], w[1], w[2] || 0), this.FX.push(i.fx ? i.fx[0] : this.fx[0], i.fx ? i.fx[1] : this.fx[1]);
      p.push(m, m + 1, m + 2, m, m + 2, m + 3);
    }
    prism(e, t, n, r, {
      cap: i = !0,
      bottom: a = !1,
      capO: o = null
    } = {}) {
      let s = e.length,
        c = 0;
      for (let i = 0; i < s; i++) {
        let a = e[i],
          o = e[(i + 1) % s],
          l = Math.hypot(o[0] - a[0], o[1] - a[1]);
        this.quad([a[0], t, a[1]], [o[0], t, o[1]], [o[0], n, o[1]], [a[0], n, a[1]], {
          ...r,
          u0: r.wrapU ? c : -l / 2
        }), c += l;
      }
      let l = o || {
        mat: 0,
        col: (r.col || [0.8, 0.8, 0.8]).map(e => e * 0.9)
      };
      for (let [r, o] of [[i, n], [a, t]]) if (r) for (let t = 1; t < s - 1; t += 2) {
        let n = e[0],
          r = e[t],
          i = e[t + 1],
          a = e[Math.min(t + 2, s - 1)];
        this.quad([n[0], o, n[1]], [r[0], o, r[1]], [i[0], o, i[1]], [a[0], o, a[1]], l);
      }
    }
    box(e, t, n, r, i, a, o, s) {
      this.prism([[e, i], [t, i], [t, a], [e, a]], n, r, o, s);
    }
    strut(e, t, n, r) {
      let i = new Vector3(t[0] - e[0], t[1] - e[1], t[2] - e[2]),
        a = Math.abs(i.y) / i.length() > 0.95 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0),
        o = new Vector3().crossVectors(i, a).normalize().multiplyScalar(n / 2),
        s = new Vector3().crossVectors(i, o).normalize().multiplyScalar(n / 2),
        c = (e, t, n) => [e[0] + o.x * t + s.x * n, e[1] + o.y * t + s.y * n, e[2] + o.z * t + s.z * n],
        l = [[-1, -1], [1, -1], [1, 1], [-1, 1]],
        u = i.length();
      for (let i = 0; i < 4; i++) {
        let [a, o] = l[i],
          [s, d] = l[(i + 1) % 4];
        this.quad(c(e, a, o), c(e, s, d), c(t, s, d), c(t, a, o), r, [[0, 0], [n, 0], [n, u], [0, u]]);
      }
    }
    build() {
      let e = new BufferGeometry();
      return e.setAttribute(`position`, new Float32BufferAttribute(this.P, 3)), e.setAttribute(`normal`, new Float32BufferAttribute(this.N, 3)), e.setAttribute(`uv`, new Float32BufferAttribute(this.U, 2)), e.setAttribute(`aCol`, new Float32BufferAttribute(this.C, 3)), e.setAttribute(`aCol2`, new Float32BufferAttribute(this.C2, 3)), e.setAttribute(`aMat`, new Float32BufferAttribute(this.M, 4)), e.setAttribute(`aFx`, new Float32BufferAttribute(this.FX, 2)), e.setIndex(this.I), e.computeBoundingSphere(), e.computeBoundingBox(), e;
    }
  },
  jp = null;

function Mp() {
  return jp || (jp = new ShaderMaterial({
    uniforms: _d(),
    side: 2,
    vertexShader: `
      attribute vec3 aCol; attribute vec3 aCol2; attribute vec4 aMat; attribute vec2 aFx;
      varying vec2 vUv; varying vec3 vCol; varying vec3 vCol2; varying vec4 vMat; varying vec3 vN; varying vec3 vWorld; varying vec2 vFx;
      void main(){
        vUv = uv; vCol = aCol; vCol2 = aCol2; vMat = aMat; vFx = aFx;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      ${bd}
      varying vec2 vUv; varying vec3 vCol; varying vec3 vCol2; varying vec4 vMat; varying vec3 vN; varying vec3 vWorld; varying vec2 vFx;
      // 周期 per 的细线，线宽 w（同单位），带抗锯齿
      float lines(float x, float per, float w){
        float f = fract(x / per) * per;
        float fw = fwidth(x) + 1e-4;
        return 1.0 - smoothstep(w - fw, w + fw, min(f, per - f) * 2.0);
      }
      float lodOf(float x, float per){ return clamp(fwidth(x) / per * 1.6, 0.0, 1.0); }
      vec3 glass(vec3 tint, vec3 n, vec3 V, vec2 id, float lodF){
        vec2 j = (vec2(hash21(id), hash21(id * 1.7 + 3.0)) - 0.5) * 0.035 * lodF;
        vec3 t1 = normalize(vec3(-n.z, 0.0, n.x) + vec3(1e-4, 0.0, 0.0));
        vec3 np = normalize(n + t1 * j.x + vec3(0.0, j.y, 0.0));
        vec3 R = reflect(V, np);
        vec3 refl = envRefl(R, vWorld.y);
        float fres = pow(1.0 - max(dot(-V, n), 0.0), 4.0);
        float ndl = max(dot(n, uSunDir), 0.0) * gShadow;
        vec3 g = (tint + (hash21(id + 9.0) - 0.5) * 0.05 * lodF) * (0.6 + 0.8 * ndl);
        // 夜里玻璃是深色底：压低对夜空的反射，免得整栋楼泛紫
        // 很深的玻璃（如大疆天空之城）少反射一些天空，保持照片里那种近黑色
        float dk = smoothstep(0.03, 0.12, dot(tint, vec3(0.333)));
        return mix(g, refl * mix(vec3(1.0), tint * 1.5 + 0.4, 0.4), clamp(0.46 + fres * 0.5, 0.0, 1.0) * (1.0 - 0.6 * uNight) * mix(0.42, 1.0, dk));
      }
      float boxm(vec2 f, vec2 lo, vec2 hi, vec2 fw){
        vec2 mm = smoothstep(lo - fw, lo + fw, f) * (1.0 - smoothstep(hi - fw, hi + fw, f));
        return mm.x * mm.y;
      }
      void main(){
        int m = int(vMat.x + 0.5);
        // 立面号 = 变体 × 10 + 样式；样式 5~9 是第 4 轮新增的（阳台节奏、竖向条窗、彩色板格、遮阳横带、错位窗）
        float p1 = vMat.y, p2 = vMat.z; int sraw = int(vMat.w + 0.5); int var = sraw / 10; int style = sraw - var * 10;
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        vec3 V = normalize(vWorld - cameraPosition);
        gShadow = sunShadow(vWorld, n);
        vec3 col; float spec = 0.0;
        vec2 p = vUv;
        if (m == 1) {
          // 金属板
          float j = 0.0;
          if (style == 1) j = lines(p.y, p2, p2 * 0.42) * (1.0 - lodOf(p.y, p2)) * 0.55;
          else {
            j = lines(p.x, p1, 0.07) * (1.0 - lodOf(p.x, p1));
            if (style == 0) j = max(j, lines(p.y, p2, 0.07) * (1.0 - lodOf(p.y, p2)));
            j *= 0.5;
          }
          vec2 id = floor(p / vec2(p1, p2));
          vec3 alb = vCol * (0.96 + 0.07 * hash21(id) * (1.0 - lodOf(p.x, p1)));
          col = lightIt(alb * (1.0 - j), n);
          vec3 R = reflect(V, n);
          float fres = pow(1.0 - max(dot(-V, n), 0.0), 3.0);
          col = mix(col, skyColor(vec3(R.x, abs(R.y) * 0.6 + 0.25, R.z)) * (0.5 + 0.5 * vCol), 0.10 + 0.22 * fres);
          spec = 0.9;
        } else if (m == 2) {
          float lodx = lodOf(p.x, p1), lody = lodOf(p.y, p2);
          float lodF = 1.0 - max(lodx, lody);
          vec2 id = floor(p / vec2(p1, p2));
          vec3 g = glass(vCol2, n, V, id, lodF);
          // 墙面带一点雨痕色差，不是一整片纯色
          vec3 frame = lightIt(vCol * (1.0 - 0.08 * smoothstep(0.45, 1.0, vnoise(vec2(p.x * 0.45, p.y * 0.05))) * lodF), n);
          frame *= 1.0 - 0.5 * uNight; // 夜里框料压暗，楼体是深色底，亮的只有窗
          float fl = fract(p.y / p2);
          vec2 f = fract(p / vec2(p1, p2));
          vec2 fw = fwidth(p / vec2(p1, p2)) * 1.2 + 1e-4;
          float lit = 0.35 + 0.65 * gShadow * step(0.0, dot(n, uSunDir));
          // 住宅窗、实墙窗用的暗玻璃：只留三成天空反射，侧看不再是蓝白格子
          vec3 gd = mix(lightIt(vCol2 * 1.2, n) * 0.85 + vCol2 * 0.12, g, 0.30);
          if (uNight > 0.0) {
            // 夜景窗灯：住宅一窗一灯；写字楼三格一组，整层亮的更多
            bool home = style == 2 || style == 5 || style == 9;
            vec2 wid = home ? id : vec2(floor(id.x / 3.0), id.y);
            float bs = floor(vWorld.x / 37.0) + floor(vWorld.z / 41.0) * 3.0 + vFx.y * 9.0;
            vec3 wl = winLight(wid, bs);
            if (!home) wl = max(wl, step(0.70, hash11(id.y * 7.3 + bs)) * mix(vec3(1.0, 0.80, 0.50), vec3(0.85, 0.92, 1.0), step(0.8, hash11(id.y * 3.1 + bs))) * 0.60);
            wl = uNight * mix(vec3(0.17, 0.105, 0.04), wl, lodF) * 1.1;
            g += wl; gd += wl;
          }
          if (style == 2) {
            // 实墙开窗：变体决定窗的比例（方窗 / 横长窗 / 竖长窗 / 双联窗）
            vec2 lo = vec2(0.2, 0.22), hi = vec2(0.8, 0.80);
            if (var == 1) { lo = vec2(0.10, 0.26); hi = vec2(0.90, 0.78); }
            else if (var == 2) { lo = vec2(0.30, 0.12); hi = vec2(0.70, 0.88); }
            else if (var == 3) { lo = vec2(0.13, 0.30); hi = vec2(0.87, 0.74); }
            float win = boxm(f, lo, hi, fw);
            if (var == 3) win *= smoothstep(0.025 - fw.x, 0.025 + fw.x, abs(f.x - 0.5));
            // 窗洞有进深：窗上沿和两侧压一道阴影，窗台一条亮边，楼层之间一道分缝，每 4 开间一根略深的壁柱
            float topSh = smoothstep(hi.y - 0.14, hi.y, f.y) * 0.50 + (1.0 - smoothstep(lo.x, lo.x + 0.07, f.x)) * 0.22 + smoothstep(hi.x - 0.07, hi.x, f.x) * 0.22;
            vec3 gw = gd * (1.0 - topSh * lit * lodF);
            vec3 fr = frame * (1.0 - 0.10 * lines(p.y, p2, 0.10) * lodF);
            fr *= 1.0 - 0.07 * step(mod(id.x, 4.0), 0.5) * lodF;
            float sill = (smoothstep(lo.y - 0.07, lo.y - 0.05, f.y) - smoothstep(lo.y - 0.02, lo.y, f.y)) * step(lo.x, f.x) * step(f.x, hi.x) * lodF;
            fr = mix(fr, frame * 1.10, sill);
            col = mix(fr, gw, mix(win, (hi.x - lo.x) * (hi.y - lo.y), 1.0 - lodF));
            spec = 0.3;
          } else if (style == 5) {
            // 住宅阳台节奏：每 2~4 开间一个内凹阳台（实体栏板或玻璃栏板），其余是窗
            float per = 2.0 + float(var - (var / 3) * 3);
            bool balc = mod(id.x, per) < 0.5;
            vec3 wall = frame * (1.0 - 0.10 * lines(p.y, p2, 0.10) * lodF);
            if (balc) {
              float open = boxm(f, vec2(0.06, -0.5), vec2(0.94, 0.90), fw);
              float rail = 1.0 - smoothstep(0.36 - fw.y, 0.36 + fw.y, f.y);
              vec3 inner = gd * 0.55 * (1.0 - 0.4 * smoothstep(0.6, 0.9, f.y) * lit);
              vec3 railc = var >= 3 ? mix(gd * 1.3 + 0.06, frame, 0.25) : frame * 1.06;
              vec3 c2 = mix(inner, railc, rail);
              c2 = mix(c2, frame * 1.12, (smoothstep(0.33, 0.35, f.y) - smoothstep(0.38, 0.40, f.y)) * lodF);
              col = mix(wall, c2, mix(open, 0.5, 1.0 - lodF));
            } else {
              float win = boxm(f, vec2(0.22, 0.30), vec2(0.78, 0.80), fw);
              col = mix(wall, gd * (1.0 - smoothstep(0.66, 0.80, f.y) * 0.45 * lit * lodF), mix(win, 0.28, 1.0 - lodF));
            }
            spec = 0.15;
          } else if (style == 6) {
            // 竖向条窗：实墙壁柱之间通高的窄窗，层间是深色窗槛
            float a6 = var == 1 ? 0.36 : (var == 2 ? 0.20 : 0.28);
            float slot = smoothstep(a6 - fw.x, a6 + fw.x, f.x) * (1.0 - smoothstep(1.0 - a6 - fw.x, 1.0 - a6 + fw.x, f.x));
            float sp6 = 1.0 - smoothstep(0.20 - fw.y, 0.20 + fw.y, f.y);
            vec3 gl = mix(g, gd, 0.5) * (1.0 - 0.30 * (1.0 - smoothstep(a6, a6 + 0.07, f.x)) * lit * lodF);
            vec3 inner = mix(gl, frame * 0.70, sp6 * (1.0 - lody));
            col = mix(frame, inner, mix(slot, 1.0 - 2.0 * a6, lodx));
            spec = 0.4;
          } else if (style == 7) {
            // 板格幕墙：层间不透明窗槛板 + 随机的彩色板块
            float sp7 = 1.0 - smoothstep(0.30 - fw.y, 0.30 + fw.y, f.y);
            float acc = step(var == 1 ? 0.70 : (var == 2 ? 0.93 : 0.84), hash21(id + 3.7));
            vec3 pan = lightIt(mix(vCol, clamp(vCol2 * 2.4, 0.0, 1.0), 0.65), n);
            col = mix(g, frame * 0.86, sp7);
            col = mix(col, pan, acc * (1.0 - sp7));
            col = mix(col, frame, max(lines(p.x, p1, 0.10), lines(p.y, p2, 0.12)) * 0.9);
            col = mix(col, mix(g, frame * 0.9, 0.42), 1.0 - lodF);
            spec = 0.8;
          } else if (style == 8) {
            // 遮阳横带：每层一道挑出的遮阳板，板下压着阴影
            float band = smoothstep(0.30 - fw.y, 0.30 + fw.y, f.y) * (1.0 - smoothstep(0.84 - fw.y, 0.84 + fw.y, f.y));
            vec3 gl = g * (1.0 - smoothstep(0.60, 0.84, f.y) * 0.5 * lit * lodF);
            col = mix(frame, gl, mix(band, 0.54, lody));
            col = mix(col, frame * 1.12, (smoothstep(0.84, 0.86, f.y) - smoothstep(0.93, 0.95, f.y)) * (1.0 - lody));
            col = mix(col, frame * 0.8, lines(p.x, p1 * 2.0, 0.08) * (1.0 - lodx) * band * 0.6);
            spec = 0.6;
          } else if (style == 9) {
            // 错位窗：奇偶层错开半个开间
            vec2 f9 = fract(vec2(p.x + mod(id.y, 2.0) * p1 * 0.5, p.y) / vec2(p1, p2));
            float win = boxm(f9, vec2(0.12, 0.20), vec2(var == 1 ? 0.50 : 0.62, 0.84), fw);
            col = mix(frame * (1.0 - 0.08 * lines(p.y, p2, 0.08) * lodF), gd * (1.0 - smoothstep(0.70, 0.84, f9.y) * 0.45 * lit * lodF), mix(win, 0.3, 1.0 - lodF));
            spec = 0.2;
          } else if (style == 4) {
            // 横向带窗：实体窗槛墙 + 通长玻璃
            float fwy = fwidth(p.y / p2) * 1.2 + 1e-4;
            float band = smoothstep(0.52 - fwy, 0.52 + fwy, fl);
            col = mix(g, frame, mix(band, 0.48, lody));
            col = mix(col, frame * 0.8, lines(p.x, p1, 0.09) * (1.0 - lodx) * (1.0 - band) * 0.8);
            spec = 0.5;
          } else {
            float sp = smoothstep(0.76, 0.79, fl) * (1.0 - lody);
            col = mix(g, g * 0.62 + vCol2 * 0.12, sp);
            float mw = style == 3 ? 0.34 : 0.11;
            float mull = lines(p.x, p1, mw);
            col = mix(col, frame, mix(mull, mw / p1, lodx) * (style == 3 ? 1.0 : 0.85));
            col = mix(col, frame * 0.8, lines(p.y, p2, 0.16) * (1.0 - lody) * 0.75);
            if (style == 1) {
              // 斜撑：每 8 层一组人字形不锈钢斜杆
              float per = p2 * 8.0;
              float t = fract(p.y / per);
              float zig = abs(fract(p.x / (p1 * 12.0) + 0.5) - 0.5) * 2.0;
              float dd = abs(t - zig) * per;
              float fwv = fwidth(p.y) + 0.02;
              col = mix(col, frame * 1.04, 1.0 - smoothstep(0.55 - fwv, 0.55 + fwv, dd));
            }
            spec = 1.0;
          }
        } else if (m == 3) {
          float j = max(lines(p.x + floor(p.y / p2) * p1 * 0.5, p1, 0.05), lines(p.y, p2, 0.05)) * (1.0 - max(lodOf(p.x, p1), lodOf(p.y, p2)));
          vec2 id = floor(vec2(p.x + floor(p.y / p2) * p1 * 0.5, p.y) / vec2(p1, p2));
          vec3 alb = vCol * (0.94 + 0.09 * hash21(id) + 0.05 * vnoise(p * 2.0)) * (1.0 - j * 0.3);
          col = lightIt(alb, n);
          spec = 0.12;
        } else {
          col = lightIt(vCol * (0.97 + 0.06 * vnoise(vWorld.xz * 0.8 + vWorld.y)), n);
        }
        vec3 Hh = normalize(uSunDir - V);
        col += spec * gShadow * pow(max(dot(n, Hh), 0.0), 70.0) * 0.5 * (1.0 - uNight * 0.8);
        if (uNight > 0.0) {
          // 路灯把贴近地面的几层照暖
          col += uNight * vec3(0.26, 0.17, 0.07) * exp(-max(vWorld.y, 0.0) / 11.0) * 0.7;
          // 冲击波扫过时，所有精修楼的立面都被波前照亮一下
          { float wr = waveRadius(); if (wr >= 0.0) col += uNight * vec3(0.30, 0.75, 1.0) * exp(-pow((distance(vWorld.xz, uWave.xy) - wr) / 55.0, 2.0)) * 0.45 * clamp(1.4 - wr / 8000.0, 0.2, 1.0); }
          // 灯光组 5（第 5j 轮，春笋专用）：和组 1 一样出竖排字，但字带更密、字更大，点亮后把字带以外的窗灯压暗，字才读得出来
          bool bigText = vFx.x > 4.5;
          if (((vFx.x > 0.5 && vFx.x < 1.5) || bigText) && m == 2) {
            // 媒体幕墙：把幕墙分格当 LED 像素，跟着全城灯光秀走
            // 第 5 轮：出字的楼把底图收干净（压暗、去掉硬条纹），竖排大字是主体；vFx.y = 字高（米）
            vec2 cid = floor(p / vec2(p1, p2));
            vec2 cf = fract(p / vec2(p1, p2));
            float px = 0.78 + 0.22 * smoothstep(0.04, 0.14, cf.x) * smoothstep(0.04, 0.14, cf.y) * (1.0 - lodOf(p.x, p1));
            float ts = max(vFx.y, 4.0);
            vec3 sc = showColor(cid, p.y, vWorld, fract(ts * 0.37));
            // 打磨：出字的楼不再整面刷表演色。字列以外保留深玻璃 + 暖窗点，只叠一成表演色；
            // 字列是深色底板 + 亮白偏金的字，两侧各一道青色细边光
            float kS = floor((vFx.x - (bigText ? 5.0 : 1.0)) / 0.05 + 0.5);       // 这栋楼起始的文案号（0~7）
            float wm = bigText ? 4.0 : 6.0;
            vec3 tx = showTextV(p, ts, kS, wm);
            vec3 panel = vec3(0.006, 0.010, 0.030);
            float W5 = wm * ts; float u5 = abs(mod(p.x + W5 * 0.5, W5) - W5 * 0.5);
            float edge = (smoothstep(ts * 0.60, ts * 0.63, u5) - smoothstep(ts * 0.66, ts * 0.69, u5)) * (0.7 + 0.3 * sin(uTime * 0.9 + p.y * 0.02));
            // 5g：四种光线花样，按楼分配；都只当配角，亮度压在字之下
            float pat = mod(kS + floor(fract(ts * 7.31) * 4.0), 4.0);
            vec3 fxc;
            if (pat < 0.5) {
              // 潮汐扫光：一道青色光带自下而上扫过
              float bnd = exp(-pow((fract(p.y / 240.0 - uTime * 0.22 + fract(ts * 0.37)) - 0.5) * 9.0, 2.0));
              fxc = vec3(0.10, 0.85, 1.0) * bnd * 0.55 + vec3(0.0, 0.05, 0.12);
            } else if (pat < 1.5) {
              // 彩带：品红和金色两股斜向飘带
              float w1 = sin(p.x * 0.16 + p.y * 0.055 - uTime * 1.6), w2 = sin(-p.x * 0.12 + p.y * 0.04 - uTime * 1.1 + 2.0);
              fxc = vec3(1.0, 0.25, 0.65) * smoothstep(0.55, 1.0, w1) * 0.42 + vec3(1.0, 0.75, 0.20) * smoothstep(0.60, 1.0, w2) * 0.42;
            } else if (pat < 2.5) {
              // 像素点阵：幕墙分格随机闪烁，青绿为主，偶尔白
              float hpx = hash21(cid + floor(uTime * 2.5) * 7.0);
              fxc = (hpx > 0.94 ? vec3(0.9, 1.0, 1.0) : vec3(0.10, 0.90, 0.60)) * step(0.80, hpx) * 0.5;
            } else {
              // 金红 / 青绿轮换：整面缓慢换色，带竖向渐变
              float g1 = fract(p.y / 90.0 - uTime * 0.05);
              vec3 warm = mix(vec3(0.85, 0.10, 0.06), vec3(1.0, 0.72, 0.18), g1), cool = mix(vec3(0.05, 0.75, 0.55), vec3(0.10, 0.60, 1.0), g1);
              fxc = mix(warm, cool, smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(uTime * 0.55 + vWorld.x * 0.002))) * 0.30;
            }
            fxc *= bigText ? 0.25 : clamp(ts / 12.0, 0.4, 1.0); // 字小的楼花样压暗一些，字才读得出来
            // 字色按句子轮换：暖白 / 金 / 青白
            float km = mod(tx.z, 3.0);
            vec3 tcol = km < 0.5 ? vec3(1.0, 0.96, 0.84) : (km < 1.5 ? vec3(1.0, 0.82, 0.42) : vec3(0.80, 1.0, 1.0));
            vec3 lit = mix(col * (bigText ? 0.30 : 1.0) + (fxc + sc * 0.05) * px, panel, tx.y) + tcol * tx.x * (bigText ? 1.35 : 1.1) + vec3(0.10, 0.85, 1.0) * edge * 0.8;
            // 5c：没被点亮的楼只是普通夜窗；点亮后从击中点（或冲击波）向外扩散，前沿是一道青白色的亮带
            vec2 ig = ignition(vWorld);
            col = mix(col, mix(col, lit, ig.x) + vec3(0.55, 0.95, 1.0) * ig.y * 1.3, uNight);
          } else if (vFx.x > 3.5 && vFx.x < 4.5) {
            // 横排大字屏（市民中心正面）
            vec3 tx = showTextH(p, max(vFx.y, 3.0), floor((vFx.x - 4.0) / 0.05 + 0.5));
            vec3 sc = showColor(floor(p / 3.0), p.y, vWorld, 0.3);
            vec3 bg = mix(sc * 0.06 + vec3(0.03, 0.022, 0.012), vec3(0.006, 0.010, 0.030), tx.y * 0.9);
            float km = mod(tx.z, 3.0);
            vec3 tcol = km < 0.5 ? vec3(1.0, 0.96, 0.84) : (km < 1.5 ? vec3(1.0, 0.82, 0.42) : vec3(0.80, 1.0, 1.0));
            vec2 ig = ignition(vWorld);
            col = mix(col, mix(col, bg + tcol * tx.x, ig.x) + vec3(0.55, 0.95, 1.0) * ig.y * 1.3, uNight * 0.94);
          } else if (vFx.x > 1.5 && vFx.x < 2.5) {
            // 招牌灯箱：自身颜色发光，个别在闪
            float fl2 = 0.88 + 0.12 * step(0.5, fract(uTime * (0.6 + vFx.y * 2.0) + vFx.y * 7.0)) * step(0.8, vFx.y);
            col = mix(col, (vCol * 1.12 + 0.06) * fl2, uNight * 0.92);
          } else if (vFx.x > 2.5 && vFx.x < 3.5) {
            col = mix(col, stripColor(vFx.y, vWorld), uNight * 0.95);
          }
        }
        gl_FragColor = vec4(atmo(col, vWorld), 1.0);
      }`
  }), jp);
}

function Np(e, t, n, r, i, a) {
  let o = Math.cos(e.ang || 0),
    s = Math.sin(e.ang || 0),
    c = t.map(([t, n]) => new Vector2(e.x + o * t - s * n, e.z + s * t + o * n)),
    l = c.map(e => e.x),
    u = c.map(e => e.y);
  return {
    rings: [c],
    minX: Math.min(...l),
    maxX: Math.max(...l),
    minZ: Math.min(...u),
    maxZ: Math.max(...u),
    bottom: n,
    top: r,
    name: i,
    h: a
  };
}

var Pp = (e, t, n, r) => [[e, n], [t, n], [t, r], [e, r]],
  Fp = [0.8, 0.82, 0.85],
  Ip = [0.74, 0.76, 0.79],
  Lp = [0.9, 0.9, 0.88],
  Rp = [0.3, 0.32, 0.35],
  zp = (e, t, n) => Math.max(t, Math.min(n, e));

function Bp(e, t, n, r) {
  for (let i = 0; i < t.length - 1; i++) {
    let a = t[i],
      o = t[i + 1],
      s = a.ring.length;
    for (let t = 0; t < s; t++) {
      let i = a.ring[t],
        c = a.ring[(t + 1) % s],
        l = o.ring[(t + 1) % s],
        u = o.ring[t],
        d = Math.hypot(c[0] - i[0], c[1] - i[1]),
        f = Math.hypot(l[0] - u[0], l[1] - u[1]),
        p = n(t, a.y, o.y);
      if (!p) continue;
      let m = r ? [[r(t), a.y], [r(t + 1), a.y], [r(t + 1), o.y], [r(t), o.y]] : [[-d / 2, a.y], [d / 2, a.y], [f / 2, o.y], [-f / 2, o.y]];
      e.quad([i[0], a.y, i[1]], [c[0], a.y, c[1]], [l[0], o.y, l[1]], [u[0], o.y, u[1]], p, m);
    }
  }
}

var Vp = (e, t, n = 0, r = 0, i = 0) => Array.from({
    length: t
  }, (a, o) => [n + Math.cos(o / t * Math.PI * 2 + i) * e, r + Math.sin(o / t * Math.PI * 2 + i) * e]),
  Hp = (e, t, n = 0, r = 0) => [[n - e, r + t], [n + e, r + t], [n + e, r - t], [n - e, r - t]];

function Up(e, t, n, r, i = 0, a = 0) {
  let o = t.length;
  for (let s = 0; s < o; s += 2) e.quad([i, n, a], [t[s][0], n, t[s][1]], [t[(s + 1) % o][0], n, t[(s + 1) % o][1]], [t[(s + 2) % o][0], n, t[(s + 2) % o][1]], r);
}

function Wp(e, t, n, r) {
  let i = $(t.x, t.z),
    a = new Mesh(e.build(), Mp());
  a.position.set(t.x, i, t.z), a.rotation.y = -t.ang, a.renderOrder = 5;
  for (let e of n) e.bottom += i, e.top += i, e.h = r, e.name = t.name;
  return {
    mesh: a,
    colliders: n
  };
}

var Gp = (e, t, n, r, i, a, o = !0) => {
  e.strut([t, r, n], [t, i, n], a, {
    mat: 0,
    col: Fp
  }), o && e.strut([t, i, n], [t, i + 1.5, n], a * 0.6, {
    mat: 0,
    col: [0.9, 0.2, 0.15]
  });
};

function Kp(e) {
  let t = 441.8,
    n = zp(e.L / 2, 30, 38),
    r = zp(e.W / 2, 19, 24),
    i = new Ap();
  i.fx = [1.2, 24];
  let a = [0.1, 0.22, 0.38],
    o = [0.16, 0.3, 0.46],
    s = e => e <= 352 ? r * (1 + 0.035 * Math.sin(e / 352 * Math.PI)) : Math.max(0.8, r * Math.sqrt(Math.max(0, 1 - ((e - 352) / 89.80000000000001) ** 2))),
    c = e => {
      let t = s(e),
        r = Math.min(2.2, t * 0.4);
      return [[-n + r, t], [n - r, t], [n, t - r], [n, -t + r], [n - r, -t], [-n + r, -t], [-n, -t + r], [-n, t - r]];
    },
    l = [0, 18, 96, 104, 196, 204, 296, 304, 352];
  for (let e = 1; e <= 14; e++) l.push(352 + 89.80000000000001 * (1 - (1 - e / 14) ** 1.6));
  let u = l.map(e => ({
      y: e,
      ring: c(e)
    })),
    d = e => e >= 96 && e < 104 || e >= 196 && e < 204 || e >= 296 && e < 304;
  Bp(i, u, (e, t) => {
    if (d(t)) return {
      mat: 1,
      col: [0.46, 0.5, 0.55],
      p: [3, 0.7, 1]
    };
    if (t < 18) return {
      mat: 2,
      col: Fp,
      col2: [0.1, 0.15, 0.2],
      p: [3, 9, 3]
    };
    let n = e === 0 || e === 4;
    return t >= 352 ? n ? {
      mat: 2,
      col: Fp,
      col2: o,
      p: [1.5, 4.2, 3]
    } : {
      mat: 2,
      col: Fp,
      col2: o,
      p: [1.5, 4.2, 0]
    } : n ? {
      mat: 2,
      col: Ip,
      col2: a,
      p: [1.5, 4.2, 0]
    } : e % 2 ? {
      mat: 1,
      col: Fp,
      p: [2.2, 4.2, 0]
    } : {
      mat: 2,
      col: Ip,
      col2: a,
      p: [1.5, 4.2, 3]
    };
  });
  let f = {
    mat: 1,
    col: Fp,
    p: [6, 4.2, 0],
    fx: [0, 0]
  };
  for (let e of [1, -1]) for (let t = 0; t <= 12; t++) {
    let r = -n + 2.6 + (2 * n - 5.2) * t / 12,
      a = t % 3 == 0 ? 1 : 0.5,
      o = t % 3 == 0 ? 0.9 : 0.5;
    for (let t = 1; t < u.length - 1; t++) {
      let n = u[t].y,
        c = u[t + 1].y,
        l = s(n) * e,
        d = s(c) * e,
        p = Math.atan2(Math.abs(l) - Math.abs(d), c - n),
        m = Math.cos(p) * e,
        h = Math.sin(p),
        g = [r - a / 2, n + h * o, l + m * o],
        _ = [r + a / 2, n + h * o, l + m * o],
        v = [r + a / 2, c + h * o, d + m * o],
        y = [r - a / 2, c + h * o, d + m * o];
      i.quad(g, _, v, y, f), i.quad([r - a / 2, n, l], g, y, [r - a / 2, c, d], f), i.quad(_, [r + a / 2, n, l], [r + a / 2, c, d], v, f);
    }
  }
  i.box(-n, n, 441.2, 442.3, -1, 1, {
    mat: 0,
    col: Fp
  }), i.box(-n - 4, n + 4, -2, 0.6, -r - 4, r + 4, {
    mat: 3,
    col: [0.7, 0.69, 0.67],
    p: [2.4, 0.3]
  });
  for (let e of [1, -1]) i.box(-14, 14, 8.6, 9.2, e > 0 ? r : -r - 5, e > 0 ? r + 5 : -r, {
    mat: 0,
    col: Fp
  }, {
    bottom: !0
  });
  let p = [],
    m = [0, 120, 240, 352, 385, 410, 428, t];
  for (let t = 0; t < m.length - 1; t++) p.push(Np(e, c(m[t] < 352 ? m[t] : (m[t] + m[t + 1]) / 2), t === 0 ? -2 : m[t], m[t + 1]));
  return Wp(i, e, p, t);
}

function qp(e) {
  let t = 392.5,
    n = zp(Math.max(e.L, e.W) / 2 / 34, 0.85, 1.15),
    r = [[0, 30.5], [30, 32.5], [90, 34], [170, 33.4], [240, 31], [290, 27.2], [330, 21.5], [356, 15], [374, 8.6], [386, 3.4], [t, 0.5]],
    i = e => {
      for (let t = 1; t < r.length; t++) if (e <= r[t][0]) {
        let i = (e - r[t - 1][0]) / (r[t][0] - r[t - 1][0]);
        return (r[t - 1][1] + (r[t][1] - r[t - 1][1]) * i) * n;
      }
      return 0.5;
    },
    a = new Ap(),
    o = 2 * Math.PI * 34;
  a.fx = [5.1, o / 12];
  let s = [0.22, 0.34, 0.44],
    c = [0.84, 0.84, 0.82],
    l = [0, 15, 30, 60, 90, 130, 170, 205, 240, 265, 290, 310, 330, 343, 356, 365, 374, 380, 386, t].map(e => ({
      y: e,
      ring: Vp(i(e), 56)
    }));
  Bp(a, l, (e, t) => t < 30 ? {
    mat: 2,
    col: c,
    col2: [0.1, 0.15, 0.2],
    p: [1.7, 7.5, 0]
  } : t >= 374 ? {
    mat: 2,
    col: Fp,
    col2: [0.34, 0.46, 0.56],
    p: [0.5, 3, 0]
  } : {
    mat: 2,
    col: c,
    col2: s,
    p: [3.6, 4.5, 0]
  }, t => (t / 56 - (Math.PI / 2 - e.ang) / (2 * Math.PI)) * o);
  let u = {
    mat: 1,
    col: c,
    p: [4, 4.5, 2],
    fx: [0, 0]
  };
  for (let e = 0; e < 56; e++) {
    let t = e / 56 * Math.PI * 2,
      n = (e, n, r = 0) => {
        let a = i(e) + n;
        return [Math.cos(t + r) * a, e, Math.sin(t + r) * a];
      };
    for (let e = 2; e < l.length - 1; e++) {
      let t = l[e].y,
        r = l[e + 1].y,
        o = Math.min(0.55, i(t) * 0.04),
        s = Math.min(0.55, i(r) * 0.04),
        c = Math.min(0.3, i(t) * 0.02) + 0.1,
        d = Math.min(0.3, i(r) * 0.02) + 0.1,
        f = o / Math.max(1, i(t)) / 2,
        p = s / Math.max(1, i(r)) / 2;
      a.quad(n(t, c, -f), n(t, c, f), n(r, d, p), n(r, d, -p), u), a.quad(n(t, -0.1, -f), n(t, c, -f), n(r, d, -p), n(r, -0.1, -p), u), a.quad(n(t, c, f), n(t, -0.1, f), n(r, -0.1, p), n(r, d, p), u);
    }
    let r = Math.PI * 2 / 56,
      o = n(30, 0.5),
      s = n(0, 0.6, e % 2 ? r : -r);
    a.strut(s, o, 1, {
      mat: 0,
      col: c
    });
  }
  for (let e of [90, 170, 240, 290]) {
    let t = Vp(i(e) + 0.35, 56);
    a.prism(t, e - 0.5, e + 0.5, {
      mat: 0,
      col: c,
      wrapU: !0
    }, {
      cap: !1
    });
  }
  Gp(a, 0, 0, 390.5, 398.5, 0.5), a.prism(Vp(i(0) + 6, 32), -2, 0.5, {
    mat: 3,
    col: [0.72, 0.71, 0.69],
    p: [2.4, 0.3],
    wrapU: !0
  }, {
    cap: !1
  }), Up(a, Vp(i(0) + 6, 32), 0.5, {
    mat: 3,
    col: [0.7, 0.69, 0.67],
    p: [1.2, 1.2]
  });
  let d = [],
    f = [0, 90, 240, 290, 330, 356, 374, t];
  for (let t = 0; t < f.length - 1; t++) d.push(Np(e, Vp(i(t < 2 ? 90 : (f[t] + f[t + 1]) / 2) + 0.8, 20), t === 0 ? -2 : f[t], f[t + 1]));
  return Wp(a, e, d, t);
}

function Jp(e) {
  let t = 383.95,
    n = zp(e.L / 2, 30, 38),
    r = zp(e.W / 2, 15, 19),
    i = r * 0.8,
    a = n - i,
    o = new Ap();
  o.fx = [1.3, 15];
  let s = [0.08, 0.27, 0.24],
    c = [0.12, 0.34, 0.3],
    l = {
      mat: 2,
      col: Ip,
      col2: s,
      p: [1.6, 3.9, 4]
    };
  o.box(-n - 8, n + 8, -2, 22, -r - 10, r + 10, {
    mat: 2,
    col: [0.78, 0.78, 0.76],
    col2: [0.1, 0.2, 0.2],
    p: [3, 5.5, 4],
    wrapU: !0
  }, {
    capO: {
      mat: 3,
      col: [0.56, 0.57, 0.58],
      p: [3, 3]
    }
  }), o.box(-n - 8.6, n + 8.6, 21.6, 22.8, -r - 10.6, r + 10.6, {
    mat: 0,
    col: Ip
  }, {
    bottom: !0
  });
  let u = a - 2,
    d = [22, 118, 123, 215, 220, 298];
  for (let e = 0; e < d.length - 1; e++) {
    let t = e % 2 == 1;
    o.box(-u + (t ? 0.6 : 0), u - (t ? 0.6 : 0), d[e], d[e + 1], -r + (t ? 0.6 : 0), r - (t ? 0.6 : 0), t ? {
      mat: 1,
      col: [0.36, 0.42, 0.42],
      p: [3, 0.7, 1]
    } : l, {
      cap: e === d.length - 2,
      bottom: !0,
      capO: {
        mat: 3,
        col: [0.5, 0.52, 0.53],
        p: [3, 3]
      }
    });
  }
  for (let e of [1, -1]) for (let t = 0; t <= 8; t++) {
    let n = -u + 3 + (2 * u - 6) * t / 8;
    o.box(n - 0.35, n + 0.35, 22, 300, e > 0 ? r : -r - 0.6, e > 0 ? r + 0.6 : -r, {
      mat: 1,
      col: Ip,
      p: [4, 3.9, 0]
    });
  }
  for (let e of [1, -1]) {
    let n = e * a,
      r = Vp(i, 32, n, 0);
    o.prism(r, 22, 317, {
      mat: 2,
      col: Ip,
      col2: c,
      p: [1.45, 3.9, 0],
      wrapU: !0
    }, {
      cap: !1
    });
    for (let e = 61; e < 313; e += 39) o.prism(Vp(i + 0.45, 32, n, 0), e - 0.5, e + 0.5, {
      mat: 0,
      col: Ip,
      wrapU: !0
    }, {
      cap: !1
    });
    o.prism(Vp(i + 0.6, 32, n, 0), 317, 325, {
      mat: 1,
      col: Ip,
      p: [1.45, 0.8, 1],
      wrapU: !0
    }, {
      cap: !1
    }), Up(o, Vp(i + 0.6, 32, n, 0), 325, {
      mat: 0,
      col: [0.5, 0.52, 0.53]
    }, n, 0), Bp(o, [{
      y: 325,
      ring: Vp(i * 0.62, 16, n, 0)
    }, {
      y: 334,
      ring: Vp(i * 0.36, 16, n, 0)
    }, {
      y: 339,
      ring: Vp(1.4, 16, n, 0)
    }], () => ({
      mat: 1,
      col: Ip,
      p: [1.2, 3, 2]
    })), Gp(o, n, 0, 339, t, 1.3), o.prism(Vp(2.2, 12, n, 0), 355, 356, {
      mat: 0,
      col: Ip,
      wrapU: !0
    }, {
      bottom: !0
    });
  }
  return o.box(-u * 0.5, u * 0.5, 298, 305, -r * 0.6, r * 0.6, {
    mat: 2,
    col: Ip,
    col2: c,
    p: [1.6, 7, 3],
    wrapU: !0
  }), Wp(o, e, [Np(e, Hp(n + 8, r + 10), -2, 22), Np(e, Hp(u, r + 0.6), 22, 298), Np(e, Vp(i + 0.6, 16, a, 0), 22, 325), Np(e, Vp(i + 0.6, 16, -a, 0), 22, 325), Np(e, Hp(1.2, 1.2, a, 0), 325, t), Np(e, Hp(1.2, 1.2, -a, 0), 325, t)], t);
}

function Yp(e) {
  let t = zp(Math.min(e.L, e.W) / 2, 16, 19),
    n = new Ap();
  n.fx = [1.35, 6];
  let r = [0.88, 0.86, 0.8],
    i = [0.12, 0.17, 0.22],
    a = e.partBased ? 3 : 16;
  n.box(-t - a, t + a, -2, 20, -t - a, t + a, {
    mat: 2,
    col: r,
    col2: i,
    p: [3.2, 5, 4],
    wrapU: !0
  }, {
    capO: {
      mat: 3,
      col: [0.6, 0.6, 0.58],
      p: [3, 3]
    }
  }), n.box(-t - a - 0.6, t + a + 0.6, 19.5, 21.2, -t - a - 0.6, t + a + 0.6, {
    mat: 0,
    col: r
  }, {
    bottom: !0
  });
  let o = e => [[-e + 4, e], [e - 4, e], [e, e - 4], [e, -e + 4], [e - 4, -e], [-e + 4, -e], [-e, -e + 4], [-e, e - 4]];
  n.prism(o(t), 20, 146, {
    mat: 2,
    col: r,
    col2: i,
    p: [1.6, 3.2, 3]
  }, {
    cap: !1
  });
  for (let [e, r] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) for (let i = 0; i <= 6; i++) {
    let a = -t + 4 + (2 * t - 8) * i / 6,
      o = -r,
      s = e,
      c = e * t + o * (a - 0.45),
      l = r * t + s * (a - 0.45),
      u = e * (t + 0.7) + o * (a + 0.45),
      d = r * (t + 0.7) + s * (a + 0.45);
    n.box(Math.min(c, u), Math.max(c, u), 20, 148, Math.min(l, d), Math.max(l, d), {
      mat: 0,
      col: [0.93, 0.92, 0.88]
    });
  }
  let s = t * 1.28;
  return n.prism(Vp(t * 0.95, 32), 146, 149, {
    mat: 0,
    col: r,
    wrapU: !0
  }, {
    cap: !1
  }), n.prism(Vp(s, 40), 149, 150, {
    mat: 0,
    col: r,
    wrapU: !0
  }, {
    cap: !1
  }), Up(n, Vp(s, 40), 149, {
    mat: 0,
    col: [0.75, 0.74, 0.7]
  }), n.prism(Vp(s - 0.6, 40), 150, 154.5, {
    mat: 2,
    col: r,
    col2: [0.14, 0.24, 0.32],
    p: [1.5, 4.5, 0],
    wrapU: !0
  }, {
    cap: !1
  }), n.prism(Vp(s + 0.5, 40), 154.5, 156, {
    mat: 0,
    col: r,
    wrapU: !0
  }, {
    cap: !1
  }), Up(n, Vp(s + 0.5, 40), 156, {
    mat: 3,
    col: [0.58, 0.58, 0.56],
    p: [3, 3]
  }), Up(n, Vp(s + 0.5, 40), 154.5, {
    mat: 0,
    col: [0.75, 0.74, 0.7]
  }), n.prism(Vp(8, 24), 156, 160, {
    mat: 1,
    col: [0.82, 0.8, 0.76],
    p: [2, 0.6, 1],
    wrapU: !0
  }, {
    cap: !1
  }), Up(n, Vp(8, 24), 160, {
    mat: 0,
    col: [0.45, 0.47, 0.45]
  }), Gp(n, 0, 0, 160, 172, 0.5), Wp(n, e, [Np(e, Hp(t + a, t + a), -2, 20), Np(e, o(t + 0.7), 20, 149), Np(e, Vp(s + 0.5, 16), 149, 156), Np(e, Vp(8, 12), 156, 160)], 160);
}

function Xp(e) {
  let t = 355.8,
    n = zp(Math.min(e.L, e.W) / 2 * 1.02, 20, 27),
    r = new Ap();
  r.fx = [1.25, 7];
  let i = [0.2, 0.34, 0.46],
    a = Lp,
    o = (e, t) => Vp(e, 8, 0, 0, Math.PI / 8),
    s = e.partBased ? 2 : 22,
    c = e.partBased ? 2 : 16;
  r.box(-n - s, n + s, -2, 46, -n - c, n + c, {
    mat: 2,
    col: [0.8, 0.8, 0.78],
    col2: [0.12, 0.2, 0.28],
    p: [3, 4.6, 4],
    wrapU: !0
  }, {
    capO: {
      mat: 3,
      col: [0.56, 0.57, 0.58],
      p: [3, 3]
    }
  }), r.box(-n - s - 0.6, n + s + 0.6, 45.6, 47, -n - c - 0.6, n + c + 0.6, {
    mat: 0,
    col: a
  }, {
    bottom: !0
  });
  let l = [46, 128, 133, 212, 217, 278];
  for (let e = 0; e < l.length - 1; e++) {
    let t = e % 2 == 1;
    r.prism(o(t ? n - 0.7 : n), l[e], l[e + 1], t ? {
      mat: 1,
      col: [0.48, 0.52, 0.56],
      p: [3, 0.7, 1]
    } : {
      mat: 2,
      col: a,
      col2: i,
      p: [1.5, 4.1, 0]
    }, {
      cap: !1
    });
  }
  let u = o(n);
  for (let e = 0; e < 8; e++) {
    let t = u[e],
      i = u[(e + 1) % 8],
      o = t[0] / n,
      s = t[1] / n;
    r.strut([t[0] + o * 0.3, 46, t[1] + s * 0.3], [t[0] + o * 0.3, 282, t[1] + s * 0.3], 2, {
      mat: 1,
      col: a,
      p: [4, 4.1, 0]
    });
    for (let e of [1 / 3, 2 / 3]) {
      let n = t[0] + (i[0] - t[0]) * e,
        o = t[1] + (i[1] - t[1]) * e,
        s = Math.hypot(n, o);
      r.strut([n * (1 + 0.3 / s), 46, o * (1 + 0.3 / s)], [n * (1 + 0.3 / s), 278, o * (1 + 0.3 / s)], 0.6, {
        mat: 0,
        col: a
      });
    }
  }
  r.prism(o(n), 278, 279, {
    mat: 0,
    col: a
  }, {
    capO: {
      mat: 3,
      col: [0.56, 0.57, 0.58],
      p: [3, 3]
    }
  }), r.prism(o(n * 0.8), 279, 288, {
    mat: 2,
    col: a,
    col2: i,
    p: [1.5, 9, 3]
  }, {
    capO: {
      mat: 3,
      col: [0.56, 0.57, 0.58],
      p: [3, 3]
    }
  }), r.prism(o(n * 0.55), 288, 296, {
    mat: 1,
    col: a,
    p: [2, 0.7, 1]
  }, {
    capO: {
      mat: 0,
      col: [0.5, 0.52, 0.53]
    }
  }), Bp(r, [{
    y: 296,
    ring: o(4.2)
  }, {
    y: 316,
    ring: o(2.2)
  }, {
    y: 336,
    ring: o(1)
  }], () => ({
    mat: 1,
    col: Fp,
    p: [1.2, 3, 0]
  })), Gp(r, 0, 0, 336, t, 0.8);
  for (let e of [306, 322]) r.prism(o(3.6 - (e - 292) * 0.06), e - 0.3, e + 0.3, {
    mat: 0,
    col: Rp
  }, {
    bottom: !0
  });
  return Wp(r, e, [Np(e, Hp(n + s, n + c), -2, 46), Np(e, o(n + 0.8), 46, 279), Np(e, o(n * 0.8), 279, 296), Np(e, Hp(2, 2), 296, t)], t);
}

var Zp = {
  kk100: Kp,
  chunsun: qp,
  diwang: Jp,
  guomao: Yp,
  seg: Xp
};

function Qp(e) {
  let t = [],
    n = [],
    r = [],
    i = [],
    a = [],
    o = 0,
    s = 0;
  for (let c of e) {
    for (let e = 0; e < c.n; e++) {
      let l = e / c.n * Math.PI * 2 + s * 0.37,
        u = (e % 2 ? 1 : -1) * (0.05 + 0.03 * (e * 7 % 5) / 5),
        d = 0.3 + 0.5 * (e * 3 % 4 / 4);
      for (let [i, o] of [[0, -1], [0, 1], [1, 1], [1, -1]]) t.push(i, o, e % 3), n.push(c.x, c.y, c.z), r.push(l, u, d, c.len), a.push(s);
      i.push(o, o + 1, o + 2, o, o + 2, o + 3), o += 4;
    }
    s++;
  }
  let c = new BufferGeometry();
  c.setAttribute(`position`, new Float32BufferAttribute(t, 3)), c.setAttribute(`aOrg`, new Float32BufferAttribute(n, 3)), c.setAttribute(`aBeam`, new Float32BufferAttribute(r, 4)), c.setAttribute(`aSrc`, new Float32BufferAttribute(a, 1)), c.setIndex(i);
  let l = new Mesh(c, new ShaderMaterial({
    uniforms: _d(),
    transparent: !0,
    depthWrite: !1,
    blending: 2,
    side: 2,
    vertexShader: `
      uniform float uTime; uniform float uBeamT[4];
      attribute vec3 aOrg; attribute vec4 aBeam; attribute float aSrc;
      varying float vT; varying float vS; varying float vK; varying float vOn;
      void main(){
        float az = aBeam.x + uTime * aBeam.y;
        float el = aBeam.z + 0.22 * sin(uTime * 0.4 + aBeam.x * 3.0);
        vec3 d = vec3(cos(az) * cos(el), sin(el), sin(az) * cos(el));
        vec3 p0 = aOrg + d * position.x * aBeam.w;
        vec3 side = normalize(cross(d, cameraPosition - p0));
        vec3 wp = p0 + side * position.y * mix(1.6, 30.0, position.x);
        vT = position.x; vS = position.y; vK = position.z;
        // 这组光束所在的楼被光球点亮之后才射出来
        vOn = smoothstep(0.0, 2.5, uTime - uBeamT[int(aSrc + 0.5)]);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: `
      uniform float uNight;
      varying float vT; varying float vS; varying float vK; varying float vOn;
      void main(){
        float a = vOn * pow(1.0 - vT, 1.4) * pow(max(1.0 - vS * vS, 0.0), 1.6);
        vec3 c = vK < 0.5 ? vec3(1.0, 0.16, 0.12) : (vK < 1.5 ? vec3(1.0, 0.72, 0.25) : vec3(1.0, 0.35, 0.20));
        gl_FragColor = vec4(c * a * 0.38 * uNight, 1.0);
      }`
  }));
  return l.frustumCulled = !1, l.renderOrder = 22, l.visible = !1, Ad.push(l), l;
}

var $p = class {
    constructor(e, t = 40) {
      this.cell = t, this.map = new Map();
      for (let n of e) {
        let e = Math.floor(n.minX / t),
          r = Math.floor(n.maxX / t),
          i = Math.floor(n.minZ / t),
          a = Math.floor(n.maxZ / t);
        for (let t = e; t <= r; t++) for (let e = i; e <= a; e++) {
          let r = t * 1e5 + e,
            i = this.map.get(r);
          i || this.map.set(r, i = []), i.push(n);
        }
      }
    }
    query(e, t) {
      return this.map.get(Math.floor(e / this.cell) * 1e5 + Math.floor(t / this.cell)) || [];
    }
  },
  em = 0.45,
  tm = [[0, 0], [em, 0], [-0.45, 0], [0, em], [0, -0.45], [0.32, 0.32], [-0.32, 0.32], [0.32, -0.32], [-0.32, -0.32]];

function nm(e, t, n, r, i, a = 0.6) {
  for (let [o, s] of tm) {
    let c = t + o,
      l = n + s;
    for (let t of e.query(c, l)) if (!(t.top <= r + a || t.bottom >= i) && nf(c, l, t)) return t;
  }
  return null;
}

function rm(e, t, n, r, i = 0.6) {
  let a = $(t, n);
  for (let o of e.query(t, n)) o.top > r + i || o.top < a || nf(t, n, o) && (a = o.top);
  return a;
}

function im(e, t, n) {
  for (let r of e.query(t, n)) if (nf(t, n, r)) return r;
  return null;
}

var am = 260,
  om = 14,
  sm = 22,
  cm = 6,
  lm = 100,
  um = `./models/astronaut.glb`,
  dm = 0.979,
  fm = Math.PI / 2,
  pm = new Vector3(-0.25, 0.78, -0.07),
  mm = 280,
  hm = 105,
  gm = 1.6,
  _m = 0.905,
  vm = 18,
  ym = 3.2,
  bm = 0.7,
  xm = `./models/astronaut-anim/astronaut-rigged.glb`,
  Sm = 13,
  Cm = 9,
  wm = [[0, 0]].concat(Array.from({
    length: 8
  }, (e, t) => [Math.cos(t * Math.PI / 4) * Sm, Math.sin(t * Math.PI / 4) * Sm])),
  Tm = [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]],
  Em = 1.4,
  Dm = 4.6,
  Om = 520,
  km = 185,
  Am = 96,
  jm = 34,
  Mm = 1.3,
  Nm = 300,
  Pm = 0,
  Fm = 24,
  Im = e => (e = Math.max(0, Math.min(1, e)), e * e * e * (e * (e * 6 - 15) + 10));

function Lm(e, t) {
  return e.applyMatrix4(t), e.toNonIndexed && e.index ? e.toNonIndexed() : e;
}

var Rm = (e, t, n, r = 0, i = 0, a = 0, o = 1, s = 1, c = 1) => new Matrix4().compose(new Vector3(e, t, n), new Quaternion().setFromEuler(new Euler(r, i, a)), new Vector3(o, s, c));

function zm() {
  let e = [],
    t = [],
    n = [],
    r = [],
    i = [],
    a = (e, t) => new CapsuleGeometry(e, t, 6, 14);
  e.push(Lm(a(0.3, 0.34), Rm(0, 1.18, 0, 0, 0, 0, 1.15, 1, 0.92))), e.push(Lm(new SphereGeometry(0.3, 16, 10), Rm(0, 0.86, 0, 0, 0, 0, 1.05, 0.7, 0.9))), t.push(Lm(new CylinderGeometry(0.29, 0.29, 0.07, 18), Rm(0, 0.98, 0, 0, 0, 0, 1.12, 1, 0.92))), e.push(Lm(new SphereGeometry(0.265, 22, 16), Rm(0, 1.78, 0))), t.push(Lm(new CylinderGeometry(0.2, 0.23, 0.08, 18), Rm(0, 1.55, 0))), n.push(Lm(new SphereGeometry(0.25, 24, 14, 0, Math.PI * 2, 0, 1.15), Rm(0, 1.775, -0.075, -Math.PI / 2 - 0.08, 0, 0, 0.93, 1, 0.8))), i.push(Lm(new TorusGeometry(0.215, 0.02, 8, 28), Rm(0, 1.778, -0.185, 0.08, 0, 0, 0.98, 0.86, 1))), e.push(Lm(new BoxGeometry(0.56, 0.74, 0.26), Rm(0, 1.26, 0.33))), t.push(Lm(new BoxGeometry(0.44, 0.1, 0.2), Rm(0, 1.66, 0.33))), t.push(Lm(new BoxGeometry(0.3, 0.2, 0.1), Rm(0, 1.2, -0.3))), r.push(Lm(new BoxGeometry(0.06, 0.04, 0.02), Rm(-0.07, 1.23, -0.355))), i.push(Lm(new BoxGeometry(0.06, 0.04, 0.02), Rm(0.05, 1.23, -0.355)));
  for (let n of [-1, 1]) e.push(Lm(a(0.135, 0.3), Rm(n * 0.17, 0.6, -0.02, 0.12 * n * 0 + 0.1, 0, n * 0.05))), t.push(Lm(new CylinderGeometry(0.14, 0.14, 0.06, 14), Rm(n * 0.18, 0.4, 0))), e.push(Lm(a(0.125, 0.28), Rm(n * 0.185, 0.2, 0.03, -0.14, 0, 0))), t.push(Lm(new BoxGeometry(0.2, 0.14, 0.34), Rm(n * 0.19, -0.04, -0.02))), r.push(Lm(new CylinderGeometry(0.142, 0.142, 0.035, 14), Rm(n * 0.17, 0.66, -0.02, 0.1, 0, 0))), e.push(Lm(new SphereGeometry(0.16, 14, 10), Rm(n * 0.42, 1.42, 0)));
  e.push(Lm(a(0.105, 0.26), Rm(-0.5, 1.2, 0, 0, 0, -0.28))), t.push(Lm(new CylinderGeometry(0.11, 0.11, 0.05, 12), Rm(-0.56, 1, 0, 0, 0, -0.28))), e.push(Lm(a(0.095, 0.24), Rm(-0.6, 0.82, -0.05, -0.35, 0, -0.12))), t.push(Lm(new SphereGeometry(0.11, 12, 8), Rm(-0.62, 0.62, -0.13))), r.push(Lm(new CylinderGeometry(0.112, 0.112, 0.03, 12), Rm(-0.52, 1.14, 0, 0, 0, -0.28)));
  let o = (e, t) => new Mesh(mergeGeometries(e.map(e => {
      let t = e.index ? e.toNonIndexed() : e;
      return t.deleteAttribute(`uv`), t;
    })), t),
    s = {
      white: xd({
        color: 15921902,
        spec: 0.5,
        emissive: 0.3
      }),
      grey: xd({
        color: 9278104,
        spec: 0.3,
        emissive: 0.15
      }),
      dark: xd({
        color: 1709072,
        spec: 3
      }),
      red: xd({
        color: 13117470,
        emissive: 0.4
      }),
      gold: xd({
        color: 14198336,
        spec: 1.5,
        emissive: 0.4
      })
    },
    c = new Group();
  c.add(o(e, s.white), o(t, s.grey), o(n, s.dark), o(r, s.red), o(i, s.gold));
  let l = new Group();
  l.position.set(0.42, 1.42, 0);
  let u = [Lm(a(0.105, 0.26), Rm(0.06, -0.22, 0)), Lm(a(0.095, 0.24), Rm(0.08, -0.6, -0.02))],
    d = [Lm(new CylinderGeometry(0.11, 0.11, 0.05, 12), Rm(0.07, -0.42, 0)), Lm(new SphereGeometry(0.115, 12, 8), Rm(0.09, -0.82, -0.03))],
    f = [Lm(new CylinderGeometry(0.112, 0.112, 0.03, 12), Rm(0.06, -0.28, 0))];
  return l.add(o(u, s.white), o(d, s.grey), o(f, s.red)), c.add(l), {
    body: c,
    arm: l
  };
}

function Bm() {
  return new ShaderMaterial({
    uniforms: _d(),
    transparent: !0,
    depthWrite: !1,
    blending: 2,
    vertexShader: `varying vec2 vP; varying vec3 vC;
      void main(){
        vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sz = length(instanceMatrix[0].xyz);
        vec4 mv = viewMatrix * c; mv.xy += position.xy * sz;
        vP = position.xy * 2.0; vC = instanceColor;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec2 vP; varying vec3 vC;
      void main(){ float r = length(vP); float a = pow(max(1.0 - r, 0.0), 2.2) + 1.6 * pow(max(1.0 - r * 3.2, 0.0), 2.0); gl_FragColor = vec4(vC * a, 1.0); }`
  });
}

function Vm() {
  let e = [],
    t = [],
    n = [];
  for (let r = 0; r <= 160; r++) {
    let i = r / 160 * Math.PI * 2,
      a = Math.cos(i),
      o = Math.sin(i);
    if (e.push(a, 0, o, a, 1, o, a, 0, o, a, 0, o), t.push(0, 0, 0, 1, 1, 0, 1, 1), r < 160) {
      let e = r * 4;
      n.push(e, e + 4, e + 5, e, e + 5, e + 1, e + 2, e + 6, e + 7, e + 2, e + 7, e + 3);
    }
  }
  let r = new BufferGeometry();
  r.setAttribute(`position`, new Float32BufferAttribute(e, 3)), r.setAttribute(`aW`, new Float32BufferAttribute(t, 2)), r.setIndex(n);
  let i = new Mesh(r, new ShaderMaterial({
    uniforms: _d(),
    transparent: !0,
    depthWrite: !1,
    blending: 2,
    side: 2,
    vertexShader: `uniform float uTime; uniform vec4 uWave; attribute vec2 aW; varying vec2 vW; varying float vR;
      void main(){
        float t = uTime - uWave.z; float r = t < 0.0 ? 0.0 : 260.0 * t + 90.0 * t * t;
        float rr = aW.x > 0.5 ? max(r - aW.y * 220.0, 0.0) : r;
        vec3 wp = vec3(uWave.x + position.x * rr, aW.x > 0.5 ? 3.0 : position.y * 320.0, uWave.y + position.z * rr);
        vW = aW; vR = t < 0.0 ? -1.0 : r;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: `uniform float uNight; varying vec2 vW; varying float vR;
      void main(){
        if (vR < 0.0) discard;
        float fade = clamp(1.5 - vR / 7000.0, 0.22, 1.0) * (1.0 - smoothstep(13500.0, 16500.0, vR)) * smoothstep(0.0, 60.0, vR);
        float a = vW.x > 0.5 ? pow(1.0 - vW.y, 2.0) * 0.85 : pow(1.0 - vW.y, 2.2) * 0.55 + 0.9 * pow(1.0 - vW.y, 24.0);
        gl_FragColor = vec4(mix(vec3(0.20, 0.80, 1.0), vec3(0.95, 1.0, 1.0), pow(1.0 - vW.y, 6.0)) * a * fade * uNight, 1.0);
      }`
  }));
  return i.frustumCulled = !1, i.renderOrder = 29, i;
}

function Hm() {
  let e = new BufferGeometry();
  e.setAttribute(`position`, new Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3)), e.setIndex([0, 1, 2, 0, 2, 3]);
  let t = new Mesh(e, new ShaderMaterial({
    uniforms: _d({
      uBase: {
        value: new Vector3()
      },
      uLen: {
        value: 900
      },
      uAmp: {
        value: 0
      },
      uHead: {
        value: 1
      }
    }),
    transparent: !0,
    depthWrite: !1,
    blending: 2,
    side: 2,
    vertexShader: `uniform vec3 uBase; uniform float uLen; varying vec2 vS;
      void main(){
        vec3 right = normalize(vec3(cameraPosition.z - uBase.z, 0.0, -(cameraPosition.x - uBase.x)) + vec3(1e-4, 0.0, 0.0));
        float w = mix(46.0, 120.0, position.y);                       // 上宽下窄，像从天上照下来
        vec3 wp = uBase + vec3(0.0, position.y * uLen, 0.0) + right * position.x * w;
        vS = vec2(position.x, position.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: `uniform float uTime; uniform float uAmp; uniform float uHead; varying vec2 vS;
      void main(){
        float core = pow(max(1.0 - abs(vS.x), 0.0), 2.2) + 0.8 * pow(max(1.0 - abs(vS.x) * 3.5, 0.0), 2.0);
        // 光是从上往下「落」到地面的：uHead 以下还没照到
        float reach = smoothstep(uHead - 0.06, uHead + 0.02, vS.y);
        float fade = (0.35 + 0.65 * vS.y) * (1.0 - smoothstep(0.92, 1.0, vS.y));
        float shimmer = 0.85 + 0.15 * sin(uTime * 5.0 + vS.y * 40.0);
        gl_FragColor = vec4(vec3(0.62, 0.90, 1.0) * core * fade * reach * shimmer * uAmp * 0.9, 1.0);
      }`
  }));
  return t.frustumCulled = !1, t.renderOrder = 28, t.visible = !1, t;
}

var Um = class {
    constructor(e, t, n, r) {
      this.scene = e, this.camera = t, this.targets = n, this.setNight = r, this.root = new Group(), this.arm = null, this.giantScale = lm / dm, this.modelKind = `loading`, this.mats = [];
      let i = new GLTFLoader();
      i.loadAsync(xm).then(e => ({
        g: e,
        rig: !0
      })).catch(e => (console.warn(`[futian] 宇航员：带骨骼的模型 ` + xm + ` 加载失败，退回静态模型（没有走路动作）。原因：`, e && e.message ? e.message : e), i.loadAsync(um).then(e => ({
        g: e,
        rig: !1
      })))).then(({
        g: e,
        rig: t
      }) => {
        let n = e.scene;
        n.rotation.y = fm, n.position.y = t ? 0 : 0.4895;
        let r = new Group();
        if (r.add(n), r.scale.setScalar(t ? lm : this.giantScale), t) {
          this.mixer = new AnimationMixer(n), this.actions = {}, this.animW = {};
          for (let t of e.animations) {
            let e = this.mixer.clipAction(t);
            e.play(), e.setEffectiveWeight(+(t.name === `idle`)), this.actions[t.name] = e, this.animW[t.name] = +(t.name === `idle`);
          }
          if (this.actions.fall && (this.actions.fall.stop(), delete this.actions.fall, delete this.animW.fall), this.actions.jump) {
            let e = this.actions.jump,
              t = e.getClip();
            e.setLoop(LoopOnce, 1), e.clampWhenFinished = !0, e.setEffectiveTimeScale(0);
            let n = Math.min(0.28, t.duration * 0.12),
              r = 0;
            for (let e of t.tracks) {
              if (!e.name.endsWith(`.position`)) continue;
              let i = 1e9,
                a = -1e9,
                o = 0,
                s = 1;
              for (let t = 0; t < 3; t++) {
                let n = 1e9,
                  r = -1e9;
                for (let i = t; i < e.values.length; i += 3) n = Math.min(n, e.values[i]), r = Math.max(r, e.values[i]);
                r - n > a - i && (i = n, a = r, s = t);
              }
              if (a - i <= r) continue;
              r = a - i;
              let c = e.values[s],
                l = 0;
              for (let n = 0; n < e.times.length && e.times[n] < t.duration * 0.45; n++) {
                let t = Math.abs(e.values[n * 3 + s] - c);
                t > l && (l = t, o = e.times[n]);
              }
              l > 0 && (n = o);
            }
            this.jumpApex = n, this.jumpT = n;
          }
          this.handBone = n.getObjectByName(`L_Hand`) || null;
          let t = e => n.getObjectByName(e);
          this.legs = [`L`, `R`].map(e => ({
            th: t(e + `_Thigh`),
            ca: t(e + `_Calf`),
            ft: t(e + `_Foot`),
            sd: e
          })).filter(e => e.th && e.ca && e.ft), this.model = n, this.modelY0 = n.position.y, this.rigged = !0;
        }
        n.traverse(e => {
          if (!e.isMesh) return;
          e.frustumCulled = !1, e.renderOrder = 6;
          let t = e.material;
          t.envMapIntensity = 1, t.emissive = new Color(1, 1, 1), t.emissiveMap = t.map, t.emissiveIntensity = 0, Md(t), this.mats.push(t);
        }), this.root.add(r), this.modelKind = t ? `tripo-rigged` : `tripo-glb`, console.info(`[futian] 宇航员：已加载 Tripo 模型`, um, `身高`, lm, `m，缩放`, this.giantScale.toFixed(1));
      }).catch(e => {
        console.warn(`[futian] 宇航员：Tripo 模型 ` + um + ` 加载失败，暂时回退到旧的方块模型。原因：`, e && e.message ? e.message : e);
        let {
            body: t,
            arm: n
          } = zm(),
          r = new Group();
        r.add(t), r.scale.setScalar(lm / 2.05), this.root.add(r), this.arm = n, this.modelKind = `fallback-blocks`;
      }), this.root.visible = !1, e.add(this.root), this.active = !1, this.t = 0, this.fireT = 9, this.pos = new Vector3(), this.placed = !1, this.state = `hidden`, this.stateT = 0, this.yaw = 0, this.yawTarget = 0, this.grid = null, this.player = null, this.orbs = [], this.bursts = [], this.sprites = new InstancedMesh(new PlaneGeometry(1, 1), Bm(), 198), this.sprites.setColorAt(0, new Color(1, 1, 1)), this.sprites.instanceMatrix.setUsage(DynamicDrawUsage), this.sprites.instanceColor.setUsage(DynamicDrawUsage), this.sprites.frustumCulled = !1, this.sprites.count = 0, this.sprites.renderOrder = 30, e.add(this.sprites), this.onHit = () => {}, this.skyBeam = Hm(), e.add(this.skyBeam), this.lightAmp = 0, this.vel = new Vector3(), this.tpBlend = 0, this.camFree = new Vector3(), this.fpBlend = 0, this.fp = !1, this.vm = this.buildViewModel(), this.hits = 0, this.wave = null, e.add(Vm()), this._m = new Matrix4(), this._c = new Color(), this._v = new Vector3();
    }
    toggle() {
      return this.state === `hidden` || this.state === `ascending` ? this.summon() : this.dismiss(), this.active;
    }
    spotFree(e, t) {
      if (!this.grid) return !0;
      if (im(this.grid, e, t)) return !1;
      for (let n = 0; n < 8; n++) {
        let r = n / 8 * Math.PI * 2;
        if (im(this.grid, e + Math.cos(r) * Fm, t + Math.sin(r) * Fm)) return !1;
      }
      return !0;
    }
    pickLanding() {
      let e = this.camera,
        t = e.getWorldDirection(new Vector3());
      t.y = 0, t.lengthSq() < 1e-6 && t.set(0, 0, -1), t.normalize();
      let n = new Vector3().crossVectors(t, new Vector3(0, 1, 0)).normalize(),
        r = e.position.x + t.x * Nm + n.x * Pm,
        i = e.position.z + t.z * Nm + n.z * Pm,
        a = r,
        o = i,
        s = this.spotFree(r, i);
      for (let t = 1; t <= 9 && !s; t++) {
        let n = t * 28;
        for (let c = 0; c < 12 && !s; c++) {
          let l = c / 12 * Math.PI * 2 + t * 0.4,
            u = r + Math.cos(l) * n,
            d = i + Math.sin(l) * n;
          Math.hypot(u - e.position.x, d - e.position.z) < 170 || this.spotFree(u, d) && (a = u, o = d, s = !0);
        }
      }
      return this.landFound = s, new Vector3(a, $(a, o), o);
    }
    summon() {
      this.land = this.pickLanding();
      let e = this.camera,
        t = e.getWorldDirection(new Vector3());
      t.y = 0, t.lengthSq() < 1e-6 && t.set(0, 0, -1), t.normalize(), this.from = this.land.clone(), this.from.y = Math.max(this.land.y + Om, e.position.y + 240), this.faceYaw = Math.atan2(-t.x, -t.z), this.yaw = this.faceYaw, this.yawTarget = this.faceYaw, this.state = `arriving`, this.stateT = 0, this.active = !0, this.root.visible = !1, this.pos.copy(this.from), this.root.position.copy(this.pos), this.fp = !1, this.fpBlend = 0, this.tpBlend = 0, this.vel.set(0, 0, 0), this.hopT = 0, this.autoDown = !1, this.skyBeam.material.uniforms.uBase.value.copy(this.land), this.skyBeam.material.uniforms.uLen.value = this.from.y - this.land.y + 260, this.skyBeam.visible = !0, this.lightAmp = 0;
    }
    dismiss() {
      this.state !== `hidden` && (this.fp && (this.fp = !1, this.fpBlend = 0, this.onView && this.onView(!1)), this.tpBlend = 0, this.from = this.pos.clone(), this.state = `ascending`, this.stateT = 0, this.active = !1);
    }
    canFirstPerson() {
      return this.state === `landed`;
    }
    buildViewModel() {
      let e = new Group();
      return e.visible = !1, this.camera.add(e), new GLTFLoader().loadAsync(`./models/fp-arms/arm.glb`).then(t => {
        let n = null;
        t.scene.updateMatrixWorld(!0), t.scene.traverse(e => {
          e.isMesh && !n && (n = e);
        });
        let r = n.geometry.clone().applyMatrix4(n.matrixWorld),
          i = new Vector3(0.285, -0.726, 0.626).normalize(),
          a = new Vector3(0.869, 0.471, 0.15);
        a.addScaledVector(i, -a.dot(i)).normalize();
        let o = i.clone().negate(),
          s = new Vector3().crossVectors(a, o),
          c = new Matrix4().makeBasis(s, a, o).transpose();
        r.applyMatrix4(new Matrix4().makeTranslation(-0.084, 0.045, -0.062)).applyMatrix4(c);
        let l = n.material;
        l.envMapIntensity = 1, l.metalnessMap = null, l.roughnessMap = null, l.metalness = 0.05, l.roughness = 0.8, l.emissive = new Color(1, 1, 1), l.emissiveMap = l.map, l.emissiveIntensity = 0, Md(l), this.armMat = l;
        let u = e => {
          let t = new Group(),
            n = new Mesh(r, l);
          return n.frustumCulled = !1, n.renderOrder = 35, t.add(n), t.scale.set(2.3 * e, 2.3, 2.3), t;
        };
        this.armR = u(1), this.armL = u(-1), this.armBase = {
          R: [0.98, -1.02, -2.25, 0.1, 0.26, -0.1],
          L: [-0.92, -0.8, -2.3, 0.42, -0.24, 0.12]
        }, e.add(this.armR, this.armL), this.poseArms(0), console.info(`[futian] 第一人称手臂：已加载 Tripo 模型 ./models/fp-arms/arm.glb`);
      }).catch(t => {
        console.warn(`[futian] 第一人称手臂模型 ./models/fp-arms/arm.glb 加载失败，退回旧的积木手臂。原因：`, t && t.message ? t.message : t);
        let n = this.buildViewModelBlocks();
        n.visible = !0, e.add(n);
      }), e;
    }
    poseArms(e) {
      if (!this.armR) return;
      let t = this.vel ? Math.hypot(this.vel.x, this.vel.z) : 0,
        n = Math.min(1, t / 30),
        r = (this.walkPh || 0) * Math.PI * 2,
        i = this.pos.y > $(this.pos.x, this.pos.z) + 0.5 ? 0.35 : 1,
        a = Math.max(0, 1 - this.fireT / 0.4),
        o = a * a,
        s = (e, t, a, o) => {
          e.position.set(t[0] + Math.sin(r) * 0.03 * n * a * i, t[1] + Math.sin(r + (a > 0 ? 0 : Math.PI)) * 0.07 * n * i + Math.sin(this.t * 1.3 + a) * 0.012, t[2] + Math.cos(r) * 0.05 * n * a * i + 0.22 * o), e.rotation.set(t[3] + Math.sin(r + (a > 0 ? 0 : Math.PI)) * 0.03 * n * i + 0.16 * o, t[4], t[5] + Math.sin(this.t * 0.9 + a) * 0.01, `YXZ`);
        };
      s(this.armR, this.armBase.R, 1, 0), s(this.armL, this.armBase.L, -1, o), this.armMat && (this.armMat.emissiveIntensity = 0.38 * gd.uNight.value);
    }
    buildViewModelBlocks() {
      let e = xd({
          color: 15790316,
          spec: 0.4,
          emissive: 0.22
        }),
        t = xd({
          color: 9080726,
          spec: 0.3,
          emissive: 0.12
        }),
        n = xd({
          color: 13117470,
          emissive: 0.3
        }),
        r = new Group(),
        i = (r, i) => {
          let a = new Group(),
            o = new Mesh(new CapsuleGeometry(0.21, 1.5, 6, 14), e);
          o.rotation.x = Math.PI / 2, o.position.z = 0.55;
          let s = new Mesh(new CylinderGeometry(0.235, 0.235, 0.12, 16), n);
          s.rotation.x = Math.PI / 2, s.position.z = -0.22;
          let c = new Mesh(new CylinderGeometry(0.225, 0.225, 0.1, 16), t);
          c.rotation.x = Math.PI / 2, c.position.z = -0.36;
          let l = new Mesh(new SphereGeometry(0.2, 14, 10), t);
          l.scale.set(1.05, 0.62, 1.2), l.position.z = -0.6, a.add(o, s, c, l);
          for (let e = 0; e < 4; e++) {
            let n = new Mesh(new CapsuleGeometry(0.047, 0.2, 4, 8), t);
            n.rotation.x = Math.PI / 2 - 0.25, n.position.set((e - 1.5) * 0.095, 0.05, -0.86), a.add(n);
          }
          let u = new Mesh(new CapsuleGeometry(0.05, 0.16, 4, 8), t);
          return u.rotation.set(Math.PI / 2, 0, -r * 0.9), u.position.set(-r * 0.2, 0, -0.66), a.add(u), a.position.set(r * 0.92, i ? -0.62 : -0.98, i ? -2 : -1.75), a.rotation.set(i ? 0.2 : -0.1, -r * (i ? 0.2 : 0.34), r * 0.25, `YXZ`), a.traverse(e => {
            e.isMesh && (e.frustumCulled = !1, e.renderOrder = 35);
          }), a;
        };
      return r.add(i(-1, !0), i(1, !1)), r.visible = !1, this.camera.add(r), r;
    }
    setFirstPerson(e, t) {
      return e === !!this.fp ? this.fp : e && !this.canFirstPerson() ? !1 : (this.fp = !!e, t && (this.fpBlend = +!!e), this.onView && this.onView(this.fp), this.fp);
    }
    toggleFlight() {
      this.state === `landed` && (this.inAir ? (this.autoDown = !0, this.hopT = 0) : (this.hopT = 1.6, this.autoDown = !1));
    }
    controlling() {
      return this.state === `landed`;
    }
    giantBlocked(e, t, n) {
      if (!this.grid) return !1;
      for (let [r, i] of wm) {
        let a = e + r,
          o = t + i;
        for (let e of this.grid.query(a, o)) if (!(e.top <= n + Cm || e.bottom >= n + lm) && nf(a, o, e)) return !0;
      }
      return !1;
    }
    giantGround(e, t, n) {
      let r = $(e, t);
      if (!this.grid) return r;
      for (let [i, a] of Tm) {
        let o = e + i,
          s = t + a;
        for (let e of this.grid.query(o, s)) e.top > n + Cm || e.top <= r || nf(o, s, e) && (r = e.top);
      }
      return r;
    }
    camInside(e, t, n) {
      if (!this.grid) return !1;
      for (let r of this.grid.query(e, n)) if (t > r.bottom && t < r.top + 4 && nf(e, n, r)) return !0;
      return !1;
    }
    drive(e, t) {
      if (this.state !== `landed`) return !1;
      let n = t.keys;
      if (this.tpBlend <= 0 && (this.camFree.copy(t.pos), this.enterYaw = t.yaw, this.enterPitch = t.pitch, t.vel.set(0, 0, 0), t.mode === `walk` && t.toggleMode()), this.tpBlend = Math.min(1, this.tpBlend + e / Mm), this.fpBlend = this.fp ? Math.min(1, this.fpBlend + e / 0.9) : Math.max(0, this.fpBlend - e / 0.9), this.tpBlend < 1) {
        let e = Im(this.tpBlend),
          n = this.yaw - this.enterYaw;
        n = Math.atan2(Math.sin(n), Math.cos(n)), t.yaw = this.enterYaw + n * e, t.pitch = this.enterPitch + (-0.1 - this.enterPitch) * e;
      } else {
        this.fp || (t.pitch = Math.max(-1, Math.min(0.55, t.pitch)));
        let r = -Math.sin(t.yaw),
          i = -Math.cos(t.yaw),
          a = -i,
          o = r,
          s = (n.has(`KeyW`) || n.has(`ArrowUp`) ? 1 : 0) - (n.has(`KeyS`) || n.has(`ArrowDown`) ? 1 : 0),
          c = (n.has(`KeyD`) || n.has(`ArrowRight`) ? 1 : 0) - (n.has(`KeyA`) || n.has(`ArrowLeft`) ? 1 : 0),
          l = (n.has(`Space`) || n.has(`KeyE`) ? 1 : 0) - (n.has(`ControlLeft`) || n.has(`ControlRight`) || n.has(`KeyQ`) ? 1 : 0);
        l !== 0 && (this.hopT = 0, this.autoDown = !1), this.hopT > 0 && (this.hopT -= e, l = 1);
        let u = n.has(`ShiftLeft`) || n.has(`ShiftRight`),
          d = !!this.inAir;
        this.autoDown && (d ? l = -1 : this.autoDown = !1);
        let f = (d ? 75 : 44) * (u ? 2.3 : 1),
          p = (r * s + a * c * 0.8) * f,
          m = (i * s + o * c * 0.8) * f;
        this.fp ? this.yawTarget = t.yaw : s !== 0 || c !== 0 ? this.yawTarget = Math.atan2(-p, -m) : this.fireT < 0.9 && (this.yawTarget = t.yaw);
        let h = 1 - Math.exp(-e * (d ? 1.8 : 2.8));
        this.vel.x += (p - this.vel.x) * h, this.vel.z += (m - this.vel.z) * h, this.vel.y += (l * 46 * (u ? 1.8 : 1) - this.vel.y) * (1 - Math.exp(-e * 2.4));
        let g = this.pos.y,
          _ = this.pos.x + this.vel.x * e,
          v = this.pos.z + this.vel.z * e;
        if (this.giantBlocked(this.pos.x, this.pos.z, g) || !this.giantBlocked(_, v, g)) this.pos.x = _, this.pos.z = v;else {
          let t = !1;
          if (Math.hypot(p, m) > 1) for (let n of [0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.35, -1.35]) {
            let r = Math.cos(n),
              i = Math.sin(n),
              a = (p * r - m * i) * r * 0.9,
              o = (p * i + m * r) * r * 0.9;
            if (!this.giantBlocked(this.pos.x + a * e, this.pos.z + o * e, g)) {
              this.pos.x += a * e, this.pos.z += o * e, this.vel.x = a, this.vel.z = o, t = !0;
              break;
            }
          }
          t || (this.vel.x = 0, this.vel.z = 0);
        }
        this.hitWall = this.giantBlocked(this.pos.x - Math.sin(this.yaw) * 6, this.pos.z - Math.cos(this.yaw) * 6, g), this.pos.y += this.vel.y * e;
        let y = this.giantGround(this.pos.x, this.pos.z, Math.max(g, this.pos.y));
        this.pos.y <= y ? (this.pos.y = y, this.vel.y < 0 && (this.vel.y = 0)) : !d && l <= 0 && (this.pos.y - y <= Cm ? this.pos.y = y : this.autoDown = !0), this.pos.y = Math.min(this.pos.y, 1500), this.land.copy(this.pos), this.inAir = this.pos.y > y + 0.5, this.walkPh = (this.walkPh || 0) + (this.inAir ? 0 : Math.hypot(this.vel.x, this.vel.z) * e / 38);
      }
      let r = !this.fp && this.tpBlend >= 1 && n.has(`KeyB`) ? 1 : 0;
      this.lookBack = (this.lookBack || 0) + (r - (this.lookBack || 0)) * (1 - Math.exp(-e * 7)), this.lookBack < 0.002 && (this.lookBack = 0);
      let i = Im(this.lookBack),
        a = i * Math.PI;
      t.camYawOff = a;
      let o = t.yaw + a,
        s = t.pitch,
        c = Math.cos(s),
        l = this._v.set(-Math.sin(o) * c, Math.sin(s), -Math.cos(o) * c),
        u = 1 - i,
        d = Math.cos(o) * u,
        f = -Math.sin(o) * u,
        p = this.pos.x + d * jm - l.x * km,
        m = this.pos.y + Am - l.y * km,
        h = this.pos.z + f * jm - l.z * km,
        g = 1;
      for (let e = 1; e <= 28; e++) {
        let t = 0.06 + 0.94 * e / 28;
        if (this.camInside(this.pos.x + d * jm - l.x * km * t, this.pos.y + Am - l.y * km * t, this.pos.z + f * jm - l.z * km * t)) {
          g = Math.max(0.09, t - 0.06);
          break;
        }
      }
      this.camK = (this.camK || 1) + (g - (this.camK || 1)) * (1 - Math.exp(-e * (g < (this.camK || 1) ? 14 : 3))), p = this.pos.x + d * jm - l.x * km * this.camK, m = this.pos.y + Am - l.y * km * this.camK, h = this.pos.z + f * jm - l.z * km * this.camK, m = Math.max(m, $(p, h) + 4);
      let _ = -Math.sin(this.yaw),
        v = -Math.cos(this.yaw),
        y = Math.sin((this.walkPh || 0) * Math.PI * 2) * 0.9,
        b = this.pos.x + _ * 6,
        x = this.pos.y + lm * _m + y,
        S = this.pos.z + v * 6,
        C = Im(this.fpBlend),
        w = Im(this.tpBlend);
      return p += (b - p) * C, m += (x - m) * C, h += (S - h) * C, t.pos.set(this.camFree.x + (p - this.camFree.x) * w, this.camFree.y + (m - this.camFree.y) * w, this.camFree.z + (h - this.camFree.z) * w), !0;
    }
    anchor(e) {
      let t = this.camera,
        n = t.getWorldDirection(new Vector3()),
        r = new Vector3().crossVectors(n, new Vector3(0, 1, 0)).normalize();
      return n.y = 0, n.lengthSq() < 1e-6 && n.set(0, 0, -1), n.normalize(), r.crossVectors(n, new Vector3(0, 1, 0)).normalize(), e.copy(t.position).addScaledVector(n, mm).addScaledVector(r, hm), e.y = Math.max($(e.x, e.z), t.position.y - 62), e;
    }
    hand(e) {
      return this.fp && this.fpBlend > 0.5 ? this.camera.localToWorld(e.set(-9, -7, -34)) : this.handBone && this.root.visible ? (this.handBone.updateWorldMatrix(!0, !1), this.handBone.getWorldPosition(e)) : this.modelKind === `fallback-blocks` ? e.set(0.5, 1.5, -0.95).multiplyScalar(lm / 2.05).applyQuaternion(this.root.quaternion).add(this.root.position) : e.copy(pm).multiplyScalar(this.giantScale).applyQuaternion(this.root.quaternion).add(this.root.position);
    }
    pickTarget(e, t) {
      let n = null,
        r = Math.cos(14 * Math.PI / 180),
        i = this._v;
      for (let a of this.targets) {
        let o = Math.hypot(a.x - e.x, a.z - e.z),
          s = Math.hypot(t.x, t.z) || 0.001,
          c = Math.max(a.base + 20, Math.min(a.base + a.h * 0.9, e.y + t.y / s * o));
        i.set(a.x - e.x, c - e.y, a.z - e.z);
        let l = i.length();
        if (l > 4500 || l < 20) continue;
        let u = i.dot(t) / l + (a.lit ? -0.03 : 0) + Math.min(0.01, a.h / 6e4) - l * 4e-6;
        u > r && (r = u, n = a, n._aimY = c);
      }
      return n;
    }
    fire(e) {
      if (!this.active || this.orbs.length >= cm) return null;
      gd.uNight.value < 0.5 && this.setNight(!0);
      let t = this.camera.getWorldDirection(new Vector3()),
        n = this.hand(new Vector3()),
        r = e || this.pickTarget(this.camera.position, t);
      r && r._aimY == null && (r._aimY = r.base + r.h * 0.55);
      let i = {
        p: n.clone(),
        v: t.clone().multiplyScalar(am),
        age: 0,
        target: r,
        trail: [],
        dive: 0,
        seed: Math.random() * 10
      };
      return this.orbs.push(i), this.fireT = 0, i;
    }
    fixLegs(e) {
      let t = this._lg ||= {
          H: new Vector3(),
          K: new Vector3(),
          A: new Vector3(),
          t: new Vector3(),
          u: new Vector3(),
          w: new Vector3(),
          p: new Vector3(),
          q: new Quaternion(),
          q2: new Quaternion(),
          fq: new Quaternion(),
          f: new Vector3(),
          r: new Vector3(),
          legs: [{}, {}]
        },
        n = this.state === `arriving` || this.state === `ascending` || !!this.inAir;
      this.wasAir && !n && (this.landT = 0), this.wasAir = n, this.landT = this.landT == null ? 9 : this.landT + e, this.legAirK = (this.legAirK == null ? +!!n : this.legAirK) + (+!!n - (this.legAirK == null ? 0 : this.legAirK)) * (1 - Math.exp(-e * 9));
      let r = Math.max(0, Math.min(1, this.legAirK)),
        i = this.landT / 0.55,
        a = i >= 1 ? 0 : i < 0.18 ? i / 0.18 : (1 - (i - 0.18) / 0.82) ** 2,
        o = Math.max(0, 1 - (this.animW.walk || 0) - (this.animW.run || 0)),
        s = Math.PI / 180;
      this.model.position.y = this.modelY0, this.root.updateMatrixWorld(!0);
      let c = this.yaw;
      t.f.set(-Math.sin(c), 0, -Math.cos(c)), t.r.set(Math.cos(c), 0, -Math.sin(c));
      let l = (e, t, n) => Math.sqrt(e * e + t * t + 2 * e * t * Math.cos(n * s)),
        u = 1 / 0,
        d = [];
      for (let e = 0; e < 2; e++) {
        let n = this.legs[e],
          r = t.legs[e];
        n.th.getWorldPosition(t.H), n.ca.getWorldPosition(t.K), n.ft.getWorldPosition(t.A);
        let i = t.K.distanceTo(t.H),
          c = t.A.distanceTo(t.K);
        t.u.subVectors(t.K, t.H), t.w.subVectors(t.A, t.K);
        let f = Math.acos(Math.max(-1, Math.min(1, t.u.dot(t.w) / (i * c)))) / s,
          p = f + (3 - f) * o;
        p = Math.max(p, 30 * a);
        let m = l(i, c, p),
          h = Math.hypot(t.A.x - t.H.x, t.A.z - t.H.z),
          g = Math.sqrt(Math.max(0, m * m - h * h)),
          _ = t.H.y - t.A.y;
        u = Math.min(u, g - _), r.a = i, r.b = c, r.A0 = (r.A0 || new Vector3()).copy(t.A), r.bend0 = f, r.dG = m, r.vNow = _, r.h = h, r.hx = h > 0.001 ? (t.A.x - t.H.x) / h : t.r.x * (n.sd === `L` ? -1 : 1), r.hz = h > 0.001 ? (t.A.z - t.H.z) / h : t.r.z * (n.sd === `L` ? -1 : 1);
        let v = (t.A.x - t.H.x) * t.r.x + (t.A.z - t.H.z) * t.r.z,
          y = Math.max(-0.05, Math.min(0.12, v / (i + c) * (n.sd === `L` ? -1 : 1))) * (n.sd === `L` ? -1 : 1),
          b = n.sd === `L` ? 12 : 8,
          x = n.sd === `L` ? 0.16 : 0.1;
        r.dirA = (r.dirA || new Vector3()).set(0, -1, 0).addScaledVector(t.f, -x).addScaledVector(t.r, y).normalize(), r.dA = l(i, c, b), d.push(n.sd + ` ` + f.toFixed(0));
      }
      isFinite(u) || (u = 0), u = Math.max(-0.2 * lm, Math.min(0.25 * lm, u)) * (1 - r), this.model.position.y = this.modelY0 + u / (lm * (this.root.scale.y || 1)), this.root.updateMatrixWorld(!0);
      let f = [];
      for (let e = 0; e < 2; e++) {
        let n = this.legs[e],
          i = t.legs[e];
        n.th.getWorldPosition(t.H);
        let a = i.vNow + u,
          o = Math.max(i.h, Math.sqrt(Math.max(0, i.dG * i.dG - a * a)));
        t.t.set(t.H.x + i.hx * o, i.A0.y, t.H.z + i.hz * o), t.p.copy(t.H).addScaledVector(i.dirA, i.dA), t.t.lerp(t.p, r), this.solveLeg(n, t.t, t.f), n.th.getWorldPosition(t.H), n.ca.getWorldPosition(t.K), n.ft.getWorldPosition(t.A), t.u.subVectors(t.K, t.H), t.w.subVectors(t.A, t.K), f.push(n.sd + ` ` + i.bend0.toFixed(0) + `→` + (Math.acos(Math.max(-1, Math.min(1, t.u.dot(t.w) / (t.u.length() * t.w.length())))) / s).toFixed(0) + `°`);
      }
      this.legInfo = f.join(` / `) + ` lift ` + u.toFixed(1) + `m` + (a > 0 ? ` landing` : ``);
    }
    solveLeg(e, t, n) {
      let r = this._ik ||= {
        H: new Vector3(),
        K: new Vector3(),
        A: new Vector3(),
        d: new Vector3(),
        p: new Vector3(),
        K2: new Vector3(),
        A2: new Vector3(),
        v1: new Vector3(),
        v2: new Vector3(),
        dq: new Quaternion(),
        bw: new Quaternion(),
        pw: new Quaternion(),
        fw: new Quaternion()
      };
      e.th.getWorldPosition(r.H), e.ca.getWorldPosition(r.K), e.ft.getWorldPosition(r.A), e.ft.getWorldQuaternion(r.fw);
      let i = r.K.distanceTo(r.H),
        a = r.A.distanceTo(r.K);
      r.d.subVectors(t, r.H);
      let o = r.d.length();
      if (o < 1e-6) return;
      r.d.multiplyScalar(1 / o), o = Math.max(Math.abs(i - a) + 0.001, Math.min(i + a - 0.001 * (i + a), o));
      let s = Math.max(-1, Math.min(1, (i * i + o * o - a * a) / (2 * i * o))),
        c = Math.sqrt(1 - s * s);
      if (r.p.copy(n).addScaledVector(r.d, -n.dot(r.d)), r.p.lengthSq() < 1e-8) return;
      r.p.normalize(), r.K2.copy(r.H).addScaledVector(r.d, i * s).addScaledVector(r.p, i * c), r.A2.copy(r.H).addScaledVector(r.d, o);
      let l = (e, t, n) => {
        r.dq.setFromUnitVectors(t.normalize(), n.normalize()), e.getWorldQuaternion(r.bw), e.parent.getWorldQuaternion(r.pw), e.quaternion.copy(r.pw.invert()).multiply(r.dq).multiply(r.bw), e.updateMatrixWorld(!0);
      };
      l(e.th, r.v1.subVectors(r.K, r.H), r.v2.subVectors(r.K2, r.H)), e.ca.getWorldPosition(r.K), e.ft.getWorldPosition(r.A), l(e.ca, r.v1.subVectors(r.A, r.K), r.v2.subVectors(r.A2, r.K)), e.ft.parent.getWorldQuaternion(r.pw), e.ft.quaternion.copy(r.pw.invert()).multiply(r.fw), e.ft.updateMatrixWorld(!0);
    }
    update(e) {
      if (this.t += e, this.fireT += e, this.state !== `hidden` && !this.frozen) {
        this.stateT += e, this.camera;
        let t = 1,
          n = 0;
        if (this.state === `arriving`) {
          let e = this.stateT;
          this.lightAmp = Math.min(1, e / 0.5), this.skyBeam.material.uniforms.uHead.value = 1 - Im(e / (Em * 0.85));
          let t = Im((e - Em) / Dm);
          this.pos.lerpVectors(this.from, this.land, t), e >= 6 && (this.state = `landed`, this.stateT = 0, this.pos.copy(this.land));
        } else if (this.state === `landed`) {
          if (this.pos.copy(this.land), this.stateT < bm) {
            let e = this.stateT / bm;
            t = 1 - 0.035 * Math.sin(e * Math.PI) * (1 - e * 0.5);
          }
          this.lightAmp = Math.max(0, 1 - this.stateT / 1.6);
          let r = Math.hypot(this.vel.x, this.vel.z),
            i = this.vel.x * -Math.sin(this.yaw) + this.vel.z * -Math.cos(this.yaw),
            a = -(this.inAir ? 0.42 : 0.1) * Math.max(-0.5, Math.min(1, i / 75));
          this.lean = (this.lean || 0) + (a - (this.lean || 0)) * (1 - Math.exp(-e * 4)), n = this.lean, this.bobY = this.inAir ? Math.sin(this.t * 0.9) * 1.5 : Math.abs(Math.sin((this.walkPh || 0) * Math.PI * 2)) * 1.8 * Math.min(1, r / 30);
        } else if (this.state === `ascending`) {
          let e = Math.min(1, this.stateT / ym),
            t = e * e * (0.4 + 0.6 * e);
          this.pos.copy(this.from), this.pos.y += t * 760, this.lightAmp = Math.min(1, this.stateT / 0.6) * (1 - Im((this.stateT - ym + 0.8) / 0.8)), this.skyBeam.material.uniforms.uBase.value.set(this.from.x, $(this.from.x, this.from.z), this.from.z), this.skyBeam.material.uniforms.uHead.value = 0, this.skyBeam.visible = !0, this.bobY = 0, this.stateT >= ym && (this.state = `hidden`, this.root.visible = !1, this.lightAmp = 0);
        }
        let r = this.yawTarget - this.yaw;
        if (r = Math.atan2(Math.sin(r), Math.cos(r)), this.yaw += r * (1 - Math.exp(-e * (this.fp ? 12 : 9))), this.root.position.copy(this.pos), this.state === `landed` && (this.root.position.y += this.bobY || 0), this.skyBeam.material.uniforms.uAmp.value = this.lightAmp, this.lightAmp <= 0 && this.state !== `arriving` && (this.skyBeam.visible = !1), this.state !== `hidden` && (this.root.visible = !(this.fpBlend > 0.72) && !(this.state === `arriving` && this.stateT < Em)), this.vm && (this.vm.visible = this.fpBlend > 0.72, this.vm.visible && this.poseArms(e)), this.mixer) {
          let t = Math.hypot(this.vel.x, this.vel.z),
            r = `idle`,
            i = 1;
          this.state === `arriving` || this.state === `ascending` || this.inAir ? r = this.actions.jump ? `jump` : `idle` : t > 62 ? (r = `run`, i = Math.max(0.55, Math.min(1.1, t / 150))) : t > 3 && (r = `walk`, i = Math.max(0.45, Math.min(1.2, t / 62)));
          let a = 1 - Math.exp(-e * 7);
          for (let e in this.actions) {
            let t = this.animW[e] + (+(e === r) - this.animW[e]) * a;
            this.animW[e] = t, this.actions[e].setEffectiveWeight(t), e === r && e !== `jump` && this.actions[e].setEffectiveTimeScale(i);
          }
          if (this.actions.jump) {
            r === `jump` && this.prevWant !== `jump` && (this.jumpT = this.state === `landed` ? 0 : this.jumpApex), r === `jump` && (this.jumpT = Math.min(this.jumpApex, this.jumpT + e));
            let t = this.actions.jump;
            t.paused = !1, t.enabled = !0, t.time = this.jumpT;
          }
          this.prevWant = r, this.clipTime = this.actions[r] ? this.actions[r].time : 0, this.mixer.update(e), this.anim = r === `jump` ? this.jumpT < this.jumpApex ? `takeoff` : `air-hold` : r, this.state === `landed` && (n = this.inAir ? (this.lean || 0) * 0.6 : 0, this.bobY = 0, this.root.position.y = this.pos.y);
        }
        this.root.rotation.set(n, this.yaw, 0, `YXZ`), this.root.scale.set(1, t, 1), this.mixer && this.legs && this.legs.length === 2 && this.root.visible && this.fixLegs(e);
        for (let e of this.mats) e.emissiveIntensity = 0.42 * gd.uNight.value;
        if (this.player && this.state !== `hidden`) {
          let e = this.player.pos,
            t = e.x - this.pos.x,
            n = e.z - this.pos.z,
            r = Math.hypot(t, n);
          if (this.state !== `landed` && r < vm && e.y > this.pos.y - 3 && e.y < this.pos.y + lm + 4) {
            let i = vm / Math.max(r, 0.001);
            e.x = this.pos.x + t * i, e.z = this.pos.z + n * i;
          }
        }
        let i = Math.max(0, 1 - this.fireT / 1.2);
        this.arm && this.arm.rotation.set(-0.25 - 1.25 * Math.min(1, i * 2.2), -0.55 * Math.min(1, i * 2.2), 0.22);
      }
      if (this.wave) {
        let e = Ed(gd.uTime.value - this.wave.t0);
        if (e > 0) {
          let t = !0;
          for (let n of this.targets) n.lit || (Math.hypot(n.x - this.wave.x, n.z - this.wave.z) <= e ? n.lit = !0 : t = !1);
          this.allLit = t;
        }
      }
      let t = 0,
        n = (e, n, r, i, a) => {
          t >= this.sprites.instanceMatrix.count || (this._m.makeScale(n, n, n).setPosition(e), this.sprites.setMatrixAt(t, this._m), this._c.setRGB(r, i, a), this.sprites.setColorAt(t, this._c), t++);
        };
      for (let t = this.orbs.length - 1; t >= 0; t--) {
        let r = this.orbs[t];
        r.age += e;
        let i = r.target;
        if (i && !r.dive) {
          let t = this._v.set(i.x - r.p.x, i._aimY - r.p.y, i.z - r.p.z),
            n = t.length();
          t.normalize();
          let a = r.v.clone().normalize().lerp(t, Math.min(1, e * (2.2 + 600 / Math.max(60, n)))).normalize();
          r.v.copy(a).multiplyScalar(am * (1 + Math.min(1.2, r.age * 0.5))), Math.hypot(i.x - r.p.x, i.z - r.p.z) < i.R * 0.85 && Math.abs(r.p.y - i._aimY) < 60 && (r.dive = 1e-4, r.hit = r.p.clone(), r.v.setLength(120));
        }
        if (r.p.addScaledVector(r.v, e), r.dive && (r.dive += e, r.dive > 0.35 && !r.done)) {
          if (r.done = !0, Td(r.hit, i), this.hits++, this.hits >= 3) {
            let e = Od(i.x, i.z, 0.8, this.targets);
            this.wave = {
              x: i.x,
              z: i.z,
              t0: e
            };
            for (let e of this.targets) e !== i && (e.lit = !1);
          }
          this.bursts.push({
            p: r.hit.clone(),
            age: 0
          }), this.onHit(i);
        }
        let a = $(r.p.x, r.p.z);
        if (r.age > om || r.dive && r.dive > 0.5 || r.p.y < a) {
          !r.done && r.p.y < a + 1 && this.bursts.push({
            p: r.p.clone(),
            age: 0,
            small: !0
          }), this.orbs.splice(t, 1);
          continue;
        }
        r.trail.unshift(r.p.clone()), r.trail.length > sm && r.trail.pop();
        let o = r.dive ? Math.max(0.05, 1 - r.dive / 0.5) : 1,
          s = 1 + 0.15 * Math.sin(this.t * 30 + r.seed);
        n(r.p, 46 * gm * o * s, 0.1, 0.3, 0.42), n(r.p, 17 * gm * o * s, 0.35, 0.85, 1), n(r.p, 6.5 * gm * o, 1.6, 1.6, 1.5);
        for (let e = 1; e < r.trail.length; e++) {
          let t = 1 - e / sm;
          n(r.trail[e], (10 * t + 2.5) * gm * o, 0.25 * t * t, 0.75 * t * t, 1 * t * t);
        }
      }
      if (this.lightAmp > 0 && this.state !== `hidden`) {
        let e = this.lightAmp,
          t = this.skyBeam.material.uniforms,
          r = this._v.copy(t.uBase.value);
        r.y += t.uLen.value - 200, n(r, 620 * e, 0.3 * e, 0.55 * e, 0.75 * e), n(r, 240 * e, 0.9 * e, 1.1 * e, 1.2 * e);
        let i = new Vector3(t.uBase.value.x, t.uBase.value.y + 6, t.uBase.value.z),
          a = 1 - t.uHead.value;
        if (n(i, 300 * e * a, 0.22 * e, 0.5 * e, 0.7 * e), this.state === `arriving` && this.stateT > 1.2) {
          let e = 1 - Im((this.stateT - Em) / Dm);
          n(new Vector3(this.pos.x, this.pos.y + 55, this.pos.z), 150 + 260 * e, 0.25 * e + 0.05, 0.55 * e + 0.1, 0.75 * e + 0.12);
        }
      }
      let r = this.fp && this.fpBlend > 0.5;
      if (this.active && this.fireT < 0.6 && !r) {
        let e = 1 - this.fireT / 0.6,
          t = this.hand(new Vector3());
        n(t, 60 * e + 14, 0.35 * e, 0.85 * e, 1 * e), n(t, 20 * e, 1.5 * e, 1.5 * e, 1.4 * e);
      }
      if (r) {
        let e = Math.max(0, 1 - this.fireT / 0.5),
          t;
        this.armL ? (this.camera.updateMatrixWorld(!0), t = this.armL.localToWorld(new Vector3(0, -0.11, -0.36))) : t = this.camera.localToWorld(new Vector3(-0.78, -0.5, -2.55));
        let r = 0.85 + 0.15 * Math.sin(this.t * 6);
        n(t, (1.5 + 2.2 * e) * r, 0.25 + 0.5 * e, 0.75 + 0.4 * e, 1 + 0.3 * e), n(t, 0.5 + 0.6 * e, 1.4, 1.4, 1.3);
      }
      for (let t = this.bursts.length - 1; t >= 0; t--) {
        let r = this.bursts[t];
        r.age += e;
        let i = r.small ? 0.5 : 1.1;
        if (r.age > i) {
          this.bursts.splice(t, 1);
          continue;
        }
        let a = r.age / i,
          o = (r.small ? 30 : 90) + (r.small ? 60 : 420) * a,
          s = (1 - a) * (1 - a);
        n(r.p, o, 0.5 * s, 0.95 * s, 1.1 * s), n(r.p, o * 0.35, 1.4 * s, 1.4 * s, 1.2 * s);
      }
      this.sprites.count = t, this.sprites.instanceMatrix.needsUpdate = !0, this.sprites.instanceColor.needsUpdate = !0;
    }
  },
  Wm = 1700,
  Gm = (e, t) => Math.round(e * 2) + `,` + Math.round(t * 2),
  Km = {
    motorway: [22, 30],
    trunk: [17, 20],
    primary: [14.5, 20],
    secondary: [11.5, 30],
    tertiary: [9, 44],
    motorway_link: [12, 60],
    trunk_link: [11, 60],
    primary_link: [10, 60],
    secondary_link: [9, 70]
  };

function qm(e) {
  return function () {
    e |= 0, e = e + 1831565813 | 0;
    let t = Math.imul(e ^ e >>> 15, 1 | e);
    return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var Jm = class {
    constructor() {
      this.P = [], this.N = [], this.C = [], this.A = [];
    }
    box(e, t, n, r, i, a, o, s = 0, c = [0, 0, 0]) {
      let l = e - r / 2,
        u = e + r / 2,
        d = t - i / 2,
        f = t + i / 2,
        p = n - a / 2,
        m = n + a / 2,
        h = l + c[2],
        g = u - c[2],
        _ = p + c[1],
        v = m - c[0],
        y = [[l, d, p], [u, d, p], [u, d, m], [l, d, m], [h, f, _], [g, f, _], [g, f, v], [h, f, v]],
        b = [[3, 2, 6, 7], [1, 0, 4, 5], [2, 1, 5, 6], [0, 3, 7, 4], [4, 7, 6, 5], [0, 1, 2, 3]],
        x = new Vector3(),
        S = new Vector3(),
        C = new Vector3();
      for (let e of b) {
        x.set(y[e[1]][0] - y[e[0]][0], y[e[1]][1] - y[e[0]][1], y[e[1]][2] - y[e[0]][2]), S.set(y[e[3]][0] - y[e[0]][0], y[e[3]][1] - y[e[0]][1], y[e[3]][2] - y[e[0]][2]), C.crossVectors(x, S).normalize();
        for (let t of [0, 1, 2, 0, 2, 3]) this.P.push(...y[e[t]]), this.N.push(C.x, C.y, C.z), this.C.push(...o), this.A.push(s);
      }
    }
    wheels(e, t, n, r) {
      for (let i of t) for (let t of [-1, 1]) {
        let a = new CylinderGeometry(n, n, r, 10).toNonIndexed();
        a.rotateZ(Math.PI / 2), a.translate(t * e, n, i);
        let o = a.attributes.position,
          s = a.attributes.normal;
        for (let e = 0; e < o.count; e++) this.P.push(o.getX(e), o.getY(e), o.getZ(e)), this.N.push(s.getX(e), s.getY(e), s.getZ(e)), this.C.push(0.05, 0.05, 0.055), this.A.push(0);
        a.dispose();
      }
    }
    build() {
      let e = new BufferGeometry();
      return e.setAttribute(`position`, new Float32BufferAttribute(this.P, 3)), e.setAttribute(`normal`, new Float32BufferAttribute(this.N, 3)), e.setAttribute(`color`, new Float32BufferAttribute(this.C, 3)), e.setAttribute(`aPaint`, new Float32BufferAttribute(this.A, 1)), e;
    }
  },
  Ym = [0.06, 0.09, 0.12],
  Xm = [0.07, 0.07, 0.08],
  Zm = [1, 0.98, 0.9],
  Qm = [0.75, 0.05, 0.04],
  $m = [0.92, 0.92, 0.9],
  eh = [1, 1, 1];

function th(e) {
  let t = new Jm(),
    n = e ? 4.75 : 4.6,
    r = e ? 1.9 : 1.8,
    i = e ? 0.82 : 0.66,
    a = e ? 0.72 : 0.58,
    o = e ? 0.34 : 0.28;
  t.box(0, o + i / 2, 0, r, i, n, eh, 1, [0.12, 0.08, 0.05]), t.box(0, o - 0.06, 0, r - 0.1, 0.14, n - 0.3, Xm);
  let s = e ? 2.9 : 2.5,
    c = e ? -0.35 : -0.2;
  t.box(0, o + i + a / 2, c, r - 0.14, a, s, Ym, 0, e ? [0.62, 0.22, 0.14] : [0.75, 0.62, 0.16]), t.box(0, o + i + a + 0.02, c - (e ? 0.2 : 0.06), r - 0.46, 0.05, s - (e ? 0.95 : 1.42), eh, 1);
  for (let e of [-1, 1]) t.box(e * (r / 2 - 0.34), o + i * 0.72, n / 2 - 0.04, 0.42, 0.14, 0.08, Zm), t.box(e * (r / 2 - 0.34), o + i * 0.76, -n / 2 + 0.04, 0.46, 0.12, 0.08, Qm);
  return t.wheels(r / 2 - 0.12, [n * 0.3, -n * 0.3], e ? 0.37 : 0.32, 0.24), t.build();
}

function nh() {
  let e = new Jm(),
    t = 4.7,
    n = 1.82;
  e.box(0, 0.6699999999999999, 0, n, 0.74, t, [0.1, 0.36, 0.78], 0, [0.12, 0.08, 0.05]), e.box(0, 0.54, 0, 1.84, 0.16, 4.2, $m), e.box(0, 0.24, 0, 1.72, 0.14, 4.4, Xm), e.box(0, 1.37, -0.3, 1.6800000000000002, 0.66, 2.9, Ym, 0, [0.62, 0.3, 0.14]), e.box(0, 1.7200000000000002, -0.4, 1.36, 0.05, 1.9, [0.1, 0.36, 0.78]), e.box(0, 1.8200000000000003, -0.2, 0.42, 0.14, 0.2, [0.95, 0.85, 0.3]);
  for (let r of [-1, 1]) e.box(r * (n / 2 - 0.34), 0.8328, t / 2 - 0.04, 0.42, 0.14, 0.08, Zm), e.box(r * (n / 2 - 0.34), 0.8624, -2.31, 0.46, 0.12, 0.08, Qm);
  return e.wheels(n / 2 - 0.12, [t * 0.3, -1.41], 0.33, 0.24), e.build();
}

function rh() {
  let e = new Jm(),
    t = 11.6,
    n = 2.5;
  e.box(0, 0.88, 0, n, 1, t, eh, 1), e.box(0, 1.9300000000000002, 0, 2.48, 1.1, 11.5, Ym), e.box(0, 2.7399999999999998, 0, n, 0.52, t, $m, 0, [0.15, 0.1, 0.08]), e.box(0, 3.1, -1, 1.8, 0.26, t * 0.55, [0.82, 0.83, 0.84]);
  for (let r = -4.6; r < t / 2 - 0.6; r += 1.45) for (let t of [-1, 1]) e.box(t * (n / 2 - 0.02), 1.9300000000000002, r, 0.06, 1.1, 0.12, $m);
  e.box(0, 0.3, 0, 2.4, 0.2, 11.2, Xm);
  for (let r of [-1, 1]) e.box(r * (n / 2 - 0.4), 0.88, t / 2 - 0.03, 0.5, 0.2, 0.08, Zm), e.box(r * (n / 2 - 0.3), 1.08, -5.77, 0.3, 0.5, 0.08, Qm);
  return e.box(0, 2.58, t / 2 - 0.03, 1.6, 0.3, 0.08, [0.95, 0.6, 0.1]), e.wheels(n / 2 - 0.16, [t * 0.3, -3.132], 0.5, 0.3), e.build();
}

function ih() {
  let e = new Jm(),
    t = 6.2,
    n = 2.1;
  e.box(0, 1.67, -0.9, n, 2.3, 4.2, $m), e.box(0, 0.9199999999999999, t / 2 - 0.95, 2.04, 1, 1.9, eh, 1), e.box(0, 1.8399999999999999, t / 2 - 1.05, 2, 0.86, 1.7, Ym, 0, [0.5, 0, 0.08]), e.box(0, 2.29, t / 2 - 1.3, 1.8, 0.06, 1.1, eh, 1), e.box(0, 0.31999999999999995, 0, 1.9000000000000001, 0.2, 5.9, Xm);
  for (let r of [-1, 1]) e.box(r * (n / 2 - 0.36), 0.9199999999999999, t / 2 - 0.02, 0.4, 0.18, 0.08, Zm), e.box(r * (n / 2 - 0.2), 0.72, -3.08, 0.24, 0.3, 0.08, Qm);
  return e.wheels(n / 2 - 0.14, [t * 0.3, -6.2 * 0.28], 0.42, 0.28), e.build();
}

var ah = [{
    make: () => th(!1),
    len: 4.6,
    wid: 1.8,
    hgt: 1.5,
    share: 0.46,
    cap: 2600,
    glb: `sedan`,
    tint: 0.7
  }, {
    make: () => th(!0),
    len: 4.75,
    wid: 1.9,
    hgt: 1.9,
    share: 0.22,
    cap: 1400,
    glb: `suv`,
    tint: 0.35
  }, {
    make: nh,
    len: 4.7,
    wid: 1.82,
    hgt: 1.7,
    share: 0.12,
    cap: 700,
    glb: `taxi`,
    tint: 0
  }, {
    make: rh,
    len: 11.6,
    wid: 2.5,
    hgt: 3.3,
    share: 0.07,
    cap: 420,
    glb: `bus`,
    tint: 0
  }, {
    make: ih,
    len: 6.2,
    wid: 2.1,
    hgt: 2.8,
    share: 0.06,
    cap: 420,
    glb: `truck`,
    tint: 0
  }, {
    make: () => th(!0),
    len: 5,
    wid: 1.9,
    hgt: 1.9,
    share: 0.07,
    cap: 500,
    glb: `mpv`,
    tint: 0.6
  }],
  oh = 260,
  sh = 48,
  ch = {
    sedan: !0,
    suv: !0,
    taxi: !0,
    bus: !1,
    truck: !0,
    mpv: !1
  },
  lh = [[0.93, 0.93, 0.92], [0.93, 0.93, 0.92], [0.08, 0.08, 0.09], [0.08, 0.08, 0.09], [0.62, 0.64, 0.66], [0.62, 0.64, 0.66], [0.36, 0.38, 0.4], [0.55, 0.08, 0.08], [0.1, 0.2, 0.42], [0.75, 0.72, 0.62], [0.16, 0.3, 0.22], [0.85, 0.5, 0.1]],
  uh = [[0.1, 0.55, 0.36], [0.12, 0.42, 0.75], [0.1, 0.55, 0.36], [0.85, 0.42, 0.12]];

function dh() {
  return new ShaderMaterial({
    uniforms: _d(),
    vertexShader: `
      attribute vec3 color; attribute float aPaint;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying float vPaint;
      void main(){
        vec4 lp = vec4(position, 1.0); vec3 ln = normal;
        vec3 paint = vec3(0.8);
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
        #endif
        #ifdef USE_INSTANCING_COLOR
          paint = instanceColor;
        #endif
        vCol = mix(color, paint, aPaint); vPaint = aPaint;
        vec4 wp = modelMatrix * lp; vWorld = wp.xyz; vN = normalize(mat3(modelMatrix) * ln);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      ${bd}
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying float vPaint;
      void main(){
        vec3 n = normalize(vN);
        vec3 V = normalize(vWorld - cameraPosition);
        float sh = sunShadow(vWorld, n);
        vec3 col = lightLin(toLin(vCol), n, sh, 0.9);
        // 车漆和玻璃反射天空
        float lum = dot(vCol, vec3(0.333));
        float glossy = max(vPaint, step(lum, 0.13) * step(0.07, lum));
        vec3 R = reflect(V, n);
        float fres = pow(1.0 - max(dot(-V, n), 0.0), 3.0);
        col = mix(col, skyColor(vec3(R.x, abs(R.y), R.z)), glossy * (0.10 + 0.45 * fres));
        col += glossy * sh * pow(max(dot(n, normalize(uSunDir - V)), 0.0), 90.0) * 0.9;
        // 车灯自发光
        if (lum > 0.94 && vPaint < 0.5 && abs(n.y) < 0.5) col = max(col, vCol);
        // 夜景：尾灯亮红
        if (vPaint < 0.5 && vCol.r > 0.6 && vCol.g < 0.15) col = mix(col, vec3(1.0, 0.10, 0.06), uNight);
        gl_FragColor = vec4(atmo(col, vWorld), 1.0);
      }`
  });
}

function fh() {
  return new ShaderMaterial({
    uniforms: _d(),
    transparent: !0,
    depthWrite: !1,
    polygonOffset: !0,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -12,
    vertexShader: `
      varying vec2 vUv; varying vec3 vWorld;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      ${bd}
      varying vec2 vUv; varying vec3 vWorld;
      void main(){
        vec2 d = abs(vUv - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.72, 1.0, d.x)) * (1.0 - smoothstep(0.80, 1.0, d.y));
        float lit = sunShadow(vWorld, vec3(0.0, 1.0, 0.0));
        gl_FragColor = vec4(vec3(0.02, 0.03, 0.05), a * (0.22 + 0.36 * lit));
      }`
  });
}

function ph(e) {
  let t = e.roadClasses,
    n = [];
  for (let r of e.roads) {
    let e = t[r[0]],
      i = Km[e];
    if (!i) continue;
    let [, a, o, s, c] = r;
    if (c.length < 4 || o < 1) continue;
    let l = Kd.get(r),
      u = c.length / 2,
      d = t => {
        let n = [];
        for (let e = 0; e < u; e++) {
          let r = t ? u - 1 - e : e;
          n.push([c[r * 2], c[r * 2 + 1]]);
        }
        let d,
          f,
          p = a / 2;
        if (s) {
          d = Math.min(o, 6);
          let e = (a - 1.2) / d;
          f = Array.from({
            length: d
          }, (t, n) => -p + 0.6 + (n + 0.5) * e);
        } else {
          d = Math.max(1, Math.min(3, Math.floor(o / 2)));
          let e = (p - 0.6) / d;
          f = Array.from({
            length: d
          }, (t, n) => (n + 0.5) * e);
        }
        return {
          pts: n,
          offs: f,
          cls: e,
          cfg: i,
          rev: t,
          el: l,
          total: l ? l.acc[l.acc.length - 1] : 0,
          a: Gm(...n[0]),
          b: Gm(...n[n.length - 1]),
          used: !1,
          name: r[7] || ``
        };
      };
    n.push(d(!1)), s || n.push(d(!0));
  }
  let r = new Map(),
    i = new Map();
  for (let e of n) r.has(e.a) || r.set(e.a, []), r.get(e.a).push(e), i.set(e.b, (i.get(e.b) || 0) + 1);
  let a = (e, t) => {
      let n = t ? e.length - 1 : 1,
        r = e[n][0] - e[n - 1][0],
        i = e[n][1] - e[n - 1][1],
        a = Math.hypot(r, i) || 1;
      return [r / a, i / a];
    },
    o = [],
    s = n.slice().sort((e, t) => (i.get(e.a) || 0) - (i.get(t.a) || 0));
  for (let e of s) {
    if (e.used) continue;
    let t = [],
      n = e,
      i = 0;
    for (; n && !n.used && i < 9e3;) {
      n.used = !0, t.push(n);
      for (let e = 1; e < n.pts.length; e++) i += Math.hypot(n.pts[e][0] - n.pts[e - 1][0], n.pts[e][1] - n.pts[e - 1][1]);
      let e = a(n.pts, !0),
        o = null,
        s = 0.5;
      for (let t of r.get(n.b) || []) {
        if (t.used) continue;
        let r = a(t.pts, !1),
          i = e[0] * r[0] + e[1] * r[1];
        t.cls === n.cls && (i += 0.3), t.name && t.name === n.name && (i += 0.3), i > s && (s = i, o = t);
      }
      n = o;
    }
    let s = [],
      c = [],
      l = [],
      u = [],
      d = [],
      f = 0;
    for (let e of t) {
      let t = 0;
      for (let n = 0; n < e.pts.length; n++) {
        if (n > 0) {
          let r = Math.hypot(e.pts[n][0] - e.pts[n - 1][0], e.pts[n][1] - e.pts[n - 1][1]);
          f += r, t += r;
        } else if (s.length) continue;
        let r = 0;
        if (e.el) {
          let {
              acc: n,
              elev: i
            } = e.el,
            a = e.rev ? e.total - t : t,
            o = 1;
          for (; o < n.length - 1 && n[o] < a;) o++;
          let s = Math.max(0, Math.min(1, (a - n[o - 1]) / Math.max(0.001, n[o] - n[o - 1])));
          r = i[o - 1] + (i[o] - i[o - 1]) * s;
        }
        s.push(e.pts[n][0]), c.push(e.pts[n][1]), l.push(f), u.push(r), d.push(e);
      }
    }
    if (f < 60) continue;
    let p = 1 / 0,
      m = -1 / 0,
      h = 1 / 0,
      g = -1 / 0;
    for (let e = 0; e < s.length; e++) p = Math.min(p, s[e]), m = Math.max(m, s[e]), h = Math.min(h, c[e]), g = Math.max(g, c[e]);
    o.push({
      X: s,
      Z: c,
      S: l,
      E: u,
      segAt: d,
      len: f,
      x0: p,
      x1: m,
      z0: h,
      z1: g,
      cfg: t[0].cfg,
      maxLanes: Math.max(...t.map(e => e.offs.length)),
      cars: []
    });
  }
  return o;
}

function mh(e) {
  let t = {
      on: !1,
      x: 0,
      z: 0,
      y: 0
    },
    n = [],
    r = qm(424242),
    i = ph(e),
    a = 0;
  for (let e of i) {
    let [t, n] = e.cfg;
    for (let i = 0; i < e.maxLanes; i++) {
      let o = t * (1.12 - 0.09 * i + (r() - 0.5) * 0.06),
        s = r() * n;
      for (; s < e.len - 8;) {
        let t = r(),
          c = 0,
          l = 0;
        for (let e = 0; e < ah.length; e++) if (l += ah[e].share, t < l) {
          c = e;
          break;
        }
        c === 3 && i < e.maxLanes - 1 && r() < 0.75 && (c = 0);
        let u = c === 3 ? uh[Math.floor(r() * uh.length)] : lh[Math.floor(r() * lh.length)];
        e.cars.push({
          s0: s,
          lane: i,
          v: o,
          type: c,
          paint: u,
          jitter: (r() - 0.5) * 0.5
        }), a++, s += ah[c].len + 4 + n * (0.25 + r() * 1.3);
      }
    }
  }
  let o = dh(),
    s = new Group(),
    c = ah.map(e => {
      let t = new InstancedMesh(e.make(), o, e.cap);
      return t.instanceMatrix.setUsage(DynamicDrawUsage), t.setColorAt(0, new Color(1, 1, 1)), t.instanceColor.setUsage(DynamicDrawUsage), t.frustumCulled = !1, t.count = 0, t.renderOrder = 6, s.add(t), t;
    }),
    l = new ShaderMaterial({
      uniforms: _d(),
      transparent: !0,
      depthWrite: !1,
      blending: 2,
      side: 2,
      vertexShader: `attribute vec3 color; varying vec3 vC; varying vec2 vUv;
      void main(){ vC = color; vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uNight; varying vec3 vC; varying vec2 vUv;
      void main(){ float a = pow(1.0 - vUv.y, 1.6) * (1.0 - vUv.x * vUv.x); gl_FragColor = vec4(vC * a * uNight * 1.45, 1.0); }`
    }),
    u = ah.map((e, t) => {
      let n = [],
        r = [],
        i = [],
        a = (e, t, a) => {
          for (let o of [0, 1, 2, 0, 2, 3]) n.push(...e[o]), r.push(...t), i.push(...a[o]);
        },
        o = e.len / 2,
        c = [1, 0.93, 0.78],
        u = [1, 0.08, 0.04];
      a([[-1.5, 0.08, o], [1.5, 0.08, o], [2.8, 0.08, o + 20], [-2.8, 0.08, o + 20]], c.map(e => e * 0.55), [[-1, 0], [1, 0], [1, 1], [-1, 1]]), a([[-1.2, 0.08, -o], [1.2, 0.08, -o], [1.7, 0.08, -o - 6], [-1.7, 0.08, -o - 6]], u.map(e => e * 0.6), [[-1, 0], [1, 0], [1, 1], [-1, 1]]);
      let d = Math.min(0.75, e.hgt * 0.42),
        f = Math.min(1, e.hgt * 0.5),
        p = o;
      for (let t of [-1, 1]) {
        let n = t * e.wid * 0.36,
          r = t * e.wid * 0.38;
        a([[n - 0.32, d - 0.18, p + 0.08], [n + 0.32, d - 0.18, p + 0.08], [n + 0.32, d + 0.18, p + 0.08], [n - 0.32, d + 0.18, p + 0.08]], c.map(e => e * 0.55), [[-1, 0.3], [1, 0.3], [1, 0.3], [-1, 0.3]]), a([[r - 0.28, f - 0.14, -p - 0.08], [r + 0.28, f - 0.14, -p - 0.08], [r + 0.28, f + 0.14, -p - 0.08], [r - 0.28, f + 0.14, -p - 0.08]], u.map(e => e * 0.5), [[-1, 0.3], [1, 0.3], [1, 0.3], [-1, 0.3]]);
      }
      let m = new BufferGeometry();
      m.setAttribute(`position`, new Float32BufferAttribute(n, 3)), m.setAttribute(`color`, new Float32BufferAttribute(r, 3)), m.setAttribute(`uv`, new Float32BufferAttribute(i, 2));
      let h = new InstancedMesh(m, l, e.cap);
      return h.instanceMatrix.setUsage(DynamicDrawUsage), h.frustumCulled = !1, h.count = 0, h.renderOrder = 21, h.visible = !1, Ad.push(h), s.add(h), h;
    }),
    d = ah.map(() => null),
    f = new Int32Array(ah.length),
    p = new Int32Array(ah.length),
    m = new GLTFLoader(),
    h = ah.map(() => null),
    g = new Int32Array(ah.length),
    _ = (e, t) => {
      let n = null;
      e.scene.updateMatrixWorld(!0), e.scene.traverse(e => {
        e.isMesh && !n && (n = e);
      });
      let r = n.geometry.clone().applyMatrix4(n.matrixWorld);
      ch[t.glb] && r.rotateY(Math.PI), r.computeBoundingBox();
      let i = r.boundingBox,
        a = t.len / (i.max.z - i.min.z),
        o = Math.min(a, t.wid * 1.15 / (i.max.x - i.min.x)),
        s = Math.min(a, t.hgt * 1.12 / (i.max.y - i.min.y));
      r.translate(-(i.min.x + i.max.x) / 2, -i.min.y, -(i.min.z + i.max.z) / 2), r.scale(o, s, a);
      let c = n.material;
      return c.metalness = 0.25, c.roughness = 0.42, c.metalnessMap = null, c.roughnessMap = null, c.normalMap = null, c.envMapIntensity = 1, Md(c), {
        geo: r,
        sm: c
      };
    },
    v = (e, t, n) => {
      let r = new InstancedMesh(e, t, n);
      return r.instanceMatrix.setUsage(DynamicDrawUsage), r.setColorAt(0, new Color(1, 1, 1)), r.instanceColor.setUsage(DynamicDrawUsage), r.frustumCulled = !1, r.count = 0, r.renderOrder = 6, s.add(r), r;
    };
  ah.forEach((e, t) => {
    if (e.glb) for (let n of [`-lod1`, ``]) m.loadAsync(`./models/cars/` + e.glb + n + `.glb`).then(r => {
      let {
          geo: i,
          sm: a
        } = _(r, e),
        o = v(i, a, n ? oh : sh);
      o.name = `car-` + e.glb + (n || `-hi`), n ? d[t] = o : h[t] = o, A.glb = (A.glb || 0) + 1;
    }).catch(t => console.warn(`[futian] 车模 ` + e.glb + n + `.glb 加载失败，继续用方块车：`, t && t.message ? t.message : t));
  });
  let y = ah.reduce((e, t) => e + t.cap, 0),
    b = new PlaneGeometry(1, 1);
  b.rotateX(-Math.PI / 2);
  let x = new InstancedMesh(b, fh(), y);
  x.instanceMatrix.setUsage(DynamicDrawUsage), x.frustumCulled = !1, x.count = 0, x.renderOrder = 5.5, s.add(x);
  let S = _d().uSunDir.value,
    C = Math.hypot(S.x, S.z) / S.y,
    w = -S.x / Math.hypot(S.x, S.z),
    T = -S.z / Math.hypot(S.x, S.z),
    E = new Matrix4(),
    D = new Color(),
    O = 0,
    k = new Int32Array(ah.length),
    A = {
      routes: i.length,
      cars: a,
      visible: 0,
      km: i.reduce((e, t) => e + t.len, 0) / 1e3
    };
  function j(e, r) {
    O += e, n.length = 0, k.fill(0), f.fill(0), p.fill(0), g.fill(0);
    let a = 0,
      o = r.x,
      s = r.z,
      l = Wm * Wm;
    for (let e of i) {
      if (o < e.x0 - Wm || o > e.x1 + Wm || s < e.z0 - Wm || s > e.z1 + Wm) continue;
      let {
          X: r,
          Z: i,
          S: m,
          E: _,
          segAt: v,
          len: b
        } = e,
        S = 1,
        A = -1;
      for (let j of e.cars) {
        let e = (j.s0 + j.v * O) % b;
        if (e < A || e > m[Math.min(m.length - 1, S + 8)]) {
          let t = 1,
            n = m.length - 1;
          for (; t < n;) {
            let r = t + n >> 1;
            m[r] < e ? t = r + 1 : n = r;
          }
          S = t;
        } else for (; S < m.length - 1 && m[S] < e;) S++;
        A = e;
        let M = r[S - 1],
          ee = i[S - 1],
          N = r[S],
          P = i[S],
          F = m[S] - m[S - 1] || 1,
          te = (e - m[S - 1]) / F,
          I = M + (N - M) * te,
          ne = ee + (P - ee) * te,
          re = I - o,
          L = ne - s,
          ie = re * re + L * L;
        if (ie > l) continue;
        let ae = c[j.type],
          R = ah[j.type],
          z = k[j.type];
        if (z >= R.cap) continue;
        let B = (N - M) / F,
          oe = (P - ee) / F;
        if (te > 0.7 && S < r.length - 1) {
          let e = m[S + 1] - m[S] || 1,
            t = (te - 0.7) / 0.6;
          B += ((r[S + 1] - N) / e - B) * t, oe += ((i[S + 1] - P) / e - oe) * t;
        } else if (te < 0.3 && S > 1) {
          let e = m[S - 1] - m[S - 2] || 1,
            t = (0.3 - te) / 0.6;
          B += ((M - r[S - 2]) / e - B) * t, oe += ((ee - i[S - 2]) / e - oe) * t;
        }
        let se = Math.hypot(B, oe) || 1;
        B /= se, oe /= se;
        let ce = v[S].offs,
          le = ce[Math.min(j.lane, ce.length - 1)] + j.jitter * 0.3;
        I += -oe * le, ne += B * le;
        let ue = $(I, ne) + 0.13 + _[S - 1] + (_[S] - _[S - 1]) * te;
        if (E.set(oe, 0, B, I, 0, 1, 0, ue, -B, 0, oe, ne, 0, 0, 0, 1), t.on) {
          let e = I - t.x,
            r = ne - t.z;
          e * e + r * r < 2025 && n.push({
            x: I,
            z: ne,
            y: ue - 0.13,
            yaw: Math.atan2(-B, -oe),
            hl: R.len / 2,
            hw: R.wid / 2,
            vx: B * j.v,
            vz: oe * j.v,
            label: R.glb === `bus` ? `公交车` : R.glb === `truck` ? `货车` : R.glb === `taxi` ? `出租车` : `车`
          });
        }
        u[j.type].setMatrixAt(z, E), k[j.type] = z + 1;
        let de = d[j.type],
          fe = h[j.type],
          pe = R.tint;
        if (fe && ie < 4900 && g[j.type] < sh) {
          let e = g[j.type]++;
          fe.setMatrixAt(e, E), D.setRGB(1 + (j.paint[0] - 1) * pe, 1 + (j.paint[1] - 1) * pe, 1 + (j.paint[2] - 1) * pe, SRGBColorSpace), fe.setColorAt(e, D);
        } else if (de && ie < 57600 && f[j.type] < oh) {
          let e = f[j.type]++;
          de.setMatrixAt(e, E), D.setRGB(1 + (j.paint[0] - 1) * pe, 1 + (j.paint[1] - 1) * pe, 1 + (j.paint[2] - 1) * pe, SRGBColorSpace), de.setColorAt(e, D);
        } else {
          let e = p[j.type]++;
          ae.setMatrixAt(e, E), D.setRGB(j.paint[0], j.paint[1], j.paint[2]), ae.setColorAt(e, D);
        }
        if (a < y) {
          let e = R.hgt * 0.5 * C,
            t = R.len + Math.abs(B * w + oe * T) * R.hgt * C,
            n = R.wid + Math.abs(-oe * w + B * T) * R.hgt * C;
          E.set(oe * n, 0, B * t, I + w * e, 0, 1, 0, ue + 0.03, -B * n, 0, oe * t, ne + T * e, 0, 0, 0, 1), x.setMatrixAt(a++, E);
        }
      }
    }
    let m = 0;
    u.forEach((e, t) => {
      e.count = k[t], e.instanceMatrix.needsUpdate = !0;
    }), c.forEach((e, t) => {
      e.count = p[t], m += k[t], e.instanceMatrix.needsUpdate = !0, e.instanceColor && (e.instanceColor.needsUpdate = !0);
    }), d.forEach((e, t) => {
      e && (e.count = f[t], e.instanceMatrix.needsUpdate = !0, e.instanceColor.needsUpdate = !0);
    }), h.forEach((e, t) => {
      e && (e.count = g[t], e.instanceMatrix.needsUpdate = !0, e.instanceColor.needsUpdate = !0);
    }), A.near = f.reduce((e, t) => e + t, 0), A.hi = g.reduce((e, t) => e + t, 0), x.count = a, x.instanceMatrix.needsUpdate = !0, A.visible = m;
  }
  return {
    group: s,
    update: j,
    stats: A,
    probe: t,
    hits: n
  };
}

function hh(e) {
  let t = [],
    n = [],
    r = [],
    i = (e, i, a) => {
      for (let o of [0, 1, 2, 0, 2, 3]) t.push(...e[o]), n.push(...i), r.push(...a[o]);
    },
    a = e / 2;
  i([[-1, 0.06, a], [1, 0.06, a], [3.6, 0.06, a + 24], [-3.6, 0.06, a + 24]], [1, 0.93, 0.78].map(e => e * 0.6), [[-1, 0], [1, 0], [1, 1], [-1, 1]]), i([[-1, 0.06, -a], [1, 0.06, -a], [1.6, 0.06, -a - 5], [-1.6, 0.06, -a - 5]], [1, 0.08, 0.04].map(e => e * 0.55), [[-1, 0], [1, 0], [1, 1], [-1, 1]]);
  let o = new BufferGeometry();
  return o.setAttribute(`position`, new Float32BufferAttribute(t, 3)), o.setAttribute(`color`, new Float32BufferAttribute(n, 3)), o.setAttribute(`uv`, new Float32BufferAttribute(r, 2)), o;
}

function gh() {
  return new ShaderMaterial({
    uniforms: _d(),
    transparent: !0,
    depthWrite: !1,
    blending: 2,
    side: 2,
    vertexShader: `attribute vec3 color; varying vec3 vC; varying vec2 vUv;
      void main(){ vC = color; vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uNight; varying vec3 vC; varying vec2 vUv;
      void main(){ float a = pow(1.0 - vUv.y, 1.6) * (1.0 - vUv.x * vUv.x); gl_FragColor = vec4(vC * a * uNight * 1.3, 1.0); }`
  });
}

var _h = `./models/ped/ped.glb`,
  vh = 1.76,
  yh = 64,
  bh = 256,
  xh = 230,
  Sh = 320,
  Ch = new Set([`primary`, `secondary`, `tertiary`, `unclassified`, `residential`, `living_street`]),
  wh = [{
    id: `sedan`,
    label: `轿车`,
    len: 4.7,
    wid: 1.85,
    hgt: 1.45,
    vmax: 46,
    acc: 9.5,
    share: 0.28
  }, {
    id: `suv`,
    label: `SUV`,
    len: 4.75,
    wid: 1.95,
    hgt: 1.75,
    vmax: 42,
    acc: 8.5,
    share: 0.2
  }, {
    id: `taxi`,
    label: `出租车`,
    len: 4.7,
    wid: 1.85,
    hgt: 1.6,
    vmax: 44,
    acc: 9,
    share: 0.1
  }, {
    id: `mpv`,
    label: `MPV`,
    len: 5,
    wid: 1.95,
    hgt: 1.85,
    vmax: 40,
    acc: 8,
    share: 0.12
  }, {
    id: `motorcycle`,
    label: `摩托车`,
    len: 2.15,
    wid: 0.85,
    hgt: 1.2,
    vmax: 55,
    acc: 13,
    share: 0.3,
    bike: !0
  }],
  Th = {
    v: !1
  },
  Eh = [[`Waist`, `Spine01`, 0, 0.86, -0.5], [`Spine01`, `Spine02`, 0, 0.8, -0.6], [`Spine02`, `NeckTwist01`, 0, 0.78, -0.62], [`NeckTwist01`, `Head`, 0, 0.98, -0.2], [`L_Thigh`, `L_Calf`, -0.3, -0.3, -0.9], [`R_Thigh`, `R_Calf`, 0.3, -0.3, -0.9], [`L_Calf`, `L_Foot`, 0.02, -0.86, 0.5], [`R_Calf`, `R_Foot`, -0.02, -0.86, 0.5], [`L_Upperarm`, `L_Forearm`, -0.28, -0.5, -0.82], [`R_Upperarm`, `R_Forearm`, 0.28, -0.5, -0.82], [`L_Forearm`, `L_Hand`, 0.06, -0.22, -0.97], [`R_Forearm`, `R_Hand`, -0.06, -0.22, -0.97]],
  Dh = {
    y: 0.8,
    z: 0.28
  },
  Oh = 0.35,
  kh = 8,
  Ah = 2.5,
  jh = 1.2,
  Mh = 30,
  Nh = 2.5,
  Ph = 1.1,
  Fh = 0.12,
  Ih = 0.95,
  Lh = 1.6,
  Rh = 6,
  zh = 0.75,
  Bh = [[`L_Upperarm`, `L_Forearm`, -0.92, 0.25, -0.2], [`R_Upperarm`, `R_Forearm`, 0.9, 0.35, 0.1], [`L_Forearm`, `L_Hand`, -0.75, 0.6, -0.2], [`R_Forearm`, `R_Hand`, 0.8, 0.2, 0.5], [`R_Thigh`, `R_Calf`, 0.12, -0.75, -0.62], [`R_Calf`, `R_Foot`, 0.05, -0.95, 0.3], [`L_Thigh`, `L_Calf`, -0.1, -1, -0.05], [`NeckTwist01`, `Head`, 0.25, 0.95, -0.1]],
  Vh = e => e.bike ? 240 : e.id === `mpv` || e.id === `suv` ? 1900 : 1500;

function Hh(e, t, n, r, i, a, o, s, c, l) {
  let u = e - a,
    d = t - o,
    f = r + i + c + l;
  if (u * u + d * d > f * f) return null;
  let p = -Math.sin(n),
    m = -Math.cos(n),
    h = -Math.sin(s),
    g = -Math.cos(s),
    _ = 1e9,
    v = 0,
    y = 0;
  for (let e = 0; e < 4; e++) {
    let t = e === 0 ? p : e === 1 ? -m : e === 2 ? h : -g,
      n = e === 0 ? m : e === 1 ? p : e === 2 ? g : h,
      a = r * Math.abs(p * t + m * n) + i * Math.abs(-m * t + p * n),
      o = c * Math.abs(h * t + g * n) + l * Math.abs(-g * t + h * n),
      s = u * t + d * n,
      f = a + o - Math.abs(s);
    if (f <= 0) return null;
    if (f < _) {
      _ = f;
      let e = s < 0 ? -1 : 1;
      v = t * e, y = n * e;
    }
  }
  return {
    nx: v,
    nz: y,
    depth: _
  };
}

var Uh = [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]],
  Wh = (e, t) => {
    let n = Math.sin(e * 127.1 + t * 311.7) * 43758.5453;
    return n - Math.floor(n);
  },
  Gh = e => Math.atan2(Math.sin(e), Math.cos(e)),
  Kh = class {
    constructor(e, t, n, r, i, a) {
      Object.assign(this, {
        scene: e,
        camera: t,
        city: n,
        grid: r,
        player: i,
        els: a
      }), this.state = `foot`, this.stateT = 0, this.car = null, this.near = null, this.scanT = 9, this.active = new Map(), this.moved = new Map(), this.pedYaw = 0, this.pedVisible = !1, this.camK = 1, this.camOff = 0, this.camYaw = 0, this.buildSpots(), this.loadPed(), this.loadVehicles();
    }
    buildSpots() {
      let e = this.city,
        t = e.roadClasses;
      this.cells = new Map();
      let n = 0,
        r = 0;
      e.roads.forEach((e, i) => {
        if (!Ch.has(t[e[0]]) || e[5]) return;
        let a = e[4],
          o = e[1] / 2 + 0.15,
          s = Wh(i, 1) * yh,
          c = 0;
        for (let e = 2; e < a.length; e += 2) {
          let t = a[e - 2],
            l = a[e - 1],
            u = a[e],
            d = a[e + 1],
            f = Math.hypot(u - t, d - l);
          if (f < 0.5) continue;
          let p = (u - t) / f,
            m = (d - l) / f;
          for (let e = yh - s; e < f; e += yh) {
            if (c++, n++, f < 14 || e < 6 || e > f - 6) continue;
            let a = Wh(i, c * 3.1) < 0.5 ? -1 : 1,
              s = t + p * e + -m * o * a,
              u = l + m * e + p * o * a,
              d = Math.atan2(-p * a, -m * a),
              h = Wh(i * 1.7, c * 9.3),
              g = 0,
              _ = 0;
            for (let e = 0; e < wh.length; e++) if (_ += wh[e].share, h < _) {
              g = e;
              break;
            }
            let v = Math.floor(s / bh) * 100003 + Math.floor(u / bh),
              y = this.cells.get(v);
            y || this.cells.set(v, y = []), y.push({
              id: n,
              x: s,
              z: u,
              yaw: d,
              type: g
            }), r++;
          }
          s = (s + f) % yh;
        }
      }), this.spotCount = r;
    }
    loadPed() {
      new GLTFLoader().loadAsync(_h).then(e => {
        let t = e.scene,
          n = new Box3().setFromObject(t),
          r = n.max.y - n.min.y,
          i = new Group();
        i.add(t), t.position.y = -n.min.y, t.rotation.y = Math.PI / 2, i.scale.setScalar(vh / r), this.pedMats = [], t.traverse(e => {
          if (e.isMesh) {
            e.frustumCulled = !1, e.renderOrder = 8;
            let t = e.material;
            t.envMapIntensity = 0.8, t.metalness = 0, t.roughness = 0.85, t.metalnessMap = null, t.roughnessMap = null, t.emissive = new Color(1, 1, 1), t.emissiveMap = t.map, t.emissiveIntensity = 0, Md(t), this.pedMats.push(t);
          }
        }), this.mixer = new AnimationMixer(t), this.actions = {}, this.animW = {};
        for (let t of e.animations) {
          let e = this.mixer.clipAction(t);
          e.play(), e.setEffectiveWeight(+(t.name === `idle`)), this.actions[t.name] = e, this.animW[t.name] = +(t.name === `idle`);
        }
        this.bones = {}, t.traverse(e => {
          e.isBone && (this.bones[e.name] = e);
        }), this.ped = new Group(), this.pedInner = i, this.ped.add(i), this.ped.visible = !1, this.scene.add(this.ped), console.info(`[futian] 行人：已加载 Tripo 绑骨模型`, _h, `动作`, Object.keys(this.actions).join(` / `));
      }).catch(e => console.warn(`[futian] 行人模型 ` + _h + ` 加载失败，走路时没有可见角色。原因：`, e && e.message ? e.message : e));
    }
    loadVehicles() {
      this.models = wh.map(() => null);
      let e = new GLTFLoader();
      this.glow = new Mesh(hh(4.8), gh()), this.glow.frustumCulled = !1, this.glow.renderOrder = 21, this.glow.rotation.y = Math.PI, wh.forEach((t, n) => {
        e.loadAsync(`./models/cars/` + t.id + `.glb`).then(e => {
          let r = null;
          e.scene.updateMatrixWorld(!0), e.scene.traverse(e => {
            e.isMesh && !r && (r = e);
          });
          let i = r.geometry.clone().applyMatrix4(r.matrixWorld);
          (t.bike ? Th.v : ch[t.id]) && i.rotateY(Math.PI), i.computeBoundingBox();
          let a = i.boundingBox,
            o = t.len / (a.max.z - a.min.z),
            s = Math.min(o, t.wid * 1.15 / (a.max.x - a.min.x)),
            c = Math.min(o, t.hgt * 1.12 / (a.max.y - a.min.y));
          i.translate(-(a.min.x + a.max.x) / 2, -a.min.y, -(a.min.z + a.max.z) / 2), i.scale(s, c, o), i.rotateY(Math.PI);
          let l = r.material.clone();
          l.metalness = 0.2, l.roughness = 0.5, l.metalnessMap = null, l.roughnessMap = null, l.normalMap = null, l.envMapIntensity = 1, l.emissive = new Color(1, 1, 1), l.emissiveMap = l.map, l.emissiveIntensity = 0, Md(l), this.models[n] = {
            geo: i,
            mat: l
          }, this.scanT = 9;
        }).catch(e => console.warn(`[futian] 可驾驶车模 ` + t.id + `.glb 加载失败：`, e && e.message ? e.message : e));
      });
    }
    scan() {
      let e = this.focus(),
        t = Math.floor(e.x / bh),
        n = Math.floor(e.z / bh);
      for (let r = t - 1; r <= t + 1; r++) for (let t = n - 1; t <= n + 1; t++) for (let n of this.cells.get(r * 100003 + t) || []) {
        if (this.active.has(n.id) || !this.models[n.type]) continue;
        let t = this.moved.get(n.id),
          r = t ? t.x : n.x,
          i = t ? t.z : n.z,
          a = t ? t.yaw : n.yaw;
        if (Math.hypot(r - e.x, i - e.z) > xh || !t && (im(this.grid, r, i) || nm(this.grid, r, i, $(r, i) + 0.4, $(r, i) + 1.4, 0.3))) continue;
        let o = this.models[n.type],
          s;
        s = new Mesh(o.geo, o.mat), s.frustumCulled = !1, s.renderOrder = 6, s.layers.enable(1);
        let c = {
          spot: n,
          mesh: s,
          x: r,
          z: i,
          y: $(r, i),
          yaw: a,
          v: 0,
          steer: 0,
          type: wh[n.type],
          roll: 0,
          vx: 0,
          vz: 0,
          spin: 0,
          wob: 0,
          lay: t && t.lay || 0
        };
        this.carsAt(c, r, i, a) || (this.place(c), this.scene.add(s), this.active.set(n.id, c));
      }
      for (let [t, n] of this.active) n !== this.car && Math.hypot(n.x - e.x, n.z - e.z) > Sh && (this.scene.remove(n.mesh), this.active.delete(t));
    }
    place(e) {
      e.mesh.position.set(e.x, e.y + 0.12, e.z), e.mesh.rotation.set(e.pitch || 0, e.yaw, (e.roll || 0) + Math.sin((e.wob || 0) * 26) * 0.07 * (e.wob || 0) + (e.lay || 0), `YXZ`);
    }
    focus() {
      return this.car ? this.car : this.player.pos;
    }
    inVehicle() {
      return this.state !== `foot`;
    }
    ejected() {
      return this.state === `ejected`;
    }
    wallAt(e, t, n, r) {
      let i = -Math.sin(r),
        a = -Math.cos(r),
        o = e.len / 2,
        s = e.wid / 2,
        c = $(t, n);
      for (let [e, r] of Uh) if (nm(this.grid, t + i * o * r - a * s * e, n + a * o * r + i * s * e, c + 0.3, c + 1.4, 0.35)) return !0;
      return !1;
    }
    carsAt(e, t, n, r) {
      let i = e.type;
      for (let a of this.active.values()) {
        if (a === e) continue;
        let o = Hh(t, n, r, i.len / 2, i.wid / 2, a.x, a.z, a.yaw, a.type.len / 2, a.type.wid / 2);
        if (o) return o.o = a, o;
      }
      return null;
    }
    trafficAt(e, t, n, r) {
      let i = this.traffic;
      if (!i || !i.hits) return null;
      let a = e.type;
      for (let o of i.hits) {
        if (Math.abs(o.y - e.y) > 2.5) continue;
        let i = Hh(t, n, r, a.len / 2, a.wid / 2, o.x, o.z, o.yaw, o.hl, o.hw);
        if (i) return i.o = o, i;
      }
      return null;
    }
    impact(e, t, n, r = 0, i = 0) {
      let a = n >= kh;
      this.state === `driving` && this.car && n >= Ah && !(this.hitGapT > 0) && (this.hitN = (this.hitN || 0) + 1, this.hitGapT = jh, this.hitForgetT = Mh, this.hitLog = (this.hitLog || []).concat([{
        n: this.hitN,
        kind: e,
        what: t,
        kmh: Math.round(n * 3.6)
      }]), this.hitN >= 2 && (this.pendingEject = {
        kind: e,
        what: t,
        speed: n,
        dx: r,
        dz: i
      })), this.crashT = a ? 1.6 : 0.9, this.stun = a ? 0.75 : 0.25, this.crashHard = a, this.crashWhat = t, this.crashKmh = Math.round(n * 3.6), this.bump = a ? 0.7 : 0.3, this.shake = a ? Math.min(0.5, 0.12 + n * 0.012) : 0.05, this.car && (this.car.wob = Math.max(this.car.wob || 0, a ? 1 : 0.35)), this.crashes = (this.crashes || 0) + 1;
    }
    hitCar(e, t, n, r) {
      let i = t.o,
        a = e.v < 0 ? -1 : 1,
        o = n * a,
        s = r * a,
        c = Math.abs(e.v) - (i.vx * o + i.vz * s);
      if (c < 0.4) {
        e.v = a * Math.max(0, Math.min(Math.abs(e.v), i.vx * o + i.vz * s));
        return;
      }
      let l = Vh(e.type),
        u = Vh(i.type),
        d = c >= kh,
        f = 1.15 * c * l * u / (l + u),
        p = o * 0.7 - t.nx * 0.3,
        m = s * 0.7 - t.nz * 0.3,
        h = Math.hypot(p, m) || 1;
      p /= h, m /= h;
      let g = Math.min(24, f / u);
      i.vx += p * g, i.vz += m * g;
      let _ = (o * (i.z - e.z) - s * (i.x - e.x)) / (i.type.len * 0.5 + 0.5);
      i.spin += Math.max(-3.2, Math.min(3.2, -_ * c * (d ? 0.09 : 0.04))), i.wob = d ? 1 : 0.4, i.type.bike && d && (i.lay = (_ >= 0 ? 1 : -1) * 1.28);
      let v = Math.max(0, Math.abs(e.v) - f / l);
      e.v = d ? a * Math.min(v * 0.3, 4) : -a * Math.min(1.4, c * 0.18), this.impact(`car`, i.type.label, c, t.nx, t.nz);
    }
    simCars(e) {
      for (let t of this.active.values()) {
        if (t.wob &&= Math.max(0, t.wob - e * 1.4), t === this.car) continue;
        let n = Math.hypot(t.vx, t.vz);
        if (n < 0.05 && Math.abs(t.spin) < 0.02) {
          t.wob && this.place(t), (n || t.spin) && (t.vx = t.vz = t.spin = 0);
          continue;
        }
        let r = Math.max(1, Math.min(10, Math.ceil(n * e / Oh)));
        for (let n = 0; n < r; n++) {
          let n = t.x + t.vx * e / r,
            i = t.z + t.vz * e / r,
            a = t.yaw + t.spin * e / r;
          if (this.wallAt(t.type, n, i, a)) {
            t.vx *= -0.2, t.vz *= -0.2, t.spin *= -0.3;
            break;
          }
          let o = this.carsAt(t, n, i, a);
          if (o) {
            o.o !== this.car && (o.o.vx += t.vx * 0.6, o.o.vz += t.vz * 0.6, o.o.wob = Math.max(o.o.wob || 0, 0.4)), t.vx *= o.o === this.car ? -0.15 : 0.2, t.vz *= o.o === this.car ? -0.15 : 0.2, t.spin *= 0.3;
            break;
          }
          t.x = n, t.z = i, t.yaw = a;
        }
        let i = Math.hypot(t.vx, t.vz),
          a = 8.5 * e;
        i <= a ? (t.vx = 0, t.vz = 0) : (t.vx -= t.vx / i * a, t.vz -= t.vz / i * a), t.spin *= Math.exp(-e * 3.2), t.y = $(t.x, t.z), this.moved.set(t.spot.id, {
          x: t.x,
          z: t.z,
          yaw: t.yaw,
          lay: t.lay
        }), this.place(t);
      }
    }
    interact() {
      if (this.state === `foot`) return !this.near || this.player.mode !== `walk` ? !1 : (this.car = this.near, this.state = `entering`, this.stateT = 0, this.car.lay = 0, this.car.vx = this.car.vz = this.car.spin = 0, this.car.roll = 0, this.car.pitch = 0, this.hitN = 0, this.hitGapT = 0, this.pendingEject = null, this.hitLog = [], this.enterFrom = this.player.pos.clone(), this.camFrom = this.camera.position.clone(), this.camYaw = this.player.yaw, this.camOff = 0, this.lastYaw = this.player.yaw, !0);
      if (this.state === `driving` && Math.abs(this.car.v) < 4) {
        let e = this.car,
          t = e.type,
          n = -Math.cos(e.yaw),
          r = Math.sin(e.yaw),
          i = t.wid / 2 + 0.85,
          a = e.x + n * i,
          o = e.z + r * i;
        return nm(this.grid, a, o, e.y + 0.2, e.y + 1.7, 0.4) && (a = e.x - n * i, o = e.z - r * i), e.v = 0, e.steer = 0, e.roll = 0, e.pitch = 0, this.place(e), this.moved.set(e.spot.id, {
          x: e.x,
          z: e.z,
          yaw: e.yaw
        }), e.vx = e.vz = e.spin = 0, this.crashT = 0, this.exitTo = new Vector3(a, $(a, o), o), this.exitYaw = e.yaw, this.state = `exiting`, this.stateT = 0, this.camFrom = this.camera.position.clone(), !0;
      }
      return !1;
    }
    camInside(e, t, n) {
      for (let r of this.grid.query(e, n)) if (t > r.bottom && t < r.top + 0.5 && nf(e, n, r)) return !0;
      return !1;
    }
    chaseCam(e, t, n, r, i, a, o, s) {
      let c = Math.cos(a),
        l = -Math.sin(i) * c,
        u = Math.sin(a),
        d = -Math.cos(i) * c,
        f = 1;
      for (let e of [1, 0.8, 0.62, 0.46, 0.32, 0.2, 0.1]) if (f = e, !this.camInside(t - l * o * e, n - u * o * e, r - d * o * e)) break;
      return this.camK += (f - this.camK) * (1 - Math.exp(-s * (f < this.camK ? 16 : 3))), e.set(t - l * o * this.camK, n - u * o * this.camK, r - d * o * this.camK), e.y = Math.max(e.y, $(e.x, e.z) + 0.35), e;
    }
    drive(e, t) {
      if (this.state === `foot`) return !1;
      let n = this.car,
        r = n.type,
        i = t.keys;
      if (this.stateT += e, this.state === `entering` && this.stateT > 0.7 && (this.state = `starting`, this.stateT = 0), this.state === `starting` && this.stateT > 0.9 && (this.state = `driving`, this.stateT = 0), this.state === `exiting` && this.stateT > 0.6) return t.pos.copy(this.exitTo), t.vel.set(0, 0, 0), t.yaw = this.exitYaw, t.pitch = -0.08, t.mode = `walk`, t.onGround = !0, this.pedYaw = this.exitYaw, this.state = `foot`, this.car = null, this.scanT = 9, !1;
      if (this.state === `ejected`) return this.driveEjected(e, t);
      if (this.state === `driving`) {
        this.stun = Math.max(0, (this.stun || 0) - e), this.crashT = Math.max(0, (this.crashT || 0) - e), this.hitGapT = Math.max(0, (this.hitGapT || 0) - e), this.hitN && (this.hitForgetT = (this.hitForgetT || 0) - e) <= 0 && (this.hitN = 0);
        let a = this.stun > 0 ? 0 : (i.has(`KeyW`) || i.has(`ArrowUp`) ? 1 : 0) - (i.has(`KeyS`) || i.has(`ArrowDown`) ? 1 : 0),
          o = (i.has(`KeyA`) || i.has(`ArrowLeft`) ? 1 : 0) - (i.has(`KeyD`) || i.has(`ArrowRight`) ? 1 : 0),
          s = i.has(`ShiftLeft`) || i.has(`ShiftRight`),
          c = i.has(`Space`),
          l = r.vmax * (s ? 1.3 : 1);
        if (a > 0 ? n.v += (n.v < -0.5 ? 26 : r.acc * (s ? 1.5 : 1) * Math.max(0.15, 1 - n.v / l)) * e : a < 0 ? n.v -= (n.v > 0.5 ? 24 : 6) * e : n.v -= (n.v * 0.35 + Math.sign(n.v) * 1.2) * e, c) {
          let t = 30 * e;
          n.v = Math.abs(n.v) <= t ? 0 : n.v - Math.sign(n.v) * t;
        }
        n.v = Math.max(-10, Math.min(l, n.v)), a === 0 && Math.abs(n.v) < 0.15 && (n.v = 0), n.steer += (o - n.steer) * (1 - Math.exp(-e * (r.bike ? 8 : 5.5)));
        let u = (r.bike ? 0.62 : 0.56) / (1 + Math.abs(n.v) / (r.bike ? 12 : 15)),
          d = n.v * Math.tan(u * n.steer) / Math.max(r.len * 0.62, 1.45),
          f = (r.bike ? 9 : 11) / Math.max(Math.abs(n.v), 4);
        d = Math.max(-f, Math.min(f, d)) * (c && Math.abs(n.v) > 8 ? 1.6 : 1);
        for (let e = 0; e < 3; e++) {
          let e = this.carsAt(n, n.x, n.z, n.yaw);
          if (!e) break;
          let t = e.o,
            i = e.nx * (e.depth + 0.03),
            a = e.nz * (e.depth + 0.03);
          if (!this.wallAt(t.type, t.x - i, t.z - a, t.yaw)) t.x -= i, t.z -= a, this.moved.set(t.spot.id, {
            x: t.x,
            z: t.z,
            yaw: t.yaw,
            lay: t.lay
          }), this.place(t);else if (!this.wallAt(r, n.x + i, n.z + a, n.yaw)) n.x += i, n.z += a;else break;
        }
        let p = this.trafficAt(n, n.x, n.z, n.yaw);
        if (p) {
          let t = p.o,
            i = p.depth + 0.05 + Math.abs(t.vx * p.nx + t.vz * p.nz) * e * 1.5,
            a = p.nx * i,
            o = p.nz * i;
          this.wallAt(r, n.x + a, n.z + o, n.yaw) || (n.x += a, n.z += o);
          let s = -Math.sin(n.yaw),
            c = -Math.cos(n.yaw),
            l = Math.hypot(t.vx - s * n.v, t.vz - c * n.v);
          n.kx = t.vx * 0.55, n.kz = t.vz * 0.55, n.v *= 0.3, this.crashT > 0.6 || this.impact(`traffic`, `路上的` + t.label, l, p.nx, p.nz);
        }
        let m = Math.max(1, Math.min(24, Math.ceil(Math.abs(n.v) * e / Oh)));
        for (let t = 0; t < m; t++) {
          let t = n.yaw + d * e / m,
            i = -Math.sin(t),
            a = -Math.cos(t),
            o = n.x + i * n.v * e / m,
            s = n.z + a * n.v * e / m;
          if (n.v === 0) break;
          if (this.wallAt(r, o, s, t)) {
            let t = Math.abs(n.v),
              o = -Math.sin(n.yaw),
              s = -Math.cos(n.yaw);
            if (t < kh && !this.wallAt(r, n.x + o * n.v * e / m, n.z + s * n.v * e / m, n.yaw)) {
              n.x += o * n.v * e / m, n.z += s * n.v * e / m, n.v *= 0.9;
              continue;
            }
            let c = n.v < 0 ? -1 : 1;
            n.v *= t >= kh ? -0.12 : -0.28, this.impact(`wall`, `楼`, t, -i * c, -a * c);
            break;
          }
          let c = this.carsAt(n, o, s, t);
          if (c) {
            this.hitCar(n, c, i, a);
            break;
          }
          let l = this.trafficAt(n, o, s, t);
          if (l) {
            let e = l.o,
              t = n.v < 0 ? -1 : 1,
              r = e.vx * i * t + e.vz * a * t,
              o = Math.abs(n.v) - r;
            o > 0.4 ? (n.v = t * Math.max(0, r) * 0.6, n.kx = e.vx * 0.3, n.kz = e.vz * 0.3, this.impact(`traffic`, `路上的` + e.label, o, l.nx, l.nz)) : n.v = t * Math.max(0, Math.min(Math.abs(n.v), r));
            break;
          }
          n.x = o, n.z = s, n.yaw = t;
        }
        if (n.kx || n.kz) {
          let t = n.x + n.kx * e,
            i = n.z + n.kz * e;
          !this.wallAt(r, t, i, n.yaw) && !this.carsAt(n, t, i, n.yaw) ? (n.x = t, n.z = i) : (n.kx = 0, n.kz = 0);
          let a = Math.exp(-e * 3.5);
          n.kx *= a, n.kz *= a, Math.hypot(n.kx, n.kz) < 0.1 && (n.kx = 0, n.kz = 0);
        }
        if (n.y = $(n.x, n.z), n.roll = r.bike ? n.steer * Math.min(1, Math.abs(n.v) / 14) * 0.5 : -n.steer * Math.min(1, Math.abs(n.v) / 30) * 0.045, n.pitch = this.crashHard && this.crashT > 1.1 ? (this.crashT - 1.1) * 0.12 : 0, this.pendingEject) {
          let e = this.pendingEject;
          return this.pendingEject = null, this.eject(t, e), this.driveEjected(0, t);
        }
      } else this.state === `starting` && (n.pitch = Math.sin(this.stateT * 70) * 0.006 * (1 - this.stateT / 0.9));
      this.bump = Math.max(0, (this.bump || 0) - e), this.place(n);
      let a = Gh(t.yaw - this.lastYaw);
      this.camOff = Math.max(-2.7, Math.min(2.7, this.camOff + a)), Math.abs(n.v) > 2 && Math.abs(a) < 1e-4 && (this.camOff *= Math.exp(-e * 0.9)), this.camYaw += Gh(n.yaw - this.camYaw) * (1 - Math.exp(-e * 4.5)), t.yaw = this.camYaw + this.camOff, this.lastYaw = t.yaw, this.state === `entering` && (t.pitch += (-0.17 - t.pitch) * (1 - Math.exp(-e * 6))), t.pitch = Math.max(-0.7, Math.min(0.25, t.pitch));
      let o = this.chaseCam(this._c ||= new Vector3(), n.x, n.y + (r.bike ? 1.6 : 1.9), n.z, t.yaw, t.pitch, (r.bike ? 6.2 : 8.6) + Math.abs(n.v) * 0.04, e);
      if (this.bump > 0) {
        let e = (this.shake || 0.05) * Math.min(1, this.bump / 0.3);
        o.y += Math.sin(this.bump * 60) * e, o.x += Math.cos(t.yaw) * Math.sin(this.bump * 47) * e * 0.8, o.z -= Math.sin(t.yaw) * Math.sin(this.bump * 47) * e * 0.8;
      }
      if (this.state === `entering`) {
        let e = this.stateT / 0.7,
          t = e * e * (3 - 2 * e);
        o.lerpVectors(this.camFrom, o, t);
      }
      return t.pos.copy(o), !0;
    }
    eject(e, t) {
      let n = this.car,
        r = n.type,
        i = n.yaw,
        a = -Math.sin(i),
        o = -Math.cos(i),
        s = Math.cos(i),
        c = -Math.sin(i),
        l = t.dx * s + t.dz * c,
        u = n.v < -0.3 ? -1 : 1,
        d = Math.abs(l) > 0.2 ? [Math.sign(l), -Math.sign(l)] : [1, -1],
        f = this.player.bounds,
        p = (e, t) => !f || e > f.x0 + 20 && e < f.x1 - 20 && t > f.z0 + 20 && t < f.z1 - 20,
        m = [],
        h = Math.floor(n.x / bh),
        g = Math.floor(n.z / bh);
      for (let e = h - 1; e <= h + 1; e++) for (let t = g - 1; t <= g + 1; t++) for (let r of this.cells.get(e * 100003 + t) || []) {
        let e = r.x - n.x,
          t = r.z - n.z,
          i = e * a + t * o,
          l = e * s + t * c;
        Math.abs(i) < 40 && Math.abs(l) > 2 && Math.abs(l) < 14 && m.push(l);
      }
      let _ = (e, t, a) => {
          let o = Math.ceil(Math.hypot(e - n.x, t - n.z) / 0.5);
          for (let s = 1; s <= o; s++) {
            let c = s / o;
            if (this.wallAt(r, n.x + (e - n.x) * c, n.z + (t - n.z) * c, i + (a - i) * c)) return !1;
          }
          return !0;
        },
        v = null;
      for (let e of d) {
        let t = m.filter(t => Math.sign(t) === e).map(e => Math.abs(e) + 0.4).sort((e, t) => e - t).slice(0, 2);
        for (let l of [...t, 6.5, 5, 8, 4, 9.5, 3, 2]) {
          for (let t of [3.5 * u, 1.5 * u, 6 * u, 0]) {
            let u = e * (r.bike ? 0.5 : 0.95) * (t === 0 ? 0.6 : 1),
              d = n.x + s * e * l + a * t,
              f = n.z + c * e * l + o * t,
              m = i + u;
            if (p(d, f) && !this.wallAt(r, d, f, m) && !this.carsAt(n, d, f, m) && _(d, f, m)) {
              v = {
                x1: d,
                z1: f,
                y1: m,
                sg: e,
                L: l
              };
              break;
            }
          }
          if (v) break;
        }
        if (v) break;
      }
      v ||= {
        x1: n.x,
        z1: n.z,
        y1: i + 0.6,
        sg: d[0],
        L: 0
      };
      let y = -Math.sin(v.y1),
        b = -Math.cos(v.y1),
        x = Math.cos(v.y1),
        S = -Math.sin(v.y1),
        C = r.len / 2,
        w = r.wid / 2,
        T = (e, t) => {
          let n = e - v.x1,
            r = t - v.z1,
            i = Math.abs(n * y + r * b) - C,
            a = Math.abs(n * x + r * S) - w;
          return Math.hypot(Math.max(i, 0), Math.max(a, 0)) + Math.min(Math.max(i, a), 0);
        },
        E = (e, t) => {
          let r = $(e, t);
          if (!p(e, t) || nm(this.grid, e, t, r + 0.2, r + 1.2, 0.45)) return !1;
          for (let r of this.active.values()) if (r !== n && Hh(e, t, 0, 0.9, 0.5, r.x, r.z, r.yaw, r.type.len / 2 + 0.2, r.type.wid / 2 + 0.2)) return !1;
          return !0;
        },
        D = [];
      for (let e of [3.1, 3.7, 2.7, 4.5]) for (let t of [0.6, -0.6, 1.6, -1.6]) D.push([v.sg, w + e, t * u]);
      for (let e of [3.1, 3.9]) for (let t of [0.8, 0, -0.8]) D.push([`front`, t * v.sg, C + e]);
      for (let e of [3.1, 3.9]) for (let t of [0.8, 0]) D.push([`back`, t * v.sg, -(C + e)]);
      for (let e of [3.1, 3.7]) for (let t of [0.6, -0.6, 1.6]) D.push([-v.sg, w + e, t * u]);
      let O = null;
      for (let [e, t, r] of D) {
        let i = typeof e == `number` ? e * t : t,
          a = typeof e == `number` ? r : r * u,
          o = v.x1 + x * i + y * a,
          s = v.z1 + S * i + b * a;
        if (T(o, s) < Nh) continue;
        let c = o - v.x1,
          l = s - v.z1,
          d = Math.hypot(c, l) || 1,
          f = o + c / d * 1.6,
          p = s + l / d * 1.6;
        if (!(T(f, p) < Nh || !E(o, s) || !E(f, p) || !E((o + f) / 2, (s + p) / 2)) && !nm(this.grid, (o + n.x) / 2, (s + n.z) / 2, $(o, s) + 0.6, $(o, s) + 2.6, 0.2)) {
          O = {
            x: o,
            z: s,
            where: typeof e == `number` ? e === v.sg ? `outer-side` : `road-side` : e
          };
          break;
        }
      }
      O ||= {
        x: v.x1 + y * (C + Nh + 0.8) * u,
        z: v.z1 + b * (C + Nh + 0.8) * u,
        where: `fallback-front`
      };
      let k = n.x + s * v.sg * (r.wid * 0.3),
        A = n.z + c * v.sg * (r.wid * 0.3),
        j = $(O.x, O.z);
      this.ej = {
        car: {
          x0: n.x,
          z0: n.z,
          yaw0: i,
          ...v,
          done: !1
        },
        t: 0,
        ped: {
          x0: k,
          z0: A,
          y0: n.y + (r.bike ? 1.1 : 0.9),
          x1: O.x,
          z1: O.z,
          y1: j,
          yaw: Math.atan2(-(v.x1 - O.x), -(v.z1 - O.z)),
          arc: O.where === `outer-side` ? 2.6 : 1.9
        },
        what: t.what,
        kmh: Math.round(t.speed * 3.6),
        up: !1,
        upT: 0,
        side: v.sg
      }, this.ejectInfo = {
        where: O.where,
        ped: [+O.x.toFixed(2), +j.toFixed(2), +O.z.toFixed(2)],
        car: [+v.x1.toFixed(2), +$(v.x1, v.z1).toFixed(2), +v.z1.toFixed(2)],
        carYawDeg: Math.round(v.y1 * 180 / Math.PI),
        gapToCarBox: +T(O.x, O.z).toFixed(2),
        centerDist: +Math.hypot(O.x - v.x1, O.z - v.z1).toFixed(2)
      }, console.info(`[futian] 二次撞车甩出：`, JSON.stringify(this.ejectInfo)), n.v = 0, n.kx = n.kz = 0, n.steer = 0, n.vx = n.vz = n.spin = 0, this.crashT = 0, this.stun = 0, this.state = `ejected`, this.stateT = 0, this.ejects = (this.ejects || 0) + 1, this.bump = 0.9, this.shake = 0.45;
      let M = O.x - n.x,
        ee = O.z - n.z;
      this.camYaw = Math.atan2(-M, -ee) - v.sg * 0.55, this.camOff = 0, e.yaw = this.camYaw, this.lastYaw = e.yaw, e.pitch = -0.32;
    }
    driveEjected(e, t) {
      let n = this.ej,
        r = this.car,
        i = r.type,
        a = t.keys;
      n.t += e, this.stateT += e;
      let o = n.car,
        s = Math.min(1, n.t / Ph),
        c = 1 - (1 - s) ** 3;
      r.x = o.x0 + (o.x1 - o.x0) * c, r.z = o.z0 + (o.z1 - o.z0) * c, r.yaw = o.yaw0 + (o.y1 - o.yaw0) * c, r.y = $(r.x, r.z) + Math.sin(Math.PI * Math.min(1, s / 0.55)) * (i.bike ? 0.35 : 0.55) * (s < 0.55), r.roll = i.bike ? n.side * 1.28 * Math.min(1, s * 2.2) : -n.side * 0.32 * Math.sin(Math.PI * Math.min(1, s * 1.4)) * (1 - s * 0.5), r.pitch = 0.05 * Math.sin(Math.PI * s), s >= 1 && !o.done && (o.done = !0, r.y = $(r.x, r.z), i.bike || (r.roll = 0), r.pitch = 0, r.lay = i.bike ? n.side * 1.28 : 0, i.bike && (r.roll = 0), this.moved.set(r.spot.id, {
        x: r.x,
        z: r.z,
        yaw: r.yaw,
        lay: r.lay
      })), this.place(r);
      let l = n.ped,
        u = Math.max(0, Math.min(1, (n.t - Fh) / Ih)),
        d = n.t - Fh - Ih;
      d > Lh && !n.up && ([`KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyE`, `Space`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`].some(e => a.has(e)) || d > Rh) && (n.up = !0, n.upT = 0), n.up && (n.upT += e);
      let f = l.x0 + (l.x1 - l.x0) * u,
        p = l.z0 + (l.z1 - l.z0) * u,
        m = l.y0 + (l.y1 - l.y0) * u + Math.sin(Math.PI * u) * (l.arc || 1.9),
        h = Math.PI / 2,
        g = n.up ? Math.min(1, n.upT / zh) : 0,
        _ = g * g * (3 - 2 * g);
      if (n.pitch = u < 1 ? (h + Math.PI * 2) * (u * (2 - u)) : h * (1 - _), u >= 1 && (n.pitch = h * (1 - _)), n.roll = u < 1 ? Math.sin(u * Math.PI * 2) * 0.5 : 0, n.px = f, n.pz = p, n.py = m + (u >= 1 ? 0.16 * Math.sin(n.pitch) : 0.2), n.lying = u >= 1 && !(g >= 1), this.bump = Math.max(0, (this.bump || 0) - e), n.up && g >= 1) return t.pos.set(l.x1, $(l.x1, l.z1), l.z1), t.vel.set(0, 0, 0), t.mode = `walk`, t.onGround = !0, this.pedYaw = l.yaw, this.state = `foot`, this.car = null, this.scanT = 9, this.ej = null, this.hitN = 0, !1;
      let v = Gh(t.yaw - this.lastYaw);
      this.camOff = Math.max(-3.1, Math.min(3.1, this.camOff + v)), t.yaw = this.camYaw + this.camOff, this.lastYaw = t.yaw, t.pitch = Math.max(-0.9, Math.min(0.1, t.pitch));
      let y = 0.35 * (1 - u) + 0.2,
        b = f + (r.x - f) * y,
        x = p + (r.z - p) * y,
        S = this.chaseCam(this._c ||= new Vector3(), b, $(b, x) + 1.1, x, t.yaw, t.pitch, 9.5, e || 0.016);
      if (this.bump > 0) {
        let e = (this.shake || 0.05) * Math.min(1, this.bump / 0.3);
        S.y += Math.sin(this.bump * 60) * e;
      }
      return t.pos.copy(S), !0;
    }
    posePose(e) {
      let t = this.bones,
        n = this.ped,
        r = this._t ||= {
          a: new Vector3(),
          b: new Vector3(),
          d: new Vector3(),
          Q: new Quaternion(),
          dq: new Quaternion(),
          bw: new Quaternion(),
          pw: new Quaternion()
        };
      n.updateMatrixWorld(!0), n.getWorldQuaternion(r.Q);
      for (let [n, i, a, o, s] of e) {
        let e = t[n],
          c = t[i];
        e && c && (e.getWorldPosition(r.a), c.getWorldPosition(r.b), r.b.sub(r.a).normalize(), r.d.set(a, o, s).normalize().applyQuaternion(r.Q), r.dq.setFromUnitVectors(r.b, r.d), e.getWorldQuaternion(r.bw), e.parent.getWorldQuaternion(r.pw), e.quaternion.copy(r.pw.invert()).multiply(r.dq).multiply(r.bw), e.updateMatrixWorld(!0));
      }
    }
    poseRide() {
      let e = this.bones,
        t = this.ped,
        n = this._t ||= {
          a: new Vector3(),
          b: new Vector3(),
          d: new Vector3(),
          Q: new Quaternion(),
          dq: new Quaternion(),
          bw: new Quaternion(),
          pw: new Quaternion()
        };
      this.pedInner.position.set(0, 0, 0), t.updateMatrixWorld(!0), t.getWorldQuaternion(n.Q);
      let r = 0;
      for (let [t, i, a, o, s] of Eh) {
        let c = e[t],
          l = e[i];
        c && l && (c.getWorldPosition(n.a), l.getWorldPosition(n.b), n.b.sub(n.a).normalize(), n.d.set(a, o, s).normalize().applyQuaternion(n.Q), n.dq.setFromUnitVectors(n.b, n.d), c.getWorldQuaternion(n.bw), c.parent.getWorldQuaternion(n.pw), c.quaternion.copy(n.pw.invert()).multiply(n.dq).multiply(n.bw), c.updateMatrixWorld(!0), r++);
      }
      let i = e.Pelvis || e.Hip;
      i && (i.getWorldPosition(n.a), t.worldToLocal(n.a), this.pedInner.position.set(-n.a.x, Dh.y - n.a.y, Dh.z - n.a.z)), this.ridePosed = r;
    }
    update(e, t) {
      let n = this.player;
      if (this.scanT += e, this.scanT > 0.5 && (this.scanT = 0, this.scan()), this.simCars(e), this.traffic && this.traffic.probe) {
        let e = this.traffic.probe,
          t = this.car;
        e.on = !!t && this.state === `driving`, t && (e.x = t.x, e.z = t.z, e.y = t.y);
      }
      let r = gd.uNight.value;
      for (let e of this.models) e && (e.mat.emissiveIntensity = 0.22 * r);
      {
        let e = this.car,
          t = !!e && !e.type.bike && (this.state === `starting` || this.state === `driving` || this.state === `entering`);
        t && this.glow.parent !== e.mesh ? e.mesh.add(this.glow) : !t && this.glow.parent && this.glow.parent.remove(this.glow);
      }
      if (this.pedMats) for (let e of this.pedMats) e.emissiveIntensity = 0.28 * r;
      this.near = null;
      let i = this.state === `foot` && n.mode === `walk` && !t;
      if (this.state === `foot` && !t) {
        let e = 1e9,
          t = null;
        for (let r of this.active.values()) {
          let i = Math.hypot(r.x - n.pos.x, r.z - n.pos.z) - r.type.len * 0.3;
          i < e && (e = i, t = r);
        }
        t && e < 3.6 && Math.abs(n.pos.y - t.y) < 3 + (n.mode === `fly` ? 6 : 0) && (this.near = t);
      }
      let a = this.els.prompt,
        o = ``;
      if (this.near && i ? o = `按 <b>E</b> 上车（${this.near.type.label}）` : this.near && n.mode === `fly` ? o = `先按 <b>V</b> 落地走路，再按 <b>E</b> 上车` : this.state === `entering` ? o = this.car.type.bike ? `跨上摩托车…` : `上车…` : this.state === `starting` ? o = `🔑 点火启动…` : this.state === `ejected` ? o = this.ej.lying && !this.ej.up && this.ej.t > 2.67 ? `💥 又被${this.ej.what}撞了：车被撞到路边，人摔出车外 · 按 <b>W</b> / <b>E</b> 起身` : this.ej.up ? `起身…` : `💥 又被${this.ej.what}撞了（${this.ej.kmh} km/h）：车被撞到路边，人摔出车外！` : this.state === `driving` && this.crashT > 0 ? o = (this.crashHard ? `💥 车祸！以 ${this.crashKmh} km/h 撞上了${this.crashWhat}` : `⚠ 撞到${this.crashWhat}了，已停下（${this.crashKmh} km/h）`) + (this.hitN === 1 ? ` · 再被撞一次会被甩出车外` : ``) : this.state === `driving` && (o = `${this.car.type.bike ? `🏍` : `🚗`} ${this.car.type.label} · ${Math.round(Math.abs(this.car.v) * 3.6)} km/h${this.car.v < -0.3 ? ` · 倒车` : ``}${Math.abs(this.car.v) < 4 ? ` · <b>E</b> 下车` : ``}`), o !== this.lastTxt && (this.lastTxt = o, a.innerHTML = o, a.style.display = o ? `block` : `none`, a.classList.toggle(`driving`, this.state !== `foot`), a.classList.toggle(`crash`, o.startsWith(`💥`))), !this.ped) return;
      let s = i,
        c = n.pos.x,
        l = n.pos.y,
        u = n.pos.z,
        d = 0;
      if (i) {
        d = Math.hypot(n.vel.x, n.vel.z), d > 0.6 && (this.pedYaw += Gh(Math.atan2(-n.vel.x, -n.vel.z) - this.pedYaw) * (1 - Math.exp(-e * 10)));
        let t = this.chaseCam(this._c ||= new Vector3(), c + Math.cos(n.yaw) * 0.42, l + 1.58, u - Math.sin(n.yaw) * 0.42, n.yaw, n.pitch, 3.9, e);
        this.camera.position.copy(t), this.camK < 0.2 && (s = !1);
      } else if (this.state === `entering`) {
        let t = this.car,
          n = Math.min(1, this.stateT / 0.55),
          r = -Math.cos(t.yaw),
          i = Math.sin(t.yaw),
          a = t.type.bike ? 0.1 : t.type.wid / 2 + 0.3;
        c = this.enterFrom.x + (t.x + r * a - this.enterFrom.x) * n, u = this.enterFrom.z + (t.z + i * a - this.enterFrom.z) * n, l = t.y, this.pedYaw += Gh(Math.atan2(-(t.x - c), -(t.z - u)) - this.pedYaw) * (1 - Math.exp(-e * 10)), s = t.type.bike || this.stateT < 0.6, d = 2;
      } else if (this.car && this.car.type.bike && (this.state === `starting` || this.state === `driving`)) {
        let e = this.car;
        c = e.x, u = e.z, l = e.y + 0.12, this.pedYaw = e.yaw, s = !0;
      } else if (this.state === `ejected`) {
        let e = this.ej;
        c = e.px, l = e.py, u = e.pz, this.pedYaw = e.ped.yaw, s = e.t >= Fh || this.car.type.bike, d = 0;
      } else if (this.state === `exiting`) {
        let e = Math.min(1, this.stateT / 0.6),
          t = this.car;
        c = t.x + (this.exitTo.x - t.x) * e, u = t.z + (this.exitTo.z - t.z) * e, l = this.exitTo.y, this.pedYaw = t.yaw, s = !0, d = 2;
      }
      if (this.ped.visible = s, !s) return;
      let f = this.car && this.car.type.bike && (this.state === `starting` || this.state === `driving`);
      this.ped.position.set(c, l, u);
      let p = this.state === `ejected` ? this.ej : null;
      this.ped.rotation.set(f ? this.car.pitch || 0 : p ? p.pitch : 0, this.pedYaw, f ? this.car.roll : p ? p.roll : 0, `YXZ`), f || this.pedInner.position.set(0, 0, 0);
      let m = f ? `idle` : d > 6.5 ? `run` : d > 0.5 ? this.actions.walk && d < 3.2 ? `walk` : `run` : `idle`,
        h = m === `run` ? Math.max(0.75, Math.min(1.7, d / 5.2)) : m === `walk` ? Math.max(0.6, Math.min(1.6, d / 1.6)) : 1,
        g = 1 - Math.exp(-e * 9);
      for (let e in this.actions) {
        let t = this.animW[e] + (+(e === m) - this.animW[e]) * g;
        this.animW[e] = t, this.actions[e].setEffectiveWeight(t), e === m && this.actions[e].setEffectiveTimeScale(h);
      }
      this.mixer.update(e), f && this.poseRide(), p && !(p.up && p.upT > zh * 0.6) && this.posePose(Bh), this.riding = !!f, this.anim = f ? `ride` : p ? p.lying ? `down` : p.up ? `getup` : `thrown` : m;
    }
  },
  qh = [0.8, 0.82, 0.85],
  Jh = [0.74, 0.76, 0.79],
  Yh = [0.9, 0.9, 0.88],
  Xh = [0.72, 0.69, 0.64],
  Zh = [0.3, 0.32, 0.35],
  Qh = [{
    at: [-620, 679],
    name: `卓越时代广场`,
    arche: `fin`,
    glass: [0.09, 0.21, 0.4],
    frame: Jh,
    crown: `steps`,
    tiers: 3,
    mast: 26,
    mull: 1.5,
    finGap: 3
  }, {
    at: [-619, 808],
    name: `荣超国际商会中心`,
    arche: `unit`,
    glass: [0.1, 0.33, 0.42],
    frame: Jh,
    crown: `screen`,
    crownH: 14,
    mull: 1.4,
    corner: !0
  }, {
    at: [-753, 557],
    name: `信息枢纽大厦`,
    arche: `unit`,
    glass: [0.33, 0.44, 0.55],
    frame: qh,
    crown: `slope`,
    crownH: 26,
    mull: 1.2,
    podium: 18,
    inset: 0.9
  }, {
    at: [-623, 572],
    name: `嘉里建设广场二期`,
    arche: `unit`,
    glass: [0.2, 0.38, 0.54],
    frame: Yh,
    crown: `screen`,
    crownH: 8,
    mull: 1.5,
    floorH: 4.3
  }, {
    at: [-625, 452],
    name: `福田香格里拉大酒店`,
    arche: `stone`,
    glass: [0.1, 0.16, 0.22],
    frame: [0.82, 0.75, 0.62],
    crown: `hat`,
    crownH: 10,
    cell: [3.6, 3.4],
    podium: 20,
    inset: 0.86
  }, {
    at: [-749, 914],
    name: `平安金融中心南塔`,
    arche: `steel`,
    glass: [0.3, 0.42, 0.54],
    frame: qh,
    crown: `flat`,
    mull: 1.5
  }, {
    at: [-766, 931],
    name: `平安金融中心南塔`,
    arche: `steel`,
    glass: [0.3, 0.42, 0.54],
    frame: qh,
    crown: `flat`,
    mull: 1.5
  }, {
    at: [-731, 931],
    name: `平安金融中心南塔`,
    arche: `steel`,
    glass: [0.3, 0.42, 0.54],
    frame: qh,
    crown: `flat`,
    mull: 1.5
  }, {
    at: [-749, 952],
    name: `平安金融中心南塔`,
    arche: `steel`,
    glass: [0.3, 0.42, 0.54],
    frame: qh,
    crown: `screen`,
    crownH: 9,
    mull: 1.5,
    mast: 12
  }, {
    at: [-757, 919],
    name: `平安金融中心南塔裙楼`,
    arche: `mall`,
    glass: [0.22, 0.32, 0.42],
    frame: qh
  }, {
    at: [-763, 805],
    name: `PAFC Mall`,
    arche: `mall`,
    glass: [0.2, 0.3, 0.4],
    frame: [0.78, 0.76, 0.72]
  }, {
    at: [-750, 858],
    name: `PAFC Mall 连廊`,
    arche: `mall`,
    glass: [0.2, 0.3, 0.4],
    frame: [0.78, 0.76, 0.72]
  }, {
    at: [-738, 1020],
    name: `平安财险大厦`,
    arche: `fin`,
    glass: [0.25, 0.38, 0.5],
    frame: qh,
    crown: `screen`,
    crownH: 10,
    mull: 1.5,
    finGap: 4.5,
    podium: 16,
    inset: 0.92
  }, {
    at: [-747, 364],
    name: `免税商务大厦`,
    arche: `band`,
    glass: [0.4, 0.33, 0.2],
    frame: [0.78, 0.72, 0.6],
    crown: `steps`,
    tiers: 2,
    mast: 14,
    podium: 18,
    inset: 0.84
  }, {
    at: [-1076, 454],
    name: `招商证券大厦`,
    arche: `stone`,
    glass: [0.14, 0.26, 0.38],
    frame: [0.76, 0.76, 0.74],
    crown: `flat`,
    cell: [3, 4],
    podium: 14,
    inset: 0.86
  }, {
    at: [-1197, 578],
    name: `中国人寿大厦`,
    arche: `unit`,
    glass: [0.11, 0.32, 0.3],
    frame: Jh,
    crown: `screen`,
    crownH: 9,
    mull: 1.5,
    podium: 14,
    inset: 0.86
  }, {
    at: [-1152, 457],
    name: `投行大厦`,
    arche: `band`,
    glass: [0.26, 0.34, 0.42],
    frame: Jh,
    crown: `flat`,
    podium: 12,
    inset: 0.88
  }, {
    at: [-1299, 455],
    name: `安信金融大厦`,
    arche: `fin`,
    glass: [0.12, 0.26, 0.44],
    frame: Yh,
    crown: `slope`,
    crownH: 16,
    mull: 1.5,
    finGap: 3
  }, {
    at: [-810, 274],
    name: `时代金融中心`,
    arche: `unit`,
    glass: [0.1, 0.15, 0.22],
    frame: Zh,
    crown: `screen`,
    crownH: 7,
    mull: 1.2
  }, {
    at: [-765, 188],
    name: `港中旅大厦`,
    arche: `stone`,
    glass: [0.16, 0.24, 0.32],
    frame: [0.8, 0.72, 0.66],
    crown: `steps`,
    tiers: 2,
    cell: [3.2, 3.8],
    podium: 16,
    inset: 0.84
  }, {
    at: [-888, 194],
    name: `中国联通大厦`,
    arche: `unit`,
    glass: [0.14, 0.3, 0.5],
    frame: Yh,
    crown: `flat`,
    mast: 30,
    mull: 1.6,
    podium: 14,
    inset: 0.88
  }, {
    at: [-1084, 278],
    name: `新华保险大厦`,
    arche: `band`,
    glass: [0.16, 0.3, 0.44],
    frame: Yh,
    crown: `screen`,
    crownH: 8,
    podium: 18,
    inset: 0.78
  }, {
    at: [-514, 675],
    name: `中信证券大厦`,
    arche: `stone`,
    glass: [0.14, 0.24, 0.34],
    frame: Xh,
    crown: `flat`,
    cell: [3, 4]
  }, {
    at: [-520, 794],
    name: `深圳四季酒店`,
    arche: `band`,
    glass: [0.16, 0.2, 0.24],
    frame: [0.5, 0.46, 0.42],
    crown: `hat`,
    crownH: 6
  }, {
    at: [-508, 572],
    name: `嘉里建设广场一期 2座`,
    arche: `unit`,
    glass: [0.22, 0.4, 0.54],
    frame: Yh,
    crown: `screen`,
    crownH: 6,
    mull: 1.5
  }, {
    at: [-511, 495],
    name: `嘉里建设广场一期 1座`,
    arche: `unit`,
    glass: [0.22, 0.4, 0.54],
    frame: Yh,
    crown: `screen`,
    crownH: 6,
    mull: 1.5
  }, {
    at: [-766, 460],
    name: `丰立大厦`,
    arche: `stone`,
    glass: [0.16, 0.24, 0.3],
    frame: [0.84, 0.82, 0.76],
    crown: `flat`,
    cell: [3.3, 3.3]
  }, {
    at: [-1223, 457],
    name: `华安保险总部大厦`,
    arche: `band`,
    glass: [0.18, 0.3, 0.4],
    frame: Xh,
    crown: `flat`
  }, {
    at: [-1291, 531],
    name: `中信银行大厦`,
    arche: `unit`,
    glass: [0.12, 0.28, 0.42],
    frame: Jh,
    crown: `screen`,
    crownH: 7,
    mull: 1.5
  }, {
    at: [-1087, 371],
    name: `中心商务大厦`,
    arche: `fin`,
    glass: [0.2, 0.32, 0.4],
    frame: Xh,
    crown: `flat`,
    finGap: 3.6,
    mull: 1.8
  }, {
    at: [-943, 273],
    name: `华融大厦`,
    arche: `stone`,
    glass: [0.12, 0.22, 0.34],
    frame: [0.7, 0.72, 0.74],
    crown: `steps`,
    tiers: 2,
    cell: [3, 3.9]
  }, {
    at: [-970, 203],
    name: `投资大厦`,
    arche: `band`,
    glass: [0.3, 0.26, 0.2],
    frame: [0.74, 0.68, 0.6],
    crown: `flat`
  }, {
    at: [78, 440],
    name: `大百汇广场`,
    arche: `fin`,
    glass: [0.16, 0.3, 0.46],
    frame: qh,
    crown: `slope`,
    crownH: 34,
    mull: 1.5,
    finGap: 3,
    mast: 18
  }, {
    at: [78, 573],
    name: `皇庭中心`,
    arche: `unit`,
    glass: [0.08, 0.18, 0.34],
    frame: Jh,
    crown: `screen`,
    crownH: 14,
    mull: 1.5,
    corner: !0
  }, {
    at: [95, 913],
    name: `1号楼（OSM 名）`,
    arche: `fin`,
    glass: [0.2, 0.34, 0.48],
    frame: Yh,
    crown: `steps`,
    tiers: 3,
    mull: 1.5,
    finGap: 3.6
  }, {
    at: [95, 1016],
    name: `皇岗商务中心`,
    arche: `unit`,
    glass: [0.12, 0.28, 0.44],
    frame: Jh,
    crown: `screen`,
    crownH: 12,
    mull: 1.4
  }, {
    at: [195, 911],
    name: `3号楼（OSM 名）`,
    arche: `unit`,
    glass: [0.2, 0.34, 0.48],
    frame: Yh,
    crown: `screen`,
    crownH: 9,
    mull: 1.5
  }, {
    at: [228, 1011],
    name: `4号楼（OSM 名）`,
    arche: `band`,
    glass: [0.18, 0.3, 0.42],
    frame: Yh,
    crown: `flat`
  }, {
    at: [86, 1116],
    name: `北塔（OSM 名）`,
    arche: `fin`,
    glass: [0.12, 0.26, 0.42],
    frame: Jh,
    crown: `slope`,
    crownH: 18,
    finGap: 3
  }, {
    at: [90, 1203],
    name: `南塔（OSM 名）`,
    arche: `fin`,
    glass: [0.12, 0.26, 0.42],
    frame: Jh,
    crown: `flat`,
    finGap: 3
  }, {
    at: [-777, -535],
    name: `新世界中心`,
    arche: `unit`,
    glass: [0.3, 0.4, 0.5],
    frame: qh,
    crown: `steps`,
    tiers: 3,
    mast: 20,
    mull: 1.4
  }, {
    at: [-34, 782],
    name: `鼎和大厦`,
    arche: `fin`,
    glass: [0.14, 0.28, 0.44],
    frame: Yh,
    crown: `screen`,
    crownH: 12,
    finGap: 3
  }, {
    at: [-58, 782],
    name: `鼎和大厦裙房`,
    arche: `band`,
    glass: [0.14, 0.28, 0.44],
    frame: Yh,
    crown: `flat`
  }, {
    at: [-1273, -197],
    name: `广电金融中心`,
    arche: `unit`,
    glass: [0.1, 0.26, 0.46],
    frame: Jh,
    crown: `slope`,
    crownH: 22,
    mull: 1.5
  }, {
    at: [-1254, -136],
    name: `广电大厦`,
    arche: `stone`,
    glass: [0.14, 0.22, 0.3],
    frame: Xh,
    crown: `flat`,
    cell: [3.2, 3.8]
  }, {
    at: [-768, -195],
    name: `太平金融大厦`,
    arche: `fin`,
    glass: [0.14, 0.28, 0.44],
    frame: Yh,
    crown: `screen`,
    crownH: 12,
    finGap: 2.8,
    mull: 1.4,
    corner: !0
  }, {
    at: [72, -654],
    name: `生命保险大厦`,
    arche: `unit`,
    glass: [0.1, 0.3, 0.38],
    frame: Jh,
    crown: `slope`,
    crownH: 20,
    mull: 1.5
  }, {
    at: [83, 786],
    name: `财富大厦`,
    arche: `fin`,
    glass: [0.24, 0.34, 0.44],
    frame: Xh,
    crown: `steps`,
    tiers: 2,
    mast: 16,
    finGap: 3.6
  }, {
    at: [77, 794],
    name: `财富大厦`,
    arche: `band`,
    glass: [0.24, 0.34, 0.44],
    frame: Xh,
    crown: `flat`
  }, {
    at: [131, 789],
    name: `财富大厦`,
    arche: `band`,
    glass: [0.24, 0.34, 0.44],
    frame: Xh,
    crown: `flat`
  }, {
    at: [-1093, -182],
    name: `深圳建设银行大厦`,
    arche: `stone`,
    glass: [0.1, 0.22, 0.4],
    frame: [0.74, 0.72, 0.7],
    crown: `steps`,
    tiers: 2,
    cell: [3, 4],
    podium: 18,
    inset: 0.86
  }, {
    at: [-779, -76],
    name: `基金大厦`,
    arche: `unit`,
    glass: [0.18, 0.34, 0.48],
    frame: Yh,
    crown: `screen`,
    crownH: 10,
    mull: 1.5
  }, {
    at: [-762, -641],
    name: `江苏大厦`,
    arche: `band`,
    glass: [0.16, 0.26, 0.36],
    frame: [0.84, 0.8, 0.72],
    crown: `steps`,
    tiers: 3,
    mast: 24
  }, {
    at: [61, -418],
    name: `荣超经贸中心`,
    arche: `unit`,
    glass: [0.1, 0.32, 0.42],
    frame: Jh,
    crown: `screen`,
    crownH: 12,
    mull: 1.4,
    corner: !0
  }, {
    at: [-39, 673],
    name: `金中环商务大厦`,
    arche: `unit`,
    glass: [0.12, 0.3, 0.5],
    frame: Jh,
    crown: `slope`,
    crownH: 16,
    mull: 1.2
  }, {
    at: [-58, 685],
    name: `金中环商务大厦`,
    arche: `unit`,
    glass: [0.12, 0.3, 0.5],
    frame: Jh,
    crown: `flat`,
    mull: 1.2
  }, {
    at: [72, 343],
    name: `中洲大厦`,
    arche: `fin`,
    glass: [0.08, 0.14, 0.22],
    frame: Zh,
    crown: `screen`,
    crownH: 10,
    finGap: 3
  }, {
    at: [-101, 456],
    name: `大中华国际交易广场`,
    arche: `stone`,
    glass: [0.14, 0.22, 0.3],
    frame: [0.82, 0.78, 0.7],
    crown: `steps`,
    tiers: 3,
    mast: 16,
    cell: [3.2, 3.9]
  }, {
    at: [-143, 530],
    name: `大中华国际交易广场`,
    arche: `stone`,
    glass: [0.14, 0.22, 0.3],
    frame: [0.82, 0.78, 0.7],
    crown: `hat`,
    crownH: 7,
    cell: [3.2, 3.9]
  }, {
    at: [-55, 529],
    name: `大中华国际交易广场`,
    arche: `stone`,
    glass: [0.14, 0.22, 0.3],
    frame: [0.82, 0.78, 0.7],
    crown: `hat`,
    crownH: 7,
    cell: [3.2, 3.9]
  }, {
    at: [66, -319],
    name: `诺德中心`,
    arche: `fin`,
    glass: [0.14, 0.28, 0.42],
    frame: Jh,
    crown: `screen`,
    crownH: 9,
    finGap: 3,
    podium: 14,
    inset: 0.9
  }, {
    at: [-781, -306],
    name: `荣超中心A座`,
    arche: `unit`,
    glass: [0.1, 0.3, 0.4],
    frame: Jh,
    crown: `screen`,
    crownH: 10,
    mull: 1.5
  }, {
    at: [-776, -416],
    name: `荣超中心B座`,
    arche: `unit`,
    glass: [0.1, 0.3, 0.4],
    frame: Jh,
    crown: `flat`,
    mull: 1.5
  }, {
    at: [-787, -384],
    name: `荣超中心B座`,
    arche: `band`,
    glass: [0.1, 0.3, 0.4],
    frame: Jh,
    crown: `flat`
  }, {
    at: [81, 679],
    name: `现代国际大厦`,
    arche: `band`,
    glass: [0.2, 0.3, 0.38],
    frame: [0.8, 0.78, 0.74],
    crown: `steps`,
    tiers: 2,
    mast: 12
  }, {
    at: [-1083, -55],
    name: `招商银行深圳分行大厦`,
    arche: `stone`,
    glass: [0.12, 0.22, 0.36],
    frame: [0.72, 0.7, 0.68],
    crown: `slope`,
    crownH: 14,
    cell: [3, 4],
    podium: 16,
    inset: 0.88
  }, {
    at: [424, -104],
    name: `南楼（OSM 名）`,
    arche: `unit`,
    glass: [0.16, 0.3, 0.44],
    frame: Yh,
    crown: `screen`,
    crownH: 8,
    mull: 1.5
  }, {
    at: [446, 161],
    name: `星河世纪大厦`,
    arche: `fin`,
    glass: [0.12, 0.26, 0.44],
    frame: Jh,
    crown: `steps`,
    tiers: 2,
    finGap: 3.6
  }, {
    at: [85, 183],
    name: `金地中心`,
    arche: `unit`,
    glass: [0.24, 0.36, 0.46],
    frame: qh,
    crown: `screen`,
    crownH: 8,
    mull: 1.5
  }, {
    at: [73, -209],
    name: `安联大厦`,
    arche: `band`,
    glass: [0.14, 0.26, 0.4],
    frame: [0.8, 0.8, 0.78],
    crown: `steps`,
    tiers: 2,
    mast: 14
  }, {
    at: [160, -219],
    name: `国银金融中心大厦`,
    arche: `unit`,
    glass: [0.1, 0.22, 0.38],
    frame: Jh,
    crown: `screen`,
    crownH: 8,
    mull: 1.4
  }, {
    at: [219, -208],
    name: `民生金融大厦`,
    arche: `stone`,
    glass: [0.12, 0.22, 0.32],
    frame: Xh,
    crown: `flat`,
    cell: [3, 3.9]
  }, {
    at: [465, 746],
    name: `瀚森大厦`,
    arche: `band`,
    glass: [0.16, 0.28, 0.38],
    frame: Yh,
    crown: `flat`,
    mast: 10
  }, {
    at: [146, 455],
    name: `卓悦中心西区`,
    arche: `unit`,
    glass: [0.2, 0.32, 0.42],
    frame: Zh,
    crown: `screen`,
    crownH: 7,
    mull: 1.5
  }, {
    at: [-1515, -257],
    name: `英龙商务中心`,
    arche: `band`,
    glass: [0.16, 0.28, 0.4],
    frame: Yh,
    crown: `flat`
  }, {
    at: [-1523, -113],
    name: `中电信息大厦`,
    arche: `stone`,
    glass: [0.14, 0.24, 0.34],
    frame: [0.78, 0.78, 0.76],
    crown: `flat`,
    cell: [3, 3.8]
  }, {
    at: [-1193, 191],
    name: `航天大厦`,
    arche: `band`,
    glass: [0.16, 0.26, 0.36],
    frame: Yh,
    crown: `steps`,
    tiers: 2
  }, {
    at: [466, 676],
    name: `兆邦基金融大厦`,
    arche: `unit`,
    glass: [0.12, 0.28, 0.42],
    frame: Jh,
    crown: `screen`,
    crownH: 6,
    mull: 1.5
  }, {
    at: [594, 840],
    name: `海天综合大厦`,
    arche: `stone`,
    glass: [0.14, 0.22, 0.3],
    frame: [0.82, 0.8, 0.74],
    crown: `flat`,
    cell: [3.2, 3.6]
  }, {
    at: [566, -357],
    name: `橄榄大厦`,
    arche: `band`,
    glass: [0.16, 0.3, 0.3],
    frame: [0.8, 0.82, 0.76],
    crown: `flat`
  }, {
    at: [437, -768],
    name: `中银大厦B座`,
    arche: `stone`,
    glass: [0.12, 0.2, 0.3],
    frame: Xh,
    crown: `steps`,
    tiers: 2,
    cell: [3, 3.8]
  }, {
    at: [292, 171],
    name: `华嵘大厦`,
    arche: `band`,
    glass: [0.18, 0.28, 0.36],
    frame: Xh,
    crown: `flat`
  }, {
    at: [460, 918],
    name: `京地大厦`,
    arche: `stone`,
    glass: [0.14, 0.22, 0.3],
    frame: [0.84, 0.8, 0.74],
    crown: `flat`,
    cell: [3.2, 3.6]
  }, {
    at: [1775, 103],
    name: `汉国中心`,
    arche: `fin`,
    glass: [0.16, 0.3, 0.42],
    frame: Jh,
    crown: `steps`,
    tiers: 3,
    mast: 20,
    finGap: 3,
    mull: 1.5
  }, {
    at: [4339, -1988],
    name: `城脉中心`,
    arche: `fin`,
    glass: [0.14, 0.28, 0.44],
    frame: qh,
    crown: `slope`,
    crownH: 36,
    finGap: 3,
    corner: !0
  }, {
    at: [4820, -2612],
    name: `宝能中心`,
    arche: `unit`,
    glass: [0.12, 0.26, 0.42],
    frame: Jh,
    crown: `steps`,
    tiers: 3,
    mast: 18,
    mull: 1.5
  }, {
    at: [-4494, 455],
    name: `东海国际公寓A座`,
    arche: `band`,
    glass: [0.16, 0.26, 0.36],
    frame: [0.84, 0.82, 0.78],
    crown: `steps`,
    tiers: 3,
    mast: 16
  }, {
    at: [-4431, 412],
    name: `东海国际公寓B座`,
    arche: `band`,
    glass: [0.16, 0.26, 0.36],
    frame: [0.84, 0.82, 0.78],
    crown: `steps`,
    tiers: 2
  }, {
    at: [-4353, 446],
    name: `东海朗廷酒店`,
    arche: `stone`,
    glass: [0.12, 0.2, 0.28],
    frame: [0.82, 0.78, 0.7],
    crown: `hat`,
    crownH: 8,
    cell: [3.4, 3.4]
  }, {
    at: [-4290, 389],
    name: `东海国际中心A座`,
    arche: `unit`,
    glass: [0.12, 0.28, 0.44],
    frame: Jh,
    crown: `screen`,
    crownH: 9,
    mull: 1.5
  }, {
    at: [-714, 3772],
    name: `长富金茂大厦`,
    arche: `fin`,
    glass: [0.12, 0.28, 0.46],
    frame: Jh,
    crown: `slope`,
    crownH: 28,
    finGap: 3,
    corner: !0
  }, {
    at: [-8264, 616],
    name: `华侨城大厦`,
    arche: `unit`,
    glass: [0.16, 0.32, 0.46],
    frame: Yh,
    crown: `slope`,
    crownH: 30,
    mull: 1.4,
    corner: !0
  }, {
    at: [821, -1759],
    name: `深业上城大厦2`,
    arche: `fin`,
    glass: [0.1, 0.2, 0.34],
    frame: Zh,
    crown: `screen`,
    crownH: 14,
    finGap: 3
  }, {
    at: [-3668, 1327],
    name: `京基·滨河时代广场`,
    arche: `unit`,
    glass: [0.12, 0.26, 0.42],
    frame: Jh,
    crown: `steps`,
    tiers: 3,
    mast: 14,
    mull: 1.5
  }, {
    at: [-3558, 1357],
    name: `京基滨河时代 西塔`,
    arche: `resi`,
    frame: [0.86, 0.84, 0.8],
    accent: [0.45, 0.5, 0.56],
    glass: [0.12, 0.17, 0.22],
    crown: `resi`
  }, {
    at: [-3488, 1381],
    name: `京基滨河时代 东塔`,
    arche: `resi`,
    frame: [0.86, 0.84, 0.8],
    accent: [0.45, 0.5, 0.56],
    glass: [0.12, 0.17, 0.22],
    crown: `resi`
  }, {
    at: [-12117, 269],
    name: `中国储能大厦`,
    arche: `fin`,
    glass: [0.12, 0.26, 0.44],
    frame: Jh,
    crown: `screen`,
    crownH: 16,
    finGap: 3,
    corner: !0
  }, {
    at: [-12094, 2417],
    name: `深创投广场`,
    arche: `unit`,
    glass: [0.16, 0.3, 0.46],
    frame: Yh,
    crown: `slope`,
    crownH: 20,
    mull: 1.5
  }, {
    at: [2106, -101],
    name: `交通银行大厦`,
    arche: `stone`,
    glass: [0.12, 0.22, 0.36],
    frame: [0.76, 0.76, 0.74],
    crown: `steps`,
    tiers: 3,
    mast: 18,
    cell: [3, 4]
  }, {
    at: [3210, 57],
    name: `中信国际大厦`,
    arche: `unit`,
    glass: [0.1, 0.24, 0.4],
    frame: Jh,
    crown: `screen`,
    crownH: 10,
    mull: 1.5
  }, {
    at: [855, 2371],
    name: `河套中心`,
    arche: `fin`,
    glass: [0.16, 0.3, 0.44],
    frame: Yh,
    crown: `screen`,
    crownH: 12,
    finGap: 3.6
  }, {
    at: [-7904, -842],
    name: `侨城一号广场`,
    arche: `unit`,
    glass: [0.14, 0.28, 0.42],
    frame: Jh,
    crown: `screen`,
    crownH: 10,
    mull: 1.5
  }, {
    at: [-13188, -39],
    name: `腾讯大厦`,
    arche: `unit`,
    glass: [0.12, 0.26, 0.46],
    frame: Yh,
    crown: `slope`,
    crownH: 18,
    mull: 1.5,
    corner: !0
  }, {
    at: [6583, -508],
    name: `罗湖商务中心大厦`,
    arche: `unit`,
    glass: [0.12, 0.28, 0.44],
    frame: Jh,
    crown: `screen`,
    crownH: 10,
    mull: 1.5
  }, {
    at: [4321, -626],
    name: `国信证券大厦`,
    arche: `stone`,
    glass: [0.1, 0.2, 0.32],
    frame: [0.74, 0.74, 0.72],
    crown: `steps`,
    tiers: 2,
    mast: 12,
    cell: [3, 4]
  }, {
    at: [1943, -318],
    name: `中航中心`,
    arche: `fin`,
    glass: [0.14, 0.28, 0.42],
    frame: Jh,
    crown: `screen`,
    crownH: 10,
    finGap: 3
  }, {
    at: [-12725, 3150],
    name: `中海油大厦B座`,
    arche: `unit`,
    glass: [0.14, 0.3, 0.46],
    frame: Yh,
    crown: `screen`,
    crownH: 10,
    mull: 1.4,
    corner: !0
  }, {
    at: [-12699, 3049],
    name: `中海油大厦A座`,
    arche: `unit`,
    glass: [0.14, 0.3, 0.46],
    frame: Yh,
    crown: `screen`,
    crownH: 10,
    mull: 1.4,
    corner: !0
  }, {
    at: [-12420, 2255],
    name: `航天科技广场A座`,
    arche: `fin`,
    glass: [0.12, 0.24, 0.4],
    frame: Jh,
    crown: `flat`,
    finGap: 3.6,
    mast: 12
  }, {
    at: [-1554, -1448],
    name: `文博大厦`,
    arche: `stone`,
    glass: [0.14, 0.22, 0.3],
    frame: [0.8, 0.76, 0.7],
    crown: `steps`,
    tiers: 2,
    cell: [3.2, 3.9]
  }, {
    at: [-11231, -243],
    name: `大冲国际中心`,
    arche: `unit`,
    glass: [0.12, 0.28, 0.42],
    frame: Jh,
    crown: `screen`,
    crownH: 9,
    mull: 1.5
  }, {
    at: [-11300, -171],
    name: `华润置地大厦E座`,
    arche: `fin`,
    glass: [0.14, 0.28, 0.4],
    frame: qh,
    crown: `screen`,
    crownH: 9,
    finGap: 3.6
  }, {
    at: [5660, -87],
    name: `深房广场`,
    arche: `band`,
    glass: [0.16, 0.26, 0.34],
    frame: [0.8, 0.78, 0.74],
    crown: `steps`,
    tiers: 2,
    mast: 10
  }, {
    at: [5516, -73],
    name: `深圳国际金融大厦`,
    arche: `stone`,
    glass: [0.12, 0.2, 0.3],
    frame: [0.78, 0.74, 0.68],
    crown: `flat`,
    cell: [3, 3.8]
  }, {
    at: [5537, 73],
    name: `南洋大厦`,
    arche: `band`,
    glass: [0.14, 0.24, 0.32],
    frame: [0.84, 0.82, 0.78],
    crown: `flat`
  }, {
    at: [6300, 156],
    name: `广发大厦`,
    arche: `band`,
    glass: [0.16, 0.24, 0.3],
    frame: [0.78, 0.74, 0.66],
    crown: `steps`,
    tiers: 2
  }, {
    at: [3208, -99],
    name: `华联大厦`,
    arche: `stone`,
    glass: [0.12, 0.2, 0.28],
    frame: [0.82, 0.8, 0.76],
    crown: `steps`,
    tiers: 2,
    mast: 14,
    cell: [3.2, 3.6]
  }, {
    at: [2106, 88],
    name: `国际科技大厦`,
    arche: `unit`,
    glass: [0.14, 0.26, 0.38],
    frame: Jh,
    crown: `screen`,
    crownH: 7,
    mull: 1.5
  }, {
    at: [2091, 168],
    name: `世界贸易广场`,
    arche: `band`,
    glass: [0.16, 0.26, 0.34],
    frame: Xh,
    crown: `steps`,
    tiers: 2
  }],
  $h = [[0.1, 0.25, 0.46], [0.11, 0.32, 0.4], [0.27, 0.36, 0.46], [0.09, 0.14, 0.22], [0.2, 0.4, 0.52], [0.3, 0.27, 0.22], [0.16, 0.3, 0.36], [0.07, 0.2, 0.3], [0.34, 0.42, 0.48], [0.14, 0.36, 0.34], [0.22, 0.3, 0.44], [0.38, 0.33, 0.24], [0.12, 0.18, 0.34], [0.26, 0.44, 0.5]],
  eg = [Jh, Yh, Xh, qh, [0.62, 0.64, 0.66], [0.8, 0.76, 0.7], [0.44, 0.46, 0.5], [0.86, 0.84, 0.78], [0.56, 0.5, 0.44], [0.7, 0.74, 0.76], Zh],
  tg = [[0.9, 0.88, 0.82], [0.86, 0.8, 0.72], [0.82, 0.84, 0.86], [0.88, 0.84, 0.76], [0.8, 0.74, 0.68], [0.92, 0.9, 0.88], [0.84, 0.72, 0.62], [0.78, 0.8, 0.76], [0.9, 0.82, 0.66], [0.72, 0.74, 0.78], [0.86, 0.76, 0.74], [0.76, 0.7, 0.62], [0.88, 0.88, 0.8], [0.68, 0.66, 0.64], [0.82, 0.86, 0.84], [0.92, 0.86, 0.78]],
  ng = [[0.62, 0.42, 0.32], [0.45, 0.5, 0.56], [0.74, 0.6, 0.42], [0.36, 0.4, 0.44], [0.7, 0.3, 0.24], [0.28, 0.42, 0.52], [0.5, 0.56, 0.44], [0.82, 0.66, 0.36], [0.42, 0.34, 0.3], [0.58, 0.62, 0.66], [0.3, 0.46, 0.42], [0.66, 0.5, 0.5], [0.24, 0.28, 0.34], [0.78, 0.52, 0.3]],
  rg = [[0.56, 0.57, 0.58], [0.48, 0.5, 0.52], [0.62, 0.6, 0.56], [0.36, 0.5, 0.34], [0.58, 0.36, 0.3], [0.34, 0.42, 0.54], [0.66, 0.66, 0.64]],
  ig = [[0.82, 0.14, 0.12], [0.96, 0.78, 0.14], [0.12, 0.36, 0.74], [0.1, 0.58, 0.32], [0.94, 0.94, 0.9], [0.92, 0.46, 0.1], [0.2, 0.22, 0.26], [0.76, 0.16, 0.5], [0.1, 0.62, 0.7]],
  ag = (e, t) => {
    let n = Math.sin(e * 127.1 + t * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };

function og(e, t, n, r, i = 0, a = 0, o = 4) {
  let s = ag(Math.floor(i / 240) * 0.731 + Math.floor(a / 240) * 1.377, 5),
    c = e => ag(n, e),
    l = (e, t) => c(e + 50) < t ? ag(s, e) : c(e),
    u = (e, t, n = 0.5) => e[Math.floor(l(t, n) * e.length) % e.length],
    d = u(rg, 40, 0.3);
  if (e === 1) {
    let e = Math.floor(l(1, 0.65) * 6) % 6,
      n = [`machine`, `pergola`, `hip`, `wing`, `steps`, `machine`, `slab`][Math.floor(l(2, 0.45) * 7) % 7];
    return {
      arche: `resi`,
      rv: e,
      frame: u(tg, 3, 0.6),
      frame2: u(tg, 4, 0.6),
      accent: u(ng, 5, 0.55),
      glass: [0.1 + c(6) * 0.06, 0.15 + c(6) * 0.06, 0.2 + c(7) * 0.08],
      crown: n,
      cellW: 2.9 + Math.floor(l(8, 0.6) * 4) * 0.3,
      floorH: 2.9 + Math.floor(c(9) * 3) * 0.1,
      wv: Math.floor(l(10, 0.5) * 4) % 4,
      bv: Math.floor(l(11, 0.5) * 6) % 6,
      shops: c(12) < 0.3 && t < 120,
      bayGap: 7.5 + Math.floor(l(13, 0.6) * 4) * 1.6,
      tank: c(14) < 0.5,
      roof: d,
      crownH: 3 + c(15) * 5
    };
  }
  if (e === 3 || e === 4 || t < 60) return {
    arche: `mall`,
    mv: e === 4 ? 3 : [0, 1, 2, 4, 5, 2, 0, 1][Math.floor(l(1, 0.35) * 8) % 8],
    glass: u($h, 2, 0.3),
    frame: e === 4 ? u([Yh, [0.92, 0.9, 0.84], [0.86, 0.88, 0.9]], 3, 0.5) : u(eg.concat(tg.slice(0, 6)), 3, 0.3),
    accent: u(ig, 4, 0.2),
    roof: d,
    board: c(5) < 0.28 && e !== 4,
    signs: c(6) < 0.55 && e !== 4,
    wv: Math.floor(c(7) * 4) % 4,
    cellW: 3 + Math.floor(c(8) * 4) * 0.4,
    clutter: 2 + Math.floor(c(9) * 5)
  };
  let f = [`unit`, `fin`, `band`, `stone`, `grid`, `slot`, `louvre`, `fin`, `unit`, `grid`, `stone`, `slot`][Math.floor(l(3, 0.25) * 12) % 12],
    p = [`screen`, `flat`, `steps`, `slope`, `hat`, `frame`, `screen`, `steps`, `flat`, `slope`][Math.floor(c(4) * 10) % 10],
    m = c(16) < 0.22 && t > 110;
  return {
    arche: f,
    glass: u($h, 5, 0.2),
    frame: u(eg, 6, 0.2),
    crown: m ? `steps` : p,
    crownH: 6 + c(7) * 9,
    tiers: m ? 2 : 2 + Math.floor(c(17) * 2),
    stepH: m ? 0.22 + c(18) * 0.16 : 0,
    mull: [1.2, 1.5, 1.5, 1.8, 2.1][Math.floor(c(8) * 5) % 5],
    finGap: [2.4, 3, 3.6, 4.5, 6][Math.floor(c(9) * 5) % 5],
    floorH: 3.9 + Math.floor(c(19) * 3) * 0.3,
    cell: [2.7 + Math.floor(c(10) * 4) * 0.3, 3.6 + Math.floor(c(20) * 3) * 0.3],
    wv: Math.floor(c(21) * 4) % 4,
    sv: Math.floor(c(22) * 3) % 3,
    podium: r > 1300 && c(11) < 0.6 ? 9 + Math.floor(c(12) * 4) * 4 : 0,
    inset: 0.76 + c(13) * 0.16,
    podStyle: Math.floor(c(23) * 3) % 3,
    mast: c(14) < 0.25 ? 8 + c(15) * 16 : 0,
    corner: c(24) < 0.2,
    sign: c(25) < 0.3,
    roof: d,
    clutter: 1 + Math.floor(c(26) * 4),
    auto: !0
  };
}

var sg = e => {
    let t = 0;
    for (let n = 0; n < e.length; n++) {
      let r = e[n],
        i = e[(n + 1) % e.length];
      t += r[0] * i[1] - i[0] * r[1];
    }
    return t / 2;
  },
  cg = e => {
    let t = 0,
      n = 0;
    for (let r of e) t += r[0], n += r[1];
    return [t / e.length, n / e.length];
  },
  lg = (e, t, n) => e.map(e => [n[0] + (e[0] - n[0]) * t, n[1] + (e[1] - n[1]) * t]),
  ug = (e, t, n) => {
    let r = 0;
    for (let t of e) r += Math.hypot(t[0] - n[0], t[1] - n[1]);
    return r /= e.length, lg(e, Math.max(0.3, 1 - t / r), n);
  };

function dg(e, t, n, r, i) {
  if (e.stub) return;
  let a = 0,
    o = t.length,
    s = o > 8;
  for (let c = 0; c < o; c++) {
    let l = t[c],
      u = t[(c + 1) % o],
      d = Math.hypot(u[0] - l[0], u[1] - l[1]);
    if (d < 0.05) continue;
    let f = typeof r == `function` ? r(l) : r,
      p = typeof r == `function` ? r(u) : r;
    e.quad([l[0], n, l[1]], [u[0], n, u[1]], [u[0], p, u[1]], [l[0], f, l[1]], {
      ...i,
      u0: s ? a : -d / 2
    }), a += d;
  }
}

function fg(e, t, n, r) {
  if (e.stub) return;
  let i = t.map(e => new Vector2(e[0], e[1])),
    a;
  try {
    a = ShapeUtils.triangulateShape(i, []);
  } catch {
    return;
  }
  let o = typeof n == `function` ? n : () => n;
  for (let n of a) {
    let [i, a, s] = n.map(e => t[e]);
    e.quad([i[0], o(i), i[1]], [a[0], o(a), a[1]], [s[0], o(s), s[1]], [s[0], o(s), s[1]], r, [i, a, s, s]);
  }
}

function pg(e, t, n, r, i, a, o, s, c = 7) {
  if (e.stub) return;
  let l = sg(t) > 0 ? 1 : -1,
    u = t.length;
  for (let d = 0; d < u; d++) {
    let f = t[d],
      p = t[(d + 1) % u],
      m = p[0] - f[0],
      h = p[1] - f[1],
      g = Math.hypot(m, h);
    if (g < c) continue;
    let _ = m / g,
      v = h / g,
      y = v * l,
      b = -_ * l,
      x = Math.max(1, Math.round(g / i));
    for (let t = 0; t <= x; t++) {
      let i = Math.min(g - a / 2, Math.max(a / 2, t / x * g)),
        c = f[0] + _ * i,
        l = f[1] + v * i,
        u = [c - _ * a / 2, l - v * a / 2],
        d = [c + _ * a / 2, l + v * a / 2],
        p = [u[0] + y * o, u[1] + b * o],
        m = [d[0] + y * o, d[1] + b * o];
      e.quad([p[0], n, p[1]], [m[0], n, m[1]], [m[0], r, m[1]], [p[0], r, p[1]], s), e.quad([u[0], n, u[1]], [p[0], n, p[1]], [p[0], r, p[1]], [u[0], r, u[1]], s), e.quad([m[0], n, m[1]], [d[0], n, d[1]], [d[0], r, d[1]], [m[0], r, m[1]], s);
    }
  }
}

function mg(e, t, n, r, i, a, o) {
  let s = ug(t, -i, n);
  dg(e, s, r - a / 2, r + a / 2, {
    mat: 0,
    col: o
  }), fg(e, s, r + a / 2, {
    mat: 0,
    col: o
  }), fg(e, s, r - a / 2, {
    mat: 0,
    col: o.map(e => e * 0.8)
  });
}

function hg(e) {
  let t = e.floorH || 4.2,
    n = e.mull || 1.5,
    r = e.cell || [3, 3.9];
  switch (e.arche) {
    case `fin`:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [n, t, 0]
      };
    case `steel`:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [n, 4.5, 0]
      };
    case `band`:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [n * 1.2, t, 4]
      };
    case `stone`:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [r[0], r[1], 2 + 10 * (e.wv || 0)]
      };
    case `grid`:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [n * 1.2, t, 7 + 10 * (e.sv || 0)]
      };
    case `slot`:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [r[0] * 0.8, t, 6 + 10 * (e.sv || 0)]
      };
    case `louvre`:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [n, t, 8]
      };
    case `resi`:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [e.cellW || 3.3, e.floorH || 3, 2 + 10 * (e.wv || 0)]
      };
    default:
      return {
        mat: 2,
        col: e.frame,
        col2: e.glass,
        p: [n, t, 0]
      };
  }
}

function gg(e, t, n, r, i, a, o) {
  let s = lg(t, 0.62, n);
  for (let t = 0; t < a; t++) {
    let a = s[Math.floor(ag(i, 60 + t) * s.length) % s.length],
      o = 0.25 + ag(i, 70 + t) * 0.6,
      c = n[0] + (a[0] - n[0]) * o,
      l = n[1] + (a[1] - n[1]) * o,
      u = 1.6 + ag(i, 80 + t) * 2.6,
      d = 1.4 + ag(i, 90 + t) * 2.2,
      f = 1 + ag(i, 100 + t) * 1.6;
    e.box(c - u / 2, c + u / 2, r, r + f, l - d / 2, l + d / 2, {
      mat: 1,
      col: ag(i, 110 + t) < 0.5 ? [0.72, 0.73, 0.74] : [0.52, 0.55, 0.58],
      p: [0.8, 0.3, 1]
    });
  }
  if (o) {
    let t = n[0] + (ag(i, 121) - 0.5) * 5,
      a = n[1] + (ag(i, 122) - 0.5) * 5;
    for (let [n, i] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) e.strut([t + n * 1.1, r, a + i * 1.1], [t + n * 1.1, r + 2.2, a + i * 1.1], 0.18, {
      mat: 0,
      col: [0.4, 0.42, 0.44]
    });
    e.box(t - 1.5, t + 1.5, r + 2.2, r + 4.4, a - 1.5, a + 1.5, {
      mat: 1,
      col: ag(i, 123) < 0.5 ? [0.8, 0.82, 0.84] : [0.24, 0.4, 0.62],
      p: [1, 0.5, 0]
    });
  }
}

function _g(e, t, n, r, i, a = 5) {
  let o = 0,
    s = 0;
  for (let e = 0; e < t.length; e++) {
    let n = t[e],
      r = t[(e + 1) % t.length],
      i = Math.hypot(r[0] - n[0], r[1] - n[1]);
    i > s && (s = i, o = e);
  }
  if (s < 12) return;
  let c = t[o],
    l = t[(o + 1) % t.length],
    u = Math.min(s * 0.6, 26),
    d = 0.5 - u / s / 2,
    f = 0.5 + u / s / 2,
    p = [c[0] + (l[0] - c[0]) * d, c[1] + (l[1] - c[1]) * d],
    m = [c[0] + (l[0] - c[0]) * f, c[1] + (l[1] - c[1]) * f];
  e.fx = [2, ag(r, 130)], e.quad([p[0], n + 1.2, p[1]], [m[0], n + 1.2, m[1]], [m[0], n + 1.2 + a, m[1]], [p[0], n + 1.2 + a, p[1]], {
    mat: 0,
    col: i
  }), e.fx = e.fxBase || [0, 0];
  for (let t of [0.08, 0.5, 0.92]) {
    let r = p[0] + (m[0] - p[0]) * t,
      i = p[1] + (m[1] - p[1]) * t;
    e.strut([r, n, i], [r, n + 1.2 + a, i], 0.25, {
      mat: 0,
      col: [0.3, 0.32, 0.34]
    });
  }
}

function vg(e, t, n, r, i) {
  let a = sg(t) > 0 ? 1 : -1;
  for (let o = 0; o < t.length; o++) {
    let s = t[o],
      c = t[(o + 1) % t.length],
      l = c[0] - s[0],
      u = c[1] - s[1],
      d = Math.hypot(l, u);
    if (d < 9) continue;
    let f = l / d,
      p = u / d,
      m = p * a * 0.3,
      h = -f * a * 0.3,
      g = 0.8,
      _ = 0;
    for (; g < d - 3;) {
      let t = Math.min(d - 0.8 - g, 3.5 + ag(i, 140 + o * 7 + _) * 4.5),
        a = ig[Math.floor(ag(i, 150 + o * 5 + _) * ig.length) % ig.length],
        c = [s[0] + f * g + m, s[1] + p * g + h],
        l = [s[0] + f * (g + t) + m, s[1] + p * (g + t) + h];
      e.fx = [2, ag(i, 160 + _ + o)], e.quad([c[0], n, c[1]], [l[0], n, l[1]], [l[0], r, l[1]], [c[0], r, c[1]], {
        mat: 0,
        col: a
      }), g += t + 0.4, _++;
    }
  }
  e.fx = e.fxBase || [0, 0];
}

function yg(e, t, n, r, i, a) {
  if (!e.stub) for (let o = 0; o < t.length; o++) {
    let s = t[o],
      c = t[(o + 1) % t.length];
    e.quad([s[0], r, s[1]], [c[0], r, c[1]], [n[0], r + i, n[1]], [n[0], r + i, n[1]], {
      mat: 1,
      col: a,
      p: [0.6, 0.6, 2]
    });
  }
}

function bg(e, t, n, r, i, a) {
  let o = ug(t, 1.2, n);
  if (!(o.length > 14)) for (let t = 0; t < o.length; t++) {
    let n = o[t],
      s = o[(t + 1) % o.length];
    Math.hypot(s[0] - n[0], s[1] - n[1]) < 1.5 || (e.strut([n[0], r + i, n[1]], [s[0], r + i, s[1]], 0.5, {
      mat: 0,
      col: a
    }), e.strut([n[0], r, n[1]], [n[0], r + i, n[1]], 0.45, {
      mat: 0,
      col: a
    }));
  }
}

function xg(e) {
  let t = e.ring;
  sg(t) < 0 && (t = t.slice().reverse());
  let n = e.spec,
    r = e.h;
  if (n.arche === `mall` || n.arche === `resi`) return {
    ring: t,
    top: r
  };
  let i = cg(t),
    a = Math.abs(sg(t)),
    o = (n.podium && a > 900 ? n.podium : 0) > 0 ? lg(t, n.inset || 0.85, i) : t,
    s = n.crown || `flat`;
  return {
    ring: o,
    top: r - (s === `steps` ? n.stepH ? r * n.stepH : Math.min(r * 0.16, 9 * (n.tiers || 2)) : s === `flat` ? 0 : Math.min(n.crownH || 8, r * 0.15))
  };
}

function Sg(e, t, n, r, i, a, o, s, c) {
  sg(t) < 0 && (t = t.slice().reverse());
  let l = cg(t),
    u = Math.abs(sg(t)),
    d = hg(a),
    f = a.frame.map(e => e * 0.78),
    p = {
      mat: 3,
      col: [0.56, 0.57, 0.58],
      p: [3, 3]
    },
    m = (e, t, n) => {
      let i = e.map(e => new Vector2(e[0], e[1])),
        a = e.map(e => e[0]),
        o = e.map(e => e[1]);
      s.push({
        rings: [i],
        minX: Math.min(...a),
        maxX: Math.max(...a),
        minZ: Math.min(...o),
        maxZ: Math.max(...o),
        bottom: t,
        top: n,
        name: c,
        h: r
      });
    },
    h = e => n + e,
    g = i > 0 ? i : -1.5;
  if (a.arche === `mall`) {
    let n = a.mv || 0,
      s = a.accent || a.frame,
      c = {
        mat: 3,
        col: a.roof || p.col,
        p: [3, 3]
      },
      u = Math.min(n === 2 ? 4.2 : 6.5, r);
    if (dg(e, t, h(g), h(u), {
      mat: 2,
      col: n === 2 ? f : a.frame,
      col2: [0.1, 0.14, 0.18],
      p: [n === 2 ? 3.6 : 4.2, u, 3]
    }), i > 0 && fg(e, t, h(i), {
      mat: 0,
      col: f
    }), n === 0) {
      let n = Math.max(1, Math.round((r - u) / 9));
      for (let i = 0; i < n; i++) {
        let o = u + (r - u) * i / n,
          s = u + (r - u) * (i + 1) / n;
        dg(e, i % 2 ? ug(t, 1.2, l) : t, h(o), h(s), i % 2 ? {
          mat: 2,
          col: a.frame,
          col2: a.glass,
          p: [1.8, s - o, 0]
        } : {
          mat: 1,
          col: a.frame,
          p: [3.6, 1.5, 0]
        }), mg(e, t, l, h(s), 0.5, 0.5, a.frame);
      }
    } else if (n === 1) dg(e, t, h(u), h(r), {
      mat: 2,
      col: a.frame,
      col2: a.glass,
      p: [2.1, 4.8, 0]
    }), pg(e, t, h(g), h(r + 0.6), 1e6, 2.2, 0.8, {
      mat: 1,
      col: s,
      p: [3, 3, 0]
    }, 14), mg(e, t, l, h(u), 1.4, 0.5, f), mg(e, t, l, h(r), 0.6, 0.7, a.frame);else if (n === 2) {
      dg(e, t, h(u), h(r), {
        mat: 2,
        col: a.frame,
        col2: [0.11, 0.15, 0.19],
        p: [a.cellW || 3.3, 3.3, 2 + 10 * (a.wv || 0)]
      }), mg(e, t, l, h(u), 0.9, 0.35, f);
      for (let n = u + 9.9; n < r - 3; n += 9.9) mg(e, t, l, h(n), 0.3, 0.25, f);
    } else if (n === 3) {
      dg(e, t, h(u), h(r), {
        mat: 2,
        col: a.frame,
        col2: [0.14, 0.2, 0.26],
        p: [3.6, 3.7, 8]
      });
      for (let n = u; n < r - 1; n += 3.7) mg(e, t, l, h(n), 0.35, 0.22, a.frame);
      mg(e, t, l, h(r + 1.3), 0.3, 0.4, [0.66, 0.26, 0.2]);
    } else n === 4 ? (dg(e, t, h(u), h(r), {
      mat: 2,
      col: a.frame,
      col2: a.glass,
      p: [1.6, 3.9, 8]
    }), pg(e, t, h(u), h(r), 7.8, 0.5, 0.45, {
      mat: 0,
      col: f
    }, 10)) : (dg(e, t, h(u), h(r), {
      mat: 2,
      col: a.frame,
      col2: a.glass,
      p: [1.8, 4.2, 7 + 10 * ((a.wv || 0) % 3)]
    }), mg(e, t, l, h(u), 1, 0.4, f));
    a.signs && i === 0 && vg(e, t, h(u - 1.5), h(u - 0.1), o), fg(e, t, h(r), c), dg(e, t, h(r), h(r + 1.3), {
      mat: 0,
      col: a.frame
    });
    let d = lg(t, 0.3 + ag(o, 41) * 0.14, [l[0] + (ag(o, 42) - 0.5) * 8, l[1] + (ag(o, 43) - 0.5) * 8]);
    dg(e, d, h(r), h(r + 4.5), {
      mat: 1,
      col: [0.66, 0.67, 0.68],
      p: [2.4, 0.5, 1]
    }), fg(e, d, h(r + 4.5), c), gg(e, t, l, h(r), o, a.clutter || 2, !1), a.board && _g(e, t, h(r), o, s, 4 + ag(o, 44) * 3), m(t, h(g), h(r));
    return;
  }
  if (a.arche === `resi`) {
    let n = a.rv || 0,
      i = a.accent,
      s = a.floorH || 3,
      c = a.cellW || 3.3,
      u = {
        mat: 3,
        col: a.roof || p.col,
        p: [3, 3]
      },
      _ = {
        mat: 2,
        col: i,
        col2: a.glass,
        p: [1.5, s, 5 + 10 * (a.bv || 0)]
      },
      v = a.shops ? 5.4 : 4.6;
    if (a.shops) {
      let n = ug(t, -2.2, l);
      dg(e, n, h(g), h(v), {
        mat: 2,
        col: f,
        col2: [0.1, 0.14, 0.18],
        p: [3.6, v, 3]
      }), fg(e, n, h(v), {
        mat: 0,
        col: f
      }), vg(e, n, h(v - 1.5), h(v - 0.15), o);
    } else dg(e, t, h(g), h(v), {
      mat: 3,
      col: i.map(e => e * 0.8),
      p: [1.2, 0.6]
    });
    if (n === 0) dg(e, t, h(v), h(r), d), pg(e, t, h(v), h(r + 1.2), a.bayGap || 9.9, 3, 0.9, _, 9);else if (n === 1) {
      dg(e, t, h(v), h(r), {
        mat: 2,
        col: a.frame,
        col2: a.glass,
        p: [c, s, 5 + 10 * (a.bv || 0)]
      });
      for (let n = v + s * 6; n < r - 4; n += s * 6) mg(e, t, l, h(n), 0.35, 0.3, i);
      pg(e, t, h(v), h(r + 2), 1e6, 1.6, 0.35, {
        mat: 0,
        col: i
      }, 12);
    } else if (n === 2) dg(e, t, h(v), h(r), {
      mat: 2,
      col: a.frame,
      col2: a.glass,
      p: [c * 0.8, s, 6 + 10 * ((a.wv || 0) % 3)]
    }), pg(e, t, h(v), h(r + 0.6), (a.bayGap || 9.9) * 1.3, 2.4, 0.7, {
      mat: 2,
      col: a.frame2 || i,
      col2: a.glass,
      p: [1.2, s, 22]
    }, 10);else if (n === 3) {
      let n = s * (5 + Math.floor(ag(o, 45) * 3)),
        u = v,
        d = 0;
      for (; u < r - 0.5;) {
        let o = Math.min(r, u + n);
        dg(e, t, h(u), h(o), {
          mat: 2,
          col: d % 2 ? a.frame2 || i : a.frame,
          col2: a.glass,
          p: [c, s, 9 + 10 * ((a.wv || 0) % 2)]
        }), o < r && mg(e, t, l, h(o), 0.3, 0.25, i), u = o, d++;
      }
    } else n === 4 ? (dg(e, t, h(v), h(r), {
      mat: 2,
      col: i.map(e => e * 0.7),
      col2: a.glass.map(e => e * 1.6),
      p: [c * 0.6, s, 7 + 10 * ((a.wv || 0) % 3)]
    }), pg(e, t, h(v), h(r), (a.bayGap || 9.9) * 1.1, 3.2, 0.8, {
      mat: 2,
      col: a.frame,
      col2: a.glass,
      p: [1.6, s, 35]
    }, 10)) : (dg(e, t, h(v), h(r), {
      mat: 2,
      col: a.frame,
      col2: a.glass,
      p: [c, s, 9]
    }), pg(e, t, h(v), h(r + 1), a.bayGap || 9.9, 1, 0.5, {
      mat: 0,
      col: i
    }, 9));
    fg(e, t, h(r), u), dg(e, t, h(r), h(r + 1.4), {
      mat: 0,
      col: a.frame
    });
    let y = a.crown,
      b = a.crownH || 5,
      x = t.length <= 10;
    if (y === `hip` && x) yg(e, ug(t, -0.6, l), l, h(r + 1.4), 3 + b * 0.7, [[0.58, 0.3, 0.24], [0.34, 0.4, 0.5], [0.42, 0.44, 0.46], [0.3, 0.44, 0.36]][Math.floor(ag(o, 46) * 4) % 4]);else if (y === `pergola`) bg(e, t, l, h(r + 1.4), 2.6 + b * 0.4, i);else if (y === `wing`) pg(e, t, h(r - s * 2), h(r + 2.5 + b * 0.5), 5.5, 0.45, 0.7, {
      mat: 0,
      col: i
    }, 8), mg(e, t, l, h(r + 1.4), 0.9, 0.4, i);else if (y === `steps`) {
      let n = lg(t, 0.78, l);
      dg(e, n, h(r), h(r + s * 2), {
        mat: 2,
        col: a.frame2 || a.frame,
        col2: a.glass,
        p: [c, s, 2]
      }), fg(e, n, h(r + s * 2), u), mg(e, n, l, h(r + s * 2 + 0.2), 0.8, 0.35, i);
    } else y === `slab` ? (mg(e, t, l, h(r + 3.4), 1.6, 0.45, i), bg(e, lg(t, 0.7, l), l, h(r), 3.2, a.frame)) : mg(e, t, l, h(r + 1.4), 0.5, 0.35, i);
    if (y !== `hip` || !x) {
      let n = lg(t, 0.3 + ag(o, 47) * 0.16, [l[0] + (ag(o, 48) - 0.5) * 5, l[1] + (ag(o, 49) - 0.5) * 5]),
        i = 3.5 + ag(o, 50) * 3;
      dg(e, n, h(r), h(r + i), {
        mat: 0,
        col: a.frame
      }), fg(e, n, h(r + i), u), gg(e, t, l, h(r), o, 1 + Math.floor(ag(o, 51) * 3), a.tank);
    }
    m(t, h(g), h(r));
    return;
  }
  let _ = t,
    v = g,
    y = a.podium && u > 900 ? a.podium : 0;
  y > 0 && (dg(e, t, h(g), h(6), {
    mat: 2,
    col: a.frame,
    col2: [0.1, 0.14, 0.18],
    p: [4.2, 6, 3]
  }), dg(e, t, h(6), h(y), a.podStyle === 1 ? {
    mat: 2,
    col: a.frame,
    col2: a.glass,
    p: [2.1, 4.5, 0]
  } : a.podStyle === 2 ? {
    mat: 2,
    col: a.frame,
    col2: [0.11, 0.15, 0.2],
    p: [3.3, 4.5, 2]
  } : {
    mat: 1,
    col: a.frame,
    p: [3, 1.5, 0]
  }), a.auto && ag(o, 52) < 0.5 && vg(e, t, h(4.4), h(5.8), o), dg(e, t, h(y), h(y + 1.2), {
    mat: 0,
    col: a.frame
  }), mg(e, t, l, h(6), 1.6, 0.4, f), fg(e, t, h(y), p), m(t, h(g), h(y)), _ = lg(t, a.inset || 0.85, l), v = y);
  let b = a.crown || `flat`,
    x = b === `steps` ? a.stepH ? r * a.stepH : Math.min(r * 0.16, 9 * (a.tiers || 2)) : b === `flat` ? 0 : Math.min(a.crownH || 8, r * 0.15),
    S = r - x,
    C = v + (y > 0 ? 0 : 9);
  y === 0 && (dg(e, ug(_, 0.8, l), h(g), h(C), {
    mat: 2,
    col: a.frame,
    col2: [0.1, 0.15, 0.2],
    p: [3, 9, 3]
  }), fg(e, _, h(C), {
    mat: 0,
    col: f
  }), mg(e, _, l, h(C), 1.2, 0.5, a.frame));
  let w = r > 170 ? 2 : +(r > 95),
    T = [C];
  for (let e = 1; e <= w; e++) {
    let t = C + (S - C) * e / (w + 1);
    T.push(t, t + 4.4);
  }
  T.push(S);
  for (let t = 0; t < T.length - 1; t++) {
    let n = T[t],
      r = T[t + 1];
    t % 2 == 0 ? (dg(e, _, h(n), h(r), d), t > 0 && fg(e, _, h(n), {
      mat: 0,
      col: f
    }), t < T.length - 2 && fg(e, _, h(r), {
      mat: 0,
      col: f
    })) : dg(e, ug(_, 0.7, l), h(n), h(r), {
      mat: 1,
      col: [0.5, 0.53, 0.56],
      p: [3, 0.7, 1]
    });
  }
  if (a.arche === `fin` && pg(e, _, h(C), h(S + (b === `screen` ? x : 0)), a.finGap || 3, 0.38, 0.55, {
    mat: 0,
    col: a.frame
  }), a.arche === `steel` && pg(e, _, h(C), h(S + 1.5), 8.6, 1.5, 0.9, {
    mat: 1,
    col: a.frame,
    p: [6, 4.5, 0]
  }), a.arche === `louvre`) for (let t = C + (a.floorH || 4.2) * 3; t < S - 3; t += (a.floorH || 4.2) * 3) mg(e, _, l, h(t), 0.5, 0.2, a.frame);
  if (a.arche === `slot` && pg(e, _, h(C), h(S), (a.cell || [3, 3.9])[0] * 3.2, 0.7, 0.5, {
    mat: 0,
    col: a.frame
  }, 9), a.arche === `grid` && pg(e, _, h(C), h(S + 1), 1e6, 1.2, 0.45, {
    mat: 1,
    col: f,
    p: [4, 4.2, 0]
  }, 10), a.arche === `band`) for (let t = C + 4.2 * 6; t < S - 4; t += 4.2 * 6) mg(e, _, l, h(t), 0.45, 0.35, a.frame);
  a.corner && pg(e, _, h(C), h(r), 1e6, 1.8, 0.5, {
    mat: 1,
    col: a.frame,
    p: [6, 4.2, 0]
  });
  let E = r,
    D = lg(_, 0.3, l);
  if (b === `screen`) {
    fg(e, _, h(S), p), dg(e, _, h(S), h(r), {
      mat: 2,
      col: a.frame,
      col2: a.glass,
      p: [a.mull || 1.5, x, 3]
    }), mg(e, _, l, h(r), 0.3, 0.4, a.frame);
    let t = lg(_, 0.5, l);
    dg(e, t, h(S), h(S + x * 0.7), {
      mat: 1,
      col: [0.62, 0.64, 0.66],
      p: [2.4, 0.6, 1]
    }), fg(e, t, h(S + x * 0.7), p);
  } else if (b === `steps`) {
    let t = _,
      n = S,
      r = a.tiers || 2;
    for (let i = 0; i < r; i++) {
      fg(e, t, h(n), p), dg(e, t, h(n), h(n + 1.1), {
        mat: 0,
        col: a.frame
      }), t = lg(t, 0.8, l);
      let o = n + x / r;
      dg(e, t, h(n), h(o), i === r - 1 ? {
        mat: 1,
        col: a.frame,
        p: [2.4, 0.7, 1]
      } : d), n = o;
    }
    fg(e, t, h(n), p), D = lg(t, 0.25, l);
  } else if (b === `slope`) {
    let t = 1,
      n = 0,
      r = 0;
    for (let e = 0; e < _.length; e++) {
      let i = _[e],
        a = _[(e + 1) % _.length],
        o = Math.hypot(a[0] - i[0], a[1] - i[1]);
      o > r && (r = o, t = (a[0] - i[0]) / o, n = (a[1] - i[1]) / o);
    }
    ag(o, 21) < 0.5 && (t = -t, n = -n);
    let i = 1 / 0,
      s = -1 / 0;
    for (let e of _) {
      let r = e[0] * t + e[1] * n;
      i = Math.min(i, r), s = Math.max(s, r);
    }
    let c = e => h(S + 1.5 + (x - 1.5) * ((e[0] * t + e[1] * n - i) / (s - i)));
    dg(e, _, h(S), c, {
      mat: 2,
      col: a.frame,
      col2: a.glass,
      p: [a.mull || 1.5, 4.2, 3]
    }), fg(e, _, c, {
      mat: 1,
      col: a.frame.map(e => e * 0.92),
      p: [3, 3, 0]
    }), E = S + x * 0.5;
  } else if (b === `frame`) {
    fg(e, _, h(S), p), dg(e, _, h(S), h(S + 1.4), {
      mat: 0,
      col: a.frame
    }), bg(e, ug(_, -0.6, l), l, h(S), x, a.frame), pg(e, _, h(S), h(r), 4.2, 0.4, 0.2, {
      mat: 0,
      col: a.frame
    }, 8);
    let t = lg(_, 0.5, l);
    dg(e, t, h(S), h(S + x * 0.75), {
      mat: 1,
      col: [0.62, 0.64, 0.66],
      p: [2.4, 0.6, 1]
    }), fg(e, t, h(S + x * 0.75), p);
  } else if (b === `hat`) {
    dg(e, ug(_, 1.2, l), h(S), h(r - 1.5), {
      mat: 2,
      col: f,
      col2: a.glass,
      p: [1.5, x, 3]
    }), mg(e, _, l, h(r - 0.75), 1.6, 1.5, a.frame), fg(e, _, h(S), p);
    let t = lg(_, 0.4, l);
    dg(e, t, h(r), h(r + 4), {
      mat: 1,
      col: [0.62, 0.64, 0.66],
      p: [2.4, 0.6, 1]
    }), fg(e, t, h(r + 4), p);
  } else {
    fg(e, _, h(r), p), dg(e, _, h(r), h(r + 1.6), {
      mat: 0,
      col: a.frame
    }), mg(e, _, l, h(r + 1.6), 0.25, 0.3, a.frame);
    let t = lg(_, 0.45, [l[0] + (ag(o, 31) - 0.5) * 6, l[1] + (ag(o, 32) - 0.5) * 6]);
    dg(e, t, h(r), h(r + 5.5), {
      mat: 1,
      col: [0.62, 0.64, 0.66],
      p: [2.4, 0.6, 1]
    }), fg(e, t, h(r + 5.5), p), E = r + 5.5, D = lg(t, 0.3, l);
  }
  if (a.auto && ((b === `flat` || b === `screen`) && gg(e, _, l, h(b === `flat` ? r : S), o, a.clutter || 2, !1), a.sign && b !== `slope` && _g(e, ug(_, 0.4, l), h(r - 1), o, ig[Math.floor(ag(o, 53) * ig.length) % ig.length], 3.2 + ag(o, 54) * 2.5)), a.mast) {
    let t = cg(D);
    e.strut([t[0], h(E), t[1]], [t[0], h(E + a.mast), t[1]], 0.9, {
      mat: 0,
      col: [0.85, 0.86, 0.88]
    }), e.strut([t[0], h(E + a.mast), t[1]], [t[0], h(E + a.mast + 1.2), t[1]], 0.5, {
      mat: 0,
      col: [0.85, 0.2, 0.15]
    });
  }
  m(_, h(v), h(r));
}

var Cg = 24,
  wg = 400,
  Tg = /铁塔|埃菲尔|金字塔|凯旋门/,
  Eg = class {
    constructor(e, t = new Set()) {
      this.extraSigns = [], this.city = e, this.entries = new Map(), this.keyOf = new Map(), this.skip = new Set(), this.colliders = [], this.report = [], this.showTargets = [], this.detail = new Map(), this.tris = 0;
      let n = {
        stub: !0,
        quad() {},
        strut() {},
        box() {},
        prism() {}
      };
      e.buildings.forEach((e, r) => {
        let [i, a, o, s, c] = e;
        if (t.has(r)) {
          this.skip.add(r);
          return;
        }
        if (i === 2 || a < Cg || e[5] && Tg.test(e[5])) return;
        let l = c[0],
          u = [];
        for (let e = 0; e < l.length; e += 2) u.length && Math.hypot(l[e] - u[u.length - 1][0], l[e + 1] - u[u.length - 1][1]) < 0.05 || u.push([l[e], l[e + 1]]);
        if (u.length > 3 && Math.hypot(u[0][0] - u[u.length - 1][0], u[0][1] - u[u.length - 1][1]) < 0.05 && u.pop(), u.length < 3) return;
        let d = Math.abs(sg(u));
        if (d < 120) return;
        let f = cg(u),
          p = null,
          m = 14;
        for (let e of Qh) {
          let t = Math.hypot(e.at[0] - f[0], e.at[1] - f[1]);
          t < m && (m = t, p = e);
        }
        let h = p || og(i, a, s, d, f[0], f[1], u.length),
          g = 1 / 0;
        for (let e of u) g = Math.min(g, $(e[0], e[1]));
        let _ = p && p.name || e[5] || ``,
          v = Math.floor(f[0] / wg) + `,` + Math.floor(f[1] / wg),
          y = {
            ring: u,
            base: g,
            h: a,
            minH: o,
            spec: h,
            seed: s,
            name: _
          };
        if (y.show = h.arche !== `resi` && h.arche !== `mall` && !!(h.name || a >= 150), y.show) {
          let e = 0;
          for (let t of u) e = Math.max(e, Math.hypot(t[0] - f[0], t[1] - f[1]));
          this.showTargets.push({
            x: f[0],
            z: f[1],
            R: e + 3,
            h: a,
            base: g,
            name: _
          });
        }
        this.entries.has(v) || this.entries.set(v, {
          cx: (Math.floor(f[0] / wg) + 0.5) * wg,
          cz: (Math.floor(f[1] / wg) + 0.5) * wg,
          list: []
        }), this.entries.get(v).list.push(y), this.keyOf.set(r, v), this.skip.add(r), Sg(n, u, g, a, o, h, s, this.colliders, _), this.report.push({
          name: _ || ``,
          osmName: e[5] || ``,
          h: a,
          kind: i,
          x: Math.round(f[0]),
          z: Math.round(f[1]),
          arche: h.arche,
          crown: h.crown || `-`,
          named: !!p
        });
      });
    }
    attach(e, t, n) {
      this.scene = e, this.far = t, this.onChange = n || (() => {}), this.group = new Group(), e.add(this.group, t.group);
    }
    buildTile(e) {
      let t = this.entries.get(e),
        n = new Ap(),
        r = [];
      for (let e of t.list) {
        let t = e.show,
          i = 1 / 0,
          a = -1 / 0,
          o = 1 / 0,
          s = -1 / 0;
        for (let t of e.ring) i = Math.min(i, t[0]), a = Math.max(a, t[0]), o = Math.min(o, t[1]), s = Math.max(s, t[1]);
        let c = Math.max(6, Math.min(14, 0.34 * Math.min(a - i, s - o)));
        n.fxBase = t ? [1 + 0.05 * (Math.floor(ag(e.seed, 88) * 8) % 8), c] : [0, ag(e.seed, 77)], n.fx = n.fxBase, Sg(n, e.ring, e.base, e.h, e.minH, e.spec, e.seed, r, e.name);
      }
      let i = n.build(),
        a = new Mesh(i, Mp());
      return a.renderOrder = 5, a.layers.enable(1), this.tris += i.index.count / 3, {
        mesh: a,
        tris: i.index.count / 3
      };
    }
    update(e) {
      let t = Math.min(3400, 2100 + Math.max(0, e.y) * 1),
        n = null,
        r = 1 / 0,
        i = 0;
      for (let [a, o] of this.entries) {
        let s = Math.hypot(o.cx - e.x, o.cz - e.z),
          c = this.detail.get(a);
        if (s < t) c || (i++, s < r && (r = s, n = a));else if (c && s > t + 600) {
          this.group.remove(c.mesh), c.mesh.geometry.dispose(), this.tris -= c.tris, this.detail.delete(a);
          let e = this.far.byKey.get(a);
          e && (e.visible = !0);
        }
      }
      let a = 0;
      for (; n && a < (this.fast ? 1e3 : 1);) {
        let o = this.buildTile(n);
        this.detail.set(n, o), this.group.add(o.mesh);
        let s = this.far.byKey.get(n);
        if (s && (s.visible = !1), a++, i--, n = null, this.fast) {
          r = 1 / 0;
          for (let [i, a] of this.entries) {
            if (this.detail.has(i)) continue;
            let o = Math.hypot(a.cx - e.x, a.cz - e.z);
            o < t && o < r && (r = o, n = i);
          }
        }
      }
      return a && this.onChange(), i;
    }
  },
  Dg = `#2a8cff`,
  Og = `#e8262a`,
  kg = `#f2f6ff`,
  Ag = `#f26a21`,
  jg = `#f0c060`,
  Mg = [{
    at: [-11240, 316],
    name: `创维半导体设计大厦东座`,
    parts: [[`SKYWORTH `, Dg], [`创维`, kg]],
    aliases: [`创维半导体大厦`, `创维半导体设计大厦`, `创维`, `SKYWORTH`, `创维东座`]
  }, {
    at: [-11350, 349],
    name: `创维半导体设计大厦西座`,
    parts: [[`SKYWORTH `, Dg], [`创维`, kg]],
    aliases: [`创维半导体大厦`, `创维半导体设计大厦`, `创维`, `SKYWORTH`, `创维西座`]
  }, {
    at: [-11137, 85],
    name: `德赛科技大厦`,
    parts: [[`DESAY`, Dg]],
    italic: !0,
    aliases: [`德赛`, `DESAY`]
  }, {
    at: [-10884, 86],
    name: `康佳研发大厦`,
    parts: [[`KONKA `, Og], [`康佳`, Og]],
    aliases: [`康佳`, `KONKA`]
  }, {
    at: [-10797, 219],
    name: `长虹科技大厦`,
    parts: [[`CHANGHONG `, Dg], [`长虹`, Dg]],
    aliases: [`长虹`, `CHANGHONG`]
  }, {
    at: [-11001, 86],
    name: `飞亚达科技大厦`,
    parts: [[`FIYTA `, kg], [`飞亚达`, kg]],
    aliases: [`飞亚达`, `FIYTA`]
  }, {
    at: [2136, -391],
    name: `飞亚达大厦`,
    parts: [[`FIYTA `, kg], [`飞亚达`, kg]],
    aliases: [`飞亚达`, `FIYTA`]
  }, {
    at: [-13188, -39],
    name: `腾讯大厦`,
    parts: [[`Tencent`, Dg]],
    italic: !0,
    aliases: [`腾讯`, `Tencent`, `腾讯总部`, `腾讯大厦老楼`]
  }, {
    at: [-13093, 1957],
    name: `腾讯滨海大厦`,
    parts: [[`Tencent`, kg]],
    italic: !0,
    aliases: [`腾讯滨海`, `滨海大厦`, `腾讯新总部`, `Tencent Binhai`]
  }, {
    at: [-11956, 2818],
    name: `华润总部大厦（春笋）`,
    parts: [[`华润`, jg]],
    aliases: [`春笋`, `华润总部`, `华润总部大厦`, `中国华润大厦`, `华润大厦`]
  }, {
    at: [-11300, -171],
    name: `华润置地大厦E座`,
    parts: [[`华润置地`, jg]],
    aliases: [`华润置地`, `华润`]
  }, {
    at: [4904, -74],
    name: `华润大厦（罗湖）`,
    parts: [[`华润`, jg]],
    aliases: [`华润大厦`, `华润`]
  }, {
    at: [-738, 1020],
    name: `平安财险大厦`,
    parts: [[`PING AN `, Ag], [`中国平安`, Ag]],
    aliases: [`平安财险`, `中国平安`, `平安`]
  }, {
    at: [-1076, 454],
    name: `招商证券大厦`,
    parts: [[`招商证券`, Og]],
    aliases: [`招商证券`, `招商`]
  }, {
    at: [-1083, -55],
    name: `招商银行深圳分行大厦`,
    parts: [[`招商银行`, Og]],
    aliases: [`招商银行`, `招行`, `招商`]
  }, {
    at: [3210, 57],
    name: `中信国际大厦`,
    parts: [[`CITIC `, Og], [`中信`, Og]],
    aliases: [`中信`, `CITIC`]
  }, {
    at: [-1291, 531],
    name: `中信银行大厦`,
    parts: [[`中信银行`, Og]],
    aliases: [`中信银行`, `中信`]
  }, {
    at: [2106, -101],
    name: `交通银行大厦`,
    parts: [[`交通银行`, Dg]],
    aliases: [`交通银行`, `交行`]
  }, {
    at: [4321, -626],
    name: `国信证券大厦`,
    parts: [[`国信证券`, Dg]],
    aliases: [`国信证券`, `国信`]
  }, {
    at: [-3818, 1147],
    name: `万科滨海置地大厦`,
    parts: [[`万科`, Og]],
    aliases: [`万科`, `vanke`]
  }, {
    at: [-12699, 3049],
    name: `中海油大厦A座`,
    parts: [[`中国海油`, Og]],
    aliases: [`中海油`, `中国海油`, `CNOOC`]
  }, {
    at: [-12725, 3150],
    name: `中海油大厦B座`,
    parts: [[`中国海油`, Og]],
    aliases: [`中海油`, `中国海油`, `CNOOC`]
  }, {
    at: [821, -1759],
    name: `深业上城大厦2`,
    parts: [[`深业上城`, jg]],
    aliases: [`深业上城`, `UpperHills`]
  }, {
    at: [-8264, 616],
    name: `华侨城大厦`,
    parts: [[`华侨城`, Og]],
    aliases: [`华侨城`, `OCT`]
  }, {
    at: [-3668, 1327],
    name: `京基·滨河时代广场`,
    parts: [[`京基`, jg]],
    aliases: [`京基滨河时代`, `京基`]
  }, {
    at: [-1197, 578],
    name: `中国人寿大厦`,
    parts: [[`中国人寿`, `#22a860`]],
    aliases: [`中国人寿`, `国寿`]
  }, {
    at: [-1093, -182],
    name: `深圳建设银行大厦`,
    parts: [[`中国建设银行`, Dg]],
    aliases: [`建设银行`, `建行`]
  }, {
    at: [4441, 88],
    name: `中国建设银行大厦`,
    parts: [[`中国建设银行`, Dg]],
    aliases: [`建设银行`, `建行`]
  }, {
    at: [4397, 64],
    name: `工商银行大厦`,
    parts: [[`中国工商银行`, Og]],
    aliases: [`工商银行`, `工行`]
  }, {
    at: [-768, -195],
    name: `太平金融大厦`,
    parts: [[`中国太平`, Dg]],
    aliases: [`中国太平`, `太平`]
  }, {
    at: [-1299, 455],
    name: `安信金融大厦`,
    parts: [[`安信证券`, Ag]],
    aliases: [`安信证券`, `安信`]
  }, {
    at: [-12462, -56],
    name: `海王银河科技大厦`,
    parts: [[`海王`, Dg]],
    aliases: [`海王`]
  }, {
    at: [-12540, 3740],
    name: `天虹总部大厦`,
    parts: [[`天虹`, Og]],
    aliases: [`天虹`, `Rainbow`]
  }, {
    at: [85, 183],
    name: `金地中心`,
    parts: [[`金地集团`, Og]],
    aliases: [`金地`]
  }, {
    at: [72, 343],
    name: `中洲大厦`,
    parts: [[`中洲`, jg]],
    aliases: [`中洲`]
  }],
  Ng = `"Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif`,
  Pg = new Map();

function Fg(e) {
  let t = JSON.stringify(e.parts) + (e.italic ? `i` : ``);
  if (Pg.has(t)) return Pg.get(t);
  let n = document.createElement(`canvas`),
    r = n.getContext(`2d`),
    i = t => `${e.italic ? `italic ` : ``}900 ${/[^\x00-\x7f]/.test(t) ? 104 : 110}px ${Ng}`,
    a = 0,
    o = [];
  for (let [t] of e.parts) {
    r.font = i(t);
    let e = r.measureText(t).width;
    o.push(e), a += e;
  }
  n.width = Math.ceil(a + 92), n.height = 160, r = n.getContext(`2d`), r.textBaseline = `middle`, r.textAlign = `left`;
  for (let t of [0, 1]) {
    let n = 46;
    e.parts.forEach(([e, a], s) => {
      r.font = i(e), r.fillStyle = a, t === 0 ? (r.shadowColor = a, r.shadowBlur = 22, r.globalAlpha = 0.5) : (r.shadowBlur = 0, r.globalAlpha = 1), r.fillText(e, n, 160 * 0.53), n += o[s];
    });
  }
  let s = new CanvasTexture(n);
  s.generateMipmaps = !0, s.minFilter = LinearMipmapLinearFilter, s.anisotropy = 8;
  let c = {
    tex: s,
    aspect: n.width / n.height
  };
  return Pg.set(t, c), c;
}

function Ig(e) {
  return new ShaderMaterial({
    uniforms: _d({
      uLogo: {
        value: e
      }
    }),
    polygonOffset: !0,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: `varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
      void main(){ vUv = uv; vN = normal; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      ${bd}
      uniform sampler2D uLogo;
      varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
      void main(){
        vec4 t = texture2D(uLogo, vUv);
        float letter = smoothstep(0.62, 0.86, t.a);
        float halo = t.a * (1.0 - letter);
        vec3 n = normalize(vN);
        float sh = sunShadow(vWorld, n);
        // 招牌带：深色铝板；白天字是品牌色的金属字，夜里自发光
        vec3 band = lightLin(vec3(0.020, 0.024, 0.032), n, sh, 1.0);
        vec3 dayLetter = lightLin(toLin(mix(t.rgb, vec3(0.9), 0.18)), n, sh, 1.0) * 1.05 + 0.04;
        vec3 nightLetter = mix(t.rgb, vec3(1.0), 0.28) * 1.22;
        vec3 col = mix(band, mix(dayLetter, nightLetter, uNight), letter);
        col += t.rgb * halo * 1.5 * uNight;
        gl_FragColor = vec4(atmo(col, vWorld), 1.0);
      }`
  });
}

function Lg(e) {
  let t = null;
  for (let n = 0; n < e.length; n++) {
    let r = e[n],
      i = e[(n + 1) % e.length],
      a = Math.hypot(i[0] - r[0], i[1] - r[1]);
    if (a < 0.5) continue;
    let o = (i[0] - r[0]) / a,
      s = (i[1] - r[1]) / a,
      c = 1 / 0,
      l = -1 / 0,
      u = 1 / 0,
      d = -1 / 0;
    for (let t of e) {
      let e = t[0] * o + t[1] * s,
        n = -t[0] * s + t[1] * o;
      c = Math.min(c, e), l = Math.max(l, e), u = Math.min(u, n), d = Math.max(d, n);
    }
    let f = (l - c) * (d - u);
    (!t || f < t.A) && (t = {
      A: f,
      ux: o,
      uz: s,
      u0: c,
      u1: l,
      v0: u,
      v1: d
    });
  }
  let {
      ux: n,
      uz: r,
      u0: i,
      u1: a,
      v0: o,
      v1: s
    } = t,
    c = (i + a) / 2,
    l = (o + s) / 2;
  return {
    c: [c * n - l * r, c * r + l * n],
    ax: [n, r],
    L: a - i,
    W: s - o
  };
}

function Rg(e, t) {
  let n = new Group(),
    r = [],
    i = [],
    a = [];
  for (let e of t.entries.values()) for (let t of e.list) a.push(t);
  for (let e of t.extraSigns || []) a.push(e);
  for (let e of Mg) {
    let t = null,
      o = 30;
    for (let n of a) {
      let r = 0,
        i = 0;
      for (let e of n.ring) r += e[0], i += e[1];
      r /= n.ring.length, i /= n.ring.length;
      let a = Math.hypot(r - e.at[0], i - e.at[1]);
      a < o && (o = a, t = n, t._c = [r, i]);
    }
    if (!t) {
      i.push(e.name);
      continue;
    }
    t.spec = {
      ...t.spec,
      sign: !1
    };
    let {
        ring: s,
        top: c
      } = xg(t),
      l = Lg(s),
      {
        tex: u,
        aspect: d
      } = Fg(e),
      f = Ig(u),
      p = t.h,
      m = Math.max(6, Math.min(13, 0.065 * p + 2)),
      h = t.base + c - 1.2,
      g = [],
      _ = [],
      v = [],
      y = [],
      b = [[l.ax[0], l.ax[1], l.W / 2, l.L], [-l.ax[0], -l.ax[1], l.W / 2, l.L], [-l.ax[1], l.ax[0], l.L / 2, l.W], [l.ax[1], -l.ax[0], l.L / 2, l.W]];
    for (let [e, n, r, i] of t.longOnly ? b.slice(0, 2) : b) {
      if (i < 14) continue;
      let t = -n,
        a = e,
        o = m * d,
        s = m;
      o > i * 0.94 && (o = i * 0.94, s = o / d);
      let c = l.c[0] + t * (r + 0.9),
        u = l.c[1] + a * (r + 0.9),
        f = a,
        p = -t,
        b = g.length / 3;
      for (let [e, n] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) g.push(c + f * e * o / 2, h - s + n * s, u + p * e * o / 2), _.push(t, 0, a), v.push(e * 0.5 + 0.5, n);
      y.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    if (!g.length) {
      i.push(e.name + `（立面太窄）`);
      continue;
    }
    let x = new BufferGeometry();
    x.setAttribute(`position`, new Float32BufferAttribute(g, 3)), x.setAttribute(`normal`, new Float32BufferAttribute(_, 3)), x.setAttribute(`uv`, new Float32BufferAttribute(v, 2)), x.setIndex(y), x.computeBoundingSphere();
    let S = new Mesh(x, f);
    S.renderOrder = 7, n.add(S), r.push({
      name: e.name,
      aliases: e.aliases || [],
      x: t._c[0],
      z: t._c[1],
      h: t.base + p,
      logo: e.parts.map(e => e[0]).join(``).trim(),
      signs: y.length / 6
    });
  }
  return i.length && console.warn(`[futian] 企业字标：这些楼没有匹配到足迹`, i), {
    group: n,
    list: r,
    missing: i
  };
}

function zg(e) {
  let t = null;
  for (let n = 0; n < e.length; n++) {
    let r = e[n],
      i = e[(n + 1) % e.length],
      a = Math.hypot(i[0] - r[0], i[1] - r[1]);
    if (a < 0.5) continue;
    let o = (i[0] - r[0]) / a,
      s = (i[1] - r[1]) / a,
      c = 1 / 0,
      l = -1 / 0,
      u = 1 / 0,
      d = -1 / 0;
    for (let t of e) {
      let e = t[0] * o + t[1] * s,
        n = -t[0] * s + t[1] * o;
      c = Math.min(c, e), l = Math.max(l, e), u = Math.min(u, n), d = Math.max(d, n);
    }
    let f = l - c,
      p = d - u,
      m = [o, s],
      h = (c + l) / 2,
      g = (u + d) / 2,
      _ = [h * o - g * s, h * s + g * o];
    if (p > f) {
      m = [-s, o];
      let e = f;
      f = p, p = e;
    }
    (!t || f * p < t.L * t.W) && (t = {
      c: _,
      ax: m,
      L: f,
      W: p
    });
  }
  return t;
}

var Bg = (e, t, n, r, i) => {
    let a = e.map(e => new Vector2(e[0], e[1])),
      o = e.map(e => e[0]),
      s = e.map(e => e[1]);
    return {
      rings: [a],
      minX: Math.min(...o),
      maxX: Math.max(...o),
      minZ: Math.min(...s),
      maxZ: Math.max(...s),
      bottom: t,
      top: n,
      name: r,
      h: i
    };
  },
  Vg = e => {
    let t = new Mesh(e.build(), Mp());
    return t.renderOrder = 5, t;
  };

function Hg(e) {
  let t = 193.2,
    n = 7.5,
    r = zg(e),
    i = $(r.c[0], r.c[1]),
    [a, o] = r.ax,
    s = -o,
    c = a,
    l = r.L / 2,
    u = r.W / 2,
    d = (e, t) => [r.c[0] + a * e + s * t, r.c[1] + o * e + c * t],
    f = e => 196.7 + 10 * ((e + l) / (2 * l)),
    p = [];
  p.push({
    u: -(l - n),
    v: u,
    long: !0
  }), p.push({
    u: l - n,
    v: u
  });
  for (let e = 1; e < 7; e++) {
    let t = Math.PI / 2 - e / 7 * Math.PI;
    p.push({
      u: l - n + Math.cos(t) * n,
      v: Math.sin(t) * u
    });
  }
  p.push({
    u: l - n,
    v: -u,
    long: !0
  }), p.push({
    u: -(l - n),
    v: -u
  });
  for (let e = 1; e < 7; e++) {
    let t = -Math.PI / 2 - e / 7 * Math.PI;
    p.push({
      u: -(l - n) + Math.cos(t) * n,
      v: Math.sin(t) * u
    });
  }
  let m = new Ap(),
    h = [0.36, 0.42, 0.42],
    g = [0.15, 0.26, 0.27],
    _ = [0.16, 0.21, 0.21],
    v = [0.06, 0.08, 0.08],
    y = e => i + e;
  for (let e = 0; e < p.length; e++) {
    let t = p[e],
      n = p[(e + 1) % p.length],
      r = d(t.u, t.v),
      i = d(n.u, n.v);
    if (t.long) {
      let e = t.v > 0 ? 1 : -1;
      m.quad([r[0], y(12), r[1]], [i[0], y(12), i[1]], [i[0], y(f(n.u)), i[1]], [r[0], y(f(t.u)), r[1]], {
        mat: 2,
        col: h,
        col2: g,
        p: [1.5, 4.65, 8],
        fx: [1.05, 11]
      }, [[t.u * e - 13, 12], [n.u * e - 13, 12], [n.u * e - 13, f(n.u)], [t.u * e - 13, f(t.u)]]);
      let a = d(-0.7, t.v + e * 0.12),
        o = d(0.7, t.v + e * 0.12);
      m.quad([a[0], y(12), a[1]], [o[0], y(12), o[1]], [o[0], y(187.2), o[1]], [a[0], y(187.2), a[1]], {
        mat: 0,
        col: v,
        fx: [0, 0]
      });
    } else m.quad([r[0], y(0), r[1]], [i[0], y(0), i[1]], [i[0], y(f(n.u)), i[1]], [r[0], y(f(t.u)), r[1]], {
      mat: 1,
      col: _,
      p: [3, 0.85, 1],
      fx: [0, 0]
    });
  }
  let b = [d(-(l - n), u - 1.2), d(l - n, u - 1.2), d(l - n, -u + 1.2), d(-(l - n), -u + 1.2)];
  m.prism(b, y(-1.5), y(12), {
    mat: 2,
    col: [0.7, 0.72, 0.72],
    col2: [0.1, 0.15, 0.17],
    p: [3, 12, 3],
    fx: [0, 0]
  }, {
    cap: !1
  });
  let x = p.map(e => d(e.u, e.v)),
    S = [d(-l + 1, u - 0.4), d(l - 1, u - 0.4), d(l - 1, -u + 0.4), d(-l + 1, -u + 0.4)];
  m.prism(S, y(11.5), y(12), {
    mat: 0,
    col: h,
    fx: [0, 0]
  }, {
    bottom: !0
  }), m.prism(S, y(192.7), y(t), {
    mat: 0,
    col: [0.4, 0.42, 0.43],
    fx: [0, 0]
  }, {
    capO: {
      mat: 3,
      col: [0.5, 0.52, 0.53],
      p: [3, 3]
    }
  }), m.prism([d(-10, 6), d(10, 6), d(10, -6), d(-10, -6)], y(t), y(199.2), {
    mat: 1,
    col: [0.5, 0.52, 0.54],
    p: [2.4, 0.6, 1],
    fx: [0, 0]
  });
  let C = [Bg(x, i - 1.5, i + t + 4, `腾讯大厦`, t)];
  return {
    mesh: Vg(m),
    colliders: C,
    obb: r,
    base: i,
    H: t,
    target: {
      x: r.c[0],
      z: r.c[1],
      R: l + 4,
      h: t,
      base: i,
      name: `腾讯大厦`
    },
    signEntry: {
      ring: [d(-(l - n), u), d(l - n, u), d(l - n, -u), d(-(l - n), -u)],
      h: 196.2,
      base: i,
      spec: {
        arche: `mall`
      },
      longOnly: !0
    }
  };
}

function Ug(e, t, n, r, i, a, o, s, c) {
  let l = -n[1],
    u = n[0],
    d = (e, r) => [t[0] + n[0] * e + l * r, t[1] + n[1] * e + u * r],
    f = [d(-r / 2, i / 2), d(r / 2, i / 2), d(r / 2, -i / 2), d(-r / 2, -i / 2)];
  for (let t = 0; t < 4; t++) {
    let n = f[t],
      r = f[(t + 1) % 4];
    e.quad([n[0], a, n[1]], [r[0], a, r[1]], [r[0], o, r[1]], [n[0], o, n[1]], t % 2 == 0 ? s : c);
  }
  return e.quad([f[0][0], o, f[0][1]], [f[1][0], o, f[1][1]], [f[2][0], o, f[2][1]], [f[3][0], o, f[3][1]], {
    mat: 3,
    col: [0.42, 0.43, 0.44],
    p: [3, 3],
    fx: [0, 0]
  }), e.quad([f[0][0], a, f[0][1]], [f[1][0], a, f[1][1]], [f[2][0], a, f[2][1]], [f[3][0], a, f[3][1]], {
    mat: 0,
    col: [0.16, 0.15, 0.14],
    fx: [0, 0]
  }), f;
}

function Wg(e, t) {
  let n = 245.8,
    r = 194.8,
    i = e => {
      let t = 0,
        n = 0;
      for (let r of e) t += r[0], n += r[1];
      return [t / e.length, n / e.length];
    },
    a = i(e),
    o = i(t),
    s = Math.min($(a[0], a[1]), $(o[0], o[1])),
    c = new Ap(),
    l = e => s + e,
    u = [0.9, 0.92, 0.92],
    d = [0.26, 0.42, 0.48],
    f = [0.17, 0.16, 0.15],
    p = [0.72, 0.44, 0.24],
    m = [],
    h = (e, t, n, r) => {
      c.fx = [0, 0], c.prism(e, l(-1.5), l(10), {
        mat: 2,
        col: u,
        col2: [0.12, 0.18, 0.22],
        p: [3, 11.5, 3],
        wrapU: !0
      }, {
        cap: !1
      }), c.fx = [1 + 0.05 * r, 13], c.prism(e, l(10), l(t - 5), {
        mat: 2,
        col: u,
        col2: d,
        p: [1.5, 4.5, 0]
      }, {
        cap: !1
      }), c.fx = [0, 0], c.prism(e, l(t - 5), l(t), {
        mat: 2,
        col: u,
        col2: d,
        p: [1.5, 5, 3]
      }, {
        capO: {
          mat: 3,
          col: [0.5, 0.52, 0.53],
          p: [3, 3]
        }
      });
      let a = i(e),
        o = e.map(e => [a[0] + (e[0] - a[0]) * 0.5, a[1] + (e[1] - a[1]) * 0.5]);
      c.prism(o, l(t), l(t + 5), {
        mat: 1,
        col: [0.55, 0.57, 0.58],
        p: [2.4, 0.6, 1]
      }), m.push(Bg(e, s - 1.5, s + t, n, t));
    };
  h(e, n, `腾讯滨海大厦南塔`, 2), h(t, r, `腾讯滨海大厦北塔`, 4);
  let g = [o[0] - a[0], o[1] - a[1]],
    _ = Math.hypot(g[0], g[1]),
    v = [g[0] / _, g[1] / _],
    y = [-v[1], v[0]],
    b = [(a[0] + o[0]) / 2, (a[1] + o[1]) / 2],
    x = {
      mat: 1,
      col: f,
      p: [3, 0.9, 1],
      fx: [0, 0]
    },
    S = {
      mat: 2,
      col: p,
      col2: [0.2, 0.3, 0.34],
      p: [2.4, 4.5, 0],
      fx: [0, 0]
    };
  for (let [e, t, r, i, a] of [[0, 26, 0, _ + 20, 44], [96, 124, 9, _ + 46, 36], [152, 178, -8, _ + 40, 34]]) {
    let o = Ug(c, [b[0] + y[0] * r, b[1] + y[1] * r], v, i, a, l(e), l(t), x, S);
    for (let n of [[o[1], o[2]], [o[3], o[0]]]) for (let r of [e + 0.4, t - 0.4]) c.strut([n[0][0], l(r), n[0][1]], [n[1][0], l(r), n[1][1]], 1.1, {
      mat: 0,
      col: p,
      fx: [0, 0]
    });
    e > 0 && m.push(Bg(o, s + e, s + t, `腾讯滨海大厦`, n));
  }
  return {
    mesh: Vg(c),
    colliders: m,
    targets: [{
      x: a[0],
      z: a[1],
      R: 56,
      h: n,
      base: s,
      name: `腾讯滨海大厦南塔`
    }, {
      x: o[0],
      z: o[1],
      R: 50,
      h: r,
      base: s,
      name: `腾讯滨海大厦北塔`
    }],
    signEntry: {
      ring: e,
      h: n,
      base: s,
      spec: {
        arche: `mall`
      }
    },
    cS: a,
    cN: o,
    base: s,
    HS: n
  };
}

var Gg = {
    x0: -12425,
    x1: -12255,
    z0: -4190,
    z1: -4105
  },
  Kg = [{
    id: 1110477861,
    name: `南翼`,
    h: 157.5,
    minH: 31.5,
    ring: [[-12298.7, -4112], [-12264.7, -4112.7], [-12265.1, -4133.2], [-12271.7, -4133.1], [-12299.1, -4132.6]],
    cx: -12279.9,
    cz: -4124.7
  }, {
    id: 1110477862,
    name: ``,
    h: 211.6,
    minH: 0,
    ring: [[-12275.5, -4147.1], [-12275.9, -4165.9], [-12289.7, -4165.7], [-12289.3, -4146.8]],
    cx: -12282.6,
    cz: -4156.4
  }, {
    id: 1110477863,
    name: `东翼`,
    h: 180,
    minH: 40.5,
    ring: [[-12275.5, -4147.1], [-12272, -4147.2], [-12257.5, -4147.5], [-12258.2, -4183], [-12276.2, -4182.6], [-12275.9, -4165.9]],
    cx: -12269.2,
    cz: -4162.2
  }, {
    id: 1110477864,
    name: `西翼`,
    h: 198,
    minH: 45,
    ring: [[-12299.4, -4146.6], [-12320, -4146.2], [-12320.1, -4155.3], [-12320.1, -4156.4], [-12320.3, -4165.1], [-12299.7, -4165.5]],
    cx: -12313.3,
    cz: -4155.8
  }, {
    id: 1110477865,
    name: `西翼`,
    h: 166.5,
    minH: 36,
    ring: [[-12397.3, -4144.5], [-12400.6, -4144.5], [-12415.3, -4144.2], [-12416, -4177.5], [-12398, -4177.8], [-12397.7, -4163.6]],
    cx: -12404.1,
    cz: -4158.7
  }, {
    id: 1110477866,
    name: ``,
    h: 193.1,
    minH: 0,
    ring: [[-12397.3, -4144.5], [-12397.7, -4163.6], [-12383.3, -4163.8], [-12382.9, -4144.8]],
    cx: -12390.3,
    cz: -4154.2
  }, {
    id: 1110477867,
    name: `南翼`,
    h: 144,
    minH: 22.5,
    ring: [[-12370.8, -4110.1], [-12404.1, -4109.5], [-12404.5, -4129.7], [-12400.4, -4129.8], [-12371.2, -4130.4]],
    cx: -12390.2,
    cz: -4121.9
  }, {
    id: 1110477868,
    name: `东翼`,
    h: 180,
    minH: 40.5,
    ring: [[-12371.5, -4145], [-12352, -4145.4], [-12352.2, -4154.7], [-12352.2, -4155.8], [-12352.4, -4164.5], [-12371.9, -4164.1]],
    cx: -12358.7,
    cz: -4154.9
  }, {
    id: 1110959408,
    name: `天空之城连桥`,
    h: 117,
    minH: 103.5,
    ring: [[-12320.1, -4155.3], [-12320.1, -4156.4], [-12352.2, -4155.8], [-12352.2, -4154.7]],
    cx: -12336.2,
    cz: -4155.6
  }, {
    id: 1151596327,
    name: `南翼`,
    h: 157.5,
    minH: 0,
    ring: [[-12299.1, -4132.6], [-12271.7, -4133.1], [-12272, -4147.2], [-12275.5, -4147.1], [-12289.3, -4146.8], [-12299.4, -4146.6]],
    cx: -12284.5,
    cz: -4142.2
  }, {
    id: 1151596328,
    name: `西翼`,
    h: 198,
    minH: 0,
    ring: [[-12289.3, -4146.8], [-12299.4, -4146.6], [-12299.7, -4165.5], [-12289.7, -4165.7]],
    cx: -12294.5,
    cz: -4156.1
  }, {
    id: 1151596329,
    name: `东翼`,
    h: 180,
    minH: 0,
    ring: [[-12382.9, -4144.8], [-12371.5, -4145], [-12371.9, -4164.1], [-12383.3, -4163.8]],
    cx: -12377.4,
    cz: -4154.4
  }, {
    id: 1151596330,
    name: `南翼`,
    h: 144,
    minH: 0,
    ring: [[-12371.2, -4130.4], [-12400.4, -4129.8], [-12400.6, -4144.5], [-12397.3, -4144.5], [-12382.9, -4144.8], [-12371.5, -4145]],
    cx: -12387.3,
    cz: -4139.8
  }],
  qg = e => {
    let t = 0;
    for (let n = 0; n < e.length; n++) {
      let r = e[n],
        i = e[(n + 1) % e.length];
      t += r[0] * i[1] - i[0] * r[1];
    }
    return t / 2;
  },
  Jg = e => {
    let t = 0,
      n = 0;
    for (let r of e) t += r[0], n += r[1];
    return [t / e.length, n / e.length];
  },
  Yg = (e, t, n, r, i) => {
    let a = e.map(e => new Vector2(e[0], e[1])),
      o = e.map(e => e[0]),
      s = e.map(e => e[1]);
    return {
      rings: [a],
      minX: Math.min(...o),
      maxX: Math.max(...o),
      minZ: Math.min(...s),
      maxZ: Math.max(...s),
      bottom: t,
      top: n,
      name: r,
      h: i
    };
  },
  Xg = (e, t) => e > Gg.x0 && e < Gg.x1 && t > Gg.z0 && t < Gg.z1;

function Zg() {
  let e = new Ap(),
    t = [],
    n = [0.3, 0.31, 0.34],
    r = [0.105, 0.105, 0.12],
    i = [0.13, 0.13, 0.14],
    a = [0.7, 0.68, 0.63],
    o = [3, 0.1],
    s = $(-12336, -4150),
    c = e => s + e,
    l = Kg.filter(e => !e.name && e.minH === 0),
    u = Kg.filter(e => e.name && e.minH > 0 && !e.name.includes(`连桥`)),
    d = Kg.filter(e => e.name && e.minH === 0 && !e.name.includes(`连桥`)),
    f = Kg.find(e => e.name.includes(`连桥`));
  for (let i of l) {
    e.prism(i.ring, c(-1.5), c(i.h), {
      mat: 1,
      col: r,
      p: [1.25, 6, 2],
      wrapU: !0
    }, {
      capO: {
        mat: 0,
        col: [0.2, 0.2, 0.22]
      }
    });
    let o = Jg(i.ring);
    e.strut([o[0], c(i.h), o[1]], [o[0], c(i.h + 5), o[1]], 1.6, {
      mat: 0,
      col: n
    });
    let l = i.ring.map(e => e[0]),
      u = i.ring.map(e => e[1]);
    e.box(Math.min(...l) - 9, Math.max(...l) + 9, c(-1.5), c(7.5), Math.min(...u) - 9, Math.max(...u) + 9, {
      mat: 3,
      col: a,
      p: [2.4, 1.2]
    }, {
      capO: {
        mat: 3,
        col: [0.62, 0.61, 0.58],
        p: [2.4, 2.4]
      }
    }), t.push(Yg(i.ring, s - 1.5, s + i.h, `大疆天空之城`, i.h));
  }
  for (let n of d) {
    let r = null,
      a = 1e9;
    for (let e of u) {
      if (e.name !== n.name) continue;
      let t = Math.hypot(e.cx - n.cx, e.cz - n.cz);
      t < a && (a = t, r = e);
    }
    let o = r ? r.minH + 3 : 30;
    e.prism(n.ring, c(o), c(n.h - 2), {
      mat: 1,
      col: [0.12, 0.125, 0.14],
      p: [1.5, 4.5, 0],
      wrapU: !0
    }, {
      bottom: !0,
      capO: {
        mat: 0,
        col: i
      }
    }), t.push(Yg(n.ring, s + o, s + n.h - 2, `大疆天空之城`, n.h));
  }
  if (u.forEach((r, a) => {
    let l = qg(r.ring) < 0 ? r.ring.slice().reverse() : r.ring,
      u = r.h - r.minH,
      d = r.minH + u * [0.46, 0.52, 0.42, 0.5, 0.44, 0.54][a % 6],
      f = 4.2;
    for (let [a, u] of [[r.minH, d - f], [d + f, r.h]]) {
      e.prism(l, c(a), c(u), {
        mat: 2,
        col: [0.1, 0.105, 0.12],
        col2: [0.03, 0.045, 0.065],
        p: [1.5, 4.5, 0]
      }, {
        bottom: !0,
        capO: {
          mat: 0,
          col: i
        }
      });
      let d = Jg(l),
        f = l.map(e => [d[0] + (e[0] - d[0]) * 1.03, d[1] + (e[1] - d[1]) * 1.03]);
      e.prism(f, c(a - 1), c(a), {
        mat: 0,
        col: i
      }, {
        bottom: !0
      }), e.prism(f, c(u), c(u + 0.8), {
        mat: 0,
        col: n,
        fx: o
      }, {
        capO: {
          mat: 0,
          col: i
        }
      }), t.push(Yg(l, s + a - 1, s + u + 0.8, `大疆天空之城`, r.h));
      let p = l.length,
        m = 0.5;
      for (let t = 0; t < p; t++) {
        let r = l[t],
          i = l[(t + 1) % p],
          s = i[0] - r[0],
          d = i[1] - r[1],
          f = Math.hypot(s, d);
        if (f < 1) continue;
        let h = d / f * m,
          g = -s / f * m,
          _ = [r[0] + h, r[1] + g],
          v = [i[0] + h, i[1] + g],
          y = [(_[0] + v[0]) / 2, (_[1] + v[1]) / 2],
          b = {
            mat: 0,
            col: n,
            fx: o
          };
        if (e.strut([_[0], c(a), _[1]], [_[0], c(u), _[1]], 1, b), e.strut([_[0], c(a), _[1]], [v[0], c(a), v[1]], 0.9, b), f < 11) continue;
        let x = Math.min(17, (u - a) * 0.36);
        e.strut([_[0], c(u), _[1]], [y[0], c(u - x), y[1]], 1, b), e.strut([v[0], c(u), v[1]], [y[0], c(u - x), y[1]], 1, b), e.strut([y[0], c(u - x), y[1]], [y[0], c(a), y[1]], 0.8, b), e.strut([_[0], c(u - x), _[1]], [v[0], c(u - x), v[1]], 0.6, {
          mat: 0,
          col: n
        });
      }
    }
  }), f) {
    let n = f.ring,
      r = [];
    for (let e = 0; e < n.length; e++) {
      let t = n[e],
        i = n[(e + 1) % n.length];
      r.push([Math.hypot(i[0] - t[0], i[1] - t[1]), [(t[0] + i[0]) / 2, (t[1] + i[1]) / 2]]);
    }
    r.sort((e, t) => e[0] - t[0]);
    let i = r[0][1],
      a = r[1][1],
      l = a[0] - i[0],
      u = a[1] - i[1],
      d = Math.hypot(l, u),
      p = -u / d,
      m = l / d,
      h = f.minH + 1.5,
      g = [i[0] - l / d * 4, i[1] - u / d * 4],
      _ = [a[0] + l / d * 4, a[1] + u / d * 4],
      v = {
        mat: 0,
        col: [0.5, 0.52, 0.55],
        fx: o
      },
      y = [[g[0] + p * 1.3, g[1] + m * 1.3], [_[0] + p * 1.3, _[1] + m * 1.3], [_[0] - p * 1.3, _[1] - m * 1.3], [g[0] - p * 1.3, g[1] - m * 1.3]];
    e.prism(y, c(h - 0.35), c(h), {
      mat: 0,
      col: [0.45, 0.46, 0.48]
    }, {
      bottom: !0
    });
    for (let t of [-1, 1]) {
      let n = null;
      for (let r = 0; r <= 10; r++) {
        let i = r / 10,
          a = g[0] + (_[0] - g[0]) * i + p * 1.3 * t,
          o = g[1] + (_[1] - g[1]) * i + m * 1.3 * t,
          s = [a, c(h + 1.3 + 7.5 * (2 * i - 1) ** 2), o];
        n && e.strut(n, s, 0.22, v), r > 0 && r < 10 && e.strut([a, c(h), o], s, 0.1, v), e.strut([a, c(h), o], [a, c(h + 1.15), o], 0.07, {
          mat: 0,
          col: [0.5, 0.52, 0.55]
        }), n = s;
      }
      e.strut([g[0] + p * 1.3 * t, c(h + 1.15), g[1] + m * 1.3 * t], [_[0] + p * 1.3 * t, c(h + 1.15), _[1] + m * 1.3 * t], 0.08, {
        mat: 0,
        col: [0.5, 0.52, 0.55]
      });
    }
    t.push(Yg(y, s + h - 0.35, s + h, `天空之城连桥`, 117));
  }
  let p = new Mesh(e.build(), Mp());
  p.renderOrder = 5;
  let m = l.reduce((e, t) => e.cx > t.cx ? e : t),
    h = l.reduce((e, t) => e.cx < t.cx ? e : t);
  return {
    mesh: p,
    colliders: t,
    places: [{
      name: `大疆天空之城`,
      aliases: [`大疆`, `天空之城`, `DJI`, `DJI Sky City`, `Sky City`, `大疆总部`],
      x: (m.cx + h.cx) / 2,
      z: (m.cz + h.cz) / 2,
      h: s + m.h,
      pri: 9
    }, {
      name: `天空之城东塔`,
      aliases: [`大疆东塔`, `Sky City East Tower`],
      x: m.cx,
      z: m.cz,
      h: s + m.h,
      pri: 6
    }, {
      name: `天空之城西塔`,
      aliases: [`大疆西塔`, `Sky City West Tower`],
      x: h.cx,
      z: h.cz,
      h: s + h.h,
      pri: 6
    }]
  };
}

var Qg = e => e.toLowerCase().replace(/[\s·・,，.。()（）\-]/g, ``),
  $g = e => e.replace(/大厦|大楼|中心|广场|设计|科技|研发|总部|国际|深圳|中国/g, ``),
  e_ = (e, t = 0) => t < -2900 ? e < -9e3 ? t < -4800 || e < -14500 ? `宝安` : `南山` : e < 6500 ? t < -6500 ? `龙华` : e < -6466 ? `南山` : e > 4300 ? `罗湖` : `福田` : t < -9e3 ? `龙岗` : e > 13500 ? `盐田` : `龙岗` : e < -14500 ? `宝安` : e > 13500 ? `盐田` : e > 8500 ? `罗湖` : e < -6466 ? `南山` : e > 4300 ? `罗湖` : `福田`;

function t_(e) {
  let t = new Set(),
    n = [];
  for (let r of e) {
    if (!r.name) continue;
    let e = r.name + `|` + Math.round(r.x / 40) + `|` + Math.round(r.z / 40);
    if (t.has(e)) continue;
    t.add(e);
    let i = [r.name, ...(r.aliases || [])].map(Qg);
    n.push({
      ...r,
      keys: i,
      skeys: i.map($g),
      pri: r.pri || 0
    });
  }
  return n;
}

function n_(e, t, n) {
  let r = Qg(t);
  if (!r) return [];
  let i = $g(r),
    a = [];
  for (let t of e) {
    let e = 0;
    for (let n = 0; n < t.keys.length; n++) {
      let a = t.keys[n],
        o = t.skeys[n];
      if (a === r) e = Math.max(e, 100);else if (a.startsWith(r)) e = Math.max(e, 80);else if (a.includes(r)) e = Math.max(e, 62);else if (r.includes(a) && a.length >= 2) e = Math.max(e, 50);else if (i.length >= 2 && (o.includes(i) || o.length >= 2 && i.includes(o))) e = Math.max(e, 44);else {
        let t = 0;
        for (let e of a) if (e === r[t] && t++, t === r.length) break;
        t === r.length && r.length >= 2 && (e = Math.max(e, 30));
      }
    }
    e > 0 && a.push({
      it: t,
      sc: e + t.pri,
      d: Math.hypot(t.x - n.x, t.z - n.z)
    });
  }
  return a.sort((e, t) => t.sc - e.sc || e.d - t.d), a.slice(0, 8);
}

var r_ = e => e >= 1e3 ? (e / 1e3).toFixed(1) + ` km` : Math.round(e) + ` m`;

function i_() {
  let e = [],
    t = [],
    n = [];
  for (let r = 0; r < 2; r++) {
    let i = e.length / 3;
    for (let [n, i] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) e.push(0, i, 0), t.push(n, r);
    n.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  let r = new BufferGeometry();
  r.setAttribute(`position`, new Float32BufferAttribute(e, 3)), r.setAttribute(`aSide`, new Float32BufferAttribute(t, 2)), r.setIndex(n);
  let i = new Mesh(r, new ShaderMaterial({
    uniforms: _d({
      uBase: {
        value: new Vector3()
      },
      uLen: {
        value: 700
      }
    }),
    transparent: !0,
    depthWrite: !1,
    depthTest: !1,
    blending: 2,
    side: 2,
    vertexShader: `uniform vec3 uBase; uniform float uLen; attribute vec2 aSide; varying vec2 vS;
      void main(){
        float d = distance(cameraPosition.xz, uBase.xz);
        float w = clamp(d * 0.007, 2.5, 60.0);
        vec3 right = aSide.y < 0.5 ? normalize(vec3(cameraPosition.z - uBase.z, 0.0, -(cameraPosition.x - uBase.x)) + vec3(1e-4, 0.0, 0.0)) : vec3(0.0);
        // 第二片不要：只用一片始终朝向相机的光片（aSide.y=1 的那片退化掉）
        vec3 wp = uBase + vec3(0.0, position.y * uLen, 0.0) + right * aSide.x * w;
        vS = vec2(aSide.x, position.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: `uniform float uTime; uniform float uNight; varying vec2 vS;
      void main(){
        float core = pow(max(1.0 - abs(vS.x), 0.0), 2.5) + 0.9 * pow(max(1.0 - abs(vS.x) * 4.0, 0.0), 2.0);
        float fade = pow(1.0 - vS.y, 1.3) * smoothstep(0.0, 0.02, vS.y);
        float pulse = 0.75 + 0.25 * sin(uTime * 3.0 - vS.y * 22.0);
        vec3 c = mix(vec3(1.0, 0.82, 0.30), vec3(0.45, 0.95, 1.0), smoothstep(0.0, 0.5, vS.y));
        gl_FragColor = vec4(c * core * fade * pulse * mix(1.25, 0.9, uNight), 1.0);
      }`
  }));
  return i.frustumCulled = !1, i.renderOrder = 40, i.visible = !1, i;
}

var a_ = class {
    constructor(e, t, n, r, i, a = {}) {
      Object.assign(this, {
        index: e,
        scene: t,
        camera: n,
        els: r,
        getPos: i,
        hooks: a
      }), this.open = !1, this.results = [], this.sel = 0, this.target = null, this.arrived = !1, this.beacon = i_(), t.add(this.beacon), r.input.addEventListener(`input`, () => this.refresh()), r.input.addEventListener(`keydown`, e => {
        e.stopPropagation(), e.key === `Escape` ? (this.hide(), e.preventDefault()) : e.key === `Enter` ? (this.results[this.sel] && this.choose(this.results[this.sel].it), e.preventDefault()) : e.key === `ArrowDown` ? (this.sel = Math.min(this.results.length - 1, this.sel + 1), this.render(), e.preventDefault()) : e.key === `ArrowUp` && (this.sel = Math.max(0, this.sel - 1), this.render(), e.preventDefault());
      }), r.input.addEventListener(`keyup`, e => e.stopPropagation()), r.clear.addEventListener(`click`, () => {
        this.clear(), this.hide();
      }), this._v = new Vector3();
    }
    show() {
      this.open = !0, this.els.box.style.display = `block`, document.pointerLockElement && document.exitPointerLock(), this.els.input.value = ``, this.results = [], this.render(), this.els.clear.style.display = this.target ? `` : `none`, setTimeout(() => this.els.input.focus(), 0), this.hooks.onOpen && this.hooks.onOpen();
    }
    hide() {
      this.open = !1, this.els.box.style.display = `none`, this.els.input.blur(), this.hooks.onClose && this.hooks.onClose();
    }
    refresh() {
      this.results = n_(this.index, this.els.input.value, this.getPos()), this.sel = 0, this.render();
    }
    render() {
      let e = this.els.list;
      if (e.innerHTML = ``, !this.results.length && this.els.input.value.trim()) {
        let t = document.createElement(`div`);
        t.className = `sr none`, t.textContent = `没有找到这个地点`, e.appendChild(t);
      } else this.results.forEach((t, n) => {
        let r = document.createElement(`div`);
        r.className = `sr` + (n === this.sel ? ` on` : ``);
        let i = document.createElement(`span`);
        i.textContent = t.it.name;
        let a = document.createElement(`small`);
        a.textContent = e_(t.it.x, t.it.z) + ` · ` + r_(t.d), r.append(i, a), r.addEventListener(`mousedown`, e => {
          e.preventDefault(), this.choose(t.it);
        }), e.appendChild(r);
      });
    }
    choose(e) {
      this.target = e, this.arrived = !1, this.beacon.material.uniforms.uBase.value.set(e.x, e.h + 2, e.z), this.beacon.visible = !0, this.hide();
    }
    clear() {
      this.target = null, this.beacon.visible = !1, this.els.target.style.display = `none`, this.els.label.style.display = `none`, this.els.arrow.style.display = `none`;
    }
    update() {
      let e = this.target,
        {
          target: t,
          label: n,
          arrow: r
        } = this.els;
      if (!e) return;
      let i = this.getPos(),
        a = Math.hypot(e.x - i.x, e.z - i.z);
      a < 80 ? this.arrived = !0 : a > 140 && (this.arrived = !1), t.style.display = `block`, t.textContent = this.arrived ? `✅ 已到达：${e.name}` : `🎯 目标：${e.name} · ${r_(a)}`, t.classList.toggle(`arrived`, this.arrived);
      let o = window.innerWidth,
        s = window.innerHeight,
        c = this._v.set(e.x, e.h + 2 + Math.min(260, 30 + a * 0.06), e.z),
        l = this.camera,
        u = c.clone().sub(l.position).dot(l.getWorldDirection(new Vector3())) > 0;
      c.project(l);
      let d = (c.x * 0.5 + 0.5) * o,
        f = (-c.y * 0.5 + 0.5) * s;
      if (u && d > 40 && d < o - 40 && f > 40 && f < s - 40) n.style.display = `block`, n.style.left = d + `px`, n.style.top = f + `px`, n.textContent = `${e.name} · ${r_(a)}`, r.style.display = `none`;else {
        n.style.display = `none`;
        let e = c.x,
          t = -c.y;
        u || (e = -e, t = -t);
        let i = Math.hypot(e, t) || 1;
        e /= i, t /= i;
        let a = Math.min((o / 2 - 60) / Math.abs(e || 1e-6), (s / 2 - 60) / Math.abs(t || 1e-6));
        r.style.display = `block`, r.style.left = o / 2 + e * a + `px`, r.style.top = s / 2 + t * a + `px`, r.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(t, e)}rad)`;
      }
    }
  },
  o_ = 2048,
  s_ = 9e3;

function c_(e) {
  e.traverse(e => {
    e.isMesh && e.layers.enable(1);
  });
}

var l_ = class {
    constructor(e, t) {
      this.renderer = e, this.scene = t, this.depthMat = new MeshBasicMaterial({
        colorWrite: !1,
        side: 2,
        polygonOffset: !0,
        polygonOffsetFactor: 1.2,
        polygonOffsetUnits: 2
      }), this.cascades = [0, 1].map(e => {
        let t = new DepthTexture(o_, o_, UnsignedIntType);
        t.compareFunction = 515, t.minFilter = t.magFilter = LinearFilter;
        let n = new WebGLRenderTarget(o_, o_, {
            depthTexture: t,
            depthBuffer: !0,
            generateMipmaps: !1
          }),
          r = new OrthographicCamera(-1, 1, 1, -1, 10, s_);
        return r.layers.set(1), {
          rt: n,
          cam: r,
          key: ``,
          i: e
        };
      }), gd.uShadow0.value = this.cascades[0].rt.depthTexture, gd.uShadow1.value = this.cascades[1].rt.depthTexture, this.basis = new Matrix4().lookAt(fd.clone(), new Vector3(), new Vector3(0, 1, 0)), this.right = new Vector3().setFromMatrixColumn(this.basis, 0), this.up = new Vector3().setFromMatrixColumn(this.basis, 1), this.dirty = !0, this.renders = 0, this._bias = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1), this._look = new Vector3(), this._f = new Vector3(), gd.uShadowInfo.value.z = 1;
    }
    markDirty() {
      this.dirty = !0;
    }
    update(e) {
      let t = e.getWorldDirection(this._look),
        n = Math.max(0, e.position.y),
        r = Math.min(1100, Math.max(130, 130 + n * 0.95));
      r = 130 * 1.25 ** Math.round(Math.log(r / 130) / Math.log(1.25));
      let i = Math.min(3600, r * 4.2),
        a = [r, i];
      for (let n of this.cascades) {
        let r = a[n.i],
          i = this._f.copy(e.position);
        if (n.i === 0) {
          let n = r * 0.72;
          t.y < -0.02 && (n = Math.min(n, e.position.y / -t.y)), i.addScaledVector(t, n), i.y < 0 && (i.y = 0);
        } else {
          let e = Math.hypot(t.x, t.z) || 1;
          i.x += t.x / e * r * 0.55, i.z += t.z / e * r * 0.55, i.y = 0;
        }
        let o = r / 5,
          s = Math.round(i.dot(this.right) / o) * o,
          c = Math.round(i.dot(this.up) / o) * o,
          l = n.i === 0 ? Math.round(i.dot(fd) / 200) * 200 : 0,
          u = `${r.toFixed(1)}|${s.toFixed(1)}|${c.toFixed(1)}|${l}`;
        if (u === n.key && !this.dirty) continue;
        n.key = u;
        let d = r + o * 0.75,
          f = new Vector3().addScaledVector(this.right, s).addScaledVector(this.up, c).addScaledVector(fd, l),
          p = n.cam;
        p.left = -d, p.right = d, p.top = d, p.bottom = -d, p.position.copy(f).addScaledVector(fd, s_ * 0.5), p.up.set(0, 1, 0), p.lookAt(f), p.updateProjectionMatrix(), p.updateMatrixWorld(!0), this._render(n), (n.i === 0 ? gd.uShadowMat0.value : gd.uShadowMat1.value).copy(this._bias).multiply(p.projectionMatrix).multiply(p.matrixWorldInverse);
        let m = 2 * d / o_;
        n.i === 0 ? gd.uShadowInfo.value.x = m : gd.uShadowInfo.value.y = m;
      }
      this.dirty = !1;
    }
    _render(e) {
      let {
          renderer: t,
          scene: n
        } = this,
        r = t.getRenderTarget(),
        i = n.overrideMaterial,
        a = n.background;
      n.overrideMaterial = this.depthMat, n.background = null, t.setRenderTarget(e.rt), t.clear(), t.render(n, e.cam), t.setRenderTarget(r), n.overrideMaterial = i, n.background = a, this.renders++;
    }
  },
  u_ = -78;

function d_(e) {
  let t = e.L / 2,
    n = e => 52 + 29 * Math.min(1, Math.max(0, (Math.abs(e) / t - 0.35) / 0.65)) ** 1.25,
    r = (e, t) => (t - u_) / (n(e) - u_) * 2 - 1,
    i = (e, n) => {
      let i = e / t,
        a = r(e, n);
      return 43 + 30 * Math.abs(i) ** 1.9 + 7 * Math.abs(i) ** 7 + 3.5 * (1 - a * a) + 3.5 * i * i * a;
    },
    a = (e, n) => {
      let i = e / t,
        a = r(e, n);
      return 2.6 + 2.6 * Math.max(0, 1 - a * a) ** 0.7 * (1 - 0.4 * i * i);
    },
    o = (e, t) => i(e, t) - a(e, t),
    s = new Ap(),
    c = [0.9, 0.72, 0.34],
    l = [0.88, 0.73, 0.42],
    u = [0.43, 0.5, 0.6],
    d = [0.8, 0.78, 0.73],
    f = [0.66, 0.65, 0.62],
    p = [0.86, 0.87, 0.89],
    m = [0.09, 0.23, 0.42],
    h = [0.22, 0.38, 0.5],
    g = [0.74, 0.76, 0.78],
    _ = (e, r) => {
      let i = -t + 2 * t * e / 124;
      return [i, u_ + (n(i) - u_) * r / 12];
    },
    v = (e, r, a) => {
      let o = 0.6,
        s = (i(Math.min(t, e + o), r) - i(Math.max(-t, e - o), r)) / (2 * o),
        c = n(e),
        l = Math.max(u_, r - o),
        u = Math.min(c, r + o),
        d = (i(e, u) - i(e, l)) / Math.max(0.001, u - l),
        f = Math.hypot(s, 1, d);
      return [-s / f * a, 1 / f * a, -d / f * a];
    },
    y = {
      mat: 1,
      col: u,
      p: [2.06, 6, 2]
    },
    b = {
      mat: 1,
      col: l,
      p: [4.12, 4.2, 0],
      fx: [2, 0.1]
    };
  for (let e = 0; e < 124; e++) for (let t = 0; t < 12; t++) {
    let n = [_(e, t), _(e + 1, t), _(e + 1, t + 1), _(e, t + 1)];
    s.quad(...n.map(([e, t]) => [e, i(e, t), t]), y, n, n.map(([e, t]) => v(e, t, 1))), s.quad(...n.map(([e, t]) => [e, o(e, t), t]), b, n, n.map(([e, t]) => v(e, t, -1)));
  }
  let x = (e, t, n) => s.quad([e[0], o(...e), e[1]], [t[0], o(...t), t[1]], [t[0], i(...t), t[1]], [e[0], i(...e), e[1]], {
    mat: 1,
    col: c,
    p: [4.12, 9, 2],
    u0: n,
    fx: [3, 0.1]
  });
  for (let e = 0; e < 124; e++) x(_(e, 12), _(e + 1, 12), e * 4.12), x(_(e, 0), _(e + 1, 0), e * 4.12);
  for (let e = 0; e < 12; e++) x(_(0, e), _(0, e + 1), e * 12), x(_(124, e), _(124, e + 1), e * 12);
  let S = [];
  for (let t of [-1, 1]) {
    let n = Math.min(t * 64, t * 226),
      r = Math.max(t * 64, t * 226);
    s.box(n - 2, r + 2, -2, 6, -70, 44, {
      mat: 3,
      col: d,
      p: [2.4, 1.2]
    }), s.box(n, r, 6, 30, -68, 42, {
      mat: 2,
      col: g,
      col2: m,
      p: [2, 4, 0],
      wrapU: !0
    }, {
      capO: {
        mat: 3,
        col: f,
        p: [3, 3]
      }
    });
    for (let e of [6, 14, 22, 30]) s.box(n - 1.6, r + 1.6, e - 0.25, e + 0.25, -69.6, 43.6, {
      mat: 0,
      col: [0.9, 0.9, 0.88]
    }, {
      bottom: !0
    });
    s.box(n + 14, r - 14, 30, 35.5, -54, 28, {
      mat: 1,
      col: [0.7, 0.72, 0.74],
      p: [3, 0.5, 1]
    }), S.push(Np(e, Pp(n - 2, r + 2, -70, 44), -2, 6, e.name)), S.push(Np(e, Pp(n, r, -68, 42), 6, 30, e.name)), S.push(Np(e, Pp(n + 14, r - 14, -54, 28), 30, 35.5, e.name));
  }
  s.box(-60, 60, -2, 9, -64, 50, {
    mat: 3,
    col: d,
    p: [2.4, 1.2]
  }, {
    capO: {
      mat: 3,
      col: [0.74, 0.72, 0.68],
      p: [2.4, 2.4]
    }
  }), S.push(Np(e, Pp(-60, 60, -64, 50), -2, 9, e.name));
  for (let t = 0; t < 9; t++) {
    let n = 50 + (9 - t) * 2.4;
    s.box(-42, 42, t, t + 1, 50, n, {
      mat: 3,
      col: d,
      p: [2.4, 0.5]
    }, {
      capO: {
        mat: 3,
        col: [0.76, 0.74, 0.7],
        p: [1.2, 0.6]
      }
    }), S.push(Np(e, Pp(-42, 42, 50, n), t === 0 ? -2 : t, t + 1, e.name));
  }
  let C = o(0, -10) + 0.3;
  s.box(-56, 56, 9, C, -52, 30, {
    mat: 2,
    col: p,
    col2: h,
    p: [2, 6, 3],
    wrapU: !0
  }, {
    cap: !1
  }), S.push(Np(e, Pp(-56, 56, -52, 30), 9, C, e.name)), s.quad([-52, 11, 30.4], [52, 11, 30.4], [52, 37, 30.4], [-52, 37, 30.4], {
    mat: 2,
    col: p,
    col2: h,
    p: [2, 6, 3],
    fx: [4.1, 8]
  }, [[-52, 11], [52, 11], [52, 37], [-52, 37]]);
  {
    let t = [0.72, 0.14, 0.1],
      n = [0.56, 0.11, 0.08];
    s.fx = [2, 0.1];
    let r = Pp(-57, -15, -33, 9);
    s.prism(r, 9, 78, {
      mat: 2,
      col: t,
      col2: [0.09, 0.12, 0.16],
      p: [1.75, 4.2, 4]
    }, {
      cap: !1
    }), s.prism(r, 78, 84, {
      mat: 1,
      col: t,
      p: [3.5, 6, 0]
    }, {
      capO: {
        mat: 0,
        col: n
      }
    });
    for (let [e, r] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let i = -36 + e * 21,
        a = -12 + r * 21;
      s.box(Math.min(i, i - e * 4.5) - (e > 0 ? 0 : 0.6), Math.max(i, i - e * 4.5) + (e > 0 ? 0.6 : 0), 9, 84.5, Math.min(a, a - r * 4.5) - (r > 0 ? 0 : 0.6), Math.max(a, a - r * 4.5) + (r > 0 ? 0.6 : 0), {
        mat: 1,
        col: t,
        p: [4.5, 4.2, 0]
      }, {
        capO: {
          mat: 0,
          col: n
        }
      });
    }
    s.box(-58.2, -13.8, 77.6, 78.2, -34.2, 10.2, {
      mat: 0,
      col: n
    }, {
      bottom: !0
    }), s.box(-45, -27, 84, 88, -21, -3, {
      mat: 1,
      col: n,
      p: [3, 0.6, 1]
    }), S.push(Np(e, Pp(-57.6, -14.4, -33.6, 9.6), 9, 84, e.name));
  }
  {
    let t = [0.93, 0.7, 0.14],
      n = [0.74, 0.54, 0.1],
      r = (e, t = 48) => Array.from({
        length: t
      }, (n, r) => [36 + Math.cos(r / t * Math.PI * 2) * e, -12 + Math.sin(r / t * Math.PI * 2) * e]),
      i = (e, t, n) => {
        let i = r(e);
        for (let e = 0; e < 48; e += 2) s.quad([36, t, -12], [i[e][0], t, i[e][1]], [i[e + 1][0], t, i[e + 1][1]], [i[(e + 2) % 48][0], t, i[(e + 2) % 48][1]], n);
      };
    s.prism(r(22), 9, 73, {
      mat: 2,
      col: t,
      col2: [0.1, 0.13, 0.16],
      p: [1.44, 4.2, 4],
      wrapU: !0
    }, {
      cap: !1
    }), s.prism(r(22), 73, 78, {
      mat: 1,
      col: t,
      p: [2.88, 5, 2],
      wrapU: !0
    }, {
      cap: !1
    }), i(22, 78, {
      mat: 0,
      col: n
    });
    for (let e = 25.8; e < 70; e += 16.8) s.prism(r(22.6), e - 0.3, e + 0.3, {
      mat: 0,
      col: n,
      wrapU: !0
    }, {
      cap: !1
    }), i(22.6, e + 0.3, {
      mat: 0,
      col: n
    }), i(22.6, e - 0.3, {
      mat: 0,
      col: n
    });
    s.prism(r(23.4), 72.7, 73.3, {
      mat: 0,
      col: n,
      wrapU: !0
    }, {
      cap: !1
    }), i(23.4, 73.3, {
      mat: 0,
      col: n
    }), i(23.4, 72.7, {
      mat: 0,
      col: n
    }), s.prism(r(8, 24), 78, 82, {
      mat: 1,
      col: n,
      p: [2, 0.6, 1],
      wrapU: !0
    }, {
      cap: !1
    }), S.push(Np(e, r(22.5, 24), 9, 78, e.name));
  }
  s.fx = [0, 0];
  let w = (t, r) => {
    let i = o(t, r) - 13,
      a = Array.from({
        length: 8
      }, (e, n) => [t + Math.cos(n / 8 * Math.PI * 2 + 0.39) * 1.05, r + Math.sin(n / 8 * Math.PI * 2 + 0.39) * 1.05]);
    s.prism(a, -2, i, {
      mat: 0,
      col: p
    }, {
      cap: !1
    });
    for (let [e, a] of [[-9, -4.5], [9, -4.5], [9, 4.5], [-9, 4.5]]) {
      let c = t + e,
        l = Math.min(n(c) - 1, Math.max(-77, r + a));
      s.strut([t, i - 0.5, r], [c, o(c, l) + 0.2, l], 0.7, {
        mat: 0,
        col: p
      });
    }
    S.push(Np(e, Pp(t - 1, t + 1, r - 1, r + 1), -2, i, e.name));
  };
  for (let e of [-1, 1]) for (let t = 0; t < 6; t++) {
    let r = e * (40 + t * 37);
    Math.abs(r) > 70 && w(r, n(r) - 5), w(r, -73.5);
  }
  let T = $(e.x, e.z),
    E = new Mesh(s.build(), Mp());
  E.position.set(e.x, T, e.z), E.rotation.y = -e.ang, E.renderOrder = 5;
  for (let r = -t; r < t - 0.1; r += 4.12) {
    let a = Math.min(t, r + 4.12),
      s = (r + a) / 2,
      c = n(s);
    for (let t = 0; t < 3; t++) {
      let l = u_ + (c - u_) * t / 3,
        u = u_ + (c - u_) * (t + 1) / 3,
        d = 1 / 0,
        f = -1 / 0;
      for (let e of [r, a]) for (let t of [l, (l + u) / 2, u]) d = Math.min(d, o(e, Math.min(t, n(e)))), f = Math.max(f, i(e, Math.min(t, n(e))));
      S.push(Np(e, Pp(r, a, l, u), d, (f + i(s, (l + u) / 2)) / 2, e.name));
    }
  }
  for (let e of S) e.bottom += T, e.top += T, e.h = 84;
  return {
    mesh: E,
    colliders: S
  };
}

var f_ = [[0, 37, 5], [22, 36.6, 5.2], [120, 34.6, 6], [300, 31.6, 7.4], [470, 28.6, 8.8], [520, 27.2, 9.6], [548, 19.5, 8.6], [566, 9.5, 4.4], [574, 3.4, 1.3]],
  p_ = [98, 190, 282, 374, 462],
  m_ = 9,
  h_ = 599.1;

function g_(e) {
  for (let t = 1; t < f_.length; t++) {
    let [n, r, i] = f_[t - 1],
      [a, o, s] = f_[t];
    if (e <= a) {
      let t = (e - n) / (a - n);
      return [r + (o - r) * t, i + (s - i) * t];
    }
  }
  let t = f_[f_.length - 1];
  return [t[1], t[2]];
}

function __(e, t = 0) {
  let [n, r] = g_(e);
  n += t;
  let i = n - r;
  return [[-i, n], [i, n], [n, i], [n, -i], [i, -n], [-i, -n], [-n, -i], [-n, i]];
}

var v_ = [[0, 1], [1, 0], [0, -1], [-1, 0]];

function y_(e) {
  let t = new Ap();
  t.fx = [1, 30];
  let n = [0.8, 0.82, 0.85],
    r = [0.58, 0.61, 0.65],
    i = [0.3, 0.42, 0.54],
    a = [0.16, 0.25, 0.34],
    o = new Set(f_.map(e => e[0]));
  for (let e of p_) o.add(e), o.add(e + m_);
  let s = [...o].sort((e, t) => e - t),
    c = e => p_.some(t => e >= t && e < t + m_);
  for (let e = 0; e < s.length - 1; e++) {
    let o = s[e],
      l = s[e + 1],
      u = __(o),
      d = __(l);
    for (let e = 0; e < 8; e++) {
      let s = u[e],
        f = u[(e + 1) % 8],
        p = d[(e + 1) % 8],
        m = d[e],
        h = Math.hypot(f[0] - s[0], f[1] - s[1]),
        g = Math.hypot(p[0] - m[0], p[1] - m[1]);
      Math.hypot(l - o, (h - g) / 2);
      let _,
        v = e % 2 == 0;
      _ = c(o) ? {
        mat: 1,
        col: r,
        p: [3, 0.75, 1]
      } : o < 22 ? {
        mat: 2,
        col: n,
        col2: a,
        p: [3, 11, 3]
      } : o >= 520 ? v ? {
        mat: 2,
        col: n,
        col2: i,
        p: [1.5, 4.5, 3]
      } : {
        mat: 2,
        col: n,
        col2: i,
        p: [1.1, 4.5, 3]
      } : v ? {
        mat: 2,
        col: n,
        col2: i,
        p: [1.5, 4.5, 0]
      } : {
        mat: 2,
        col: n,
        col2: i,
        p: [1.5, 4.5, 1]
      }, o >= 520 ? _.fx = [3, 0.9] : (!v || o < 22) && (_.fx = [0, 0.3]), t.quad([s[0], o, s[1]], [f[0], o, f[1]], [p[0], l, p[1]], [m[0], l, m[1]], _, [[-h / 2, o], [h / 2, o], [g / 2, l], [-g / 2, l]]);
    }
  }
  for (let e of p_) for (let r of [e, e + m_]) t.prism(__(r, 0.9), r - 0.3, r + 0.3, {
    mat: 0,
    col: n
  }, {
    bottom: !0,
    capO: {
      mat: 0,
      col: n
    }
  });
  let l = [[-1, 2.4, 1.5, 0, 574], [1, 2.4, 1.5, 0, 574], [-0.62, 1.1, 0.85, 22, 566], [-0.22, 1.1, 0.85, 22, 566], [0.22, 1.1, 0.85, 22, 566], [0.62, 1.1, 0.85, 22, 566]],
    u = {
      mat: 1,
      col: n,
      p: [6, 4.5, 0],
      fx: [3, 0.1]
    };
  for (let e = 0; e < 4; e++) {
    let [n, r] = v_[e],
      i = -r,
      a = n;
    for (let [e, o, c, d, f] of l) {
      let l = Math.abs(e) === 1 ? u : {
          ...u,
          fx: [0, 0]
        },
        p = s.filter(e => e >= d && e <= f).map(t => {
          let [s, l] = g_(t),
            u = s - l,
            d = Math.min(1, u / 13),
            f = o * d,
            p = c * d,
            m = Math.abs(e) === 1 ? e * (u - f / 2) : e * u,
            h = n * s + i * m,
            g = r * s + a * m;
          return {
            y: t,
            l: [h - i * f / 2, g - a * f / 2],
            r: [h + i * f / 2, g + a * f / 2],
            d: p
          };
        });
      for (let e = 0; e < p.length - 1; e++) {
        let i = p[e],
          a = p[e + 1],
          o = (e, t) => [e[0] + n * t.d, t.y, e[1] + r * t.d],
          s = (e, t) => [e[0] - n * 0.3, t.y, e[1] - r * 0.3];
        t.quad(o(i.l, i), o(i.r, i), o(a.r, a), o(a.l, a), l), t.quad(s(i.l, i), o(i.l, i), o(a.l, a), s(a.l, a), l), t.quad(o(i.r, i), s(i.r, i), s(a.r, a), o(a.r, a), l);
      }
    }
  }
  let d = __(574);
  t.prism(d, 573.2, 574.4, {
    mat: 0,
    col: n
  }, {
    capO: {
      mat: 0,
      col: r
    }
  });
  let f = e => [[-e, e], [e, e], [e, -e], [-e, -e]],
    p = [[574.4, 2.6], [581, 1.9], [590, 1.2], [h_, 0.3]];
  for (let e = 0; e < p.length - 1; e++) {
    let [r, i] = p[e],
      [a, o] = p[e + 1],
      s = f(i),
      c = f(o);
    for (let e = 0; e < 4; e++) t.quad([s[e][0], r, s[e][1]], [s[(e + 1) % 4][0], r, s[(e + 1) % 4][1]], [c[(e + 1) % 4][0], a, c[(e + 1) % 4][1]], [c[e][0], a, c[e][1]], {
      mat: 1,
      col: n,
      p: [1.2, 2.2, 0],
      fx: [3, 0.1]
    });
  }
  for (let [e, n] of [[581, 2.5], [590, 1.7]]) t.prism(f(n), e - 0.35, e + 0.35, {
    mat: 0,
    col: r
  }, {
    bottom: !0
  });
  t.prism(f(0.5), 599, 600.5, {
    mat: 0,
    col: [0.9, 0.2, 0.15]
  });
  for (let [e, r] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    let [i, a] = g_(548),
      o = i - a / 2;
    t.strut([e * o, 548, r * o], [e * 1.6, 586, r * 1.6], 0.9, {
      mat: 0,
      col: n
    });
  }
  t.box(-41, 41, -2, 0.6, -41, 41, {
    mat: 3,
    col: [0.72, 0.71, 0.69],
    p: [2.4, 0.3]
  }, {
    capO: {
      mat: 3,
      col: [0.7, 0.69, 0.67],
      p: [1.2, 1.2]
    }
  });
  for (let [e, r] of v_) {
    let i = -r,
      a = e,
      o = [e * 40.4 - i * 14, r * 40.4 - a * 14],
      s = [e * 40.4 + i * 14, r * 40.4 + a * 14];
    t.box(Math.min(o[0], s[0]) - Math.abs(e) * 3.5, Math.max(o[0], s[0]) + Math.abs(e) * 3.5, 8.2, 8.8, Math.min(o[1], s[1]) - Math.abs(r) * 3.5, Math.max(o[1], s[1]) + Math.abs(r) * 3.5, {
      mat: 0,
      col: n
    }, {
      bottom: !0
    });
  }
  let m = $(e.x, e.z),
    h = new Mesh(t.build(), Mp());
  h.position.set(e.x, m, e.z), h.renderOrder = 5;
  let g = {
      x: e.x,
      z: e.z,
      ang: 0
    },
    _ = [Np(g, f(41), m - 2, m + 0.6, `平安金融中心`, h_)],
    v = [0.6, 60, 120, 180, 240, 300, 360, 420, 470, 520, 534, 548, 557, 566, 574];
  for (let e = 0; e < v.length - 1; e++) _.push(Np(g, __(v[e] < 520 ? v[e] : (v[e] + v[e + 1]) / 2, v[e] < 520 ? 1.5 : 0.5), m + v[e], m + v[e + 1], `平安金融中心`, h_));
  return _.push(Np(g, f(2.2), m + 574, m + h_, `平安金融中心`, h_)), {
    mesh: h,
    colliders: _
  };
}

function b_(e) {
  let t = new Ap();
  t.fx = [1.15, 12];
  let n = [0.7, 0.72, 0.75],
    r = [0.12, 0.22, 0.34],
    i = [0.3, 0.32, 0.35],
    a = 245.8,
    o = e.L / 2 - 3,
    s = e.W / 2 - 3,
    c = {
      mat: 2,
      col: n,
      col2: r,
      p: [3, 4, 2],
      wrapU: !0
    };
  t.box(-24, 24, -2, 36, -24, 24, {
    mat: 2,
    col: [0.8, 0.82, 0.84],
    col2: [0.16, 0.26, 0.36],
    p: [3, 12, 3],
    wrapU: !0
  }, {
    cap: !1
  });
  for (let [e, n] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) t.box(e * 27 - (e > 0 ? 9 : 0), e * 27 + (e > 0 ? 0 : 9), -2, 36, n * 27 - (n > 0 ? 9 : 0), n * 27 + (n > 0 ? 0 : 9), c, {
    cap: !1
  });
  t.box(-o, o, 36, 60, -s, s, c, {
    bottom: !0,
    capO: {
      mat: 3,
      col: [0.62, 0.64, 0.62],
      p: [6, 6]
    }
  }), t.box(-o + 8, o - 8, 60, 60.6, -s + 8, s - 8, {
    mat: 0,
    col: [0.3, 0.47, 0.2]
  }), t.box(-o - 0.6, o + 0.6, 35.5, 36.5, -s - 0.6, s + 0.6, {
    mat: 0,
    col: i
  }, {
    bottom: !0
  }), t.box(-o - 0.6, o + 0.6, 59.7, 61.4, -s - 0.6, s + 0.6, {
    mat: 0,
    col: n
  }), t.box(-27, 27, 60, 235.8, -27, 27, c, {
    cap: !1
  }), t.box(-27, 27, 235.8, a, -27, 27, {
    mat: 1,
    col: n,
    p: [3, 0.8, 1],
    wrapU: !0
  }, {
    capO: {
      mat: 0,
      col: i
    }
  }), t.box(-21, 21, a, 250.8, -21, 21, {
    mat: 1,
    col: i,
    p: [3, 0.8, 1],
    wrapU: !0
  });
  let l = $(e.x, e.z),
    u = new Mesh(t.build(), Mp());
  return u.position.set(e.x, l, e.z), u.rotation.y = -e.ang, u.renderOrder = 5, {
    mesh: u,
    colliders: [Np(e, Pp(-27, 27, -27, 27), l - 2, l + a, e.name, a), Np(e, Pp(-o, o, -s, s), l + 36, l + 60 + 1, e.name, a)]
  };
}

function x_(e) {
  let t = e.bounds,
    n = 20261119,
    r = () => (n = Math.imul(n, 1664525) + 1013904223 >>> 0, n / 4294967296),
    i = [],
    a = 5200,
    o = (t.x0 + t.x1) / 2,
    s = (t.z0 + t.z1) / 2;
  for (let e = 0; e < 9e3; e++) {
    let e = o + (r() - 0.5) * (t.x1 - t.x0 + 2 * a),
      n = s + (r() - 0.5) * (t.z1 - t.z0 + 2 * a),
      c = Math.max(t.x0 - e, 0, e - t.x1),
      l = Math.max(t.z0 - n, 0, n - t.z1);
    if (Math.hypot(c, l) < 300) continue;
    let u = Math.sin(e * 0.0011 + 1.7) * Math.cos(n * 0.0013 - 0.6) + Math.sin((e + n) * 7e-4) * 0.6;
    if (u < -0.35 && r() < 0.85 || n < t.z0 && r() < 0.45) continue;
    let d = u > 0.5 && r() < 0.35,
      f = d ? 90 + r() * 170 : 18 + r() * r() * 90,
      p = d ? 30 + r() * 20 : 24 + r() * 50,
      m = d ? 30 + r() * 20 : 16 + r() * 30,
      h = r(),
      g = h < 0.35 ? [0.8, 0.77, 0.7] : h < 0.6 ? [0.62, 0.66, 0.72] : h < 0.8 ? [0.36, 0.5, 0.66] : [0.72, 0.72, 0.72];
    i.push({
      x: e,
      z: n,
      h: f,
      w: p,
      dp: m,
      yaw: r() < 0.7 ? 0 : r() * 3.14,
      col: g
    });
  }
  let c = new BoxGeometry(1, 1, 1);
  c.translate(0, 0.5, 0);
  let l = new InstancedMesh(c, xd({
      color: 16777215
    }), i.length),
    u = new Matrix4(),
    d = new Quaternion(),
    f = new Vector3(0, 1, 0),
    p = new Color();
  return i.forEach((e, t) => {
    d.setFromAxisAngle(f, e.yaw), u.compose(new Vector3(e.x, 0, e.z), d, new Vector3(e.w, e.h, e.dp)), l.setMatrixAt(t, u), p.setRGB(e.col[0], e.col[1], e.col[2], SRGBColorSpace), l.setColorAt(t, p);
  }), l.frustumCulled = !1, l.userData.count = i.length, l;
}

var S_ = 1.7,
  C_ = 24,
  w_ = class {
    constructor(e, t, n, r) {
      this.camera = e, this.dom = t, this.grid = n, this.bounds = r, this.pos = new Vector3(), this.vel = new Vector3(), this.yaw = 0, this.pitch = 0, this.mode = `fly`, this.noclip = !1, this.keys = new Set(), this.onGround = !1, this.locked = !1, this.onModeChange = () => {}, this.camYawOff = 0, t.addEventListener(`click`, () => {
        this.locked || t.requestPointerLock?.();
      }), document.addEventListener(`pointerlockchange`, () => {
        this.locked = document.pointerLockElement === t;
      }), document.addEventListener(`mousemove`, e => {
        (this.locked || e.buttons & 1 && e.target === t) && (this.yaw -= e.movementX * 0.0022, this.pitch -= e.movementY * 0.0022, this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch)));
      }), window.addEventListener(`keydown`, e => {
        if (!this.blockInput && ((e.code === `Space` || e.code.startsWith(`Arrow`)) && e.preventDefault(), e.ctrlKey && e.code !== `ControlLeft` && e.code !== `ControlRight` && e.preventDefault(), !e.repeat)) {
          if (this.keys.add(e.code), e.code === `KeyV`) {
            if (this.astroV && this.astroV()) return;
            this.toggleMode();
          }
          e.code === `KeyN` && (this.noclip = !this.noclip, this.onModeChange()), e.code === `Space` && this.mode === `walk` && this.onGround && !(this.astroBusy && this.astroBusy()) && (this.vel.y = 7.5, this.onGround = !1);
        }
      }), window.addEventListener(`keyup`, e => this.keys.delete(e.code)), window.addEventListener(`blur`, () => this.keys.clear());
    }
    setView(e, t) {
      this.pos.copy(e);
      let n = t.clone().sub(e);
      this.yaw = Math.atan2(-n.x, -n.z), this.pitch = Math.atan2(n.y, Math.hypot(n.x, n.z));
    }
    toggleMode() {
      if (this.mode === `fly`) {
        this.mode = `walk`, this.pos.y -= S_, this.vel.set(0, 0, 0);
        let e = rm(this.grid, this.pos.x, this.pos.z, 1 / 0);
        nm(this.grid, this.pos.x, this.pos.z, this.pos.y, this.pos.y + S_) && (this.pos.y = e), this.onGround = !1;
      } else this.mode = `fly`, this.pos.y += S_, this.vel.set(0, 0, 0);
      this.onModeChange();
    }
    update(e) {
      if (this.camYawOff = 0, this.drive && this.drive(e, this)) {
        this.camera.position.copy(this.pos), this.camera.rotation.set(this.pitch, this.yaw + this.camYawOff, 0, `YXZ`);
        return;
      }
      let t = this.keys,
        n = new Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)),
        r = new Vector3(-n.z, 0, n.x),
        i = new Vector3();
      (t.has(`KeyW`) || t.has(`ArrowUp`)) && i.add(n), (t.has(`KeyS`) || t.has(`ArrowDown`)) && i.sub(n), (t.has(`KeyD`) || t.has(`ArrowRight`)) && i.add(r), (t.has(`KeyA`) || t.has(`ArrowLeft`)) && i.sub(r), i.lengthSq() > 0 && i.normalize();
      let a = t.has(`ShiftLeft`) || t.has(`ShiftRight`);
      if (this.mode === `fly`) {
        let n = (40 + Math.max(0, this.pos.y - $(this.pos.x, this.pos.z)) * 0.35) * (a ? 4 : 1),
          i = 0;
        (t.has(`Space`) || t.has(`KeyE`)) && (i += 1), (t.has(`ControlLeft`) || t.has(`ControlRight`) || t.has(`KeyQ`)) && --i;
        let o = new Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)),
          s = new Vector3(),
          c = (t.has(`KeyW`) || t.has(`ArrowUp`) ? 1 : 0) - (t.has(`KeyS`) || t.has(`ArrowDown`) ? 1 : 0),
          l = (t.has(`KeyD`) || t.has(`ArrowRight`) ? 1 : 0) - (t.has(`KeyA`) || t.has(`ArrowLeft`) ? 1 : 0);
        s.addScaledVector(o, c).addScaledVector(r, l), s.y += i, s.lengthSq() > 1 && s.normalize(), s.multiplyScalar(n), this.vel.lerp(s, 1 - Math.exp(-e * 6)), this.moveFly(this.vel.clone().multiplyScalar(e));
      } else {
        let t = a ? 11 : 5,
          n = 1 - Math.exp(-e * (this.onGround ? 14 : 3));
        this.vel.x += (i.x * t - this.vel.x) * n, this.vel.z += (i.z * t - this.vel.z) * n, this.vel.y -= C_ * e, this.moveWalk(e);
      }
      this.clampWorld();
      let o = this.mode === `walk` ? S_ : 0;
      this.camera.position.set(this.pos.x, this.pos.y + o, this.pos.z), this.camera.rotation.set(this.pitch, this.yaw, 0, `YXZ`);
    }
    moveFly(e) {
      let t = Math.max(1, Math.ceil(e.length() / 2)),
        n = e.clone().divideScalar(t);
      for (let e = 0; e < t; e++) {
        let e = this.pos.x + n.x,
          t = this.pos.z + n.z,
          r = this.pos.y + n.y;
        if (this.noclip) this.pos.set(e, r, t);else {
          let n = r - 1,
            i = r + 0.5;
          nm(this.grid, e, t, n, i, 0) ? nm(this.grid, e, this.pos.z, n, i, 0) ? nm(this.grid, this.pos.x, t, n, i, 0) ? nm(this.grid, this.pos.x, this.pos.z, n, i, 0) ? this.vel.multiplyScalar(0.3) : this.pos.y = r : this.pos.set(this.pos.x, r, t) : this.pos.set(e, r, this.pos.z) : this.pos.set(e, r, t);
        }
        let i = this.noclip ? $(this.pos.x, this.pos.z) : rm(this.grid, this.pos.x, this.pos.z, this.pos.y - 1, 0.2);
        this.pos.y < i + 1.2 && (this.pos.y = i + 1.2, this.vel.y < 0 && (this.vel.y = 0));
      }
      this.pos.y > 3e3 && (this.pos.y = 3e3);
    }
    moveWalk(e) {
      let t = this.vel.x * e,
        n = this.vel.z * e,
        r = Math.max(1, Math.ceil(Math.hypot(t, n) / 0.3));
      for (let e = 0; e < r; e++) {
        let e = t / r,
          i = n / r,
          a = this.pos.y,
          o = a + S_ + 0.1;
        nm(this.grid, this.pos.x + e, this.pos.z, a, o) ? this.vel.x = 0 : this.pos.x += e, nm(this.grid, this.pos.x, this.pos.z + i, a, o) ? this.vel.z = 0 : this.pos.z += i;
        let s = rm(this.grid, this.pos.x, this.pos.z, this.pos.y);
        this.onGround && s > this.pos.y && s - this.pos.y <= 0.6 && (this.pos.y = s);
      }
      this.pos.y += this.vel.y * e;
      let i = rm(this.grid, this.pos.x, this.pos.z, this.pos.y - this.vel.y * e);
      this.pos.y <= i ? (this.pos.y = i, this.vel.y = 0, this.onGround = !0) : this.onGround && this.pos.y - i < 0.5 && this.vel.y <= 0 ? (this.pos.y = i, this.vel.y = 0) : this.onGround = !1, this.pos.y < -50 && (this.pos.y = $(this.pos.x, this.pos.z) + 2, this.vel.y = 0);
    }
    clampWorld() {
      let e = this.bounds;
      this.pos.x = Math.max(e.x0 - 600, Math.min(e.x1 + 600, this.pos.x)), this.pos.z = Math.max(e.z0 - 600, Math.min(e.z1 + 600, this.pos.z));
    }
  },
  T_ = function () {
    var e = `b9H79Tebbbe8Fv9Gbb9Gvuuuuueu9Giuuub9Geueu9Giuuueuixkbeeeddddillviebeoweuecj:Gdkr;Neqo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbeY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVbdE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbiL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtblK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949WboY9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVJ9V29VVbrl79IV9Rbwq:VZkdbk:XYi5ud9:du8Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaicefhxcj;abad9Uc;WFbGcjdadca0EhmaialfgPar9Rgoadfhsavaoadz:jjjjbgzceVhHcbhOdndninaeaO9nmeaPax9RaD6mdamaeaO9RaOamfgoae6EgAcsfglc9WGhCabaOad2fhXaAcethQaxaDfhiaOaeaoaeao6E9RhLalcl4cifcd4hKazcj;cbfaAfhYcbh8AazcjdfhEaHh3incbh5dnawTmbaxa8Acd4fRbbh5kcbh8Eazcj;cbfhqinaih8Fdndndndna5a8Ecet4ciGgoc9:fPdebdkaPa8F9RaA6mrazcj;cbfa8EaA2fa8FaAz:jjjjb8Aa8FaAfhixdkazcj;cbfa8EaA2fcbaAz:kjjjb8Aa8FhixekaPa8F9RaK6mva8FaKfhidnaCTmbaPai9RcK6mbaocdtc:q:G:cjbfcj:G:cjbawEhaczhrcbhlinargoc9Wfghaqfhrdndndndndndnaaa8Fahco4fRbbalcoG4ciGcdtfydbPDbedvivvvlvkar9cb83bwar9cb83bbxlkarcbaiRbdai8Xbb9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbaqaofgrcGfcbaicdfa8J9c8N1:NfghRbbag9cjjjjjw:dg8J9qE86bbarcVfcbaha8J9c8M1:NfghRbbag9cjjjjjl:dg8J9qE86bbarc7fcbaha8J9c8L1:NfghRbbag9cjjjjjd:dg8J9qE86bbarctfcbaha8J9c8K1:NfghRbbag9cjjjjje:dg8J9qE86bbarc91fcbaha8J9c8J1:NfghRbbag9cjjjj;ab:dg8J9qE86bbarc4fcbaha8J9cg1:NfghRbbag9cjjjja:dg8J9qE86bbarc93fcbaha8J9ch1:NfghRbbag9cjjjjz:dgg9qE86bbarc94fcbahag9ca1:NfghRbbai8Xbe9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbarc95fcbaha8J9c8N1:NfgiRbbag9cjjjjjw:dg8J9qE86bbarc96fcbaia8J9c8M1:NfgiRbbag9cjjjjjl:dg8J9qE86bbarc97fcbaia8J9c8L1:NfgiRbbag9cjjjjjd:dg8J9qE86bbarc98fcbaia8J9c8K1:NfgiRbbag9cjjjjje:dg8J9qE86bbarc99fcbaia8J9c8J1:NfgiRbbag9cjjjj;ab:dg8J9qE86bbarc9:fcbaia8J9cg1:NfgiRbbag9cjjjja:dg8J9qE86bbarcufcbaia8J9ch1:NfgiRbbag9cjjjjz:dgg9qE86bbaiag9ca1:NfhixikaraiRblaiRbbghco4g8Ka8KciSg8KE86bbaqaofgrcGfaiclfa8Kfg8KRbbahcl4ciGg8La8LciSg8LE86bbarcVfa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc7fa8Ka8Lfg8KRbbahciGghahciSghE86bbarctfa8Kahfg8KRbbaiRbeghco4g8La8LciSg8LE86bbarc91fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc4fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc93fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc94fa8Kahfg8KRbbaiRbdghco4g8La8LciSg8LE86bbarc95fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc96fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc97fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc98fa8KahfghRbbaiRbigico4g8Ka8KciSg8KE86bbarc99faha8KfghRbbaicl4ciGg8Ka8KciSg8KE86bbarc9:faha8KfghRbbaicd4ciGg8Ka8KciSg8KE86bbarcufaha8KfgrRbbaiciGgiaiciSgiE86bbaraifhixdkaraiRbwaiRbbghcl4g8Ka8KcsSg8KE86bbaqaofgrcGfaicwfa8Kfg8KRbbahcsGghahcsSghE86bbarcVfa8KahfghRbbaiRbeg8Kcl4g8La8LcsSg8LE86bbarc7faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarctfaha8KfghRbbaiRbdg8Kcl4g8La8LcsSg8LE86bbarc91faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc4faha8KfghRbbaiRbig8Kcl4g8La8LcsSg8LE86bbarc93faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc94faha8KfghRbbaiRblg8Kcl4g8La8LcsSg8LE86bbarc95faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc96faha8KfghRbbaiRbvg8Kcl4g8La8LcsSg8LE86bbarc97faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc98faha8KfghRbbaiRbog8Kcl4g8La8LcsSg8LE86bbarc99faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc9:faha8KfghRbbaiRbrgicl4g8Ka8KcsSg8KE86bbarcufaha8KfgrRbbaicsGgiaicsSgiE86bbaraifhixekarai8Pbw83bwarai8Pbb83bbaiczfhikdnaoaC9pmbalcdfhlaoczfhraPai9RcL0mekkaoaC6moaimexokaCmva8FTmvkaqaAfhqa8Ecefg8Ecl9hmbkdndndndnawTmbasa8Acd4fRbbgociGPlbedrbkaATmdaza8Afh8Fazcj;cbfhhcbh8EaEhaina8FRbbhraahocbhlinaoahalfRbbgqce4cbaqceG9R7arfgr86bbaoadfhoaAalcefgl9hmbkaacefhaa8Fcefh8FahaAfhha8Ecefg8Ecl9hmbxikkaATmeaza8Afhaazcj;cbfhhcbhoceh8EaYh8FinaEaofhlaa8Vbbhrcbhoinala8FaofRbbcwtahaofRbbgqVc;:FiGce4cbaqceG9R7arfgr87bbaladfhlaLaocefgofmbka8FaQfh8FcdhoaacdfhaahaQfhha8EceGhlcbh8EalmbxdkkaATmbaocl4h8Eaza8AfRbbhqcwhoa3hlinalRbbaotaqVhqalcefhlaocwfgoca9hmbkcbhhaEh8FaYhainazcj;cbfahfRbbhrcwhoaahlinalRbbaotarVhralaAfhlaocwfgoca9hmbkara8E94aq7hqcbhoa8Fhlinalaqao486bbalcefhlaocwfgoca9hmbka8Fadfh8FaacefhaahcefghaA9hmbkkaEclfhEa3clfh3a8Aclfg8Aad6mbkaXazcjdfaAad2z:jjjjb8AazazcjdfaAcufad2fadz:jjjjb8AaAaOfhOaihxaimbkc9:hoxdkcbc99aPax9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaok:ysezu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnalaeci9UgrcHf6mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecjez:kjjjb8Aav9cu83iUav9cu83i8Wav9cu83iyav9cu83iaav9cu83iKav9cu83izav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhldnaeTmbcmcsaDceSEhkcbhxcbhmcbhrcbhicbhoindnalaq9nmbc9:hoxikdndnawRbbgDc;Ve0mbavc;abfaoaDcu7gPcl4fcsGcitfgsydlhzasydbhHdndnaDcsGgsak9pmbavaiaPfcsGcdtfydbaxasEhDaxasTgOfhxxekdndnascsSmbcehOasc987asamffcefhDxekalcefhDal8SbbgscFeGhPdndnascu9mmbaDhlxekalcvfhlaPcFbGhPcrhsdninaD8SbbgOcFbGastaPVhPaOcu9kmeaDcefhDascrfgsc8J9hmbxdkkaDcefhlkcehOaPce4cbaPceG9R7amfhDkaDhmkavc;abfaocitfgsaDBdbasazBdlavaicdtfaDBdbavc;abfaocefcsGcitfgsaHBdbasaDBdlaocdfhoaOaifhidnadcd9hmbabarcetfgsaH87ebasclfaD87ebascdfaz87ebxdkabarcdtfgsaHBdbascwfaDBdbasclfazBdbxekdnaDcpe0mbavaiaqaDcsGfRbbgscl4gP9RcsGcdtfydbaxcefgOaPEhDavaias9RcsGcdtfydbaOaPTgzfgOascsGgPEhsaPThPdndnadcd9hmbabarcetfgHax87ebaHclfas87ebaHcdfaD87ebxekabarcdtfgHaxBdbaHcwfasBdbaHclfaDBdbkavaicdtfaxBdbavc;abfaocitfgHaDBdbaHaxBdlavaicefgicsGcdtfaDBdbavc;abfaocefcsGcitfgHasBdbaHaDBdlavaiazfgicsGcdtfasBdbavc;abfaocdfcsGcitfgDaxBdbaDasBdlaocifhoaiaPfhiaOaPfhxxekaxcbalRbbgsEgHaDc;:eSgDfhOascsGhAdndnascl4gCmbaOcefhzxekaOhzavaiaC9RcsGcdtfydbhOkdndnaAmbazcefhxxekazhxavaias9RcsGcdtfydbhzkdndnaDTmbalcefhDxekalcdfhDal8SbegPcFeGhsdnaPcu9kmbalcofhHascFbGhscrhldninaD8SbbgPcFbGaltasVhsaPcu9kmeaDcefhDalcrfglc8J9hmbkaHhDxekaDcefhDkasce4cbasceG9R7amfgmhHkdndnaCcsSmbaDhsxekaDcefhsaD8SbbglcFeGhPdnalcu9kmbaDcvfhOaPcFbGhPcrhldninas8SbbgDcFbGaltaPVhPaDcu9kmeascefhsalcrfglc8J9hmbkaOhsxekascefhskaPce4cbaPceG9R7amfgmhOkdndnaAcsSmbashlxekascefhlas8SbbgDcFeGhPdnaDcu9kmbascvfhzaPcFbGhPcrhDdninal8SbbgscFbGaDtaPVhPascu9kmealcefhlaDcrfgDc8J9hmbkazhlxekalcefhlkaPce4cbaPceG9R7amfgmhzkdndnadcd9hmbabarcetfgDaH87ebaDclfaz87ebaDcdfaO87ebxekabarcdtfgDaHBdbaDcwfazBdbaDclfaOBdbkavc;abfaocitfgDaOBdbaDaHBdlavaicdtfaHBdbavc;abfaocefcsGcitfgDazBdbaDaOBdlavaicefgicsGcdtfaOBdbavc;abfaocdfcsGcitfgDaHBdbaDazBdlavaiaCTaCcsSVfgicsGcdtfazBdbaiaATaAcsSVfhiaocifhokawcefhwaocsGhoaicsGhiarcifgrae6mbkkcbc99alaqSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnalaecvf9pmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk:Lvoeue99dud99eud99dndnadcl9hmbaeTmeindndnabcdfgd8Sbb:Yab8Sbbgi:Ygl:l:tabcefgv8Sbbgo:Ygr:l:tgwJbb;:9cawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai86bbdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad86bbdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad86bbabclfhbaecufgembxdkkaeTmbindndnabclfgd8Ueb:Yab8Uebgi:Ygl:l:tabcdfgv8Uebgo:Ygr:l:tgwJb;:FSawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai87ebdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad87ebdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad87ebabcwfhbaecufgembkkk:4ioiue99dud99dud99dnaeTmbcbhiabhlindndnal8Uebgv:YgoJ:ji:1Salcof8UebgrciVgw:Y:vgDNJbbbZJbbb:;avcu9kEMgq:lJbbb9p9DTmbaq:Ohkxekcjjjj94hkkalclf8Uebhvalcdf8UebhxalarcefciGcetfak87ebdndnax:YgqaDNJbbbZJbbb:;axcu9kEMgm:lJbbb9p9DTmbam:Ohxxekcjjjj94hxkabaiarciGgkfcd7cetfax87ebdndnav:YgmaDNJbbbZJbbb:;avcu9kEMgP:lJbbb9p9DTmbaP:Ohvxekcjjjj94hvkalarcufciGcetfav87ebdndnawaw2:ZgPaPMaoaoN:taqaqN:tamamN:tgoJbbbbaoJbbbb9GE:raDNJbbbZMgD:lJbbb9p9DTmbaD:Ohrxekcjjjj94hrkalakcetfar87ebalcwfhlaiclfhiaecufgembkkk9mbdnadcd4ae2gdTmbinababydbgecwtcw91:Yaece91cjjj98Gcjjj;8if::NUdbabclfhbadcufgdmbkkk:Tvirud99eudndnadcl9hmbaeTmeindndnabRbbgiabcefgl8Sbbgvabcdfgo8Sbbgrf9R:YJbbuJabcifgwRbbgdce4adVgDcd4aDVgDcl4aDVgD:Z:vgqNJbbbZMgk:lJbbb9p9DTmbak:Ohxxekcjjjj94hxkaoax86bbdndnaraif:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohoxekcjjjj94hokalao86bbdndnavaifar9R:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohixekcjjjj94hikabai86bbdndnaDadcetGadceGV:ZaqNJbbbZMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkawad86bbabclfhbaecufgembxdkkaeTmbindndnab8Vebgiabcdfgl8Uebgvabclfgo8Uebgrf9R:YJbFu9habcofgw8Vebgdce4adVgDcd4aDVgDcl4aDVgDcw4aDVgD:Z:vgqNJbbbZMgk:lJbbb9p9DTmbak:Ohxxekcjjjj94hxkaoax87ebdndnaraif:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohoxekcjjjj94hokalao87ebdndnavaifar9R:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohixekcjjjj94hikabai87ebdndnaDadcetGadceGV:ZaqNJbbbZMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkawad87ebabcwfhbaecufgembkkk9teiucbcbyd:K:G:cjbgeabcifc98GfgbBd:K:G:cjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;LeeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiclfaeclfydbBdbaicwfaecwfydbBdbaicxfaecxfydbBdbaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk;aeedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdbaicxfalBdbaicwfalBdbaiclfalBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabkk83dbcj:Gdk8Kbbbbdbbblbbbwbbbbbbbebbbdbbblbbbwbbbbc:K:Gdkl8W:qbb`,
      t = `b9H79TebbbeKl9Gbb9Gvuuuuueu9Giuuub9Geueuixkbbebeeddddilve9Weeeviebeoweuecj:Gdkr;Neqo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbdY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVblE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtboK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbrL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949WbwY9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVJ9V29VVbDl79IV9Rbqq:W9Dklbzik94evu8Jjjjjbcz9Rhbcbheincbhdcbhiinabcwfadfaicjuaead4ceGglE86bbaialfhiadcefgdcw9hmbkaeai86b:q:W:cjbaecitab8Piw83i:q:G:cjbaecefgecjd9hmbkk:JBl8Aud97dur978Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaialfgxar9RhodnadTgmmbavaoad;8qbbkaicefhPcj;abad9Uc;WFbGcjdadca0EhsdndndnadTmbaoadfhzcbhHinaeaH9nmdaxaP9RaD6miabaHad2fhOaPaDfhAasaeaH9RaHasfae6EgCcsfgocl4cifcd4hXavcj;cbfaoc9WGgQcetfhLavcj;cbfaQci2fhKavcj;cbfaQfhYcbh8Aaoc;ab6hEincbh3dnawTmbaPa8Acd4fRbbh3kcbh5avcj;cbfh8Eindndndndna3a5cet4ciGgoc9:fPdebdkaxaA9RaQ6mwdnaQTmbavcj;cbfa5aQ2faAaQ;8qbbkaAaCfhAxdkaQTmeavcj;cbfa5aQ2fcbaQ;8kbxekaxaA9RaX6moaoclVcbawEhraAaXfhocbhidnaEmbaxao9Rc;Gb6mbcbhlina8EalfhidndndndndndnaAalco4fRbbgqciGarfPDbedibledibkaipxbbbbbbbbbbbbbbbbpklbxlkaiaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaiaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaiaopbbbpklbaoczfhoxekaiaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqcd4ciGarfPDbedibledibkaiczfpxbbbbbbbbbbbbbbbbpklbxlkaiczfaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaiczfaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaiczfaopbbbpklbaoczfhoxekaiczfaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqcl4ciGarfPDbedibledibkaicafpxbbbbbbbbbbbbbbbbpklbxlkaicafaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaicafaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaicafaopbbbpklbaoczfhoxekaicafaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqco4arfPDbedibledibkaic8Wfpxbbbbbbbbbbbbbbbbpklbxlkaic8Wfaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Ngicitpbi:q:G:cjbaiRb:q:W:cjbgipsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbaiaoclffaqRb:q:W:cjbfhoxikaic8Wfaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Ngicitpbi:q:G:cjbaiRb:q:W:cjbgipsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbaiaocwffaqRb:q:W:cjbfhoxdkaic8Wfaopbbbpklbaoczfhoxekaic8WfaopbbdaoRbbgicitpbi:q:G:cjbaiRb:q:W:cjbgipsaoRbegqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbaiaocdffaqRb:q:W:cjbfhokalc;abfhialcjefaQ0meaihlaxao9Rc;Fb0mbkkdnaiaQ9pmbaici4hlinaxao9RcK6mwa8EaifhqdndndndndndnaAaico4fRbbalcoG4ciGarfPDbedibledibkaqpxbbbbbbbbbbbbbbbbpkbbxlkaqaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spkbbahaoclffagRb:q:W:cjbfhoxikaqaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spkbbahaocwffagRb:q:W:cjbfhoxdkaqaopbbbpkbbaoczfhoxekaqaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpkbbahaocdffagRb:q:W:cjbfhokalcdfhlaiczfgiaQ6mbkkaohAaoTmoka8EaQfh8Ea5cefg5cl9hmbkdndndndnawTmbaza8Acd4fRbbglciGPlbedwbkaQTmdavcjdfa8Afhlava8Afpbdbh8Jcbhoinalavcj;cbfaofpblbg8KaYaofpblbg8LpmbzeHdOiAlCvXoQrLg8MaLaofpblbg8NaKaofpblbgypmbzeHdOiAlCvXoQrLg8PpmbezHdiOAlvCXorQLg8Fcep9Ta8Fpxeeeeeeeeeeeeeeeegap9op9Hp9rg8Fa8Jp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ma8PpmwDKYqk8AExm35Ps8E8Fg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ka8LpmwKDYq8AkEx3m5P8Es8Fg8Ka8NaypmwKDYq8AkEx3m5P8Es8Fg8LpmbezHdiOAlvCXorQLg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ka8LpmwDKYqk8AExm35Ps8E8Fg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ugap9Abbbaladfglaaa8Fa8Fpmlvorlvorlvorlvorp9Ugap9Abbbaladfglaaa8Fa8FpmwDqkwDqkwDqkwDqkp9Ugap9Abbbaladfglaaa8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9AbbbaladfhlaoczfgoaQ6mbxikkaQTmeavcjdfa8Afhlava8Afpbdbh8Jcbhoinalavcj;cbfaofpblbg8KaYaofpblbg8LpmbzeHdOiAlCvXoQrLg8MaLaofpblbg8NaKaofpblbgypmbzeHdOiAlCvXoQrLg8PpmbezHdiOAlvCXorQLg8Fcep:nea8Fpxebebebebebebebebgap9op:bep9rg8Fa8Jp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ma8PpmwDKYqk8AExm35Ps8E8Fg8Fcep:nea8Faap9op:bep9rg8Fp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ka8LpmwKDYq8AkEx3m5P8Es8Fg8Ka8NaypmwKDYq8AkEx3m5P8Es8Fg8LpmbezHdiOAlvCXorQLg8Fcep:nea8Faap9op:bep9rg8Fp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ka8LpmwDKYqk8AExm35Ps8E8Fg8Fcep:nea8Faap9op:bep9rg8Fp:oegap9Abbbaladfglaaa8Fa8Fpmlvorlvorlvorlvorp:oegap9Abbbaladfglaaa8Fa8FpmwDqkwDqkwDqkwDqkp:oegap9Abbbaladfglaaa8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9AbbbaladfhlaoczfgoaQ6mbxdkkaQTmbcbhocbalcl4gl9Rc8FGhiavcjdfa8Afhrava8Afpbdbhainaravcj;cbfaofpblbg8JaYaofpblbg8KpmbzeHdOiAlCvXoQrLg8LaLaofpblbg8MaKaofpblbg8NpmbzeHdOiAlCvXoQrLgypmbezHdiOAlvCXorQLg8Faip:Rea8Falp:Tep9qg8Faap9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8LaypmwDKYqk8AExm35Ps8E8Fg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8Ja8KpmwKDYq8AkEx3m5P8Es8Fg8Ja8Ma8NpmwKDYq8AkEx3m5P8Es8Fg8KpmbezHdiOAlvCXorQLg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8Ja8KpmwDKYqk8AExm35Ps8E8Fg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9AbbbaradfhraoczfgoaQ6mbkka8Aclfg8Aad6mbkdnaCad2goTmbaOavcjdfao;8qbbkdnammbavavcjdfaCcufad2fad;8qbbkaCaHfhHc9:hoaAhPaAmbxlkkaeTmbaDalfhrcbhocuhlinaralaD9RglfaD6mdasaeao9Raoasfae6Eaofgoae6mbkaial9RhPkcbc99axaP9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaokwbz:bjjjbkNsezu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnalaeci9UgrcHf6mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecje;8kbav9cu83iUav9cu83i8Wav9cu83iyav9cu83iaav9cu83iKav9cu83izav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhldnaeTmbcmcsaDceSEhkcbhxcbhmcbhrcbhicbhoindnalaq9nmbc9:hoxikdndnawRbbgDc;Ve0mbavc;abfaoaDcu7gPcl4fcsGcitfgsydlhzasydbhHdndnaDcsGgsak9pmbavaiaPfcsGcdtfydbaxasEhDaxasTgOfhxxekdndnascsSmbcehOasc987asamffcefhDxekalcefhDal8SbbgscFeGhPdndnascu9mmbaDhlxekalcvfhlaPcFbGhPcrhsdninaD8SbbgOcFbGastaPVhPaOcu9kmeaDcefhDascrfgsc8J9hmbxdkkaDcefhlkcehOaPce4cbaPceG9R7amfhDkaDhmkavc;abfaocitfgsaDBdbasazBdlavaicdtfaDBdbavc;abfaocefcsGcitfgsaHBdbasaDBdlaocdfhoaOaifhidnadcd9hmbabarcetfgsaH87ebasclfaD87ebascdfaz87ebxdkabarcdtfgsaHBdbascwfaDBdbasclfazBdbxekdnaDcpe0mbavaiaqaDcsGfRbbgscl4gP9RcsGcdtfydbaxcefgOaPEhDavaias9RcsGcdtfydbaOaPTgzfgOascsGgPEhsaPThPdndnadcd9hmbabarcetfgHax87ebaHclfas87ebaHcdfaD87ebxekabarcdtfgHaxBdbaHcwfasBdbaHclfaDBdbkavaicdtfaxBdbavc;abfaocitfgHaDBdbaHaxBdlavaicefgicsGcdtfaDBdbavc;abfaocefcsGcitfgHasBdbaHaDBdlavaiazfgicsGcdtfasBdbavc;abfaocdfcsGcitfgDaxBdbaDasBdlaocifhoaiaPfhiaOaPfhxxekaxcbalRbbgsEgHaDc;:eSgDfhOascsGhAdndnascl4gCmbaOcefhzxekaOhzavaiaC9RcsGcdtfydbhOkdndnaAmbazcefhxxekazhxavaias9RcsGcdtfydbhzkdndnaDTmbalcefhDxekalcdfhDal8SbegPcFeGhsdnaPcu9kmbalcofhHascFbGhscrhldninaD8SbbgPcFbGaltasVhsaPcu9kmeaDcefhDalcrfglc8J9hmbkaHhDxekaDcefhDkasce4cbasceG9R7amfgmhHkdndnaCcsSmbaDhsxekaDcefhsaD8SbbglcFeGhPdnalcu9kmbaDcvfhOaPcFbGhPcrhldninas8SbbgDcFbGaltaPVhPaDcu9kmeascefhsalcrfglc8J9hmbkaOhsxekascefhskaPce4cbaPceG9R7amfgmhOkdndnaAcsSmbashlxekascefhlas8SbbgDcFeGhPdnaDcu9kmbascvfhzaPcFbGhPcrhDdninal8SbbgscFbGaDtaPVhPascu9kmealcefhlaDcrfgDc8J9hmbkazhlxekalcefhlkaPce4cbaPceG9R7amfgmhzkdndnadcd9hmbabarcetfgDaH87ebaDclfaz87ebaDcdfaO87ebxekabarcdtfgDaHBdbaDcwfazBdbaDclfaOBdbkavc;abfaocitfgDaOBdbaDaHBdlavaicdtfaHBdbavc;abfaocefcsGcitfgDazBdbaDaOBdlavaicefgicsGcdtfaOBdbavc;abfaocdfcsGcitfgDaHBdbaDazBdlavaiaCTaCcsSVfgicsGcdtfazBdbaiaATaAcsSVfhiaocifhokawcefhwaocsGhoaicsGhiarcifgrae6mbkkcbc99alaqSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnalaecvf9pmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk;Toio97eue97aec98Ghedndnadcl9hmbaeTmecbhdinababpbbbgicKp:RecKp:Sep;6eglaicwp:RecKp:Sep;6ealp;Geaiczp:RecKp:Sep;6egvp;Gep;Kep;Legopxbbbbbbbbbbbbbbbbp:2egralpxbbbjbbbjbbbjbbbjgwp9op9rp;Keglpxbb;:9cbb;:9cbb;:9cbb;:9calalp;Meaoaop;Meavaravawp9op9rp;Keglalp;Mep;Kep;Kep;Jep;Negvp;Mepxbbn0bbn0bbn0bbn0grp;KepxFbbbFbbbFbbbFbbbp9oaipxbbbFbbbFbbbFbbbFp9op9qalavp;Mearp;Kecwp:RepxbFbbbFbbbFbbbFbbp9op9qaoavp;Mearp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qpkbbabczfhbadclfgdae6mbxdkkaeTmbcbhdinabczfgDaDpbbbgipxbbbbbbFFbbbbbbFFgwp9oabpbbbgoaipmbediwDqkzHOAKY8AEgvczp:Reczp:Sep;6eglaoaipmlvorxmPsCXQL358E8FpxFubbFubbFubbFubbp9op;6eavczp:Sep;6egvp;Gealp;Gep;Kep;Legipxbbbbbbbbbbbbbbbbp:2egralpxbbbjbbbjbbbjbbbjgqp9op9rp;Keglpxb;:FSb;:FSb;:FSb;:FSalalp;Meaiaip;Meavaravaqp9op9rp;Keglalp;Mep;Kep;Kep;Jep;Negvp;Mepxbbn0bbn0bbn0bbn0grp;KepxFFbbFFbbFFbbFFbbp9oaiavp;Mearp;Keczp:Rep9qgialavp;Mearp;KepxFFbbFFbbFFbbFFbbp9oglpmwDKYqk8AExm35Ps8E8Fp9qpkbbabaoawp9oaialpmbezHdiOAlvCXorQLp9qpkbbabcafhbadclfgdae6mbkkk;2ileue97euo97dnaec98GgiTmbcbheinabcKfpx:ji:1S:ji:1S:ji:1S:ji:1SabpbbbglabczfgvpbbbgopmlvorxmPsCXQL358E8Fgrczp:Segwpxibbbibbbibbbibbbp9qp;6egDp;NegqaDaDp;MegDaDp;KealaopmbediwDqkzHOAKY8AEgDczp:Reczp:Sep;6eglalp;MeaDczp:Sep;6egoaop;Mearczp:Reczp:Sep;6egrarp;Mep;Kep;Kep;Lepxbbbbbbbbbbbbbbbbp:4ep;Jep;Mepxbbn0bbn0bbn0bbn0gDp;KepxFFbbFFbbFFbbFFbbgkp9oaqaop;MeaDp;Keczp:Rep9qgoaqalp;MeaDp;Keakp9oaqarp;MeaDp;Keczp:Rep9qgDpmwDKYqk8AExm35Ps8E8Fglp5eawclp:RegqpEi:T:j83ibavalp5baqpEd:T:j83ibabcwfaoaDpmbezHdiOAlvCXorQLgDp5eaqpEe:T:j83ibabaDp5baqpEb:T:j83ibabcafhbaeclfgeai6mbkkkuee97dnadcd4ae2c98GgeTmbcbhdinababpbbbgicwp:Recwp:Sep;6eaicep:SepxbbjFbbjFbbjFbbjFp9opxbbjZbbjZbbjZbbjZp:Uep;Mepkbbabczfhbadclfgdae6mbkkk:Sodw97euaec98Ghedndnadcl9hmbaeTmecbhdinabpxbbuJbbuJbbuJbbuJabpbbbgicKp:TeglaicYp:Tep9qgvcdp:Teavp9qgvclp:Teavp9qgop;6ep;Negvaicwp:RecKp:SegraipxFbbbFbbbFbbbFbbbgwp9ogDp:Uep;6ep;Mepxbbn0bbn0bbn0bbn0gqp;Kecwp:RepxbFbbbFbbbFbbbFbbp9oavaDarp:Xeaiczp:RecKp:Segip:Uep;6ep;Meaqp;Keawp9op9qavaDaraip:Uep:Xep;6ep;Meaqp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qavaoalcep:Rep9oalpxebbbebbbebbbebbbp9op9qp;6ep;Meaqp;KecKp:Rep9qpkbbabczfhbadclfgdae6mbxdkkaeTmbcbhdinabczfgkpxbFu9hbFu9hbFu9hbFu9habpbbbglakpbbbgrpmlvorxmPsCXQL358E8Fgvczp:TegqavcHp:Tep9qgicdp:Teaip9qgiclp:Teaip9qgicwp:Teaip9qgop;6ep;NegialarpmbediwDqkzHOAKY8AEgDpxFFbbFFbbFFbbFFbbglp9ograDczp:Segwp:Ueavczp:Reczp:SegDp:Xep;6ep;Mepxbbn0bbn0bbn0bbn0gvp;Kealp9oaiarawaDp:Uep:Xep;6ep;Meavp;Keczp:Rep9qgwaiaoaqcep:Rep9oaqpxebbbebbbebbbebbbp9op9qp;6ep;Meavp;Keczp:ReaiaDarp:Uep;6ep;Meavp;Kealp9op9qgipmwDKYqk8AExm35Ps8E8FpkbbabawaipmbezHdiOAlvCXorQLpkbbabcafhbadclfgdae6mbkkk9teiucbcbydj:G:cjbgeabcifc98GfgbBdj:G:cjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaikkxebcj:Gdklz:zbb`,
      n = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 3, 2, 0, 0, 5, 3, 1, 0, 1, 12, 1, 0, 10, 22, 2, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11, 7, 0, 65, 0, 253, 15, 26, 11]),
      r = new Uint8Array([32, 0, 65, 2, 1, 106, 34, 33, 3, 128, 11, 4, 13, 64, 6, 253, 10, 7, 15, 116, 127, 5, 8, 12, 40, 16, 19, 54, 20, 9, 27, 255, 113, 17, 42, 67, 24, 23, 146, 148, 18, 14, 22, 45, 70, 69, 56, 114, 101, 21, 25, 63, 75, 136, 108, 28, 118, 29, 73, 115]);
    if (typeof WebAssembly != `object`) return {
      supported: !1
    };
    var i = WebAssembly.validate(n) ? s(t) : s(e),
      a,
      o = WebAssembly.instantiate(i, {}).then(function (e) {
        a = e.instance, a.exports.__wasm_call_ctors();
      });
    function s(e) {
      for (var t = new Uint8Array(e.length), n = 0; n < e.length; ++n) {
        var i = e.charCodeAt(n);
        t[n] = i > 96 ? i - 97 : i > 64 ? i - 39 : i + 4;
      }
      for (var a = 0, n = 0; n < e.length; ++n) t[a++] = t[n] < 60 ? r[t[n]] : (t[n] - 60) * 64 + t[++n];
      return t.buffer.slice(0, a);
    }
    function c(e, t, n, r, i, a, o) {
      var s = e.exports.sbrk,
        c = r + 3 & -4,
        l = s(c * i),
        u = s(a.length),
        d = new Uint8Array(e.exports.memory.buffer);
      d.set(a, u);
      var f = t(l, r, i, u, a.length);
      if (f == 0 && o && o(l, c, i), n.set(d.subarray(l, l + r * i)), s(l - s(0)), f != 0) throw Error(`Malformed buffer data: ` + f);
    }
    var l = {
        NONE: ``,
        OCTAHEDRAL: `meshopt_decodeFilterOct`,
        QUATERNION: `meshopt_decodeFilterQuat`,
        EXPONENTIAL: `meshopt_decodeFilterExp`,
        COLOR: `meshopt_decodeFilterColor`
      },
      u = {
        ATTRIBUTES: `meshopt_decodeVertexBuffer`,
        TRIANGLES: `meshopt_decodeIndexBuffer`,
        INDICES: `meshopt_decodeIndexSequence`
      },
      d = [],
      f = 0;
    function p(e) {
      var t = {
        object: new Worker(e),
        pending: 0,
        requests: {}
      };
      return t.object.onmessage = function (e) {
        var n = e.data;
        t.pending -= n.count, t.requests[n.id][n.action](n.value), delete t.requests[n.id];
      }, t;
    }
    function m(e) {
      for (var t = `self.ready = WebAssembly.instantiate(new Uint8Array([` + new Uint8Array(i) + `]), {}).then(function(result) { result.instance.exports.__wasm_call_ctors(); return result.instance; });self.onmessage = ` + g.name + `;` + c.toString() + g.toString(), n = new Blob([t], {
          type: `text/javascript`
        }), r = URL.createObjectURL(n), a = d.length; a < e; ++a) d[a] = p(r);
      for (var a = e; a < d.length; ++a) d[a].object.postMessage({});
      d.length = e, URL.revokeObjectURL(r);
    }
    function h(e, t, n, r, i) {
      for (var a = d[0], o = 1; o < d.length; ++o) d[o].pending < a.pending && (a = d[o]);
      return new Promise(function (o, s) {
        var c = new Uint8Array(n),
          l = ++f;
        a.pending += e, a.requests[l] = {
          resolve: o,
          reject: s
        }, a.object.postMessage({
          id: l,
          count: e,
          size: t,
          source: c,
          mode: r,
          filter: i
        }, [c.buffer]);
      });
    }
    function g(e) {
      var t = e.data;
      self.ready.then(function (e) {
        if (!t.id) return self.close();
        try {
          var n = new Uint8Array(t.count * t.size);
          c(e, e.exports[t.mode], n, t.count, t.size, t.source, e.exports[t.filter]), self.postMessage({
            id: t.id,
            count: t.count,
            action: `resolve`,
            value: n
          }, [n.buffer]);
        } catch (e) {
          self.postMessage({
            id: t.id,
            count: t.count,
            action: `reject`,
            value: e
          });
        }
      });
    }
    return {
      ready: o,
      supported: !0,
      useWorkers: function (e) {
        m(e);
      },
      decodeVertexBuffer: function (e, t, n, r, i) {
        c(a, a.exports.meshopt_decodeVertexBuffer, e, t, n, r, a.exports[l[i]]);
      },
      decodeIndexBuffer: function (e, t, n, r) {
        c(a, a.exports.meshopt_decodeIndexBuffer, e, t, n, r);
      },
      decodeIndexSequence: function (e, t, n, r) {
        c(a, a.exports.meshopt_decodeIndexSequence, e, t, n, r);
      },
      decodeGltfBuffer: function (e, t, n, r, i, o) {
        c(a, a.exports[u[i]], e, t, n, r, a.exports[l[o]]);
      },
      decodeGltfBufferAsync: function (e, t, n, r, i) {
        return d.length > 0 ? h(e, t, n, u[r], l[i]) : o.then(function () {
          var o = new Uint8Array(e * t);
          return c(a, a.exports[u[r]], o, e, t, n, a.exports[l[i]]), o;
        });
      }
    };
  }(),
  E_ = {
    civic: {
      fill: 1,
      stretch: 1.6,
      h: 80,
      colliders: [[0.86, 0.62, 0, 0.62], [0.12, 0.18, 0, 1]]
    },
    convention: {
      fill: 0.97,
      stretch: 1.5,
      h: 50,
      tint: [1.12, 1.12, 1.1],
      metal: 0.12,
      rough: 0.55,
      colliders: [[0.95, 0.9, 0, 1]]
    },
    library: {
      fill: 0.95,
      stretch: 1.4,
      colliders: [[0.95, 0.9, 0, 1]]
    },
    concert: {
      fill: 0.95,
      stretch: 1.4,
      colliders: [[0.7, 0.9, 0, 0.9]]
    },
    szse: {
      fill: 1,
      stretch: 1.3,
      remapY: [[0, 0.45, 0, 36 / 245.8], [0.45, 0.75, 36 / 245.8, 62 / 245.8], [0.75, 1, 62 / 245.8, 1]],
      colliders: [[0.95, 0.95, 36 / 245.8, 62 / 245.8], [0.5, 0.6, 0, 1]]
    },
    upperhills: {
      fill: 1,
      stretch: 1.4,
      colliders: [[0.95, 0.95, 0, 1]]
    }
  };

async function D_(e, t, n, r = new Set()) {
  let i = new GLTFLoader();
  i.setMeshoptDecoder(T_);
  let a = (t.landmarkModels || []).filter(e => !r.has(e.id)),
    o = [],
    s = [],
    c = 0;
  return await Promise.all(a.map(async t => {
    let r = E_[t.id] || {},
      l = r.h || t.h,
      u;
    try {
      u = await i.loadAsync(`./models/` + t.file);
    } catch (e) {
      console.warn(`地标模型加载失败`, t.id, e);
      return;
    }
    let d = u.scene;
    r.remapY && O_(d, r.remapY);
    let f = new Box3().setFromObject(d),
      p = f.getSize(new Vector3()),
      m = f.getCenter(new Vector3()),
      h = p.x >= p.z,
      g = h ? p.x : p.z,
      _ = h ? p.z : p.x,
      v = t.L * (r.fill || 1) / g,
      y = t.W * (r.fill || 1) / _,
      b = r.stretch || 1.4;
    v / y > b && (v = y * b), y / v > b && (y = v * b);
    let x = l / p.y,
      S = new Group();
    d.position.set(-m.x, -f.min.y, -m.z), S.add(d), S.scale.set(h ? v : y, x, h ? y : v);
    let C = new Group();
    C.add(S);
    let w = (h ? -t.ang : Math.PI / 2 - t.ang) + (r.yaw || 0);
    C.rotation.y = w;
    let T = Math.cos(t.ang),
      E = Math.sin(t.ang),
      D = 1 / 0;
    for (let [e, n] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      let r = t.x + T * e * t.L / 2 - E * n * t.W / 2,
        i = t.z + E * e * t.L / 2 + T * n * t.W / 2;
      D = Math.min(D, $(r, i));
    }
    C.position.set(t.x, D - 0.3, t.z), d.traverse(e => {
      if (!e.isMesh) return;
      e.renderOrder = 5;
      let t = e.material;
      r.tint && t.color && t.color.setRGB(...r.tint), r.metal != null && `metalness` in t && (t.metalness = Math.min(t.metalness ?? 1, r.metal)), r.rough != null && `roughness` in t && (t.roughness = Math.max(t.roughness ?? 0, r.rough)), `envMapIntensity` in t && (t.envMapIntensity = 1), t.isMeshStandardMaterial && Md(t);
    }), e.add(C), s.push(C);
    for (let [e, n, i, a] of r.colliders || [[0.9, 0.9, 0, 1]]) {
      let r = t.L * e / 2,
        s = t.W * n / 2,
        c = [[-r, -s], [r, -s], [r, s], [-r, s]].map(([e, n]) => new Vector2(t.x + T * e - E * n, t.z + E * e + T * n)),
        u = c.map(e => e.x),
        d = c.map(e => e.y);
      o.push({
        rings: [c],
        minX: Math.min(...u),
        maxX: Math.max(...u),
        minZ: Math.min(...d),
        maxZ: Math.max(...d),
        bottom: D + l * i - (i === 0 ? 2 : 0),
        top: D + l * a,
        name: t.name,
        h: l
      });
    }
    c++, n && n(c / a.length);
  })), {
    colliders: o,
    objects: s
  };
}

function O_(e, t) {
  e.updateMatrixWorld(!0);
  let n = new Matrix4().copy(e.matrixWorld).invert(),
    r = [];
  e.traverse(e => {
    e.isMesh && r.push(e);
  });
  let i = new Box3().setFromObject(e),
    a = i.min.y,
    o = i.max.y - i.min.y,
    s = new Vector3();
  for (let i of r) {
    let r = new Matrix4().multiplyMatrices(n, i.matrixWorld),
      c = i.geometry,
      l = c.attributes.position,
      u = new Float32Array(l.count * 3);
    for (let e = 0; e < l.count; e++) {
      s.fromBufferAttribute(l, e).applyMatrix4(r);
      let n = (s.y - a) / o;
      for (let [e, r, i, a] of t) if (n >= e - 1e-6 && n <= r + 1e-6) {
        n = i + (n - e) / (r - e) * (a - i);
        break;
      }
      u[e * 3] = s.x, u[e * 3 + 1] = a + n * o, u[e * 3 + 2] = s.z;
    }
    if (c.setAttribute(`position`, new BufferAttribute(u, 3)), c.attributes.normal) {
      let e = c.attributes.normal,
        t = new Float32Array(e.count * 3),
        n = new Matrix3().getNormalMatrix(r);
      for (let r = 0; r < e.count; r++) s.fromBufferAttribute(e, r).applyMatrix3(n).normalize(), t[r * 3] = s.x, t[r * 3 + 1] = s.y, t[r * 3 + 2] = s.z;
      c.setAttribute(`normal`, new BufferAttribute(t, 3));
    }
    c.computeBoundingBox(), c.computeBoundingSphere(), i.removeFromParent(), i.position.set(0, 0, 0), i.rotation.set(0, 0, 0), i.scale.set(1, 1, 1), e.add(i);
  }
  e.updateMatrixWorld(!0);
}

function k_(e) {
  return function () {
    e |= 0, e = e + 1831565813 | 0;
    let t = Math.imul(e ^ e >>> 15, 1 | e);
    return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var A_ = 400,
  j_ = (e, t) => Math.floor(e / A_) + `,` + Math.floor(t / A_);

function M_(e, t, n, r) {
  let i = new Map();
  for (let e of n) {
    let t = j_(e.x, e.z);
    i.has(t) || i.set(t, []), i.get(t).push(e);
  }
  let a = new Group(),
    o = new Color();
  for (let n of i.values()) {
    let i = new InstancedMesh(e, t, n.length);
    n.forEach((e, t) => {
      i.setMatrixAt(t, e.m), r && (o.setRGB(e.c[0], e.c[1], e.c[2]), i.setColorAt(t, o));
    }), i.computeBoundingSphere(), a.add(i);
  }
  return a;
}

function N_() {
  let e = document.createElement(`canvas`);
  e.width = 64, e.height = 64;
  let t = e.getContext(`2d`);
  t.clearRect(0, 0, 64, 64), t.strokeStyle = `#d6d8da`, t.lineWidth = 3, t.strokeRect(1.5, 1.5, 61, 61), t.lineWidth = 1.6;
  for (let e = 8; e < 64; e += 8) t.beginPath(), t.moveTo(e, 0), t.lineTo(e, 64), t.stroke();
  for (let e = 21; e < 64; e += 21) t.beginPath(), t.moveTo(0, e), t.lineTo(64, e), t.stroke();
  let n = new CanvasTexture(e);
  return n.colorSpace = SRGBColorSpace, n;
}

function P_(e) {
  let t = k_(777),
    n = [],
    r = [],
    i = [],
    a = [],
    o = new Matrix4(),
    s = new Quaternion(),
    c = new Vector3(),
    l = new Vector3(),
    u = new Vector3(0, 1, 0);
  for (let d of e) {
    let e = Math.floor(d.h / 3),
      f = d.ring.length,
      p = ShapeUtils.area(d.ring) < 0 ? -1 : 1;
    for (let i = 0; i < f; i++) {
      let a = d.ring[i],
        m = d.ring[(i + 1) % f],
        h = m.x - a.x,
        g = m.y - a.y,
        _ = Math.hypot(h, g);
      if (_ < 2.2) continue;
      let v = g / _ * p,
        y = -h / _ * p,
        b = Math.atan2(v, y);
      s.setFromAxisAngle(u, b);
      let x = Math.floor(_ / 2.6);
      for (let i = 1; i < e; i++) for (let e = 0; e < x; e++) {
        let u = (e + 0.5) / x,
          f = t(),
          p = a.x + h * u,
          m = a.y + g * u,
          b = d.base + i * 3;
        if (f < 0.13) {
          let e = (t() - 0.5) * 0.8;
          l.set(p + h / _ * e + v * 0.28, b + 0.35, m + g / _ * e + y * 0.28), c.set(0.85, 0.6, 0.42), n.push({
            x: p,
            z: m,
            m: o.compose(l, s, c).clone()
          });
        } else f < 0.22 && (l.set(p + v * 0.22, b + 0.9, m + y * 0.22), c.set(1.3, 1.5, 0.45), r.push({
          x: p,
          z: m,
          m: o.compose(l, s, c).clone()
        }));
      }
    }
    let m = d.base + d.h,
      h = d.area > 80 ? 1 + Math.floor(t() * 2.5) : +(t() < 0.5);
    for (let e = 0; e < h; e++) {
      let e = d.ring[Math.floor(t() * f)],
        n = d.cx + (e.x - d.cx) * (0.3 + t() * 0.4),
        r = d.cz + (e.y - d.cz) * (0.3 + t() * 0.4),
        a = 0.7 + t() * 0.5;
      l.set(n, m + 0.4, r), c.set(a, a * (1.2 + t() * 0.6), a), s.setFromAxisAngle(u, t() * 6.28);
      let p = t() < 0.55 ? [0.82, 0.83, 0.85] : t() < 0.6 ? [0.2, 0.38, 0.7] : [0.92, 0.92, 0.9];
      i.push({
        x: n,
        z: r,
        m: o.compose(l, s, c).clone(),
        c: p
      });
    }
    if (t() < 0.35) {
      let e = d.cx + (t() - 0.5) * 3,
        n = d.cz + (t() - 0.5) * 3;
      l.set(e, m + 0.6, n), c.set(1, 1, 1), s.setFromAxisAngle(u, t() * 6.28), a.push({
        x: e,
        z: n,
        m: o.compose(l, s, c).clone()
      });
    }
  }
  let d = new Group(),
    f = new BoxGeometry(1, 1, 1),
    p = xd({
      color: 14211284
    });
  d.add(M_(f, p, n));
  let m = new BoxGeometry(1, 1, 1),
    h = xd({
      map: N_(),
      alphaTest: 0.5,
      side: 2,
      color: 16777215
    });
  d.add(M_(m, h, r));
  let g = new CylinderGeometry(0.75, 0.75, 1.2, 10);
  g.translate(0, 0.6, 0);
  let _ = xd({
    color: 16777215,
    spec: 0.6
  });
  d.add(M_(g, _, i, !0));
  let v = new BoxGeometry(2, 0.08, 1.4);
  v.rotateX(-0.6), v.translate(0, 0.5, 0);
  let y = new CylinderGeometry(0.22, 0.22, 2, 8);
  y.rotateZ(Math.PI / 2), y.translate(0, 0.95, -0.55);
  let b = mergeGeometries([v, y]);
  return d.add(M_(b, xd({
    color: 3820126,
    spec: 0.8
  }), a)), d.userData.count = n.length + r.length + i.length + a.length, d;
}

function F_(e) {
  let t = k_(4242),
    n = [],
    r = new Matrix4(),
    i = new Quaternion(),
    a = new Vector3(),
    o = new Vector3(),
    s = new Vector3(0, 1, 0);
  for (let c of e) {
    let e = Math.abs(ShapeUtils.area(c.ring));
    if (e < 250) continue;
    let l = Math.min(6, Math.floor(e / 400) + +(t() < 0.5));
    for (let e = 0; e < l; e++) {
      let e = c.ring[Math.floor(t() * c.ring.length)],
        l = 0.35 + t() * 0.35,
        u = c.cx + (e.x - c.cx) * l,
        d = c.cz + (e.y - c.cz) * l;
      o.set(u, c.base + c.h, d), a.set(2 + t() * 3, 1.2 + t() * 1.5, 2 + t() * 3), i.setFromAxisAngle(s, Math.atan2(e.x - c.cx, e.y - c.cz)), n.push({
        x: u,
        z: d,
        m: r.compose(o, i, a).clone()
      });
    }
  }
  let c = new BoxGeometry(1, 1, 1);
  return c.translate(0, 0.5, 0), M_(c, xd({
    color: 10132638
  }), n);
}

function I_(e) {
  let t = e.roadClasses,
    n = k_(99),
    r = [],
    i = new Matrix4(),
    a = new Quaternion(),
    o = new Vector3(1, 1, 1),
    s = new Vector3(),
    c = new Vector3(0, 1, 0);
  for (let l of e.roads) {
    let e = t[l[0]];
    if (![`trunk`, `primary`, `secondary`, `tertiary`].includes(e) || l[5]) continue;
    let u = l[4],
      d = l[1] / 2 + 0.9,
      f = e === `tertiary` ? 38 : 32,
      p = n() * f;
    for (let e = 2; e < u.length; e += 2) {
      let t = u[e - 2],
        n = u[e - 1],
        m = u[e],
        h = u[e + 1],
        g = Math.hypot(m - t, h - n);
      if (g < 0.1) continue;
      let _ = -(h - n) / g,
        v = (m - t) / g,
        y = f - p;
      for (; y < g; y += f) {
        let e = t + (m - t) * y / g,
          u = n + (h - n) * y / g,
          f = l[3] ? [1] : [-1, 1];
        for (let t of f) {
          let n = e + _ * d * t,
            l = u + v * d * t;
          a.setFromAxisAngle(c, Math.atan2(-_ * t, -v * t)), s.set(n, $(n, l), l), r.push({
            x: n,
            z: l,
            m: i.compose(s, a, o).clone()
          });
        }
      }
      p = (p + g) % f;
    }
  }
  let l = new CylinderGeometry(0.09, 0.14, 10, 6);
  l.translate(0, 5, 0);
  let u = new BoxGeometry(0.08, 0.08, 2.4);
  u.translate(0, 9.8, 1.15);
  let d = new CylinderGeometry(0.22, 0.25, 0.5, 6);
  d.translate(0, 0.25, 0);
  let f = mergeGeometries([l, u, d]),
    p = new BoxGeometry(0.35, 0.14, 0.75);
  p.translate(0, 9.72, 2.3);
  let m = new Group(),
    h = M_(f, xd({
      color: 6975606,
      spec: 0.5
    }), r);
  h.userData.cast = !0, m.add(h), m.add(M_(p, xd({
    color: 16773320,
    emissive: 1
  }), r));
  let g = M_(new PlaneGeometry(1, 1), jd({
    color: [1, 0.74, 0.4],
    size: 4.2,
    local: [0, 9.6, 2.3],
    gain: 0.9
  }), r);
  return g.visible = !1, g.traverse(e => {
    e.renderOrder = 20;
  }), Ad.push(g), m.add(g), m.userData.count = r.length, m;
}

function L_(e) {
  let t = e.roadClasses,
    n = new Set([`trunk`, `primary`, `secondary`, `tertiary`, `unclassified`, `residential`, `primary_link`, `secondary_link`, `tertiary_link`, `living_street`]),
    r = new Set([`primary`, `secondary`, `tertiary`, `unclassified`, `residential`, `trunk`, `living_street`]),
    i = new Map(),
    a = (e, t) => Math.round(e * 2) + `,` + Math.round(t * 2);
  e.roads.forEach((e, r) => {
    if (!n.has(t[e[0]]) || e[5]) return;
    let o = e[4];
    for (let e = 0; e < o.length; e += 2) {
      let t = a(o[e], o[e + 1]);
      i.has(t) || i.set(t, []), i.get(t).push([r, e / 2]);
    }
  });
  let o = [],
    s = [],
    c = [],
    l = 0;
  for (let n of i.values()) {
    if (new Set(n.map(e => e[0])).size < 2) continue;
    let i = [];
    for (let [t, r] of n) {
      let n = e.roads[t],
        a = n[4],
        o = a.length / 2,
        s = a[r * 2],
        c = a[r * 2 + 1];
      for (let e of [-1, 1]) {
        let t = r + e;
        t < 0 || t >= o || i.push({
          r: n,
          x: s,
          z: c,
          tx: a[t * 2] - s,
          tz: a[t * 2 + 1] - c
        });
      }
    }
    if (i.length < 3) continue;
    let a = Math.max(...i.map(e => e.r[1]));
    for (let e of i) {
      if (!r.has(t[e.r[0]])) continue;
      let n = Math.hypot(e.tx, e.tz),
        i = a / 2 + 3.5;
      if (n < i + 3) continue;
      let u = e.tx / n,
        d = e.tz / n,
        f = e.x + u * i,
        p = e.z + d * i,
        m = e.r[1] / 2 - 0.4,
        h = -d,
        g = u,
        _ = $(f, p) + 0.16,
        v = o.length / 3;
      for (let [e, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) o.push(f + h * m * e + u * 2 * t, _, p + g * m * e + d * 2 * t), s.push(m * e, 2 * t);
      c.push(v, v + 2, v + 1, v, v + 3, v + 2, v, v + 1, v + 2, v, v + 2, v + 3), l++;
    }
  }
  let u = new BufferGeometry();
  u.setAttribute(`position`, new Float32BufferAttribute(o, 3)), u.setAttribute(`uv`, new Float32BufferAttribute(s, 2)), u.setIndex(c), u.computeBoundingSphere();
  let d = new Mesh(u, new ShaderMaterial({
    uniforms: _d(),
    depthWrite: !1,
    polygonOffset: !0,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -8,
    vertexShader: `
      varying vec2 vUv; varying vec3 vWorld;
      void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vWorld = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `
      ${bd}
      varying vec2 vUv; varying vec3 vWorld;
      void main(){
        float fw = fwidth(vUv.x) + 1e-3;
        float s = fract(vUv.x / 1.2);
        float m = smoothstep(0.0, fw/1.2*1.5, s) * (1.0 - smoothstep(0.5 - fw/1.2*1.5, 0.5, s));
        float worn = 0.85 + 0.15 * vnoise(vWorld.xz * 2.0);
        if (m * worn < 0.3) discard;
        vec3 n = vec3(0.0,1.0,0.0);
        gShadow = sunShadow(vWorld, n);
        gl_FragColor = vec4(atmo(lightIt(vec3(0.93,0.93,0.91) * worn, n), vWorld), 1.0);
      }`
  }));
  return d.renderOrder = 4, d.userData.count = l, d;
}

var R_ = e => document.getElementById(e),
  z_ = (e, t) => {
    R_(`loadbar`).style.width = (e * 100).toFixed(0) + `%`, t && (R_(`loadmsg`).textContent = t);
  },
  B_ = () => new Promise(e => requestAnimationFrame(() => e()));

async function V_() {
  let e = new WebGLRenderer({
    antialias: !0,
    powerPreference: `high-performance`
  });
  e.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)), e.setSize(window.innerWidth, window.innerHeight), R_(`app`).appendChild(e.domElement);
  let t = new Scene();
  t.background = new Color(md);
  let n = new PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 4e4);
  z_(0.05, `读取 OSM 城市数据…`);
  let r = await (await fetch(`./city.json`)).json();
  od(r.peak), await B_(), z_(0.08, `烘焙天空和云…`), await B_(), Id(e);
  try {
    await document.fonts.ready;
  } catch {}
  let i = Cd();
  t.add(Ld());
  let a = new l_(e, t),
    o = new HemisphereLight(12375295, 7037525, 1),
    s = new DirectionalLight(16773852, 2.6);
  s.position.copy(fd).multiplyScalar(1e3), t.add(o, s), z_(0.15, `生成地面与莲花山…`), await B_();
  let c = new $d(r, e, t);
  z_(0.35, `生成建筑 ${r.buildings.length} 栋…`), await B_();
  let l = (e, t, n = 30) => {
      let i = -1,
        a = n;
      if (r.buildings.forEach((n, r) => {
        let o = n[4][0],
          s = 0,
          c = 0;
        for (let e = 0; e < o.length; e += 2) s += o[e], c += o[e + 1];
        let l = Math.hypot(s / (o.length / 2) - e, c / (o.length / 2) - t);
        l < a && (a = l, i = r);
      }), i < 0) return null;
      let o = r.buildings[i][4][0],
        s = [];
      for (let e = 0; e < o.length; e += 2) s.push([o[e], o[e + 1]]);
      return {
        bi: i,
        ring: s
      };
    },
    u = new Set(),
    d = [],
    f = l(-13188, -39),
    p = l(-13093, 1957),
    m = l(-13128, 1894);
  f && (u.add(f.bi), d.push(Hg(f.ring))), p && m && (u.add(p.bi), u.add(m.bi), d.push(Wg(p.ring, m.ring)));
  let h = null;
  r.bounds.z0 < -4300 && (r.buildings.forEach((e, t) => {
    let n = e[4][0],
      r = 0,
      i = 0;
    for (let e = 0; e < n.length; e += 2) r += n[e], i += n[e + 1];
    Xg(r / (n.length / 2), i / (n.length / 2)) && u.add(t);
  }), h = Zg(), d.push({
    mesh: h.mesh,
    colliders: h.colliders,
    targets: [],
    signEntry: null
  }));
  let g = new Eg(r, u);
  for (let e of d) t.add(e.mesh), c_(e.mesh), e.signEntry && g.extraSigns.push(e.signEntry);
  let _ = Wd(r, g.skip);
  t.add(_.group), await B_();
  let v = Wd(r, null, {
    only: new Set(g.keyOf.keys()),
    keyOf: g.keyOf
  });
  g.attach(t, v, () => a.markDirty()), _.colliders.push(...g.colliders);
  for (let e of d) _.colliders.push(...e.colliders);
  {
    let e = (r.heroes || []).find(e => e.id === `chunsun`);
    if (e) {
      let t = 29.5;
      g.extraSigns.push({
        ring: [[e.x - t, e.z - t], [e.x + t, e.z - t], [e.x + t, e.z + t], [e.x - t, e.z + t]],
        h: 286,
        base: 0,
        spec: {
          arche: `mall`
        }
      });
    }
  }
  let y = Rg(r, g);
  t.add(y.group);
  let b = new $p(_.colliders);
  z_(0.55, `生成道路 ${r.roads.length} 条…`), await B_();
  let x = qd(r);
  t.add(x);
  let S = mh(r);
  t.add(S.group), z_(0.6, `城中村细节、路灯、斑马线…`), await B_();
  let C = P_(_.details.village.filter(e => e.cx > -1900 && e.cx < 2100 && e.cz > -2150 && e.cz < 2050)),
    w = F_(_.details.roofs),
    T = I_(r),
    E = L_(r);
  t.add(C, w, T, E), z_(0.65, `种树…`), await B_();
  let D = new kp(r, b, t, () => a.markDirty());
  z_(0.75, `建造平安金融中心、市民中心…`), await B_();
  let O = r.pingan,
    k = $(O.x, O.z),
    A = y_(O);
  t.add(A.mesh), _.colliders.push(...A.colliders);
  let j = new Set([`civic`]),
    M = (r.landmarkModels || []).find(e => e.id === `civic`),
    ee = null;
  M && (ee = d_(M), t.add(ee.mesh), _.colliders.push(...ee.colliders));
  let N = (r.landmarkModels || []).find(e => e.id === `szse`),
    P = null;
  N && (P = b_(N), t.add(P.mesh), _.colliders.push(...P.colliders), j.add(`szse`));
  let F = [];
  for (let e of r.heroes || []) {
    let n = Zp[e.id];
    if (!n) continue;
    let r = n(e);
    t.add(r.mesh), F.push(r.mesh), _.colliders.push(...r.colliders);
  }
  {
    let e = [{
      x: O.x,
      y: $(O.x, O.z) + 596,
      z: O.z,
      n: 10,
      len: 1500
    }];
    for (let t of r.heroes || []) (t.id === `kk100` || t.id === `chunsun`) && (t.beam = e.length, e.push({
      x: t.x,
      y: t.h - 2,
      z: t.z,
      n: 6,
      len: 1100
    }));
    t.add(Qp(e));
  }
  t.add(x_(r));
  let te = new PMREMGenerator(e),
    I = new Scene();
  I.add(Ld()), t.environment = te.fromScene(I, 0, 1, 5e4).texture, t.environmentIntensity = 0.55, z_(0.9, `加载地标模型…`);
  let ne = await D_(t, r, e => z_(0.9 + 0.09 * e), j);
  _.colliders.push(...ne.colliders);
  let re = new $p(_.colliders);
  c_(_.group), c_(v.group), c_(A.mesh), c_(w);
  for (let e of F) c_(e);
  ee && c_(ee.mesh), P && c_(P.mesh);
  for (let e of ne.objects) c_(e);
  for (let e of [x, T]) e.traverse(e => {
    e.userData.cast && c_(e);
  });
  let L = new w_(n, e.domElement, re, r.bounds),
    ie = r.landmarks.find(e => e.name === `市民中心`) || {
      x: -344,
      z: -340
    },
    ae = new Vector3(O.x * 0.6 + ie.x * 0.4, 190, O.z * 0.6 + ie.z * 0.4);
  L.setView(new Vector3(O.x + 620, 260, O.z + 900), ae);
  let R = [{
    x: O.x,
    z: O.z,
    R: 56,
    h: 560,
    base: k,
    name: `平安金融中心`,
    beam: 0
  }];
  for (let e of r.heroes || []) R.push({
    x: e.x,
    z: e.z,
    R: Math.hypot(e.L, e.W) / 2 + 6,
    h: e.h * 0.92,
    base: 0,
    name: e.name,
    beam: e.beam
  });
  N && R.push({
    x: N.x,
    z: N.z,
    R: 44,
    h: 240,
    base: 0,
    name: N.name
  }), M && R.push({
    x: M.x,
    z: M.z + 22,
    R: 75,
    h: 60,
    base: 0,
    name: M.name
  }), R.push(...g.showTargets);
  for (let e of d) R.push(...(e.targets || [e.target]));
  let z = new Um(t, n, R, e => ge(e));
  z.onHit = () => _e(), t.add(n);
  let B = new Kh(t, n, r, re, L, {
    prompt: R_(`prompt`)
  });
  B.traffic = S, L.drive = (e, t) => z.drive(e, t) || B.drive(e, t), L.astroV = () => B.inVehicle() ? !0 : z.controlling() ? (z.toggleFlight(), !0) : !1, L.astroBusy = () => z.controlling() || B.inVehicle();
  let oe = R_(`fpbtn`),
    se = R_(`visor`),
    ce = () => {
      let e = z.state === `landed`;
      oe.style.display = e ? `block` : `none`, oe.textContent = z.fp ? `🛰 切到身后视角（C）` : `🧑‍🚀 切到第一人称（C）`, se.style.display = z.fp ? `block` : `none`, _e();
    },
    le = () => {
      z.state === `landed` && z.setFirstPerson(!z.fp), ce();
    };
  z.onView = ce, oe.addEventListener(`click`, e => {
    e.stopPropagation(), le(), oe.blur();
  });
  let ue = ``,
    de = 1;
  z.grid = re, z.player = L;
  let fe = +(new URLSearchParams(location.search).get(`night`) === `1`),
    pe = new Color(md),
    me = new Color(1709088),
    he = () => {
      let e = gd.uNight.value;
      o.intensity = 1 + -0.9 * e, s.intensity = 2.6 + -2.45 * e, t.environmentIntensity = 0.55 + (0.06 - 0.55) * e, t.background.copy(pe).lerp(me, e);
      for (let t of Ad) t.visible = e > 0.01;
    },
    ge = (e, t) => {
      fe = +!!e, t && (gd.uNight.value = fe), he(), _e();
    },
    _e = () => {
      R_(`mode`).textContent = (B.ejected && B.ejected() ? `💥 被甩出车外` : B.inVehicle() ? (B.car && B.car.type.bike ? `🏍 骑摩托车` : `🚗 开车`) + (B.state === `driving` && B.crashT > 0 ? B.crashHard ? ` · 💥 车祸` : ` · ⚠ 碰撞` : ``) : (L.mode === `fly` ? `✈ 飞行` : `🚶 走路`) + (L.noclip && L.mode === `fly` ? `（穿墙）` : ``)) + (fe ? ` · 🌙 夜景` : ``) + (z.state === `landed` ? z.fp ? ` · 👁 第一人称` : ` · 🎮 操控宇航员` : ``) + (z.active ? ` · 🧑‍🚀 左键发射（已命中 ` + z.hits + ` 发，` + (z.hits < 2 ? `下一发点亮一栋` : `下一发连锁引爆`) + `）` : ``);
    };
  L.onModeChange = _e, _e();
  let ve = e => {
    document.body.classList.toggle(`nohud`, !e);
  };
  new URLSearchParams(location.search).get(`hud`) === `0` && ve(!1), window.addEventListener(`keydown`, e => {
    we.open || (e.code === `KeyF` && !e.repeat ? (e.preventDefault(), we.show()) : (e.code === `KeyH` && ve(document.body.classList.contains(`nohud`)), e.code === `KeyT` && !e.repeat && ge(!fe), e.code === `KeyG` && !e.repeat && !B.inVehicle() && (z.toggle(), ce()), e.code === `KeyE` && !e.repeat && z.state === `hidden` && B.interact() && _e(), e.code === `KeyC` && !e.repeat && le()));
  }), e.domElement.addEventListener(`mousedown`, t => {
    t.button === 0 && z.active && document.pointerLockElement === e.domElement && z.fire();
  }), gd.uNight.value = fe, he(), document.addEventListener(`pointerlockchange`, () => {
    R_(`clickhint`).style.display = document.pointerLockElement ? `none` : ``;
  });
  let ye = /^[0-9A-Za-z一二三四五六七八九十东西南北中\-]{0,4}(座|栋|塔|号楼|单元|期)[0-9A-Za-z一二三四五六七八九十东西南北单元座栋]*$/,
    be = (e, t, n) => {
      let r = im(re, e, t);
      return r ? r.top : n;
    },
    xe = [];
  for (let e of y.list) xe.push({
    ...e,
    pri: 6
  });
  h && xe.push(...h.places), xe.push({
    name: `平安金融中心`,
    aliases: [`平安`, `平安大厦`, `平安国际金融中心`, `PAFC`],
    x: O.x,
    z: O.z,
    h: k + 599,
    pri: 8
  });
  let Se = {
    kk100: [`京基100`, `KK100`, `京基一百`, `京基金融中心`],
    chunsun: [`春笋`, `华润总部`, `华润总部大厦`, `中国华润大厦`],
    diwang: [`地王`, `信兴广场`],
    guomao: [`国贸`, `国际贸易中心`],
    seg: [`赛格`, `赛格大厦`, `华强北`]
  };
  for (let e of r.heroes || []) xe.push({
    name: e.id === `chunsun` ? `华润总部大厦（春笋）` : e.name,
    aliases: Se[e.id] || [],
    x: e.x,
    z: e.z,
    h: e.h,
    pri: 8
  });
  for (let e of r.landmarkModels || []) xe.push({
    name: e.name,
    aliases: e.id === `upperhills` ? [`深业上城`] : e.id === `szse` ? [`证交所`, `深交所`] : e.id === `convention` ? [`会展中心`] : [],
    x: e.x,
    z: e.z,
    h: e.id === `civic` ? 84 : e.h,
    pri: 7
  });
  let Ce = (e, t) => [(t - r.origin.lon) * 6378137 * Math.PI / 180 * Math.cos(r.origin.lat * Math.PI / 180), -(e - r.origin.lat) * 6378137 * Math.PI / 180];
  for (let [e, t, n, i] of [[`宝安中心区`, 22.5553, 113.884, [`宝安中心`, `宝安`, `宝安区`, `宝中`]], [`深圳宝安国际机场`, 22.6393, 113.8107, [`机场`, `宝安机场`, `深圳机场`]], [`前海`, 22.533, 113.899, [`前海自贸区`, `前海湾`]], [`龙岗中心城（龙城广场）`, 22.72, 114.247, [`龙岗`, `龙岗区`, `龙岗中心城`, `龙城广场`, `龙城`]], [`大运中心`, 22.696, 114.215, [`大运`, `大运新城`, `龙岗大运`]], [`龙华（壹方天地）`, 22.65, 114.0235, [`龙华`, `龙华区`, `壹方天地`, `壹方城`]], [`深圳北站`, 22.6097, 114.029, [`北站`, `高铁北站`]], [`坂田（华为基地）`, 22.656, 114.057, [`坂田`, `华为`, `华为基地`]], [`布吉`, 22.603, 114.118, [`布吉街道`, `龙岗布吉`]], [`盐田区政府`, 22.557, 114.236, [`盐田`, `盐田区`, `沙头角`]], [`盐田港`, 22.575, 114.27, [`盐田港区`]], [`梧桐山`, 22.582, 114.214, [`梧桐山风景区`, `梧桐`]], [`西丽`, 22.583, 113.954, [`西丽街道`, `留仙洞`]], [`蛇口`, 22.486, 113.915, [`蛇口港`, `海上世界`]]]) {
    let [a, o] = Ce(t, n);
    a > r.bounds.x0 && a < r.bounds.x1 && o > r.bounds.z0 && o < r.bounds.z1 && xe.push({
      name: e,
      aliases: i,
      x: a,
      z: o,
      h: be(a, o, 60),
      pri: 7
    });
  }
  for (let e of r.landmarks) xe.push({
    name: e.name,
    x: e.x,
    z: e.z,
    h: be(e.x, e.z, 30),
    pri: 5
  });
  for (let e of r.buildings) {
    if (!e[5] || ye.test(e[5])) continue;
    let t = e[4][0],
      n = 0,
      r = 0;
    for (let e = 0; e < t.length; e += 2) n += t[e], r += t[e + 1];
    n /= t.length / 2, r /= t.length / 2, xe.push({
      name: e[5],
      x: n,
      z: r,
      h: $(n, r) + e[1]
    });
  }
  let we = new a_(t_(xe), t, n, {
      box: R_(`search`),
      input: R_(`searchin`),
      list: R_(`searchlist`),
      clear: R_(`searchclear`),
      target: R_(`target`),
      label: R_(`marklabel`),
      arrow: R_(`markarrow`)
    }, () => L.pos, {
      onOpen: () => {
        L.blockInput = !0, L.keys.clear();
      },
      onClose: () => {
        L.blockInput = !1;
      }
    }),
    Te = Xd(r),
    Ee = 2048,
    De = 0.5,
    Oe = new Map(),
    V = {
      base: `#6d6a64`,
      drawRoads: !0,
      drawPaths: !1,
      roadScale: 1.6,
      drawBuildings: `rgba(40,44,52,0.85)`,
      sidewalks: !1,
      aprons: !1,
      hill: !0,
      villageAlleys: !1,
      plazaPattern: !1
    },
    ke = !1,
    Ae = (e, t) => {
      let n = e * 100003 + t,
        i = Oe.get(n);
      if (!i) {
        if (ke) return null;
        if (ke = !0, i = {
          cv: Zd(r, {
            x0: e * Ee,
            x1: (e + 1) * Ee,
            z0: t * Ee,
            z1: (t + 1) * Ee
          }, Ee * De, V),
          used: 0
        }, Oe.set(n, i), Oe.size > 12) {
          let e = null,
            t = 1 / 0;
          for (let [n, r] of Oe) r.used < t && (t = r.used, e = n);
          Oe.delete(e);
        }
      }
      return i.used = performance.now(), i.cv;
    },
    je = R_(`mm`),
    H = je.getContext(`2d`);
  function Me() {
    let e = je.width,
      t = De,
      n = (L.pos.x - Te.x0) * t,
      i = (L.pos.z - Te.z0) * t,
      a = e / 2 / (700 * t);
    H.save(), H.fillStyle = `#555`, H.fillRect(0, 0, e, e), H.translate(e / 2, e / 2), H.rotate(L.yaw), H.scale(a, a), ke = !1;
    {
      let e = Math.floor((L.pos.x - 1015) / Ee),
        r = Math.floor((L.pos.x + 1015) / Ee),
        a = Math.floor((L.pos.z - 1015) / Ee),
        o = Math.floor((L.pos.z + 1015) / Ee);
      for (let s = e; s <= r; s++) for (let e = a; e <= o; e++) {
        let r = Ae(s, e);
        r && H.drawImage(r, (s * Ee - Te.x0) * t - n, (e * Ee - Te.z0) * t - i);
      }
    }
    H.fillStyle = `#ffd760`;
    for (let e of r.landmarks) {
      let r = (e.x - Te.x0) * t - n,
        o = (e.z - Te.z0) * t - i;
      H.beginPath(), H.arc(r, o, 5 / a, 0, 7), H.fill();
    }
    if (H.restore(), H.fillStyle = `#ff4d4d`, H.strokeStyle = `#fff`, H.lineWidth = 3, H.beginPath(), H.moveTo(e / 2, e / 2 - 16), H.lineTo(e / 2 + 10, e / 2 + 12), H.lineTo(e / 2, e / 2 + 6), H.lineTo(e / 2 - 10, e / 2 + 12), H.closePath(), H.fill(), H.stroke(), we.target) {
      let t = we.target,
        n = t.x - L.pos.x,
        r = t.z - L.pos.z,
        i = Math.hypot(n, r),
        a = Math.cos(L.yaw),
        o = Math.sin(L.yaw),
        s = n * a - r * o,
        c = n * o + r * a,
        l = e / 2 / 700;
      if (H.save(), H.translate(e / 2, e / 2), i <= 651) H.fillStyle = `rgba(255,200,60,0.30)`, H.beginPath(), H.arc(s * l, c * l, 22, 0, 7), H.fill(), H.fillStyle = `#ffc83c`, H.strokeStyle = `#fff`, H.lineWidth = 3, H.beginPath(), H.arc(s * l, c * l, 10, 0, 7), H.fill(), H.stroke();else {
        let t = Math.atan2(c, s),
          n = e / 2 - 26;
        H.translate(Math.cos(t) * n, Math.sin(t) * n), H.rotate(t), H.fillStyle = `#ffc83c`, H.strokeStyle = `#fff`, H.lineWidth = 3, H.beginPath(), H.moveTo(20, 0), H.lineTo(-12, -15), H.lineTo(-4, 0), H.lineTo(-12, 15), H.closePath(), H.fill(), H.stroke(), H.rotate(-t), H.fillStyle = `#fff`, H.font = `bold 20px sans-serif`, H.textAlign = `center`, H.strokeStyle = `rgba(0,0,0,.8)`, H.lineWidth = 4;
        let r = -Math.cos(t) * 46,
          a = -Math.sin(t) * 46 + 7;
        H.strokeText(r_(i), r, a), H.fillText(r_(i), r, a);
      }
      H.restore();
    }
    H.fillStyle = `#fff`, H.font = `bold 22px sans-serif`, H.textAlign = `center`, e / 2 + Math.sin(-L.yaw) * (e / 2 - 20) * -1, e / 2 - Math.cos(L.yaw) * (e / 2 - 20), H.fillText(`北`, e / 2 - Math.sin(L.yaw) * (e / 2 - 22), e / 2 - Math.cos(L.yaw) * (e / 2 - 22) + 8);
  }
  let U = [...r.landmarks];
  function W() {
    let e = null,
      t = 260;
    for (let n of U) {
      let r = Math.hypot(n.x - L.pos.x, n.z - L.pos.z);
      r < t && (t = r, e = n);
    }
    let n = R_(`near`);
    e ? (n.style.display = `block`, n.textContent = `📍 ` + e.name) : n.style.display = `none`;
  }
  window.addEventListener(`resize`, () => {
    n.aspect = window.innerWidth / window.innerHeight, n.updateProjectionMatrix(), e.setSize(window.innerWidth, window.innerHeight);
  }), z_(1, `完成`), R_(`loading`).style.display = `none`, console.info(`[futian] buildings`, r.buildings.length, `roads`, x.userData.count, `tower entries`, g.skip.size, `building tris`, _.group.userData.tris, `village details`, C.userData.count, `lights`, T.userData.count, `crosswalks`, E.userData.count, `bridges`, x.userData.bridges);
  let Ne = () => {
      n.position.copy(L.pos), D.fast = g.fast = !0;
      let e = 0;
      for (; D.update(n.position) + g.update(n.position) + c.update(n.position) > 0 && e++ < 400;);
      return D.fast = g.fast = !1, a.markDirty(), e;
    },
    Pe = new Clock(),
    Fe = 0,
    Ie = 0,
    Le = 0,
    Re = 6378137,
    ze = r.origin.lat,
    Be = r.origin.lon;
  window.__futian = {
    avatar: B,
    grid2: re,
    terrainHeight: $,
    buildingAt: (e, t) => im(re, e, t),
    player: L,
    scene: t,
    camera: n,
    renderer: e,
    city: r,
    shadows: a,
    setHud: ve,
    towers: g,
    trees: D,
    ground: c,
    traffic: S,
    settle: Ne,
    setNight: ge,
    G: gd,
    showTextCanvas: i,
    astro: z,
    showTargets: R,
    igniteTarget: Td,
    igniteReset: kd,
    launchWave: Od,
    search: we,
    logos: y
  };
  let Ve = `foot`;
  function He() {
    Pe.update();
    let r = Math.min(Pe.getDelta(), 0.05);
    L.update(r), B.update(r, z.state !== `hidden`);
    {
      let e = B.state + (B.state === `driving` && B.crashT > 0 ? B.crashHard ? `!` : `~` : ``);
      e !== Ve && (Ve = e, _e());
    }
    if (n.updateMatrixWorld(), gd.uTime.value += r, gd.uNight.value !== fe) {
      let e = fe - gd.uNight.value;
      gd.uNight.value = Math.abs(e) < r / 1.5 ? fe : gd.uNight.value + Math.sign(e) * r / 1.5, he();
    }
    if (de += r, de > 0.3) {
      de = 0;
      let e = n.position,
        t = t => n => {
          let r = n.geometry && (n.boundingSphere || n.geometry.boundingSphere);
          r && (n.visible = (r.center.x - e.x) ** 2 + (r.center.z - e.z) ** 2 < (t + r.radius) ** 2);
        };
      T.traverse(e => {
        e.isInstancedMesh && t(e.name === `glow` ? 2600 : 1800)(e);
      }), w.children.forEach(t(2500)), _.group.children.forEach(t(11e3)), v.group.children.forEach(e => {
        g.detail.has(e.userData.key) || t(14e3)(e);
      });
    }
    if (z.update(r), z.state !== ue && (ue = z.state, ce()), se.style.opacity = z.fpBlend > 0.72 ? `1` : `0`, we.update(), S.update(r, n.position), D.update(n.position), g.update(n.position), c.update(n.position), a.update(n), e.render(t, n), Fe++, Ie += r, Le += r, Le > 0.1) {
      Le = 0, Me(), W();
      let e = ze - L.pos.z / (Re * Math.PI / 180),
        t = Be + L.pos.x / (Re * Math.PI / 180 * Math.cos(ze * Math.PI / 180)),
        n = L.pos.y - $(L.pos.x, L.pos.z);
      R_(`coord`).textContent = `${e.toFixed(5)}°N ${t.toFixed(5)}°E · 高 ${n.toFixed(0)}m`;
    }
    Ie > 0.5 && (R_(`fps`).textContent = `${(Fe / Ie).toFixed(0)} FPS`, Fe = 0, Ie = 0), requestAnimationFrame(He);
  }
  He();
}

V_().catch(e => {
  console.error(e), R_(`loadmsg`).textContent = `加载失败：` + e.message;
});
