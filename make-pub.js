// convert-ascii.js
// Usage: node convert-ascii.js input.md output.md
// Deps:  npm i mathjax-full sharp gray-matter asciimath-parser

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import sharp from "sharp";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AsciiMath as AMParser, TokenTypes } from "asciimath-parser";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

// -------- Config --------
const INPUT_MD = process.argv[2] || "input.md";
const OUT_MD   = process.argv[3] || "output.md";
const INPUT_PATH= "/Users/alex/Documents/book/";
const IMG_DIR  = "images/";
const ALT_TEXT_DEFAULT = "equation";

// 글리프 절대 크기: ex 단위 기준(px/ex), fallback으로 viewBox 1단위당 픽셀
const BASE_PX_PER_EX = 24;
let activePxPerEx = BASE_PX_PER_EX;
const BASE_PX_PER_VBUNIT = 4;

// 최소 패딩(이미지마다 동일)
const PAD_X = 10;  // 좌우
const PAD_Y = 2;   // 상하

// 칼럼 폭 상한(타이트 폭이 이 값을 넘으면 축소)
const MAX_FINAL_W = 1600;

// 컨트롤 문자 제거용(탭/개행 제외)
const CTRL_CLEAN_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

// 렌더링 품질 관련
const RENDER_SUPERSAMPLE = (() => {
  const raw = Number.parseFloat(process.env.RENDER_SUPERSAMPLE ?? "2");
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
})();
const BASE_SVG_DENSITY = 72;
const MAX_RENDER_DIMENSION = 12000;
const PNG_WRITE_OPTS = {
  compressionLevel: 2,
  adaptiveFiltering: true,
  quality: 100,
};

// PNG 메타 density 통일
const PNG_DPI = 96;

// $$ ... $$
const FENCE_RE = /(?:^|\r?\n)\$\$\s*(?!\s*\$\$)([\s\S]*?\S[\s\S]*?)\s*\$\$(?:\r?\n|$)/g;

// -------- MathJax init --------
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: "none", displayAlign: "center", displayIndent: "0" });
const mj  = mathjax.document("", { InputJax: tex, OutputJax: svg });

// -------- symbols.csv 로더 --------
async function loadSymbolsFromCSV(csvPath) {
  const out = {};
  try {
    const text = await fs.readFile(csvPath, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf(",");
      if (idx < 0) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!key || !val) continue;
      out[key] = { type: TokenTypes.Const, tex: val };
    }
  } catch { /* optional */ }
  return out;
}

// -------- AM -> LaTeX -> SVG --------
function renderAsciiMathToSVG(block, parser) {
  const lines   = block.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const texList = lines.map(s => parser.toTex(s));
  const texSrc  = (texList.length === 1)
    ? texList[0]
    : "\\begin{gather*}\n" + texList.join(" \\\\ \n") + "\n\\end{gather*}";
  // display:false → 여백 적은 인라인 박스
  // console.log("Converted TeX:", texSrc);
  const node = mj.convert(texSrc, { display: true });
  const html = adaptor.outerHTML(node);
  const svg = extractRootSVG(html);
  if (!svg) throw new Error("MathJax failed to output <svg>.");
  return svg;
}

function extractRootSVG(html) {
  const svgTagRe = /<\/?svg\b[^>]*>/gi;
  const first = svgTagRe.exec(html);
  if (!first || first[0][1] === "/") return null;
  let depth = 1;
  const start = first.index;
  let match;
  while ((match = svgTagRe.exec(html))) {
    if (match[0][1] === "/") {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, svgTagRe.lastIndex);
      }
    } else {
      depth += 1;
    }
  }
  return null;
}

// -------- 밝은 배경 기준 타이트 크롭 --------
async function cropByLumaTight(pngBuf, whiteThreshold = 250) {
  const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  let top = H, left = W, bottom = -1, right = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a === 0) continue;                            // 완전 투명 = 배경
      if ((r + g + b) / 3 >= whiteThreshold) continue;  // 거의 흰색 = 배경
      if (y < top) top = y; if (y > bottom) bottom = y;
      if (x < left) left = x; if (x > right) right = x;
    }
  }
  if (bottom < top || right < left) return { buf: pngBuf, width: W, height: H };
  const cropW = right - left + 1, cropH = bottom - top + 1;
  const buf = await sharp(pngBuf)
    .extract({ left, top, width: cropW, height: cropH })
    .png(PNG_WRITE_OPTS)
    .toBuffer();
  return { buf, width: cropW, height: cropH };
}

