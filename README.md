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

浏览器首次打开歌词阅读器时会下载完整音频并写入 Cache Storage；之后打开同一首歌会直接读取本地缓存。缓存不可用、被浏览器回收或存储空间不足时会自动退回在线播放，不影响播放器使用。更新已有音频文件时，请同步递增 `app/audio-cache.ts` 中的缓存版本号。

## 生产部署

生产环境运行在 `https://yomikana.aqhours.cn`。推送到 `main` 后，GitHub webhook 会触发 `deploy.sh`，按该提交构建并更新服务。

## 专辑封面配色

歌词背景使用 `node-vibrant` 提取封面的 Vibrant、DarkVibrant、LightVibrant、Muted、DarkMuted、LightMuted 六类颜色。配色保存于 `app/cover-palettes.json`，浏览器无需下载提色库或执行图片分析。

添加或更新 `app/song-data.ts` 中的封面后，运行 `npm run palette:generate` 并提交生成的 JSON。该命令需要访问封面图床；支持 JPEG 和 WebP，提取失败时不会覆盖已有配色。背景保留封面原始颜色的空间分布，以大范围模糊消除图像细节；提取的主色和深色用于统一色调及底部明暗，不将六个色块直接拼接。边缘虚化只作用于可见文字，不处理背景。

## 加载优化

歌曲数据只在服务端组装，浏览器接收当前歌曲；首页列表在服务端渲染，只有主题按钮需要客户端交互。音频缓存下载在点击「开始阅读」后启动，避免与首屏图片争抢带宽。

背景保留原始 URL、尺寸与画质。首页卡片使用 640px WebP，播放器小封面使用 256px WebP，质量参数为 88；首页仅第一张封面立即加载，其余由浏览器按滚动位置懒加载。新增或更新 `app/song-data.ts` 中的封面后，运行 `npm run covers:optimize`，提交 `public/covers/` 下的生成图片与 `app/cover-thumbnails.json`。文件名包含内容哈希，常规构建不需要访问图床。
