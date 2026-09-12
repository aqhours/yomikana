# 歌曲导入

## 中文翻译要求

用户于 2026-09-12 指定；后续歌曲由助手按以下要求翻译，有用户译文时优先采用用户版本。

1. 优先准确还原原意，不添加原文没有的含义，不刻意拔高或过度文艺化。
2. 在准确的基础上让中文自然、顺畅，避免生硬逐字直译。
3. 保留 Aqours 歌词本身青春、明亮、真挚的感觉，但不要额外渲染情绪。
4. 尽量保持原歌词的分行和语气。
5. 对重复句、关键词和意象保持译法一致。
6. 如果直译和自然表达冲突，优先选择不改变原意的自然中文。

## 资料与导入流程

- 用 `/Users/jiiong/Documents/Mac/qqlyrics --help` 查看歌词脚本；按歌名、歌手、时长核对原版，保存 QRC 与来源元数据。服务要求登录或验证时，先完成验证再继续。
- Apple 日区公开查询：`https://itunes.apple.com/search?country=jp&entity=song&term=...`。匹配歌名、艺人、专辑和曲号；`artworkUrl100` 的尺寸可改为 `3000x3000bb.jpg`，下载后检查实际尺寸。`previewUrl` 是试听片段，不用作整曲同步音源。
- 完整音频使用用户已有文件、购买下载或 CD 导出；核对版本、时长及首句起点。
- 根据原文分词并补充假名、罗马音、词义；把中文译文与展示行逐行对应。
- `node scripts/import-qrc.mjs <source.qrc> <destination.yrc> <first-lyric-start-ms>` 转换真实时间轴，检查原始 QRC 是否为脚本支持的 XML 格式。
- 更新 `app/song-data.ts` 与 `app/page.tsx`，按发行日和曲号排序。音频、时间轴放入 `public/audio/`。
- 运行 `npm run covers:optimize` 和 `npm run palette:generate` 更新封面缩略图及背景配色。
- 更新歌曲目录顺序相关断言，运行 lint、构建与现有测试，再检查播放和逐字高亮。

资料未齐全时保存在 `imports/<slug>/`；接入播放器前必须取得真实音频和时间轴。
