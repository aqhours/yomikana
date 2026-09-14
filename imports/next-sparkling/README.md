# Next SPARKLING!! · 导入记录

已接入本地歌曲目录 `/songs/next-sparkling`，尚未提交或部署。

- 音频：用户提供的 `/Users/jiiong/Downloads/Next SPARKLING!! - Aqours.mp3` 原样复制到 `public/audio/next-sparkling.mp3`；实测 386.742857 秒、44.1kHz、双声道、192kbps。
- `source.qrc`：用户提供的 `lyrics/Next SPARKLING!!.qrc` 原件。保留其 48 行日文正文和逐字时间；首句 33531ms，最后一个字结束于 305318ms，后续尾奏沿用完整音频。
- `translation.zh.txt`：按项目翻译原则整理的中文译文，逐行对应 QRC。分词按日语语法拆分助词和句尾，保留完整动词变化形式；释义不加入词形推导说明。
- `apple-music.json`：Apple 日区原单曲版本元数据；《僕らの走ってきた道は…/Next SPARKLING!!》，2019-01-23，第 2 轨。
- `cover.jpg`：上述原单曲的 Apple Music 封面，实际 1423 × 1423；已生成 256px/640px WebP 及背景六色配色。

Apple 标注时长为 388.893 秒，比用户音频长约 2.15 秒；该差值不足以证明逐字时间需要整体平移，因此保留 QRC 时间。已直接检查页面显示、音频加载、首句跳转和播放进度；未进行逐音素听辨校时。

构建和 lint 已通过。按用户要求不新增 UI 单元测试。

[Apple Music 原单曲](https://music.apple.com/jp/album/next-sparkling/1891050661?i=1891050663) · [Lantis 词曲资料](https://www.lantis.jp/release-item/LACA-9924.html)