function parseExSize(svg) {
  const mw = svg.match(/width\s*=\s*"([\d.]+)\s*ex"/i);
  const mh = svg.match(/height\s*=\s*"([\d.]+)\s*ex"/i);
  if (mw && mh) return { wEx: parseFloat(mw[1]), hEx: parseFloat(mh[1]) };
  return null;
}

// -------- SVG -> PNG (균일 글리프 + 타이트 폭/높이) --------
function parseViewBox(svg) {
  const m = svg.match(/viewBox\s*=\s*"(\S+)\s+(\S+)\s+(\S+)\s+(\S+)"/i);
  if (!m) return null;
  return { vbW: parseFloat(m[3]), vbH: parseFloat(m[4]) };
}

async function svgToPngTightHeightDynamic(svgString, outPngPath) {
  // 색 고정(다크 테마 대비)
  const svgFixed = svgString.replace(/currentColor/gi, "#4A90E2");
  const svgBuf   = Buffer.from(svgFixed, "utf8");

  const contentMaxW = Math.max(1, MAX_FINAL_W - 2 * PAD_X);
  const exSize = parseExSize(svgFixed);
  const vb = parseViewBox(svgFixed) || { vbW: 1000, vbH: 250 };

  let naturalTargetW;
  if (exSize && exSize.wEx > 0) {
    naturalTargetW = Math.max(1, Math.round(exSize.wEx * activePxPerEx));
  } else {
    const baseW = Math.max(1, Math.round(vb.vbW * BASE_PX_PER_VBUNIT));
    naturalTargetW = Math.max(1, Math.min(baseW, contentMaxW));
  }

  const supersample = Math.max(1, RENDER_SUPERSAMPLE);
  let renderW = Math.max(1, Math.round(naturalTargetW * supersample));
  if (renderW > MAX_RENDER_DIMENSION) renderW = MAX_RENDER_DIMENSION;
  const appliedScale = Math.max(1, renderW / naturalTargetW);
  const maxDensityScale = Math.max(1, MAX_RENDER_DIMENSION / renderW);
  const densityScale = Math.min(appliedScale, maxDensityScale);
  const svgInputDensity = BASE_SVG_DENSITY * densityScale;

  // 1) SVG -> PNG (가로만 지정: 비율 유지, 업스케일 금지)
  let eqBuf = await sharp(svgBuf, {
    density: svgInputDensity,
    limitInputPixels: false,
  })
    .resize({
      width: renderW,
      withoutEnlargement: appliedScale <= 1,
      fastShrinkOnLoad: false,
    })
    .png(PNG_WRITE_OPTS)
    .toBuffer();

  // await fs.writeFile(outPngPath, eqBuf);

  // 2) 흰 배경 확정 + 타이트 크롭(상하/좌우 여백 제거)
  // eqBuf = await sharp(eqBuf)
  //   .flatten({ background: "#ffffff" })
  //   .png(PNG_WRITE_OPTS)
  //   .toBuffer();
  let { buf, width: eqW, height: eqH } = await cropByLumaTight(eqBuf, 250);

  if (appliedScale > 1) {
    const targetW = Math.max(1, Math.round(eqW / appliedScale));
    if (targetW < eqW) {
      buf = await sharp(buf)
        .resize({ width: targetW })
        .png(PNG_WRITE_OPTS)
        .toBuffer();
      const meta = await sharp(buf).metadata();
      eqW = meta.width ?? targetW;
      eqH = meta.height ?? Math.max(1, Math.round(eqH / appliedScale));
    }
  }

  // 3) 폭 상한(칼럼) 초과 시에만 축소 (비율 유지 / 업스케일 금지)
  if (eqW > contentMaxW) {
    const s = contentMaxW / eqW;
    buf = await sharp(buf)
      .resize({ width: Math.max(1, Math.floor(eqW * s)), withoutEnlargement: true })
      .png(PNG_WRITE_OPTS)
      .toBuffer();
    const meta = await sharp(buf).metadata();
    eqW = meta.width  ?? Math.max(1, Math.floor(eqW * s));
    eqH = meta.height ?? Math.max(1, Math.floor(eqH * s));
  }

  // 4) 최종 캔버스: 최소 패딩 + 열 폭 통일
  const tightW = eqW + 2 * PAD_X;
  const finalW = Math.max(tightW, MAX_FINAL_W);
  const finalH = eqH + 2 * PAD_Y + 40;

  // 좌우 중앙, 상단은 PAD_Y만 주고 배치(베이스라인 정렬 원하면 이 부분 조정)
  const left = Math.max(0, Math.floor((finalW - eqW) / 2));
  const top  = PAD_Y;

  const out = await sharp({
    create: {
      width: finalW,
      height: finalH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }
  })
    .composite([{ input: buf, left, top }])
    .png(PNG_WRITE_OPTS)
    .withMetadata({ density: PNG_DPI })
    .toBuffer();

  await fs.writeFile(outPngPath, out);
  return { width: finalW, height: finalH };
}

