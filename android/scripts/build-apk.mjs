import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const androidDir = resolve(__dirname, '..');
const appDir = join(androidDir, 'app');
const mainDir = join(appDir, 'src', 'main');
const buildDir = join(androidDir, 'build');
const isWin = process.platform === 'win32';

const args = new Set(process.argv.slice(2));
const doSync = args.has('--sync');
const doInstall = args.has('--install');
const doLaunch = args.has('--launch');

function log(msg) {
    console.log(`[android:build] ${msg}`);
}

function fail(msg) {
    console.error(`[android:build] ERROR: ${msg}`);
    process.exit(1);
}

function run(cmd, cmdArgs, opts = {}) {
    const isBatch = isWin && /\.(bat|cmd)$/i.test(cmd);
    if (isBatch) {
        execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', cmd, ...cmdArgs], {
            stdio: 'inherit',
            ...opts
        });
        return;
    }
    execFileSync(cmd, cmdArgs, {
        stdio: 'inherit',
        ...opts
    });
}

function findAndroidSdk() {
    const candidates = [
        process.env.ANDROID_HOME,
        process.env.ANDROID_SDK_ROOT,
        process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null,
        process.env.USERPROFILE ? join(process.env.USERPROFILE, 'AppData', 'Local', 'Android', 'Sdk') : null,
        process.env.HOME ? join(process.env.HOME, 'Android', 'Sdk') : null
    ].filter(Boolean);

    for (const dir of candidates) {
        if (existsSync(join(dir, 'build-tools')) && existsSync(join(dir, 'platforms'))) {
            return dir;
        }
    }
    fail('Android SDK not found. Set ANDROID_HOME or install SDK under AppData/Local/Android/Sdk.');
}

function findLatestSubdir(parent, filterFn = () => true) {
    const entries = readdirSync(parent)
        .filter(name => statSync(join(parent, name)).isDirectory() && filterFn(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (entries.length === 0) return null;
    return join(parent, entries[entries.length - 1]);
}

function findJavaTool(name) {
    const ext = isWin ? '.exe' : '';
    if (process.env.JAVA_HOME) {
        const candidate = join(process.env.JAVA_HOME, 'bin', name + ext);
        if (existsSync(candidate)) return candidate;
    }
    return name + ext;
}

function findAdb(sdkDir) {
    const ext = isWin ? '.exe' : '';
    const candidates = [
        join(sdkDir, 'platform-tools', 'adb' + ext),
        process.env.USERPROFILE ? join(process.env.USERPROFILE, 'platform-tools', 'adb' + ext) : null
    ].filter(Boolean);
    for (const c of candidates) {
        if (existsSync(c)) return c;
    }
    return 'adb' + ext;
}

const sdkDir = findAndroidSdk();
const buildToolsDir = findLatestSubdir(join(sdkDir, 'build-tools'));
if (!buildToolsDir) fail('No Android build-tools found in SDK.');

const platformDir = existsSync(join(sdkDir, 'platforms', 'android-33', 'android.jar'))
    ? join(sdkDir, 'platforms', 'android-33')
    : findLatestSubdir(join(sdkDir, 'platforms'), name => /^android-\d+$/.test(name) && existsSync(join(sdkDir, 'platforms', name, 'android.jar')));
if (!platformDir) fail('No Android platform android.jar found in SDK.');

const androidJar = join(platformDir, 'android.jar');
const aapt2 = join(buildToolsDir, isWin ? 'aapt2.exe' : 'aapt2');
const d8 = join(buildToolsDir, isWin ? 'd8.bat' : 'd8');
const zipalign = join(buildToolsDir, isWin ? 'zipalign.exe' : 'zipalign');
const apksigner = join(buildToolsDir, isWin ? 'apksigner.bat' : 'apksigner');
const javac = findJavaTool('javac');
const java = findJavaTool('java');
const keytool = findJavaTool('keytool');
const adb = findAdb(sdkDir);

log(`SDK:         ${sdkDir}`);
log(`Build-Tools: ${buildToolsDir}`);
log(`Platform:    ${platformDir}`);

// Sync web assets if requested or missing
const assetsIndex = join(mainDir, 'assets', 'www', 'index.html');
if (doSync || !existsSync(assetsIndex)) {
    log('Synchronizing web assets...');
    run(process.execPath, [join(__dirname, 'sync-web.mjs')]);
}

const manifestPath = join(mainDir, 'AndroidManifest.xml');
const manifestXml = readFileSync(manifestPath, 'utf8');
const versionName = (manifestXml.match(/android:versionName="([^"]+)"/) || [])[1] || '2.0.0';
const versionCode = (manifestXml.match(/android:versionCode="([^"]+)"/) || [])[1] || '20000';

const intermediateDir = join(buildDir, 'intermediates');
const genDir = join(intermediateDir, 'gen');
const classesDir = join(intermediateDir, 'classes');
const dexDir = join(intermediateDir, 'dex');
const outApkDir = join(buildDir, 'outputs', 'apk', 'debug');

rmSync(intermediateDir, { recursive: true, force: true });
mkdirSync(genDir, { recursive: true });
mkdirSync(classesDir, { recursive: true });
mkdirSync(dexDir, { recursive: true });
mkdirSync(outApkDir, { recursive: true });

const compiledResZip = join(intermediateDir, 'compiled-res.zip');
log('Compiling resources (aapt2 compile)...');
run(aapt2, ['compile', '--dir', join(mainDir, 'res'), '-o', compiledResZip]);

const linkedApk = join(intermediateDir, 'linked.apk');
log('Linking resources & assets (aapt2 link)...');
run(aapt2, [
    'link',
    '-I', androidJar,
    '--manifest', manifestPath,
    '-A', join(mainDir, 'assets'),
    '--java', genDir,
    '--min-sdk-version', '24',
    '--target-sdk-version', '33',
    '--version-code', versionCode,
    '--version-name', versionName,
    '--auto-add-overlay',
    '--debug-mode',
    '-o', linkedApk,
    compiledResZip
]);

function collectFiles(dir, ext, acc = []) {
    if (!existsSync(dir)) return acc;
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) {
            collectFiles(p, ext, acc);
        } else if (entry.endsWith(ext)) {
            acc.push(p);
        }
    }
    return acc;
}

