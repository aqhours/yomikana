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

添加或更新 `app/song-data.ts` 中的封面后，运行 `npm run palette:generate` 并提交生成的 JSON。该命令需要访问封面图床；支持 JPEG 和 WebP，提取失败时不会覆盖已有配色。歌词背景由 `@applemusic-like-lyrics/core` 的 `MeshGradientRenderer` 根据封面生成动态网格渐变；预生成配色继续用于进度条和兜底底色。边缘虚化只作用于可见文字，不处理背景。

## 加载优化

歌曲数据只在服务端组装，浏览器接收当前歌曲；首页列表在服务端渲染，只有主题按钮需要客户端交互。音频缓存下载在点击「开始阅读」后启动，避免与首屏图片争抢带宽。

歌曲详情页背景保留原始 URL、尺寸与画质。歌词动态背景使用同源封面缩略图作为颜色输入，桌面展示的大封面仍使用原图。首页卡片使用 640px WebP，播放器小封面使用 256px WebP，质量参数为 88；首页仅第一张封面立即加载，其余由浏览器按滚动位置懒加载。新增或更新 `app/song-data.ts` 中的封面后，运行 `npm run covers:optimize`，提交 `public/covers/` 下的生成图片与 `app/cover-thumbnails.json`。文件名包含内容哈希，常规构建不需要访问图床。

## 歌词动态背景

`app/reader-background.tsx` 在打开歌词页后动态加载 AMLL，采用 30 FPS、0.5 渲染比例和 0.2 流动速度。暂停或系统要求减少动态效果时使用静态模式；页面隐藏时暂停渲染，关闭歌词页后释放资源。图片加载或 WebGL 失败时退回静态模糊封面。Safari 页面底色保留封面深色兜底，移除了针对旧 CSS 渐变的颜色估算。

第三方依赖：[@applemusic-like-lyrics/core](https://github.com/amll-dev/applemusic-like-lyrics)，版本 0.5.2，许可证 AGPL-3.0-only（见依赖包 LICENSE）。

人工验收入口：`/songs/happy-party-train` → 开始阅读。请检查不同歌曲的色彩、播放/暂停、全屏切换、手机横竖屏、Safari 顶栏，以及关闭后重新打开。构建和 lint 不代表视觉验收通过。

## 致谢

感谢 [Apple Music-like Lyrics（AMLL）](https://github.com/amll-dev/applemusic-like-lyrics) 项目及其维护者和贡献者。Yomikana 的歌词动态背景使用了该项目提供的 `MeshGradientRenderer`，让专辑封面的色彩以柔和流动的渐变呈现。感谢你们的开源分享与持续维护。
