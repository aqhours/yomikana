# 夢で夜空を照らしたい · 导入记录

已接入 `/songs/yume-de-yozora`，尚未提交或部署；前端 UI 与播放效果待用户人工验收。

## 使用的资料

- `source.qrc`：用户更新后的原单曲版逐字歌词，与 `lyrics/夢で夜空を照らしたい.qrc` 一致。
- `lyrics.ja.txt`：53 行日文正文，保留原件用字、分行及最后三行 La la la la。
- `translation.zh.txt`：按项目翻译原则整理的逐行中文译文。
- `apple-music.json`：Apple 日区《夢で夜空を照らしたい/未熟DREAMER》原单曲信息，2016-09-14，第 1 轨。
- `cover.jpg`：原单曲封面；已生成 256px/640px WebP 与背景六色配色。
- 音频：用户提供的六人演唱版 MP3，原样复制到 `public/audio/yume-de-yozora.mp3`；334.341224 秒、44.1kHz、双声道、192kbps。
- 演唱：高海千歌、桜内梨子、渡辺曜、津島善子、国木田花丸、黒澤ルビィ；作词：畑亜貴；作曲：光増ハジメ；编曲：EFFY。

## 时间轴及检查

使用项目 `import-qrc.mjs` 转换为 `public/audio/yume-de-yozora.yrc`，过滤歌曲介绍，保留所有演唱时间，未平移或缩放。首句 22329ms，最后一段结束于 312162ms。

数据检查通过：53 行全文与源歌词及时间轴完全对应，582 个时间标记顺序与时长有效，均未超出音频；每个分词都有注音（汉字）、罗马音与简洁释义；音频副本字节一致。构建与 lint 通过。

没有使用 Computer Use、浏览器自动化或 UI 单元测试验收。请用户人工确认实际播放同步、分行与视觉效果。

## 先前资料

`source-live.qrc`、`lyrics.live.ja.txt`、`translation.draft.zh.txt` 是先前不匹配的 Live 版及草稿，只作来源留档，不参与页面或时间轴生成。

来源：[Apple Music 原单曲](https://music.apple.com/jp/album/1891258771?i=1891258772)、[Sunrise Music 词曲资料](https://www.sunrise-music.co.jp/list/detail.php?id=207)。
