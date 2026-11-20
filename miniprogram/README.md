# 此生之外 · 微信小程序

原生小程序，代码在 `miniprogram/`。当前代码对应 `2.0.32`（全站深色 + 50 段虚构人生），已提交审核；线上版本仍是 `2.0.18`。

## 打开方式

1. 微信开发者工具 → 导入项目。
2. 目录选择仓库根目录：`/Users/bellahuang/Desktop/deepseek`（读取根目录 `project.config.json`）。
3. AppID：`wxb3f0ab648912633a`。
4. 云开发环境：`cishengzhiwai-d5gf3fax9df941a21`。

## 页面

- `pages/home`：首页，两个入口（抽盲盒人生 / 看一个与你有关的故事）
- `pages/life`：抽人生，虚构人物故事 + 六维 + 时间轴 + 情绪自评
- `pages/script`：写一段自己的故事，表单 → 生成叙述文本
- `pages/privacy`：隐私说明（含 openid、本机存储）
- `pages/agreement`：用户协议

`pages/auth/bridge` 网页登录桥已删除，`app.json` 中不再注册。

## 登录与数据

- `app.js` 的 `onLaunch` 调用 `ensureLogin()`：`wx.cloud.init` → `wx.login` → 云函数 `login`。
- 云函数 `login` 只返回 `openid`，不落库。
- 首页「抽盲盒人生」「看一个与你有关的故事」有登录门槛，未登录时提示「请先完成微信登录」。
- 阅读记录、情绪自评、故事历史保存在本机微信缓存：

  ```text
  parallel-life-m1          阅读记录 / 情绪
  parallel-life-m1-daily    每日记录
  parallel-life-script-m1   故事历史（最近 20 条，页面只展示 3 条）
  ```

  这些 key 沿用了旧品牌前缀，属于内部标识、用户不可见；**不要随意改名**，改名会让用户本机历史丢失。

- 不上传云端，不用于其他用途。

## 视觉

- 全站深色；三色：墨蓝 `#2a3a4f`、雾蓝 `#93acd8` / `#6f86b4`、米白 `#f7f4ed`。
- 四档字号：`56 / 44 / 26 / 20rpx`（全局强制）。
- 主题覆盖在 `app.wxss` 末尾；顶部导航 `components/nav-bar/*` 通过 `wx.getMenuButtonBoundingClientRect()` 对齐胶囊。
- 主包约 1.2 MB（`2.0.32` 上传时 1,244,178 字节）。

## 上传

```bash
/Users/bellahuang/Applications/wechatwebdevtools.app/Contents/MacOS/cli \
  upload \
  --project /Users/bellahuang/Desktop/deepseek \
  -v 2.0.33 \
  -d "版本备注"
```

上传后到微信公众平台设置体验版路径 `pages/home/index`，再提交审核。审核说明草稿见 `PROJECT_STATE.md` 第 11 节。

## 已知约束

- 不做支付、会员、云备份。
- 不伪造登录、AI、云端存储能力。
- 内页保留「命盘故事摘要 / 四柱与五行 / 大运 / 流年 / 日主 / 真太阳时」等措辞（产品要求），首页不得出现「剧本 / 预测 / 出生日期」等词。
- 小程序端按负面词过滤，不展示寿命 / 死亡段落。
