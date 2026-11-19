import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const androidDir = resolve(__dirname, '..');
const rootDir = resolve(androidDir, '..');
const distDir = join(rootDir, 'dist');
const wwwDir = join(androidDir, 'app', 'src', 'main', 'assets', 'www');
const runtimeDir = join(androidDir, 'web-runtime');

const args = new Set(process.argv.slice(2));
const shouldBuildWeb = args.has('--build-web') || !existsSync(join(distDir, 'index.html'));

function log(msg) {
    console.log(`[android:sync] ${msg}`);
}

// 1. Build root web app if requested or missing
if (shouldBuildWeb) {
    log('Building root web application (npm run build)...');
    const isWin = process.platform === 'win32';
    const result = spawnSync(isWin ? 'npm.cmd' : 'npm', ['run', 'build'], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: isWin
    });
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

if (!existsSync(join(distDir, 'index.html'))) {
    console.error('[android:sync] Error: dist/index.html not found. Run npm run build first.');
    process.exit(1);
}

// 2. Load esbuild from root node_modules
const esbuildEntry = existsSync(join(rootDir, 'node_modules', 'esbuild', 'lib', 'main.js')) ? join(rootDir, 'node_modules', 'esbuild', 'lib', 'main.js') : resolve(rootDir, '..', 'Calculadora-Grafica', 'node_modules', 'esbuild', 'lib', 'main.js');
if (!existsSync(esbuildEntry)) {
    console.error('[android:sync] Error: esbuild not found in ../node_modules.');
    process.exit(1);
}
const esbuild = await import(pathToFileURL(esbuildEntry).href);

// 3. Synchronize version metadata from root package.json
const rootPkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const versionName = rootPkg.version || '2.0.0';
const versionParts = versionName.split('.').map(n => parseInt(n, 10) || 0);
const versionCode = (versionParts[0] || 1) * 10000 + (versionParts[1] || 0) * 100 + (versionParts[2] || 0);

log(`Syncing version ${versionName} (versionCode ${versionCode})...`);

const androidPkgPath = join(androidDir, 'package.json');
if (existsSync(androidPkgPath)) {
    const androidPkg = JSON.parse(readFileSync(androidPkgPath, 'utf8'));
    if (androidPkg.version !== versionName) {
        androidPkg.version = versionName;
        writeFileSync(androidPkgPath, `${JSON.stringify(androidPkg, null, 2)}\n`);
    }
}

const manifestPath = join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
let manifestXml = readFileSync(manifestPath, 'utf8');
manifestXml = manifestXml
    .replace(/android:versionCode="[^"]*"/, `android:versionCode="${versionCode}"`)
    .replace(/android:versionName="[^"]*"/, `android:versionName="${versionName}"`);
writeFileSync(manifestPath, manifestXml);

const appGradlePath = join(androidDir, 'app', 'build.gradle');
if (existsSync(appGradlePath)) {
    let gradle = readFileSync(appGradlePath, 'utf8');
    gradle = gradle
        .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
        .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
    writeFileSync(appGradlePath, gradle);
}

// 4. CSS legacy fallback transform (for Android 7-9 WebView / Chromium 70+)
function unwrapAtRuleBlocks(input, headerRegex) {
    let s = input;
    while (true) {
        const m = s.match(headerRegex);
        if (!m || m.index === undefined) break;
        const startIdx = m.index;
        const openBraceIdx = startIdx + m[0].length - 1;
        let depth = 1;
        let i = openBraceIdx + 1;
        let inStr = null;
        while (i < s.length && depth > 0) {
            const ch = s[i];
            if (inStr) {
                if (ch === '\\') { i += 2; continue; }
                if (ch === inStr) inStr = null;
            } else if (ch === '"' || ch === "'") {
                inStr = ch;
            } else if (ch === '{') {
                depth++;
            } else if (ch === '}') {
                depth--;
            }
            i++;
        }
        if (depth === 0) {
            const inner = s.slice(openBraceIdx + 1, i - 1);
            s = s.slice(0, startIdx) + inner + s.slice(i);
        } else {
            break;
        }
    }
    return s;
}

