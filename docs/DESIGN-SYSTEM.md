# CLICT Design System
> 家庭財務協作 PWA — 設計規範文件 v1.0

---

## 一、設計理念

**核心主題：溫暖 · 理財 · 系統感**

這是一個給香港家庭／伴侶使用的財務協作工具，設計基調取自 MoneyLover / Splitwise 的高密度資訊佈局，加入暖色系統感（Teal + Amber），讓財務數字清晰可讀、操作流程直覺，同時不失生活溫度。

**三個設計支柱：**
1. **信任感** — Teal 主色傳遞專業與可靠，數字排版清晰精準
2. **溫暖感** — 暖奶白底色、琥珀色警示，避免冷硬的純藍財務 App 感
3. **系統感** — 視覺層級清晰，只有需要行動的區塊才用卡片框強調

---

## 二、Design Tokens（globals.css）

```css
:root {
  --background: #FAF9F7;        /* 暖奶白底，非純白 */
  --foreground: #1C1917;        /* Stone-900，暖深色文字 */
  --card: #FFFFFF;
  --card-foreground: #1C1917;

  --primary: #0D9488;           /* Teal-600：主色、按鈕、icon、導航 active */
  --primary-foreground: #FFFFFF;

  --secondary: #F59E0B;         /* Amber-400：警示、badge、highlight */
  --secondary-foreground: #1C1917;

  --muted: #F4F0EB;             /* 暖米色，次要區塊背景 */
  --muted-foreground: #78716C;  /* Stone-500，次要文字 */

  --accent: #F59E0B;
  --accent-foreground: #1C1917;

  --destructive: #EF4444;
  --border: #E7E5E4;            /* Stone-200，柔和分隔線 */
  --input: #E7E5E4;
  --ring: #0D9488;
  --radius: 0.75rem;

  --positive: #059669;          /* Emerald-600：收入、已完成狀態 */
  --positive-foreground: #FFFFFF;
}
```

### Token 語義對照

