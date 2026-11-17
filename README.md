# 此生之外

> 旁观一段人生，不急着判断。

「此生之外」包含两个端：

- **Web 静态版**：零依赖单页应用
- **微信小程序版**：原生小程序，当前上传版本 2.0.5

所有人物与故事均为虚构，不是真实统计，不是预测，也不构成医疗、投资、婚恋或职业建议。

## Web 版

线上地址：[https://cishengzhiwai.pages.dev/](https://cishengzhiwai.pages.dev/)

```bash
cd /Users/bellahuang/Desktop/deepseek
python3 -m http.server 4174
```

打开 [http://127.0.0.1:4174/](http://127.0.0.1:4174/)。

Web 版当前包含：

- 首页：盲盒人生 / 剧本人生
- 盲盒：18 张完整虚构人物卡、六维总览、时间轴、情绪自评、本机历史、Canvas 图卡
- 剧本：公历 / 农历、闰月、出生时间、出生地、性别、四柱、五行、真太阳时、简化大运、免费剧本、本地 A/B 预览
- 本地增强：网页端不调用外部 AI，使用本地兜底文案
- 用户协议、隐私说明

不需要登录，不上传出生信息；记录只保存在浏览器 `localStorage`。

### Web 文件

```text
index.html              入口
css/site.css            样式
js/lives.js             18 张人物卡
js/bazi.js              四柱 / 真太阳时 / 大运
js/lunar.js             农历与闰月
js/freeScript.js        免费剧本
js/choicePreview.js     本地 A/B 预览
js/cities.js            城市经度
js/app.js               路由、页面、交互、Canvas 图卡
assets/                 视觉资源
dist/                   可部署静态目录
```

### 路由

```text
#/home
#/blind
#/script
#/agreement
#/privacy
```

### 构建

```bash
rm -rf dist
mkdir -p dist
cp index.html dist/
cp -R css js assets dist/
cd dist && zip -r ../cishengzhiwai-web.zip ./*
```

## 微信小程序版

小程序在 `miniprogram/`，AppID `wxb3f0ab648912633a`，当前已上传版本 **2.0.5**。

- 无强制微信登录
- 18 张人物卡
- 剧本免费层
- 本地 A/B 预览
- AI 可选，未配置时使用本地兜底
- 不做支付
- 用户协议、隐私说明已接入

详见 [miniprogram/README.md](miniprogram/README.md)。

## 当前边界

- Web 端不调用外部 AI，AI 增强只在微信小程序侧预留
- 不预测命运，不做医疗、投资、婚恋、职业建议
- 不出售、不批量复制内容
- 微信小程序隐私保护指引已提交，审核中
- 小程序 2.0.5 还未设为体验版

## 验证

- 30 组四柱 fixture：30/30 通过
- Web 首页、盲盒、剧本、协议页已用 Playwright 跑通
- 小程序已通过开发者工具 preview，并用自动化跑通首页、盲盒、剧本、AI 兜底、图卡
