// تحليل متوسط ألوان مناطق من لقطة شاشة
const sharp = require("sharp");
const path = process.argv[2];
const regions = JSON.parse(process.argv[3] || "{}");

(async () => {
  const img = sharp(path);
  const meta = await img.metadata();
  const W = meta.width, H = meta.height;
  for (const [name, r] of Object.entries(regions)) {
    const x = Math.round((r.x / 100) * W), y = Math.round((r.y / 100) * H);
    const w = Math.round((r.w / 100) * W), h = Math.round((r.h / 100) * H);
    const { data, info } = await img.clone().extract({ left: Math.max(0, x), top: Math.max(0, y), width: Math.min(w, W - x), height: Math.min(h, H - y) }).raw().toBuffer({ resolveWithObject: true });
    let R = 0, G = 0, B = 0, n = data.length / info.channels;
    for (let i = 0; i < data.length; i += info.channels) { R += data[i]; G += data[i + 1]; B += data[i + 2]; }
    n = Math.round(n);
    console.log(`${name}: avg rgb(${Math.round(R / n)},${Math.round(G / n)},${Math.round(B / n)}) — luminance ${(0.2126 * R / n + 0.7152 * G / n + 0.0722 * B / n).toFixed(0)}/255`);
  }
})();