function addLegacyCssFallbacks(css) {
    let out = css;

    // Unwrap Tailwind v4 @layer blocks for Chromium < 99
    out = out.replace(/@layer\s+[^{;]+;/g, '');
    out = unwrapAtRuleBlocks(out, /@layer\s+[^{]*\{/);
    out = unwrapAtRuleBlocks(out, /@supports\s*\(\(\(-webkit-hyphens:none\)\)[^{]*\{/);
    out = out.replace(/,\s*::backdrop\b/g, '');

    // Downlevel :where() selectors for Chromium < 88
    out = out.replace(/:where\(\.([^>()]+)>:not\(:last-child\)\)/g, '.$1>*:not(:last-child)');
    out = out.replace(/:where\(([^(),]+)\)/g, '$1');

    // Logical properties fallbacks for Chromium < 87
    out = out.replace(/margin-inline-start\s*:/g, 'margin-left:');
    out = out.replace(/margin-inline-end\s*:/g, 'margin-right:');
    out = out.replace(/padding-inline-start\s*:/g, 'padding-left:');
    out = out.replace(/padding-inline-end\s*:/g, 'padding-right:');
    out = out.replace(/margin-inline\s*:\s*auto/g, 'margin-left:auto;margin-right:auto');

    // Strip CSS Color 4 gradient interpolation (in oklab / in oklch) & dvh units for Chromium 70
    out = out.replace(/\s+in\s+(?:oklab|oklch|srgb|hsl|hwb)\b/g, '');
    out = out.replace(/(\d+(?:\.\d+)?)[dsl]vh\b/g, '$1vh');

    // Normalize Media Queries Level 4 range syntax for Chromium < 104
    out = out.replace(/@media\s*\(\s*width\s*<=\s*([^)]+)\)/g, '@media (max-width:$1)');
    out = out.replace(/@media\s*\(\s*width\s*>=\s*([^)]+)\)/g, '@media (min-width:$1)');

    out = out.replace(/([;{]\s*)inset\s*:\s*([^;{}]+)(;?)/g, (match, prefix, rawVal, semi) => {
        const isImportant = /!important\s*$/i.test(rawVal);
        const imp = isImportant ? ' !important' : '';
        const cleaned = rawVal.replace(/!important\s*$/i, '').trim();
        const parts = cleaned.split(/\s+/);
        let t, r, b, l;
        if (parts.length === 1) {
            t = r = b = l = parts[0];
        } else if (parts.length === 2) {
            t = b = parts[0];
            r = l = parts[1];
        } else if (parts.length === 3) {
            t = parts[0];
            r = l = parts[1];
            b = parts[2];
        } else if (parts.length === 4) {
            [t, r, b, l] = parts;
        } else {
            return match;
        }
        return `${prefix}top:${t}${imp};right:${r}${imp};bottom:${b}${imp};left:${l}${imp};inset:${rawVal}${semi}`;
    });

    out = out.replace(/([;{]\s*)([\w-]+)\s*:\s*([^;{}]*color-mix\([^;{}]+)(;?)/g, (match, prefix, prop, rawVal, semi) => {
        if (rawVal.includes('linear-gradient')) return match;
        const isImportant = /!important\s*$/i.test(rawVal);
        const imp = isImportant ? ' !important' : '';
        const varMatch = rawVal.match(/color-mix\([^,]+,\s*(var\([^)]+\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
        if (!varMatch) return match;
        const fallbackColor = varMatch[1];
        const cleanedProp = rawVal.replace(/color-mix\([^;{}]*?\)(?=\s*(?:!important|$|;))/, fallbackColor).replace(/!important\s*$/i, '').trim();
        return `${prefix}${prop}:${cleanedProp}${imp};${prop}:${rawVal}${semi}`;
    });

    return out;
}

// 5. Clean & copy dist -> assets/www with JS transpilation (chrome70) & CSS compat pass
const SKIP_FILES = new Set(['sw.js', 'robots.txt', 'sitemap.xml']);

rmSync(wwwDir, { recursive: true, force: true });
mkdirSync(wwwDir, { recursive: true });

async function copyAndTransformDir(srcBase, dstBase) {
    for (const entry of readdirSync(srcBase)) {
        const srcPath = join(srcBase, entry);
        const dstPath = join(dstBase, entry);
        const rel = relative(distDir, srcPath).replace(/\\/g, '/');
        if (SKIP_FILES.has(rel)) continue;

        const st = statSync(srcPath);
        if (st.isDirectory()) {
            mkdirSync(dstPath, { recursive: true });
            await copyAndTransformDir(srcPath, dstPath);
        } else if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
            const code = readFileSync(srcPath, 'utf8');
            const transformed = await esbuild.transform(code, {
                loader: 'js',
                target: ['chrome70'],
                format: 'esm',
                minify: true,
                legalComments: 'none'
            });
            writeFileSync(dstPath, transformed.code, 'utf8');
            log(`Transpiled JS (chrome70): ${rel} (${(transformed.code.length / 1024).toFixed(1)} KB)`);
        } else if (entry.endsWith('.css')) {
            const css = readFileSync(srcPath, 'utf8');
            const compatCss = addLegacyCssFallbacks(css);
            writeFileSync(dstPath, compatCss, 'utf8');
            log(`Processed CSS (compat): ${rel} (${(compatCss.length / 1024).toFixed(1)} KB)`);
        } else {
            copyFileSync(srcPath, dstPath);
        }
    }
}

await copyAndTransformDir(distDir, wwwDir);

// 6. Copy Android web runtime files & patch index.html
copyFileSync(join(runtimeDir, 'android-bridge.js'), join(wwwDir, 'android-bridge.js'));
copyFileSync(join(runtimeDir, 'android-compat.css'), join(wwwDir, 'android-compat.css'));

const indexHtmlPath = join(wwwDir, 'index.html');
let indexHtml = readFileSync(indexHtmlPath, 'utf8');

// Strip external Google Fonts links to avoid offline delays
indexHtml = indexHtml
    .replace(/<link[^>]+fonts\.googleapis\.com[^>]*>/gi, '')
    .replace(/<link[^>]+fonts\.gstatic\.com[^>]*>/gi, '');

// Inject android-bridge.js first in <head> and android-compat.css last in <head>
indexHtml = indexHtml.replace(
    /<head>/i,
    '<head><script src="/android-bridge.js"></script>'
);
indexHtml = indexHtml.replace(
    /<\/head>/i,
    '<link rel="stylesheet" href="/android-compat.css"></head>'
);

writeFileSync(indexHtmlPath, indexHtml, 'utf8');
log('Patched assets/www/index.html with Android bridge and compatibility stylesheet.');

// 7. Generate Android launcher icons from ../public/icons/
function generateIcons() {
    const srcSquare = join(rootDir, 'public', 'icons', 'icon-512.png');
    const srcMaskable = join(rootDir, 'public', 'icons', 'maskable-512.png');
    if (!existsSync(srcSquare)) {
        log('Warning: ../public/icons/icon-512.png not found, skipping icon generation.');
        return;
    }

    const resDir = join(androidDir, 'app', 'src', 'main', 'res');
    const tmpJavaDir = join(androidDir, 'build', 'icon-tool');
    mkdirSync(tmpJavaDir, { recursive: true });

    const javaCode = `
import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

public class IconGen {
    private static BufferedImage scale(BufferedImage src, int size, boolean round, double innerScale) {
        BufferedImage dst = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = dst.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        if (round) {
            g.setClip(new Ellipse2D.Double(0, 0, size, size));
        }
        int drawSize = (int) Math.round(size * innerScale);
        int offset = (size - drawSize) / 2;
        g.drawImage(src, offset, offset, drawSize, drawSize, null);
        g.dispose();
        return dst;
    }

    public static void main(String[] args) throws Exception {
        BufferedImage square = ImageIO.read(new File(args[0]));
        BufferedImage maskable = new File(args[1]).exists() ? ImageIO.read(new File(args[1])) : square;
        File resDir = new File(args[2]);

        String[] buckets = { "mipmap-mdpi", "mipmap-hdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi" };
        int[] sizes = { 48, 72, 96, 144, 192 };

        for (int i = 0; i < buckets.length; i++) {
            File dir = new File(resDir, buckets[i]);
            dir.mkdirs();
            ImageIO.write(scale(square, sizes[i], false, 1.0), "PNG", new File(dir, "ic_launcher.png"));
            ImageIO.write(scale(square, sizes[i], true, 1.0), "PNG", new File(dir, "ic_launcher_round.png"));
        }

        File fgDir = new File(resDir, "drawable-xxxhdpi");
        fgDir.mkdirs();
        BufferedImage fg = new BufferedImage(432, 432, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = fg.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        int iconSize = 276;
        int pad = (432 - iconSize) / 2;
        g.drawImage(maskable, pad, pad, iconSize, iconSize, null);
        g.dispose();
        ImageIO.write(fg, "PNG", new File(fgDir, "ic_launcher_foreground.png"));
    }
}
`;
    const javaFile = join(tmpJavaDir, 'IconGen.java');
    writeFileSync(javaFile, javaCode);
    const javaBin = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin') : '';
    const javaExe = javaBin && existsSync(join(javaBin, 'java.exe')) ? join(javaBin, 'java.exe') : 'java';

    execFileSync(javaExe, [javaFile, srcSquare, srcMaskable, resDir], { stdio: 'inherit' });
    log('Generated mipmap launcher icons (mdpi..xxxhdpi + adaptive foreground).');
}

generateIcons();
log(`Sync complete! Android web bundle ready in ${wwwDir}`);