| Token | 用途 |
|-------|------|
| `primary` | 主要行動按鈕、圖標、導航 active、重要數字 |
| `secondary` | 警示 badge、amber 高亮、通知小紅點 |
| `positive` | 收入金額 (+)、完成勾選、進度條（家務/儲蓄） |
| `destructive` | 刪除、錯誤、支出負數 |
| `muted` | StatCell 背景、次要區塊、卡片 footer |
| `amber-700` (#B45309) | 只在琥珀色底色上的文字（對比度 4.6:1，WCAG AA） |

---

## 三、字體

**Noto Sans HK**（支援繁體中文 / 香港用家）

```tsx
// app/src/app/layout.tsx
import { Noto_Sans_HK } from "next/font/google";

const notoSansHK = Noto_Sans_HK({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
```

字重用法：
- 400 → 正文、輔助說明
- 500 → 一般 label
- 600 → Section 標題、按鈕
- 700 → 大數字、Hero 金額

---

## 四、Layout 原則（DB-01 確立的規範）

### 頁面結構

```
Header（問候語 + 通知）
  └─ Hero Zone（BudgetCard + QuickStats）← 固定用卡片/色塊
  └─ Flat Section（家務）                ← 無邊框，直接在背景上
  └─ border-t 分隔線
  └─ Alert Card（結算）                  ← 唯一卡片：因為需要用戶行動
  └─ border-t 分隔線
  └─ Flat Section（儲蓄）
  └─ border-t 分隔線
  └─ Flat Section（動態）
BottomNav（fixed）
FAB（fixed，右下）
```

### 卡片使用規則

> **只有需要用戶行動（CTA）或警示的區塊才使用卡片框。**

- ✅ 用卡片：結算待確認、帳單提醒、需要操作的模態資訊
- ❌ 不用卡片：家務列表、儲蓄進度、動態feed、純資訊展示

### 分隔方式（輕重順序）

| 重量 | 方式 | 使用時機 |
|------|------|---------|
| 重 | `Card` 卡片（border + shadow） | 需要行動的 section |
| 中 | `border-t border-border` 全寬分隔線 | 平級 section 之間 |
| 輕 | `<Separator />` 組件 | section 內部子分組 |
| 無 | 純 spacing（`space-y-*`） | 同組元素之間 |

---

## 五、元件規範

### BudgetCard（Hero）
- 背景：`bg-gradient-to-br from-[#0F766E] to-[#0D9488]`
- 進度條：`bg-secondary/80`（Amber，暖色對比）
- 文字：全用 `text-white` 配合深色漸變背景
- 裝飾圓：`bg-white/5`，不能超過 `pointer-events-none`

### FlatSectionHeader
```tsx
// icon（text-primary）+ title（text-foreground）+ badge（bg-primary/10）+ action（text-muted-foreground + arrow）
```

### StatCell（次要數字格）
```tsx
<div className="rounded-xl bg-muted px-3 py-2.5">
  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
  <p className="text-[17px] font-bold leading-none text-foreground">{value}</p>
</div>
```

### Card（基礎卡片）
```tsx
className="rounded-2xl bg-card border border-border overflow-hidden shadow-[0_1px_4px_rgba(28,25,23,0.06)]"
```

### Alert Card（結算類）
- 額外加：`border-secondary/25`
- 頂部色條：`h-0.5 bg-gradient-to-r from-secondary/70 to-secondary/40`
- Badge：`bg-secondary/15 text-amber-700`

---

## 六、顏色語義系統

| 情境 | 顏色 | Tailwind class |
|------|------|----------------|
| 主要行動 | Teal | `bg-primary` / `text-primary` |
| 收入 / 已完成 | Emerald | `text-positive` / `bg-positive` |
| 支出 / 中性金額 | Stone-900 | `text-foreground` |
| 警示 / 待確認 | Amber | `text-secondary` / `bg-secondary/...` |
| 警示深色文字 | Amber-700 | `text-amber-700`（只用在琥珀底上） |
| 錯誤 / 刪除 | Red | `text-destructive` |
| 次要資訊 | Stone-500 | `text-muted-foreground` |

---

## 七、圖標規範

- **只用 inline SVG**，禁止使用 emoji 作 UI 圖標
- ViewBox 統一 `0 0 24 24`
- StrokeWidth：一般 `1.8`，強調 `2`，粗體 `2.2`
- 大小常數：`sz4`(16px) / `sz45`(18px) / `sz5`(20px) / `sz6`(24px)

```tsx
function IcXxx({ c = sz5 }: { c?: string }) {
  return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>...</svg>;
}
```

---

## 八、互動規範

| 元素 | Hover | Active | Transition |
|------|-------|--------|-----------|
| 所有可點擊元素 | `cursor-pointer` 必須 | `active:scale-95` | `transition-colors duration-200` |
| 按鈕 | `hover:bg-primary/90` | `active:bg-primary/80` | 150–200ms |
| FAB | `hover:scale-105` | `active:scale-95` | `duration-200` |
| 列表行 | `hover:bg-primary/5` | `hover:bg-primary/8` | `transition-colors` |

---

## 九、PWA 佈局注意事項

- 最大寬度：`max-w-lg mx-auto`（手機優先，桌面居中）
- 頁面 padding：`px-4`
- 底部 nav 高度預留：`pb-32`
- FAB 位置：`bottom-[4.75rem] right-4`（底部 nav 上方）
- BottomNav：`fixed bottom-0`，`bg-card/95 backdrop-blur-md`

---

## 十、禁止事項

- ❌ 禁止使用 emoji 作 UI 圖標（`🏠 📊` 等）
- ❌ 禁止 `text-white` 在 `bg-primary` 上（應用 `text-primary-foreground`）
- ❌ 禁止在白色背景上用 `text-secondary`（`#F59E0B` 對比度只有 2.4:1，失敗）
- ❌ 禁止每個 section 都用 Card 包住（參考第四節 Layout 原則）
- ❌ 禁止硬編碼顏色（如 `#6366F1`），必須用 design token
- ❌ 禁止 `font-family` 直接寫死，使用 `var(--font-sans)`

---

## 十一、Tech Stack

| 項目 | 版本 / 說明 |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4（`@import "tailwindcss"`，無 tailwind.config.js） |
| Components | shadcn/ui（Radix-based） |
| Font | Noto Sans HK via `next/font/google` |
| Icons | Inline SVG only |
| Target | Mobile-first PWA，iOS Safari + Android Chrome |

### Tailwind v4 注意

```css
/* globals.css — 正確寫法 */
@import "tailwindcss";

@theme inline {
  --color-primary: var(--primary);
  /* ... */
}

:root {
  --primary: #0D9488;
  /* ... */
}
```

不使用 `tailwind.config.js`，不使用 `@tailwind base/components/utilities`。

---

*CLICT Design System v1.0 — 基於 DB-01 Dashboard 實作確立*
