// Ajustes nativos depois do "npx cap add": orientação só paisagem, tela cheia e sem barra de status.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- iOS: Info.plist ---------- */
const plistPath = join(root, 'ios/App/App/Info.plist');
if (existsSync(plistPath)) {
  let x = readFileSync(plistPath, 'utf8');
  const landscape = '<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>';
  const set = (key, valueXml) => {
    const re = new RegExp(`(<key>${key}</key>\\s*)(<array>[\\s\\S]*?</array>|<true/>|<false/>|<string>[\\s\\S]*?</string>)`);
    if (re.test(x)) x = x.replace(re, `$1${valueXml}`);
    else x = x.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${valueXml}\n</dict>\n</plist>\n`);
  };
  set('UISupportedInterfaceOrientations', landscape);
  set('UISupportedInterfaceOrientations~ipad', landscape);
  set('UIRequiresFullScreen', '<true/>');
  set('UIStatusBarHidden', '<true/>');
  set('UIViewControllerBasedStatusBarAppearance', '<false/>');
  set('ITSAppUsesNonExemptEncryption', '<false/>');
  set('CFBundleDisplayName', '<string>Esq. vs Dir.</string>');
  writeFileSync(plistPath, x);
  console.log('iOS: Info.plist configurado (paisagem, tela cheia, sem barra de status)');
} else console.log('iOS: pasta ios/ ainda não existe — rode "npx cap add ios" antes.');

/* ---------- Android: AndroidManifest ---------- */
const manPath = join(root, 'android/app/src/main/AndroidManifest.xml');
if (existsSync(manPath)) {
  let m = readFileSync(manPath, 'utf8');
  if (!/screenOrientation/.test(m)) m = m.replace(/<activity\b/, '<activity\n            android:screenOrientation="sensorLandscape"');
  writeFileSync(manPath, m);
  console.log('Android: orientação paisagem configurada');
}
