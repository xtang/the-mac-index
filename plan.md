这份文档是专门为您准备的，可以直接作为 Prompt 发送给 AI Coding Agent（如 Cursor, Windsurf 或 GitHub Copilot Workspace）来启动项目。

它涵盖了**产品愿景、技术栈细节、数据库设计、API 规范以及 UI 设计语言**。

---

# Project Specification: Purchasing Power Terminal (PPT)

## 1. 项目概述 (Project Overview)

构建一个**复古极客风格（Retro-Geek Style）**的宏观经济数据分析终端。
核心功能是利用 **DuckDB** 存储和分析 **Big Mac Index (巨无霸指数)** 数据，通过 **Golang** 提供 API 服务，并使用 **React** 构建一个仿 80 年代 Bloomberg Terminal 风格的前端界面，用于可视化展示不同国家的购买力平价（PPP）历史变化。

## 2. 技术栈 (Tech Stack)

* **Backend:** Golang (推荐框架: Fiber v2 或 Gin)
* **Database:** DuckDB (嵌入式 OLAP 数据库)
* **Frontend:** React (Vite) + Tailwind CSS
* **Visualization:** Apache ECharts (配置为复古高对比度风格)
* **Data Source:** The Economist Big Mac Index (CSV format)

## 3. 设计规范 (Design System - "The Terminal Aesthetic")

我们要打造一种“金融黑客”的沉浸感：

* **色彩方案 (Color Palette):**
* **Background:** Deep Black (`#050505`) or Dark Blue-Grey (`#0D1117`)
* **Primary Text:** Terminal Green (`#00FF41`) or Amber (`#FFB000`)
* **Accent/Alert:** Pixel Red (`#FF0055`)
* **Grid Lines:** Dim Green (`#003B00`)


* **字体 (Typography):**
* 全局使用等宽字体 (Monospace only)。
* 推荐字体: `VT323`, `Fira Code`, or `IBM Plex Mono`.


* **UI 特征 (UI Elements):**
* **无圆角 (Zero Border Radius):** 所有的按钮、卡片、输入框必须是直角。
* **高对比度边框 (High Contrast Borders):** 明显的 1px 或 2px 边框。
* **扫描线效果 (CRT Scanlines):** 屏幕覆盖一层淡淡的 CSS 扫描线纹理。
* **闪烁光标 (Blinking Cursor):** 模拟命令行输入体验。



## 4. 数据库设计 (Database Schema)

使用 DuckDB。我们需要一个初始化脚本来创建表并导入数据。

**Table: `big_mac_raw` (原始数据)**
来源于 The Economist GitHub 的 CSV 数据。

```sql
CREATE TABLE big_mac_raw (
    date DATE,
    iso_a3 VARCHAR,      -- Country Code (e.g., JPN, CHN, USA)
    currency_code VARCHAR,
    name VARCHAR,        -- Country Name
    local_price DOUBLE,  -- Price in local currency
    dollar_ex DOUBLE,    -- Exchange rate to USD
    dollar_price DOUBLE, -- Price in USD
    USD_raw DOUBLE,      -- Raw Index vs USD
    EUR_raw DOUBLE,      -- Raw Index vs EUR
    GBP_raw DOUBLE,      -- Raw Index vs GBP
    JPY_raw DOUBLE,      -- Raw Index vs JPY
    CNY_raw DOUBLE       -- Raw Index vs CNY
);

```

**Table: `assets` (扩展性预留)**
用于未来存储黄金或其他商品价格。

```sql
CREATE TABLE asset_prices (
    date DATE,
    symbol VARCHAR,      -- e.g., 'XAU' (Gold)
    currency VARCHAR,    -- 'USD'
    price DOUBLE
);

```

## 5. API 接口定义 (API Endpoints)

后端 Go 服务需要提供以下 RESTful 接口：

### 5.1 获取国家列表

* **GET** `/api/v1/countries`
* **Response:** `[{ "code": "CHN", "name": "China", "currency": "CNY" }, ...]`

### 5.2 获取特定国家的历史指数

* **GET** `/api/v1/index/history`
* **Query Params:**
* `country`: (Required) e.g., `JPN`
* `base`: (Optional, default `USD`) 对比基准货币。


* **Logic:** 返回该国巨无霸价格、汇率、以及相对于基准货币的被高估/低估百分比。

### 5.3 购买力“时光机”转换

* **POST** `/api/v1/calculator/ppp`
* **Body:**
```json
{
  "amount": 1000,
  "currency": "JPY",
  "year": 2000,
  "target_year": 2024
}

```


* **Logic:** 基于巨无霸价格计算这笔钱的购买力在不同年份的等值。
* *Algorithm:* `(Amount / Price_2000) * Price_2024`



## 6. 功能模块与开发计划 (Implementation Plan)

请 AI Agent 按照以下步骤执行：

### Step 1: 数据层基础 (Data Foundation)

1. 初始化 Go 项目 (`go mod init ppt-terminal`)。
2. 安装 `go-duckdb` 驱动。
3. 编写 `db/seed.go` 脚本：
* 自动从 The Economist GitHub (`https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv`) 下载最新的 CSV。
* 将 CSV 加载到 DuckDB 本地文件 `ppt.db` 中。



### Step 2: 后端开发 (Backend Core)

1. 搭建 Fiber (Go) 服务器。
2. 实现上述 API 接口。
3. 编写 SQL 查询逻辑：
* 查询某段时间内，两个国家巨无霸价格的对比。
* 计算隐含汇率 (Implied Exchange Rate)。



### Step 3: 前端架构 (Frontend Skeleton)

1. 使用 Vite 初始化 React + TypeScript 项目。
2. 安装 Tailwind CSS 并配置 `tailwind.config.js` 以支持自定义颜色（Terminal Green, Dark BG）。
3. 创建基础布局 `Layout.tsx`：包含顶部状态栏（模拟系统时间、连接状态）和主内容区。
4. 实现全局样式：添加 CRT 扫描线 CSS 和自定义字体引用。

### Step 4: 数据可视化 (Dashboard Implementation)

1. **左侧面板:** 国家选择器（列表形式，支持键盘上下键选择）。
2. **主图表区:** 使用 ECharts 渲染折线图。
* X轴：时间 (2000 - 2024)
* Y轴：价格 / 指数
* **Series 1:** 美国巨无霸价格 (基准)
* **Series 2:** 目标国家巨无霸价格 (换算为 USD)
* **视觉风格:** 绿色线条，无平滑曲线 (Step Line)，明显的网格背景。


3. **右侧面板:** "时光机" 计算器小组件。
