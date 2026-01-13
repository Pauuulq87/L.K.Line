# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 專案概述

人生 K 線 (Life Destiny K-Line) - 基於 AI 大模型和傳統八字命理,將人生運勢以股票 K 線圖形式視覺化呈現的 Web 應用程式。

**核心特點**: 免 API Key 設計 - 用戶複製提示詞到外部 AI (ChatGPT/Claude/Gemini),將生成的 JSON 數據貼回應用程式即可使用。

## 常用開發指令

```bash
# 啟動開發伺服器 (預設 http://localhost:5173)
npm run dev

# 建構生產版本 (輸出至 dist/)
npm run build

# 預覽建構結果
npm run preview
```

**注意**: 本專案使用 npm,不使用 uv (這是 React 前端專案,非 Python)

## 技術架構

### 技術棧
- React 19 + Vite + TypeScript
- TailwindCSS (UI 樣式)
- Recharts (K 線圖表元件)
- 部署目標: Vercel (包含 vercel.json 設定)

### 核心資料流程

1. **數據輸入**: `ImportDataMode.tsx` (3 步驟工作流) 或 `BaziForm.tsx` (舊版表單)
2. **Prompt 生成**: 組合系統指令 (`constants.ts` 的 `BAZI_SYSTEM_INSTRUCTION`) + 用戶八字資訊
3. **外部 AI 處理**: 用戶複製 prompt 到 ChatGPT/Claude/Gemini 等平台
4. **JSON 匯入**: 用戶將 AI 回傳的 JSON 貼回應用程式
5. **視覺化呈現**: `App.tsx` 解析數據並渲染 `LifeKLineChart` + `AnalysisResult`

### 關鍵資料結構 (types.ts)

- **KLinePoint**: 單一年份資料點
  - `age`: 虛歲 (1-100)
  - `year`: 西元年份
  - `ganZhi`: 流年干支 (每年變動,如 2024=甲辰)
  - `daYun`: 大運干支 (每 10 年變動,如 "甲子大運")
  - OHLC + score + reason (K 線數據與批註)

- **AnalysisData**: 命理分析報告
  - 各維度分析 + 評分 (0-10): summary, personality, industry, wealth, marriage, health, family, fengShui
  - 幣圈特供: crypto, cryptoScore, cryptoYear, cryptoStyle

- **UserInput**: 用戶輸入的八字資訊
  - 四柱: yearPillar, monthPillar, dayPillar, hourPillar
  - 大運參數: startAge, firstDaYun
  - API 設定: modelName, apiBaseUrl, apiKey (選填,支援 "demo" 模式)

## 專案特殊邏輯

### 1. 大運方向計算邏輯

**規則** (傳統八字):
- **陽男陰女** → 順行 (甲子 → 乙丑 → 丙寅...)
- **陰男陽女** → 逆行 (甲子 → 癸亥 → 壬戌...)

**實作位置**:
- `services/geminiService.ts` 的 `getStemPolarity()` 函式判斷天干陰陽
- 陽干: 甲丙戊庚壬 / 陰干: 乙丁己辛癸

**計算流程**:
```typescript
const yearStemPolarity = getStemPolarity(input.yearPillar); // 'YANG' or 'YIN'
if (gender === MALE) {
  isForward = (yearStemPolarity === 'YANG'); // 陽男順行
} else {
  isForward = (yearStemPolarity === 'YIN'); // 陰女順行
}
```

### 2. 虛歲系統

- 專案採用**虛歲**計算,從 1 歲開始 (非 0 歲)
- 生成 1-100 歲共 100 個 KLinePoint 資料點
- 起運前的年齡標記為 "童限" (`daYun: "童限"`)

### 3. API 整合的 3 種模式

**模式 1: 免 API 模式** (預設推薦)
- 用戶在 `ImportDataMode` 複製完整 prompt
- 手動貼到外部 AI 平台取得 JSON
- 再貼回應用程式匯入

**模式 2: 自定義 API**
- 用戶提供 OpenAI-compatible endpoint
- `geminiService.ts` 直接呼叫 API
- 支援自訂 modelName (預設 "gemini-3-pro-preview")

**模式 3: Demo 模式**
- API Key 填入 "demo" 字串
- 載入 `mock-data.json` 作為範例數據

### 4. JSON 解析容錯機制

