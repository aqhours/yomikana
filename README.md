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
