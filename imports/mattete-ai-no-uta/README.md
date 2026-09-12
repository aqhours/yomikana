# 待ってて愛のうた · 导入记录

已接入本地歌曲目录：`/songs/mattete-ai-no-uta`。尚未提交或部署。

## 来源

- `booklet.ja.txt`：用户提供的歌词本原文，展示严格保留这 40 行、用字及全角分隔空格。
- `translation.zh.txt`：用户提供的原始译文，保留原始分行。页面按歌词本合并对应译文，仅调整衔接标点。
- `source.qrc`：用户提供的 `lyrics/待ってて愛のうた.qrc` 原件，包含 69 行演唱歌词。词曲信息来自该文件。
- 音频：用户提供的 `/Users/jiiong/Downloads/待ってて愛のうた.mp3`，原样复制到 `public/audio/mattete-ai-no-uta.mp3`。本机 `afinfo` 检测时长 360.907750 秒，44.1kHz、双声道、128kbps。
- `cover.jpg`：Apple Music 日区原单曲封面。请求 3000px，实际返回 1423 × 1423，未放大。
- `apple-music.json`：Apple 官方公开接口返回的原单曲元数据，附封面请求 URL；Aqours，《恋になりたいAQUARIUM》，2016-04-27，第 2 轨，360880ms。

来源：[Apple Music 日区](https://music.apple.com/jp/album/1891258134?i=1891258136)、[发行方目录](https://catalog.bandainamcomusiclive.co.jp/release/66760/)。核对日期：2026-09-12。

## 展示与同步

`app/song-data.ts` 中的 `matteteAiNoUtaLyrics` 包含分词、假名、罗马音、词义和中文译文。

`public/audio/mattete-ai-no-uta.yrc` 按歌词本归并为 40 行，首句开始于 19011ms。QRC 的歌词介绍和歌词本未收录的重复和声不进入展示。用字按歌词本统一，例如：繰り返す → くりかえす、素敵 → ステキ、力 → チカラ、mission → ミッション、love song → ラブソング。

相同文字保留源时间；用字变化的局部区间沿用源区间起止点，并在替换文字间分配时长。未按整行平均生成时间轴。英文转片假名等位置的细分时间属于局部插值，并非另行测量的音素时间。

封面 256px/640px WebP 和背景六色配色按项目现有脚本的相同参数从已下载原图生成，保存在 `public/covers/` 和两个封面 JSON 清单中。

## 验证

- 构建与 ESLint 通过。
- 新增渲染测试通过：40 行全文与歌词本逐字一致，时间轴文字对应、时间递增、时长为正且不超出音频。
- 浏览器检查：封面、注音、译文正常；点击首句跳到约 19 秒，播放进度推进、高亮工作，检查后已暂停。
- 全量测试：15 通过、12 失败；添加歌曲前的基线副本为 14 通过、相同的 12 项失败。保留既有失败，未扩大本次歌曲导入范围。
- TypeScript 检查仍有既有的 `worker/index.ts:6` 缺少 `Fetcher` 类型错误；基线副本同样复现。
