# 本地原文库

正文与可下载包位于 `data/canon/corpus/`，经 `npm run data:build` 校验后原样发布到 `public/data/corpus/`。运行时无需访问外部文本网站。

|阅读范围|文件|具体底本与边界|
|---|---|---|
|前80回|`original80.txt`|维基文库数字汇校本1—80回；不是独立脂本逐字校勘|
|120回|`cheng120.txt`|同一数字汇校本1—120回；前80回以庚辰本、后40回以程甲本为底本，不是程甲刻本逐字转录|
|癸酉108回|`guiyou108-status.json`|全文未收录；记录查找结果、候选来源与未采用原因，禁止以其他本截取或拼接代替|

`daguanyuan-texts.zip` 包含两份合订文本、120份分回正文、段落索引、署名许可说明和癸酉本缺口记录。`archive.json` 保存ZIP的SHA-256；`manifest.json` 保存正文文件与原始网页的SHA-256、获取时间、来源链接、修订编号和稳定段落编号。`NOTICE.txt` 随包分发，数字整理按CC BY-SA 4.0署名及相同方式共享。

来源底本说明：[维基文库红楼梦导览](https://zh.wikisource.org/wiki/Portal:紅樓夢)。正文保留繁体和异体字，移除网页导航、脚注标号、许可页脚，保留诗歌换行。原始HTML及提取中间结果在 `data/raw/corpus/`；`source_checked` 指来源、结构及哈希核查，不代表对120回逐字学术校勘。

## 调用

服务器 `server/literary-corpus.mjs` 提供 `loadCorpus(root)` 与 `searchCorpus(manifest, {editionId, maxChapter, query, limit})`。结果包含原文片段、回数、段落编号、段内字符偏移、是否截短、正文路径、SHA-256和来源URL。检索为本地汉字双字匹配，兼容常见人物、地点名的简繁写法，不是完整异体字检索或语义搜索。

人物行动与对话请求已接入：服务端选择版本，只查询当前起点**之前**的回目，每次最多3段、每段700字符。原文参考独立放入 `literaryReferences`，不加入个人记忆，也不放宽原有 `evidenceIds` 规则。它不证明人物知情或事件在推演中已经发生。癸酉本返回 `missing_fulltext`，文件损坏或缺失返回 `unavailable`，都不会跨版本兜底或声称已经读过原文。

故事创作 `story-continue` 与复核 `story-review` 也接入独立的 `literaryReferences`：保留起点回目末尾连续6000字符（带段落偏移），另按方向、累计剧情和人物检索起点之前最多4段。续演后的状态以已保存的剧情及IF条件为准。用户自行导入的原文不借用内置汇校本补齐，以免混用底本。检索不等于模型通读全书，也不改变默认的审核节点起点。

## 重建与验证

```sh
npm run content:corpus:fetch
npm run content:corpus
npm run content:editions
npm run build
npm test
npm run lint
```

抓取缓存保留原始来源；重建不联网。ZIP使用固定时间戳和稳定排序。新来源须单独核对版本身份、正文完整性及许可后再进入canon；现代癸酉本整理文件不能仅凭网上可下载就当作可公开分发的古籍全文。

现有剧情节点仍是选编，全文入库不等于每回已生成剧情，也不等于自动校正全部人物知识。原文、空间解释和虚构推演继续分开。
