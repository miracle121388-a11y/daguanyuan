# 本地原文库

正文与可下载包位于 `data/canon/corpus/`，经 `npm run data:build` 校验后原样发布到 `public/data/corpus/`。运行时无需访问外部文本网站。

|阅读范围|文件|具体底本与边界|
|---|---|---|
|前80回|`original80.txt`|维基文库数字汇校本1—80回；不是独立脂本逐字校勘|
|120回|`cheng120.txt`|同一数字汇校本1—120回；前80回以庚辰本、后40回以程甲本为底本，不是程甲刻本逐字转录|
|癸酉108回|`guiyou108-status.json`|全文未收录；记录查找结果、候选来源与未采用原因，禁止以其他本截取或拼接代替|

上表为**公开原文库**。2026-09-30用户另提供621页108回PDF，已转换为私人导入用TXT，保存在 `.local/corpus/guiyou108/`，下载目录也有合订TXT副本。目录与正文108回的顺序、分回范围、末回、字符保留和SHA-256均已核验；不代表版本真伪鉴定或逐字校勘。PDF未附公开转载许可，正文不进入Git、公开canon或静态下载目录。按用户最新的续本演绎要求，经 `data/canon/playbackSources.json` 核验来源后，部署包在服务器私有目录包含108份分回正文与索引，供主故事的逐回演绎使用；公开库的缺口标记只描述可公开下载的语料。

PDF转换复现（仅该文件的SHA-256与版式适用）：

```sh
conda run -n daguanyuan python -m pip install -r requirements-pdf.txt
conda run -n daguanyuan python scripts/extract_guiyou_pdf.py '/path/to/用户提供的108回.pdf' --through 91
```

输出全文108回TXT、截至91回TXT、108份分回正文及来源/页码/哈希索引。保留批语、按语、异体字、注音和物理行换行，不以其他本补文。第81回起由A4变为Letter，逐行中心坐标剔除页眉页脚，保留跨入页脚边缘的正文；PDF第238页原本无正文，明确记录。完整TXT为889044字符/2609968字节，现有导入器分为56块；截止91回分为47块。这里只验证了导入结构及完整分片覆盖，尚未让模型通读全文。实测记录：`reports/acceptance/guiyou-pdf-20260930.json`。

`daguanyuan-texts.zip` 包含两份合订文本、120份分回正文、段落索引、署名许可说明和癸酉本缺口记录。`archive.json` 保存ZIP的SHA-256；`manifest.json` 保存正文文件与原始网页的SHA-256、获取时间、来源链接、修订编号和稳定段落编号。`NOTICE.txt` 随包分发，数字整理按CC BY-SA 4.0署名及相同方式共享。

来源底本说明：[维基文库红楼梦导览](https://zh.wikisource.org/wiki/Portal:紅樓夢)。正文保留繁体和异体字，移除网页导航、脚注标号、许可页脚，保留诗歌换行。原始HTML及提取中间结果在 `data/raw/corpus/`；`source_checked` 指来源、结构及哈希核查，不代表对120回逐字学术校勘。

## 调用

服务器 `server/literary-corpus.mjs` 提供 `loadCorpus(root)` 与 `searchCorpus(manifest, {editionId, maxChapter, query, limit})`。结果包含原文片段、回数、段落编号、段内字符偏移、是否截短、正文路径、SHA-256和来源URL。检索为本地汉字双字匹配，兼容常见人物、地点名的简繁写法，不是完整异体字检索或语义搜索。

人物行动与对话请求已接入：服务端选择版本，只查询当前起点**之前**的回目，每次最多3段、每段700字符。原文参考独立放入 `literaryReferences`，不加入个人记忆，也不放宽原有 `evidenceIds` 规则。它不证明人物知情或事件在推演中已经发生。原有公开库人物检索的癸酉本返回 `missing_fulltext`；主故事另通过 `server/story-playback.mjs` 使用用户的私人PDF正文。任何文件损坏或缺失都不会跨版本兜底或声称已经读过原文。

故事创作 `story-continue` 与复核 `story-review` 也接入独立的 `literaryReferences`：保留起点回目末尾连续6000字符（带段落偏移），另按方向、累计剧情和人物检索起点之前最多4段。续演后的状态以已保存的剧情及IF条件为准。用户自行导入的原文不借用内置汇校本补齐，以免混用底本。检索不等于模型通读全书。新主世界统一从80回结束开始：原版自由续写，程高和癸酉按当前回正文精简演绎，具体规则见 `CONTINUATION.md`。

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

## 续本私有部署

`scripts/package_deploy.py` 依据审核元数据核验私人索引、108份分回SHA-256、PDF来源SHA-256和合订正文SHA-256后才打包。 fresh checkout 需先按上面的转换命令生成 `.local/corpus/guiyou108/`；缺失即终止打包，不能省略正文后上线。运行服务器再次校验；文件位于静态根目录之外。模型收到去批语后的叙事投影，段内偏移对应该投影，原文SHA-256仍标识未删注的来源文件。批语保留在私人档案供核查，不成为剧情事实。
