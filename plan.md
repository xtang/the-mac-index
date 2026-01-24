This document is prepared for you to be directly used as a Prompt for an AI Coding Agent (such as Cursor, Windsurf, or GitHub Copilot Workspace) to kickstart the project.

It covers **Product Vision, Tech Stack Details, Database Design, API Specifications, and UI Design Language**.

---

# Project Specification: Purchasing Power Terminal (PPT)

## 1. Project Overview

Build a **Retro-Geek Style** macroeconomic data analysis terminal.
The core functionality is to use **DuckDB** to store and analyze **Big Mac Index** data, serve APIs via **Golang**, and build a frontend using **React** that mimics an 80s Bloomberg Terminal style, visualizing the historical changes in Purchasing Power Parity (PPP) across different countries.

## 2. Tech Stack

* **Backend:** Golang (Recommended Framework: Fiber v2 or Gin)
* **Database:** DuckDB (Embedded OLAP Database)
* **Frontend:** React (Vite) + Tailwind CSS
* **Visualization:** Apache ECharts (Configured for retro high-contrast style)
* **Data Source:** The Economist Big Mac Index (CSV format)

## 3. Design System - "The Terminal Aesthetic"

We aim to create an immersive "Financial Hacker" experience:

* **Color Palette:**
    * **Background:** Deep Black (`#050505`) or Dark Blue-Grey (`#0D1117`)
    * **Primary Text:** Terminal Green (`#00FF41`) or Amber (`#FFB000`)
    * **Accent/Alert:** Pixel Red (`#FF0055`)
    * **Grid Lines:** Dim Green (`#003B00`)

* **Typography:**
    * Monospace only globally.
    * Recommended fonts: `VT323`, `Fira Code`, or `IBM Plex Mono`.

* **UI Elements:**
    * **Zero Border Radius:** All buttons, cards, and input boxes must be right-angled.
    * **High Contrast Borders:** Distinct 1px or 2px borders.
    * **CRT Scanlines:** A subtle CSS scanline texture overlay.
    * **Blinking Cursor:** Simulate command-line typing experience.

## 4. Database Schema

Use DuckDB. We need an initialization script to create tables and import data.

**Table: `big_mac_raw` (Raw Data)**
Sourced from The Economist GitHub CSV data.

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

**Table: `assets` (Reserved for Extensibility)**
For future storage of gold or other commodity prices.

```sql
CREATE TABLE asset_prices (
    date DATE,
    symbol VARCHAR,      -- e.g., 'XAU' (Gold)
    currency VARCHAR,    -- 'USD'
    price DOUBLE
);
```

## 5. API Endpoints

The Backend Go service needs to provide the following RESTful endpoints:

### 5.1 Get Country List

* **GET** `/api/v1/countries`
* **Response:** `[{ "code": "CHN", "name": "China", "currency": "CNY" }, ...]`

### 5.2 Get Historical Index for Specific Country

* **GET** `/api/v1/index/history`
* **Query Params:**
    * `country`: (Required) e.g., `JPN`
    * `base`: (Optional, default `USD`) Benchmark currency.

* **Logic:** Return the country's Big Mac price, exchange rate, and overvaluation/undervaluation percentage relative to the base currency.

### 5.3 Purchasing Power "Time Machine" Calculator

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

* **Logic:** Calculate the equivalent purchasing power of the amount in different years based on Big Mac prices.
* *Algorithm:* `(Amount / Price_2000) * Price_2024`

## 6. Implementation Plan

Please have the AI Agent execute the following steps:

### Step 1: Data Foundation

1. Initialize Go project (`go mod init ppt-terminal`).
2. Install `go-duckdb` driver.
3. Write `db/seed.go` script:
    * Automatically download the latest CSV from The Economist GitHub (`https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv`).
    * Load CSV into local DuckDB file `ppt.db`.

### Step 2: Backend Core

1. Set up Fiber (Go) server.
2. Implement the above API endpoints.
3. Write SQL query logic:
    * Compare Big Mac prices between two countries over a period.
    * Calculate Implied Exchange Rate.

### Step 3: Frontend Skeleton

1. Initialize React + TypeScript project using Vite.
2. Install Tailwind CSS and configure `tailwind.config.js` to support custom colors (Terminal Green, Dark BG).
3. Create basic layout `Layout.tsx`: include top status bar (simulated system time, connection status) and main content area.
4. Implement global styles: Add CRT scanline CSS and custom font references.

### Step 4: Data Visualization (Dashboard Implementation)

1. **Left Panel:** Country Selector (List format, supports up/down keyboard navigation).
2. **Main Chart Area:** Render line chart using ECharts.
    * X-Axis: Time (2000 - 2024)
    * Y-Axis: Price / Index
    * **Series 1:** US Big Mac Price (Benchmark)
    * **Series 2:** Target Country Big Mac Price (Converted to USD)
    * **Visual Style:** Green lines, Step Line (no smooth curves), obvious grid background.

3. **Right Panel:** "Time Machine" Calculator Widget.
