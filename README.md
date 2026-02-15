# 羽毛球组队小程序

微信小程序，支持单打/双打多种比赛模式，包含创建比赛、报名、组队、比赛记录、个人数据统计等功能。

## 功能列表

- 微信登录授权
- 创建比赛（单打/双打，多种子模式）
- 报名功能
- 智能组队算法（单打转、小队转、晋级赛）
- 比赛结果记录
- 我的对战（参与和创建的比赛）
- 个人数据统计

## 技术栈

- 微信小程序原生框架
- 微信云开发（云数据库、云函数）
- JavaScript ES6+

## 项目结构

```
wx_badminton/
├── app.js, app.json, app.wxss      # 入口与全局配置
├── project.config.json             # 项目配置（appid 为占位符）
├── pages/                          # 页面
│   ├── index/                      # 首页
│   ├── singles-mode/               # 单打模式选择
│   ├── doubles-mode/               # 双打模式选择
│   ├── create/                     # 创建比赛
│   ├── match-detail/               # 比赛详情
│   ├── matches/                    # 我的对战
│   └── profile/                    # 我的
├── cloudfunctions/                 # 云函数
│   ├── createMatch/
│   ├── joinMatch/
│   ├── generateTeams/
│   └── recordResult/
├── utils/                          # 工具
│   ├── auth.js
│   ├── db.js
│   └── algorithm.js
└── images/                         # 图片资源（含 TabBar 图标）
```

## 本地开发

### 1. 环境准备

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序，获取 AppID

### 2. 项目配置

1. 复制 `project.private.config.json.example` 为 `project.private.config.json`
2. 将 `YOUR_APPID` 替换为你的 AppID
3. 在 `app.js` 中将 `YOUR_CLOUD_ENV_ID` 替换为你的云开发环境 ID

### 3. 云开发

1. 在微信开发者工具中开通云开发
2. 创建云环境，获取环境 ID
3. 创建数据库集合：`users`、`matches`
4. 右键各云函数文件夹 → 「在终端打开」→ 执行 `npm install`
5. 或右键云函数 → 「上传并部署：安装依赖」

### 4. TabBar 图标

在 `images/` 目录下新增以下图标（建议 81×81 像素）：

- `home.png` / `home-active.png`
- `matches.png` / `matches-active.png`
- `profile.png` / `profile-active.png`

若暂无图标，可先用任意 PNG 占位，或参考微信官方示例图标。

### 5. 运行

使用微信开发者工具打开项目目录，编译并预览。

## 上传至 GitHub

1. 在 GitHub 创建新仓库（建议不勾选 README）
2. 执行：

```bash
git remote add origin https://github.com/<your-username>/wx-badminton.git
git branch -M main
git push -u origin main
```

## 团队协作

- Clone 后请按上述步骤建立本地的 `project.private.config.json`（不要提交此文件）
- 云函数部署后，其他成员需在开发者工具中对各云函数执行「安装依赖」
- 云端环境 ID 与数据库需由项目负责人统一配置

## 授权

本项目供学习与内部使用。
