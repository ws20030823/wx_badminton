# 羽毛球組隊小程序

微信小程序，支援單打/雙打多種比賽模式，包含創建比賽、報名、組隊、比賽記錄、個人數據統計等功能。

## 功能列表

- 微信登入授權
- 創建比賽（單打/雙打，多種子模式）
- 報名功能
- 智能組隊演算法（單打轉、小隊轉、晉級賽）
- 比賽結果記錄
- 我的對戰（參與和創建的比賽）
- 個人數據統計

## 技術棧

- 微信小程序原生框架
- 微信雲開發（雲資料庫、雲函數）
- JavaScript ES6+

## 專案結構

```
wx_badminton/
├── app.js, app.json, app.wxss      # 入口與全域設定
├── project.config.json             # 專案設定（appid 為佔位符）
├── pages/                          # 頁面
│   ├── index/                      # 首頁
│   ├── singles-mode/               # 單打模式選擇
│   ├── doubles-mode/               # 雙打模式選擇
│   ├── create/                     # 創建比賽
│   ├── match-detail/               # 比賽詳情
│   ├── matches/                    # 我的對戰
│   └── profile/                    # 我的
├── cloudfunctions/                 # 雲函數
│   ├── createMatch/
│   ├── joinMatch/
│   ├── generateTeams/
│   └── recordResult/
├── utils/                          # 工具
│   ├── auth.js
│   ├── db.js
│   └── algorithm.js
└── images/                         # 圖片資源（含 TabBar 圖示）
```

## 本地開發

### 1. 環境準備

- 安裝 [微信開發者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 註冊微信小程序，取得 AppID

### 2. 專案設定

1. 複製 `project.private.config.json.example` 為 `project.private.config.json`
2. 將 `YOUR_APPID` 替換為你的 AppID
3. 在 `app.js` 中將 `YOUR_CLOUD_ENV_ID` 替換為你的雲開發環境 ID

### 3. 雲開發

1. 在微信開發者工具中開通雲開發
2. 建立雲環境，取得環境 ID
3. 建立資料庫集合：`users`、`matches`
4. 右鍵各雲函數資料夾 → 「在終端機開啟」→ 執行 `npm install`
5. 或右鍵雲函數 → 「上傳並部署：安裝依賴」

### 4. TabBar 圖示

在 `images/` 目錄下新增以下圖示（建議 81×81 像素）：

- `home.png` / `home-active.png`
- `matches.png` / `matches-active.png`
- `profile.png` / `profile-active.png`

若暫無圖示，可先用任意 PNG 佔位，或參考微信官方範例圖示。

### 5. 運行

使用微信開發者工具開啟專案目錄，編譯並預覽。

## 團隊協作

- Clone 後請依上述步驟建立本地的 `project.private.config.json`（不要提交此檔）
- 雲函數部署後，其他成員需在開發者工具中對各雲函數執行「安裝依賴」
- 雲端環境 ID 與資料庫需由專案負責人統一配置

## 授權

本專案供學習與內部使用。