**問題**: AI 可能回傳 markdown 包裝的 JSON (如 \`\`\`json ... \`\`\`)

**解決方案** (實作於 `ImportDataMode.tsx` 和 `geminiService.ts`):
```typescript
// 1. 嘗試提取 ```json ... ``` 中的內容
const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
if (jsonMatch) jsonContent = jsonMatch[1].trim();

// 2. 若無代碼塊,尋找 { ... } 邊界
else {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    jsonContent = content.substring(start, end + 1);
  }
}
```

### 5. Prompt 工程核心

**系統指令** (`constants.ts` 的 `BAZI_SYSTEM_INSTRUCTION`):
- 定義完整 JSON schema
- **關鍵區分**:
  - `ganZhi`: 流年干支 (每年變,如 2024=甲辰, 2025=乙巳)
  - `daYun`: 大運干支 (10 年變,如 "甲子大運")
- 要求 `reason` 欄位控制在 20-30 字內 (K 線圖 tooltip 顯示)
- 強調評分要有起伏,避免平滑直線

**用戶提示詞生成** (`ImportDataMode.tsx` 的 `generateUserPrompt()`):
- 包含用戶的四柱八字
- 明確指定起運年齡與第一步大運
- 提供大運排序方向與範例
- 警告 AI 不要混淆 ganZhi 和 daYun

## 檔案結構導覽

### 主程式
- `App.tsx`: 狀態管理、JSON 匯出/匯入、HTML 報告生成

### 核心元件 (components/)
- `ImportDataMode.tsx`: **主要使用介面** - 3 步驟工作流 (填八字 → 複製 prompt → 貼 JSON)
- `BaziForm.tsx`: 舊版表單模式 (較少使用,保留用於直接 API 呼叫)
- `LifeKLineChart.tsx`: Recharts K 線圖渲染,處理大運標記與 tooltip
- `AnalysisResult.tsx`: 命理報告展示 (各維度分析 + 評分視覺化)

### 業務邏輯
- `services/geminiService.ts`: OpenAI API 整合、prompt 組裝、demo 模式處理
- `constants.ts`: `BAZI_SYSTEM_INSTRUCTION` 系統指令模板、API_STATUS 開關
- `types.ts`: TypeScript 介面定義

### 設定檔
- `vite.config.ts`: 環境變數 API_KEY 注入 (支援 `API_KEY` 或 `VITE_API_KEY`)
- `vercel.json`: Vercel 部署設定 (buildCommand, outputDirectory)
- `tsconfig.json`: TypeScript strict 模式啟用

### 靜態資源
- `mock-data.json`: Demo 模式的範例數據
- `test.json`: 測試用數據
- `assets/`: 專案預覽圖

## 開發注意事項

### 修改 Prompt 模板時
- 同步更新 `constants.ts` (系統指令) 和 `ImportDataMode.tsx` (用戶提示生成邏輯)
- 確保 JSON schema 定義與 `types.ts` 介面一致
- 測試 AI 回傳的 JSON 能否正確解析

### 新增命理分析維度時
需要修改 4 個地方:
1. `types.ts` 的 `AnalysisData` 介面
2. `constants.ts` 的 JSON schema 範例
3. `AnalysisResult.tsx` 的顯示邏輯
4. `geminiService.ts` 和 `ImportDataMode.tsx` 的解析邏輯 (加入預設值)

### 修改 K 線圖表時
- `LifeKLineChart.tsx` 使用 Recharts 的 ComposedChart
- 大運標記透過 `ReferenceLine` 實作 (每 10 年一條)
- Tooltip 顯示該年的 `reason` 詳批

### 匯出 HTML 報告的限制
- 因離線 HTML 無法執行 React 互動,`App.tsx` 會額外生成流年詳批表格 (替代 tooltip)
- SVG 透過 `.recharts-surface` 選擇器擷取
- 內嵌 TailwindCSS CDN 以保持樣式

### API Key 安全性
- 本專案**預設不需要 API Key** (用戶自行複製 prompt)
- 若用戶選擇直接 API 模式,Key 儲存在前端 (不安全,僅適合個人使用)
- `geminiService.ts` 有檢查非 ASCII 字符的邏輯 (防止用戶誤貼中文)

## 部署流程

### Vercel (推薦)
1. 連結 GitHub repo
2. Vercel 自動偵測 `vercel.json` 設定
3. 建構指令: `npm run build` (已設定於 vercel.json)
4. 輸出目錄: `dist/`

### 其他平台
- 任何支援靜態網站的平台 (Netlify, Cloudflare Pages, etc.)
- 確保建構輸出為 `dist/` 目錄
- 需設定 SPA fallback (所有路由指向 index.html)
