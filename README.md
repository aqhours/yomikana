# Yomikana

《君のこころは輝いてるかい？》日语歌词读本，包含假名注音、罗马音、中文释义、逐字同步高亮和自动滚动。

## 本地开发

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 检查

```bash
npm run lint
npm test
```

歌词时间轴位于 `public/audio/kimi-no-kokoro.yrc`，歌曲音频位于 `public/audio/kimi-no-kokoro.mp3`。

浏览器首次打开歌曲时会下载完整音频并写入 Cache Storage；之后打开同一首歌会直接读取本地缓存。缓存不可用、被浏览器回收或存储空间不足时会自动退回在线播放，不影响播放器使用。更新已有音频文件时，请同步递增 `app/audio-cache.ts` 中的缓存版本号。

## 生产部署

生产环境运行在 `https://yomikana.aqhours.cn`。推送到 `main` 后，GitHub webhook 会触发 `deploy.sh`，按该提交构建并更新服务。

## 专辑封面配色

歌词背景使用 `node-vibrant` 提取封面的 Vibrant、DarkVibrant、LightVibrant、Muted、DarkMuted、LightMuted 六类颜色。配色保存于 `app/cover-palettes.json`，浏览器无需下载提色库或执行图片分析。

添加或更新 `app/song-reader.tsx` 中的封面后，运行 `npm run palette:generate` 并提交生成的 JSON。该命令需要访问封面图床；支持 JPEG 和 WebP，提取失败时不会覆盖已有配色。背景保留封面原始颜色的空间分布，以大范围模糊消除图像细节；提取的主色和深色用于统一色调及底部明暗，不将六个色块直接拼接。边缘虚化只作用于可见文字，不处理背景。