function stripControlChars(text) {
  CTRL_CLEAN_RE.lastIndex = 0;
  return CTRL_CLEAN_RE.test(text) ? text.replace(CTRL_CLEAN_RE, "") : text;
}

// -------- 메인 --------
async function main() {
  const USER_SYMBOLS = await loadSymbolsFromCSV("custom-symbols.csv");
  const amParser = new AMParser({ display: false, symbols: USER_SYMBOLS });

  for (let c = 1; c <= 12; c++) {
    const inputName = c.toString().padStart(2, "0");
    const outputName = inputName
    const raw = await fs.readFile(INPUT_PATH + `${inputName}.md`, "utf8");
    const parsed = matter(stripControlChars(raw));
    let body = stripControlChars(parsed.content);
    const imagePath = IMG_DIR + `${outputName}`;

    await fs.mkdir(imagePath, { recursive: true });

    // $$...$$ 매치 수집 후 선계산
    const matches = [...body.matchAll(FENCE_RE)];
    const eqInfos = matches.map(m => {
      const code = m[1];
      const svg = renderAsciiMathToSVG(code, amParser);
      const exSize = parseExSize(svg);
      return { code, svg, exSize };
    });

    const contentMaxW = Math.max(1, MAX_FINAL_W - 2 * PAD_X);
    const exWidths = eqInfos
      .map(info => (info.exSize && info.exSize.wEx > 0) ? info.exSize.wEx : 0)
      .filter(w => w > 0);
    if (exWidths.length > 0) {
      const maxExWidth = Math.max(...exWidths);
      const maxPxPerEx = contentMaxW / maxExWidth;
      const desiredPxPerEx = Math.min(BASE_PX_PER_EX, maxPxPerEx);
      activePxPerEx = Math.max(1, desiredPxPerEx);
    } else {
      activePxPerEx = BASE_PX_PER_EX;
    }

    let outParts = [];
    let cursor = 0;
    let idx = 0;

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const matchStart = m.index;
      const matchEnd   = matchStart + m[0].length;
      const info       = eqInfos[i];

      outParts.push(body.slice(cursor, matchStart));

      const id  = (++idx).toString().padStart(3, "0");
      const svg = info.svg;
      const pngName = `eq-${id}.png`;
      try {
        await svgToPngTightHeightDynamic(svg, path.join(imagePath, pngName));
      } catch (err) {
        console.error(`❌ Failed to render chapter ${c}, eq ${id}`);
        console.error(`   ASCII: ${info.code.replace(/\s+/g, " ").slice(0, 200)}`);
        console.error(`   Error: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }

      const html =
        [
          `<div class="eq">`,
          `  <img src="${imagePath}/${pngName}" alt="${ALT_TEXT_DEFAULT}" `,
          `    style="display: block; margin: 0 auto;" />`,
          `</div>`,
        ].join("\n");

      outParts.push(`\n${html}\n\n`);
      cursor = matchEnd;
    }
    outParts.push(body.slice(cursor));
    const newBody = outParts.join("");

    await fs.writeFile(`${outputName}.md`, matter.stringify(newBody, parsed.data), "utf8");
    console.log(`✔ Done!  Converted ${idx} block(s).
- Uniform glyph size via ex-unit scaling (px/ex≈${activePxPerEx.toFixed(2)})
- Fixed-width canvas (${MAX_FINAL_W}px) with minimal padding (PAD_X=${PAD_X}, PAD_Y=${PAD_Y})
- Output: ${outputName}.md, Images in ${imagePath}/`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