const javaSources = [
    ...collectFiles(join(mainDir, 'java'), '.java'),
    ...collectFiles(genDir, '.java')
];
log(`Compiling ${javaSources.length} Java sources (javac --release 8)...`);
run(javac, [
    '--release', '8',
    '-encoding', 'UTF-8',
    '-cp', androidJar,
    '-d', classesDir,
    ...javaSources
]);

const classFiles = collectFiles(classesDir, '.class');
log(`Dexing ${classFiles.length} class files (d8)...`);
run(d8, [
    '--min-api', '24',
    '--lib', androidJar,
    '--output', dexDir,
    ...classFiles
]);

const classesDex = join(dexDir, 'classes.dex');
if (!existsSync(classesDex)) fail('d8 did not produce classes.dex');

const packagedApk = join(intermediateDir, 'packaged.apk');
const packerJava = join(intermediateDir, 'ApkPacker.java');
writeFileSync(packerJava, `
import java.io.*;
import java.util.*;
import java.util.zip.*;

public class ApkPacker {
    public static void main(String[] args) throws Exception {
        File inApk = new File(args[0]);
        File dexFile = new File(args[1]);
        File outApk = new File(args[2]);

        try (ZipFile zf = new ZipFile(inApk);
             ZipOutputStream zos = new ZipOutputStream(new BufferedOutputStream(new FileOutputStream(outApk)))) {
            Enumeration<? extends ZipEntry> entries = zf.entries();
            byte[] buf = new byte[65536];
            while (entries.hasMoreElements()) {
                ZipEntry e = entries.nextElement();
                String normalizedName = e.getName().replace('\\\\', '/');
                if ("classes.dex".equals(normalizedName)) continue;
                ZipEntry copy = new ZipEntry(normalizedName);
                copy.setTime(e.getTime());
                if (e.getMethod() == ZipEntry.STORED) {
                    copy.setMethod(ZipEntry.STORED);
                    copy.setSize(e.getSize());
                    copy.setCompressedSize(e.getCompressedSize());
                    copy.setCrc(e.getCrc());
                } else {
                    copy.setMethod(ZipEntry.DEFLATED);
                }
                zos.putNextEntry(copy);
                try (InputStream is = zf.getInputStream(e)) {
                    int n;
                    while ((n = is.read(buf)) > 0) zos.write(buf, 0, n);
                }
                zos.closeEntry();
            }

            ZipEntry dexEntry = new ZipEntry("classes.dex");
            dexEntry.setMethod(ZipEntry.DEFLATED);
            zos.putNextEntry(dexEntry);
            try (InputStream is = new BufferedInputStream(new FileInputStream(dexFile))) {
                int n;
                while ((n = is.read(buf)) > 0) zos.write(buf, 0, n);
            }
            zos.closeEntry();
        }
    }
}
`);
log('Merging classes.dex into APK...');
run(java, [packerJava, linkedApk, classesDex, packagedApk]);

const alignedApk = join(intermediateDir, 'aligned.apk');
log('Aligning APK (zipalign -f -p 4)...');
run(zipalign, ['-f', '-p', '4', packagedApk, alignedApk]);

const keystoreDir = join(androidDir, 'keystore');
mkdirSync(keystoreDir, { recursive: true });
const keystorePath = join(keystoreDir, 'debug.keystore');
if (!existsSync(keystorePath)) {
    log('Generating Android debug keystore...');
    run(keytool, [
        '-genkeypair',
        '-v',
        '-keystore', keystorePath,
        '-storepass', 'android',
        '-alias', 'androiddebugkey',
        '-keypass', 'android',
        '-keyalg', 'RSA',
        '-keysize', '2048',
        '-validity', '10000',
        '-dname', 'CN=CalculadoraHormigon,O=EngineeringSuitePro,C=EC'
    ]);
}

const finalApk = join(outApkDir, `calculadora-hormigon-v${versionName}-debug.apk`);
log('Signing APK (apksigner)...');
run(apksigner, [
    'sign',
    '--ks', keystorePath,
    '--ks-pass', 'pass:android',
    '--ks-key-alias', 'androiddebugkey',
    '--key-pass', 'pass:android',
    '--v1-signing-enabled', 'true',
    '--v2-signing-enabled', 'true',
    '--v3-signing-enabled', 'true',
    '--out', finalApk,
    alignedApk
]);

log('Verifying APK signature...');
run(apksigner, ['verify', '--verbose', finalApk]);

const apkSizeMb = (statSync(finalApk).size / (1024 * 1024)).toFixed(2);
log(`SUCCESS! APK built: ${finalApk} (${apkSizeMb} MB)`);

if (doInstall) {
    log('Installing APK on connected Android device via ADB...');
    run(adb, ['install', '-r', '-d', finalApk]);
    log('Installation complete!');
}

if (doLaunch) {
    log('Launching Calculadora de Hormigón on device...');
    run(adb, ['shell', 'am', 'start', '-n', 'com.calculadorahormigon.app/.MainActivity']);
}
