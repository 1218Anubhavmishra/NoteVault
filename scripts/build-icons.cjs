/**
 * Builds every app icon from images/notevault-icon.svg (full icon) and
 * images/notevault-icon-logo.svg (artwork only, transparent).
 *
 *   node scripts/build-icons.cjs
 *
 * Outputs:
 *   public/favicon.svg, public/icons/icon-{32,192,512}.png, public/apple-touch-icon.png  (website + Electron window)
 *   build/icon.png                                                                      (electron-builder: Windows, macOS, Linux)
 *   android/ and ios/ icons and splash screens                                           (@capacitor/assets)
 *
 * Copy public/favicon.svg, public/icons/ and public/apple-touch-icon.png to voiceVault public/ as well.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const fullSvgPath = path.join(root, 'images', 'notevault-icon.svg');
const logoSvgPath = path.join(root, 'images', 'notevault-icon-logo.svg');
const sourceDir = path.join(root, 'images', 'icon-source');
const BG = '#ffffff';

/** Square, full-bleed version for iOS / apple-touch (the OS rounds the corners itself). */
function squareSvg(svg) {
  return svg.replace(/<rect width="1024" height="1024" rx="224"/, '<rect width="1024" height="1024"');
}

async function png(svg, size, out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg), { density: Math.max(72, Math.ceil((72 * size) / 1024) * 2) })
    .resize(size, size)
    .png()
    .toFile(out);
  console.log('icon:', path.relative(root, out));
}

(async () => {
  const fullSvg = fs.readFileSync(fullSvgPath, 'utf8');
  const logoSvg = fs.readFileSync(logoSvgPath, 'utf8');

  fs.copyFileSync(fullSvgPath, path.join(root, 'public', 'favicon.svg'));
  console.log('icon: public/favicon.svg');
  for (const s of [32, 192, 512]) await png(fullSvg, s, path.join(root, 'public', 'icons', `icon-${s}.png`));
  await png(squareSvg(fullSvg), 180, path.join(root, 'public', 'apple-touch-icon.png'));
  await png(fullSvg, 1024, path.join(root, 'build', 'icon.png'));

  // iOS rounds the corners and Android masks to circles or squircles, so the artwork needs a margin.
  const logoInner = 780;
  const pad = (1024 - logoInner) / 2;
  fs.mkdirSync(sourceDir, { recursive: true });
  await sharp(Buffer.from(logoSvg), { density: 144 })
    .resize(logoInner, logoInner)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(sourceDir, 'logo.png'));
  console.log('icon:', path.relative(root, path.join(sourceDir, 'logo.png')));
  // Android scales the splash logo by screen width; iOS by the logo's own width on a 2732 px canvas.
  const common = [
    `--assetPath "${path.relative(root, sourceDir)}"`,
    `--iconBackgroundColor "${BG}" --iconBackgroundColorDark "${BG}"`,
    `--splashBackgroundColor "${BG}" --splashBackgroundColorDark "${BG}"`
  ].join(' ');
  execSync(`npx capacitor-assets generate --android ${common} --logoSplashScale 0.45`, { cwd: root, stdio: 'inherit' });
  execSync(`npx capacitor-assets generate --ios ${common} --logoSplashTargetWidth 1000`, { cwd: root, stdio: 'inherit' });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
