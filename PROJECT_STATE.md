# 此生之外 · 项目状态交接

最后更新：2026-11-20 11:07（Asia/Shanghai）
用途：新对话先读本文件，避免重复猜测和幻觉。

## 0. 最重要的事实

- 品牌只能是「此生之外」。
- 小程序：线上 `2.0.18`；`2.0.19`（旧设计）审核中；`2.0.32`（全站深色）已于 2026-11-19 上传并提交审核，等待结果。`2.0.19` 若先通过，可能先发布旧版。
- 数据：50 段虚构人生（原 18 + 新增 32），覆盖 22 个省份。
- 视觉：小程序全站深色（首页 / 人生物 / 故事页），四档字号 56 / 44 / 26 / 20rpx。
- 网页正式站：https://life.qiaoxiao.online/ ，已重新部署，线上为 50 段；UI 保持原浅蓝布局不变。
- 网页没有登录功能，只显示官方小程序码；右上角按钮文案「微信体验」。
- 小程序使用 `wx.login` + 云函数 `login`；没有网页登录桥，也没有 6 位网页登录码。
- 工作区已干净；所有改动已提交并推 GitHub（`origin/main` = `6ef6358`）；remote 已带 token，`git push` 自动。

## 1. 环境 / 地址

- 小程序 AppID：`wxb3f0ab648912633a`
- 微信云开发环境：`cishengzhiwai-d5gf3fax9df941a21`
- 小程序当前主包：约 1.2 MB（上传 2.0.32 时 1,244,178 字节，未超过 2 MB）
- 网页域名：`life.qiaoxiao.online`
- 域名 DNS：腾讯云 DNSPod；`life` CNAME 到 `cishengzhiwai.pages.dev`
- Cloudflare Pages 项目：`cishengzhiwai`
- 生产页面：`https://life.qiaoxiao.online/`
- 预览别名：`https://preview.cishengzhiwai.pages.dev/`
- GitHub：`https://github.com/bellaverygood-gif/A-Different-Life`
- 当前 Git HEAD：`2b9f3d3 chore(life): 去掉抽人生页的圆形标记和按钮星形图标`
- GitHub 推送：remote 已带 token（classic），`git push` 自动；token 明文在本地 `.git/config`，可在 GitHub 撤销后重配。

## 2. 小程序当前状态

### 已上传版本

- 最新上传：`2.0.32`
- 上传备注：`视觉更改为深色`
- 线上版本：`2.0.18`（发布时间 2026-11-18 17:22:20）
- 审核中：`2.0.19`（提交时间 2026-11-19 11:17:42，旧设计）
- 已提交审核：`2.0.32`（2026-11-19 上传并提交，等待结果）
- `2.0.19` 在微信后台没有撤回入口；它通过审核后可能先发布旧版。
- `2.0.32` 是当前代码对应版本（全站深色 + 50 段人生）。

### 小程序页面

`miniprogram/app.json` 当前页面：

```text
pages/home/index
pages/life/index
pages/script/index
pages/privacy/index
pages/agreement/index
```

网页登录桥 `pages/auth/bridge` 已删除，不能再引用。

### 小程序登录

- `miniprogram/app.js` 的 `onLaunch` 调用 `ensureLogin()`。
- `ensureLogin()` 执行：
  ```text
  wx.cloud.init
  wx.login
  wx.cloud.callFunction({ name: "login" })
  ```
- 云函数 `cloudfunctions/login` 返回 `openid`，不保存阅读内容。
- 首页两个动作已加登录门槛：
  - 「抽盲盒人生」
  - 「看一个与你有关的故事」
- 未登录时点击会调用 `ensureLogin(false)`，失败提示「请先完成微信登录」。
- 小程序内没有网页登录码，不要恢复旧 `authStart/authStatus/authBind` 流程到 mini UI。

### 当前小程序首页文案 / 结构

- 顶部：圆形 logo + 「此生之外」，无椭圆外框；导航用 `wx.getMenuButtonBoundingClientRect()` 与右上角微信胶囊对齐。
- 头部一体式文案（不是独立卡片 banner）：
  ```text
  旁观一段虚构人生
  在别人的故事里，看见自己的回声。
  ```
- 第一张卡：
  ```text
  随机遇见一个人
  读完一个虚构人物的几段生活。不评判任何人的选择。
  [抽盲盒人生]
  ```
