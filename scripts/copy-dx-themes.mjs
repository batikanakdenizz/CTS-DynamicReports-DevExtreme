// node_modules'taki DevExtreme tema CSS'lerini public/dx'e kopyalar.
// index.html'deki rel="dx-theme" linkleri bu dosyaları bekler; kopya olmadan
// (ya da devextreme paketiyle farklı sürümdeyken) uygulama temasız açılır.
// package.json'daki predev/prebuild kancaları sayesinde elle çalıştırmak gerekmez;
// public/dx bu yüzden .gitignore'dadır — tek doğruluk kaynağı node_modules'tır.
//
// NOT: cpSync değil copyFileSync kullanılır — Node 24/Windows'ta cpSync var olan
// dosyanın üstüne yazarken errno 0 ile hata fırlatabiliyor; hedefi silip
// dosya dosya kopyalamak her ortamda çalışıyor.
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'devextreme', 'dist', 'css')
const dest = join(root, 'public', 'dx')

rmSync(dest, { recursive: true, force: true })
mkdirSync(join(dest, 'icons'), { recursive: true })

for (const f of ['dx.fluent.blue.light.css', 'dx.fluent.blue.dark.css']) {
  copyFileSync(join(src, f), join(dest, f))
}
for (const f of readdirSync(join(src, 'icons'))) {
  copyFileSync(join(src, 'icons', f), join(dest, 'icons', f))
}
console.log('[copy-dx-themes] public/dx <- devextreme/dist/css senkronize edildi')
