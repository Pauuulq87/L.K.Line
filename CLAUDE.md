# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

人生 K 線 (Life Destiny K-Line) - 基於 AI 大模型和傳統八字命理,將人生運勢以股票 K 線圖形式視覺化呈現的 React 應用程式。

**核心特點**: 免 API Key 設計 - 用戶複製提示詞到外部 AI (ChatGPT/Claude/Gemini),將生成的 JSON 數據貼回應用程式即可使用。

## 常用開發指令

```bash
# 啟動開發伺服器 (http://localhost:5173)
npm run dev

# 建構生產版本 (輸出至 dist/)
npm run build

# 預覽建構結果
npm run preview
```

**注意**: 本專案使用 npm,這是 React + Vite + TypeScript 專案,非 Python 專案。

## 技術架構

### 技術棧
- React 19 + Vite + TypeScript (strict mode)
- TailwindCSS + Recharts (K 線圖表)
- 部署平台: Vercel

### 核心資料流程

1. **數據輸入**: `ImportDataMode.tsx` (3 步驟工作流) 或 `BaziForm.tsx` (舊版表單)
2. **Prompt 生成**: 組合系統指令 (`constants.ts`) + 用戶八字資訊
3. **外部 AI 處理**: 用戶複製到 ChatGPT/Claude/Gemini
4. **JSON 匯入**: 用戶將 AI 回傳的 JSON 貼回應用
5. **視覺化**: `App.tsx` 解析數據並渲染 `LifeKLineChart` + `AnalysisResult`

### 關鍵資料結構 (types.ts)

- **KLinePoint**: 單一年份資料點 (1-100 虛歲)
  - `ganZhi`: 流年干支 (每年變動,如 2024=甲辰)
  - `daYun`: 大運干支 (每 10 年變動,如 "甲子大運")
  - OHLC + score + reason

- **AnalysisData**: 命理分析報告
  - 各維度分析 + 評分 (0-10): summary, personality, industry, wealth, marriage, health, family, fengShui
  - 幣圈特供: crypto, cryptoScore, cryptoYear, cryptoStyle

- **UserInput**: 用戶輸入的八字資訊
  - 四柱: yearPillar, monthPillar, dayPillar, hourPillar
  - 大運參數: startAge, firstDaYun

## 關鍵邏輯

### 1. 大運方向計算 (services/geminiService.ts)

**規則**:
- **陽男陰女** → 順行 (甲子 → 乙丑 → 丙寅...)
- **陰男陽女** → 逆行 (甲子 → 癸亥 → 壬戌...)

陽干: 甲丙戊庚壬 / 陰干: 乙丁己辛癸

### 2. 虛歲系統

- 從 1 歲開始 (非 0 歲),生成 1-100 歲共 100 個資料點
- 起運前標記為 "童限" (`daYun: "童限"`)

### 3. API 整合的 3 種模式

1. **免 API 模式** (預設推薦): 用戶手動複製 prompt → 外部 AI → 貼回 JSON
2. **自定義 API**: 提供 OpenAI-compatible endpoint,直接呼叫
3. **Demo 模式**: API Key 填 "demo" 載入 `mock-data.json`

### 4. JSON 解析容錯機制

AI 可能回傳 markdown 包裝的 JSON,實作於 `ImportDataMode.tsx` 和 `geminiService.ts`:

```typescript
// 提取 ```json ... ``` 中的內容
const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
// 或尋找 { ... } 邊界
```

### 5. Prompt 工程核心

**系統指令** (`constants.ts` 的 `BAZI_SYSTEM_INSTRUCTION`):
- 定義完整 JSON schema
- 區分 `ganZhi` (流年干支,每年變) vs `daYun` (大運干支,10 年變)
- `reason` 欄位控制在 20-30 字 (用於 K 線圖 tooltip)
- 要求評分有起伏,避免平滑直線

## 檔案結構

### 核心元件 (components/)
- `ImportDataMode.tsx`: 主要介面 - 3 步驟工作流
- `BaziForm.tsx`: 舊版表單 (保留用於直接 API 呼叫)
- `LifeKLineChart.tsx`: Recharts K 線圖,大運標記與 tooltip
- `AnalysisResult.tsx`: 命理報告展示

### 主程式與邏輯
- `App.tsx`: 狀態管理、JSON 匯出/匯入、HTML 報告生成
- `services/geminiService.ts`: API 整合、prompt 組裝、demo 模式
- `constants.ts`: 系統指令模板 `BAZI_SYSTEM_INSTRUCTION`
- `types.ts`: TypeScript 介面定義

### 配置檔
- `vite.config.ts`: 環境變數 API_KEY 注入
- `vercel.json`: Vercel 部署設定
- `tsconfig.json`: TypeScript strict mode

### 資料檔
- `mock-data.json`: Demo 模式範例數據
- `test.json`: 測試用數據

## 開發注意事項

### 修改 Prompt 模板
- 同步更新 `constants.ts` (系統指令) 和 `ImportDataMode.tsx` (用戶提示生成)
- 確保 JSON schema 與 `types.ts` 介面一致

### 新增分析維度
需修改 4 個地方:
1. `types.ts` 的 `AnalysisData` 介面
2. `constants.ts` 的 JSON schema
3. `AnalysisResult.tsx` 的顯示邏輯
4. `geminiService.ts` 和 `ImportDataMode.tsx` 的解析邏輯 (加預設值)

### K 線圖表修改
- `LifeKLineChart.tsx` 使用 Recharts 的 ComposedChart
- 大運標記透過 `ReferenceLine` 實作 (每 10 年一條)
- Tooltip 顯示該年的 `reason` 詳批

### HTML 報告匯出
- 離線 HTML 無法執行 React 互動,`App.tsx` 會額外生成流年詳批表格
- SVG 透過 `.recharts-surface` 選擇器擷取
- 內嵌 TailwindCSS CDN 保持樣式

## 部署

### Vercel (推薦)
- 連結 GitHub repo,自動偵測 `vercel.json`
- 建構: `npm run build` → 輸出: `dist/`

### 其他平台
- 任何支援靜態網站的平台 (Netlify, Cloudflare Pages)
- 需設定 SPA fallback (所有路由指向 index.html)