- 第二张卡：
  ```text
  写一段自己的故事
  看一个与你有关的故事
  从你熟悉的时间与地方出发，写一段只属于你的叙述。
  也可以写下一个你偶尔会想起的选择，看看它改变了什么。不写也可以。
  ```
- 首页不再显示「18 段人生」和左上角小标签。
- 主按钮满宽、居中、高约 88rpx。
- 页脚固定在可视底部、品牌和链接居中：
  ```text
  此生之外
  微信登录   用户协议   隐私说明
  ```
- 首页已经去掉剧本、出生日期、预测、命运、排盘等词；**内页仍有这些词，审查看内页时仍有风险**。

### 小程序设计系统

- 三色：
  - 墨蓝 `#2a3a4f`
  - 雾蓝 `#93acd8` / `#6f86b4`
  - 米白 `#f7f4ed`
- 四档字号：
  - 主标题 `56rpx`
  - 标题 `38rpx`
  - 描述 `26rpx`
  - 备注/tips `20rpx`
- 当前主题主要在 `miniprogram/app.wxss` 末尾覆盖层；旧深色样式仍在前面。
- logo：`miniprogram/assets/logo.png`，已裁成圆形显示，去掉方形白框。
- 顶部导航：`miniprogram/components/nav-bar/*`。

### 小程序内页状态

- `pages/life/index`：抽人生 setup/result，寿命/死亡年龄数据保留（data 内 deathAge、sixDim「寿命」、时间轴「寿命：XX岁」均在）；小程序端按负面词正则过滤、不展示寿命；分享图保留生卒年。
- `pages/script/index`：已改为「写一段自己的故事」，去掉「剧本」「预测」「命运预测」等词；表单「出生日期/出生时间/出生地」改为「日期/时间/地点」并加 tips「可以是你出生的」；结果页保留「命盘故事摘要（原命盘摘要）/四柱与五行/大运/流年/日主/真太阳时/三柱/时柱」展示。
- `pages/privacy/index`：已补充 openid/微信登录说明，并同步去掉「剧本」「出生日期」「出生时间」「出生地」「生卒年」「六维」。
- `pages/agreement/index`：已去掉剧本/命盘摘要/出生日期等词与部分 AI/网页登录描述。

### 小程序本地数据

- 阅读记录、情绪、剧本历史保存在本机微信缓存。
- 剧本表单/结果也确实会本地保存；不要对外写「完全不存储」。
- 当前安全表述是「不会上传到云端，不会用于其他用途」。

## 3. 网页当前状态

### 技术

- 静态 HTML/CSS/JS，无框架。
- 入口：`index.html`
- 主要脚本：`js/app.js`
- 路由：hash
  ```text
  #/home
  #/blind
  #/blind?life=<id>
  #/script
  #/privacy
  #/agreement
  ```
- 关键 CSS 加载顺序：
  ```text
  css/site.css
  css/paper.css
  css/eciyuan.css
  css/frost.css
  ```
- `frost.css` 最后加载，含最终视觉覆盖。
- 当前静态资源版本：`?v=20261119e`。
- 网页已移除 CloudBase SDK、JS 登录和 6 位码；`js/cloudbase.js` 已删除。
- 网页登录弹层现在只是「微信扫码，打开小程序」，使用 `assets/mini-program-qr.jpg`。

### 首页 UI

- 顶部导航：logo + 此生之外 / 首页 / 抽一个人生 / 看故事 / 微信体验。
- Hero：
  ```text
  从年少，读到后来。
  抽一个人生，读完一个虚构人物的几段生活。不评判任何人的选择。
  [抽盲盒人生] [看一段故事]
  ```
- 按钮桌面端：主 235px、次 213px，高 54px；移动端 178/162，高 46px。
- 核心体验区「01 / 核心体验 两条路径，读完一段人生。」：
  - 已去掉背景、边框、圆角、阴影，只是普通引导文案。
  - 最大宽度 `1180px` 居中。
- `.cin-about` / `.cin-features` / `.cin-people` / `.cin-foot-note` 均最大 1180px 居中；移动端左右 32px。
- 人物卡：
  - 不再统一跳 `#/blind`。
  - 改为 `#/blind?life=<id>`。
  - 路由已解析 `life` 参数并渲染对应人物结果页。
  - 第一张韦秀兰示例 URL：`#/blind?life=wei-xiulan`。

### 网页配色 / 字体

- 已改为 logo 三色：
  ```text
  #2a3a4f / #93acd8 / #f7f4ed
  ```
