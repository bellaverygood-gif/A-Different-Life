> 交接状态以 `PROJECT_STATE.md` 为准；新对话请先读该文件，再查看 `git status`。

# 此生之外

> 旁观一段人生，不急着判断。

「此生之外」包含两个端：

- **网页静态版**：零依赖单页应用，`index.html` + `js/` + `css/`
- **微信小程序版**：原生小程序，代码在 `miniprogram/`

所有人物与故事均为虚构，不是真实统计，不是预测，也不构成医疗、投资、婚恋或职业建议。

## 网页版

线上地址：[https://life.qiaoxiao.online/](https://life.qiaoxiao.online/)（Cloudflare Pages 项目 `cishengzhiwai`）

```bash
cd /Users/bellahuang/Desktop/deepseek
python3 -m http.server 4174
```

打开 [http://127.0.0.1:4174/](http://127.0.0.1:4174/)。

- 50 段虚构人生，数量由 `LIVES.length` 动态渲染
- hash 路由：`#/home`、`#/blind`、`#/blind?life=<id>`、`#/script`、`#/privacy`、`#/agreement`
- 没有网页登录：右上角「微信体验」只展示官方小程序码
- 记录只保存在浏览器 `localStorage`，不上传

### 关键文件

```text
index.html              入口 / 静态资源版本号
css/site.css            基础样式
css/paper.css           纸张质感
css/eciyuan.css         视觉层
css/frost.css           最终视觉覆盖（最后加载）
js/app.js               路由、首页、人物结果、分享卡
js/lives.js             50 段虚构人物数据（仍含寿命字段）
js/bazi.js              四柱 / 真太阳时 / 大运
js/lunar.js             农历与闰月
js/freeScript.js        本地叙述生成
js/choicePreview.js     本地 A/B 预览
js/cities.js            城市经度
assets/                 视觉资源（logo、官方小程序码）
dist/                   可部署静态目录
```

### 构建与部署

```bash
cd /Users/bellahuang/Desktop/deepseek
rm -rf dist && mkdir -p dist
cp index.html dist/
cp -R css js assets dist/
```

部署需要 Cloudflare API Token（Pages:Edit），完整命令见 `PROJECT_STATE.md` 第 5 节。

## 微信小程序版

AppID `wxb3f0ab648912633a`，云开发环境 `cishengzhiwai-d5gf3fax9df941a21`。

- 当前代码对应 `2.0.32`（全站深色 + 50 段），已提交审核；线上为 `2.0.18`
- 全站深色，四档字号 56 / 44 / 26 / 20rpx
- 登录：`wx.login` + 云函数 `login` 取 openid，不获取昵称/头像/手机号
- 阅读记录、情绪自评、生成的故事只保存在本机微信缓存，不上传云端
- 不做支付、不做会员、不做云备份
- 页面：`pages/home`、`pages/life`、`pages/script`、`pages/privacy`、`pages/agreement`

详见 [miniprogram/README.md](miniprogram/README.md)。

## 当前边界

- 近期版本变化见 `PROJECT_STATE.md` 第 10 节
- 不预测命运，不做医疗、投资、婚恋、职业建议
- 不出现旧品牌「平行人生」
- 不上传用户内容到云端，不声称获取昵称/头像/手机号