- 网页字体层级没有像小程序那样严格收敛到 4 档；如果用户再次要求，需要单独审计。
- logo 在网页导航中为圆形（`assets/logo.png`），favicon/apple-touch-icon 也使用该 png。

## 4. 关键已知风险 / 未完成

1. **审核版本错位（进行中）**
   - 线上 `2.0.18`；`2.0.19`（旧设计）审核中；`2.0.32`（全站深色，2026-11-19 上传）已提交审核，等待结果。
   - `2.0.19` 若先通过可能先发布旧版；需关注并尽快以 `2.0.32` 为准。
2. **网页数据未更新（待部署）**
   - 线上 `js/lives.js` 仍是 18 段；仓库已是 50 段。
   - 线上「18 段虚构人生」还是硬编码（仓库已改动态 `LIVES.length`）。
   - 需重新部署 Cloudflare Pages，见第 5 节命令。
3. **旧登录代码待清理**
   - `cloudfunctions/authStart|authStatus|authBind`（旧 Web 登录，未使用）
   - `workers/auth`（旧二维码登录桥）
   - `archive/legacy-miniprogram`、`archive/legacy-cloudfunctions`
   - 确认小程序 `login` 正常后可删，减少混淆。
4. **文档过期**
   - `docs/2.0-remaining-tasks.md` 还是 M0/M1/M2 阶段计划，与当前实现不符，建议归档或重写。
5. **敏感词 / 寿命数据（当前策略）**
   - 「写一段自己的故事」保留「命盘故事摘要/四柱与五行/大运/流年/日主/真太阳时/三柱/时柱」（按用户要求）。
   - 寿命/生卒年保留；网页六维总览有虚构免责声明；小程序按负面词过滤、不展示寿命/死亡段落。
   - 数据：50 段（原 18 + 新增 32）；32 段新人物都有 `sample` 金句，原 18 段只有第 1 条有（首页只用第 1 条）。
6. **CloudBase 旧函数 / CORS**
   - `authStart/authStatus/authBind` 仍部署在 CloudBase，网页已不用。
   - 免费套餐无法把 `life.qiaoxiao.online` 加入 Web 安全来源；Web CloudBase 登录方案已放弃，不要重走。
7. **Cloudflare token**
   - 之前临时 token 可能仍有效；建议在 Cloudflare 后台撤销旧 token 再新建。
8. **微信审核 / 隐私指引**
   - 公众平台「用户隐私保护指引」需要与隐私页说明一致（openid、本地存储）。
   - 不要声称获取昵称/头像/手机号。
9. **其他小项**
   - 图卡素材版权未确认（`docs/` 提到）。
   - 情绪自评埋点未做（「更沉重」比例监控）。
   - 2.0 版审核说明未写。

## 5. 部署 / 操作命令

### 小程序上传

```bash
/Users/bellahuang/Applications/wechatwebdevtools.app/Contents/MacOS/cli \
  upload \
  --project /Users/bellahuang/Desktop/deepseek \
  -v 2.0.32 \
  -d "优化故事场景"
```

上传后需要在微信公众平台：
- 设置体验版路径：`pages/home/index`
- 需要发布时提交审核

### 云函数部署

`login` 云函数已部署。使用 CloudBase CLI / 微信开发者工具部署，环境：

```text
cishengzhiwai-d5gf3fax9df941a21
```

### 网页部署

由于 Cloudflare OAuth 失效，命令必须带有效 token/account：

```bash
cd /tmp/cloudflare
CLOUDFLARE_API_TOKEN=... \
CLOUDFLARE_ACCOUNT_ID=f880ab46e4e7bb73c8afa99c928d54de \
WRANGLER_LOG_PATH=/tmp/wrangler-log \
./node_modules/.bin/wrangler pages deploy \
  /Users/bellahuang/Desktop/deepseek/dist \
  --project-name=cishengzhiwai \
  --branch=main \
  --commit-dirty=true
```

部署前重新构建 `dist`：

```bash
cd /Users/bellahuang/Desktop/deepseek
rm -rf dist && mkdir -p dist
cp index.html dist/
cp -R css js assets dist/
```

## 6. 测试 / 验证

- 网页：
  ```bash
  curl --resolve life.qiaoxiao.online:443:172.66.47.88 \
    -sS https://life.qiaoxiao.online/
  ```
- 人物卡：打开 `https://life.qiaoxiao.online/#/blind?life=wei-xiulan`。
- 小程序：
  - 微信开发者工具自动化端口曾使用 9420/9421/9422。
  - `miniprogram-automator` 在 `/tmp/mp-auto`。
  - 截图输出在 `preview/`。

## 7. 交互 / 产品约束

- 不接支付、不做会员、不做云备份。
- 不伪造登录、AI、云端存储能力。
- 不出现旧品牌「平行人生」。
- 不做算命、运势、吉凶、寿命、改命、固定年龄终点。
- 首页不能出现剧本/出生日期/预测等词（当前已满足）。
- 页脚必须保留免责声明（当前首页为「本产品提供虚构叙事与自我反思内容，不构成心理咨询、医疗、法律、投资或其他专业建议。」）。
- 所有按钮必须圆角、无直角。
- 导航/按钮不能遮挡内容；小程序顶部要避开微信胶囊。

## 8. 关键文件

```text
index.html                          Web 入口 / 静态资源版本
js/app.js                           Web 路由、首页、人物结果、分享卡
js/lives.js                         18 个虚构人物数据（仍含寿命字段）
css/frost.css                       最终 Web 视觉覆盖
assets/logo.png                     logo（256，圆形显示）
assets/mini-program-qr.jpg          Web 展示的官方小程序码
miniprogram/app.js                  onLaunch + wx.login
miniprogram/app.json                页面注册（无 auth bridge）
miniprogram/app.wxss                最终三色/四字号覆盖
miniprogram/components/nav-bar/*    动态胶囊对齐导航
miniprogram/pages/home/*            首页
miniprogram/pages/life/*            抽人生
miniprogram/pages/script/*          故事/剧本内页（仍有敏感词）
miniprogram/pages/privacy/*         隐私说明（含 openid）
cloudfunctions/login/*              小程序 wx.login 云函数
cloudfunctions/authStart|authStatus|authBind/*  旧 Web 登录，未使用
PROJECT_STATE.md                    本交接文件
```

## 9. 新对话建议第一步

1. 读本文件 + `git status`（工作区应为 clean）。
2. 在微信后台确认审核状态：`2.0.19`（旧设计）和 `2.0.32`（全站深色 + 50 段）。
3. `2.0.32` 通过后发布，确认线上不再是 `2.0.18`。
4. 网页已部署 50 段；如再改数据/UI，需重新构建 `dist` 并用 Cloudflare token 部署（见第 5 节）。
5. B 类清理：旧登录云函数 `authStart/authStatus/authBind`、`workers/auth`、`archive/`。
6. 不要重新引入网页 6 位登录码或 CloudBase Web 登录；不要用「平行人生」旧品牌。

## 10. 本次修改结论（2026-11-19 ~ 11-20 会话）

### 数据
- 18 → 50 段虚构人生，新增 32 段，覆盖 22 个省份；结构校验全部通过（六维 6 项、时间轴 ≥8、正文 ≥300 字、id 唯一）。
- 「疫情」内容全部脱敏；计划里与疫情相关的人物改主线（护理站 / 社区医生 / 咖啡馆经营）。
- 敏感题材规避：缉毒 → 森林消防、走私案 → 仿冒官司、入狱 → 破产/追责。

### 视觉（小程序）
- 全站深色：首页深色宇宙门头图 + 两张「图片底图 + 渐变遮盖」卡 + 唯一金色主按钮；人生物 / 故事页头部图片 + 各模块装饰图。
- 四档字号 56 / 44 / 26 / 20rpx（全局强制）。
- 抽人生页去掉数量小标、上次读到、本机记录、圆形标记、按钮星形。
- 故事页去掉「复制这段故事」按钮；最近生成只显示 3 条。

### 网页
- 保持原浅蓝 UI 布局不变，只更新数据到 50 段 + 数量改为动态（不再硬编码 18）。
- 已重新部署：life.qiaoxiao.online（js/lives.js 50 条，首页显示「50 段虚构人生」）。

### 发布 / 版本
- 小程序 `2.0.32`（备注「视觉更改为深色」）已上传并提交审核，等待结果。
- 线上仍是 `2.0.18`；`2.0.19`（旧设计）也在审核队列，可能先发布旧版。

### 代码 / 仓库
- Git：`origin/main` = `6ef6358`，工作区 clean；remote 已带 GitHub PAT（classic），`git push` 自动。
- 注意：GitHub token 明文在本地 `.git/config`，可在 GitHub 撤销后重配。
- 网页部署需要 Cloudflare API Token（Cloudflare Pages:Edit），当前未持久化。
