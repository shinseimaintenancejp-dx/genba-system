# UI/UX Specifications for Genba Environment

> **Chỉ dẫn phản hồi (Vietnamese):** Khi thiết kế hoặc cài đặt giao diện người dùng (UI/UX) cho hệ thống, Agent phải tuân thủ nghiêm ngặt các quy chuẩn kỹ thuật chi tiết dưới đây. Mọi mô tả, task plan, hoặc phản hồi về UI/UX phải sử dụng tiếng Việt. Tuy nhiên, toàn bộ mã nguồn (giao diện, CSS, className, hook, components) phải được lập trình bằng tiếng Anh và văn bản hiển thị trên giao diện (UI text, placeholder, nhãn) phải sử dụng tiếng Nhật (日本語) chuẩn xác.

---

## 1. Global Layout Grid & Dimensions

### 1.1. Office Desktop Dashboard (Viewport width >= 1280px)
For administrators and back-office staff operating on desktops/laptops:
* **Sidebar (Navigation Menu):**
  * Width: Fixed `280px` (`w-[280px]`).
  * Collapsed state (tablets/laptops: 768px <= viewport < 1280px): Fixed `72px` (`w-[72px]`).
  * Background: Solid dark/indigo `hsl(222, 47%, 11%)` (`--foreground` equivalent) or neutral base to prevent distraction.
  * Menu Items: Font size must be `16px` (`text-base`) for better readability. Inactive text color must use high contrast against dark background (e.g., `text-slate-300`).
* **Header (Topbar):**
  * Height: Fixed `64px` (`h-16`).
  * Inline Padding: Fixed `24px` (`px-6`).
  * Border: Bottom border `1px` solid `hsl(214, 32%, 91%)` (`border-b border-border`).
* **Main Content Area:**
  * Maximum Width: Limit layout content to `1400px` (`max-w-[1400px]`) centered (`mx-auto`).
  * Outer Padding: Fixed `32px` (`p-8`).
  * Layout Grid Gaps: Fixed `24px` (`gap-6`) for dashboard card matrices and layout sections.

### 1.2. Mobile Field Layout (Viewport width < 640px)
Specifically optimized for Genba cleaning workers accessing the `/my-genba` route on mobile devices (often outdoors):
* **Single Column System:** No sidebars.
* **Topbar:**
  * Height: Fixed `56px` (`h-14`).
  * Inline Padding: Fixed `16px` (`px-4`).
  * Background: Sticky solid background (`sticky top-0 bg-background/95 backdrop-blur z-50`).
* **Bottom Navigation Bar (Tab Bar):**
  * Height: Fixed `72px` (`h-[72px]`) containing safe area padding.
  * Border: Top border `1px` solid `hsl(214, 32%, 91%)` (`border-t border-border`).
  * Icons/Labels: Centered grid structure with 4 tabs max. Icon size `24px`, label text size `10px` (`text-[10px]`).
* **Main Content Area:**
  * Outer Padding: Fixed `16px` (`p-4`).
  * Grid Gap: Card items must have a spacing of `16px` (`gap-4`) to prevent accidental double taps.

---

## 2. Button Component Rules

All buttons must meet strict touch requirements and distinct state styling to ensure usability under direct sunlight.

### 2.1. Dimension Standards
* **Desktop Buttons:** Height `40px` (`h-10`), padding inline `16px` (`px-4`), font size `16px` (`text-base`).
* **Mobile / Field Buttons:** Height `52px` (`h-[52px]`), padding inline `24px` (`px-6`), font size `18px` (`text-lg`).
* **Border Radius:** Fixed `0.5rem` / `8px` (`rounded-lg`) for all operational actions.

### 2.2. Business Action Colors & States (Japanese UI)

#### 2.2.1. Save / Register Button (保存 / 登録)
* **Text:** `保存` (Save) or `登録` (Register)
* **Colors & States:**
  * **Normal:** Background `hsl(221, 83%, 53%)` (Primary Blue - `#1E60F2`), Text `hsl(210, 40%, 98%)`.
  * **Hover:** Background `hsl(221, 83%, 45%)` (`#0F4FD0`).
  * **Disabled:** Background `hsl(210, 40%, 96%)` (`bg-muted`), Text `hsl(215.4, 16.3%, 56.9%)` (`text-muted-foreground`), opacity `0.5`, `pointer-events-none`.

#### 2.2.2. Cancel Button (キャンセル)
* **Text:** `キャンセル`
* **Colors & States:**
  * **Normal:** Background transparent, border `1px` solid `hsl(214, 32%, 91%)` (`border-input`), Text `hsl(222, 47%, 11%)`.
  * **Hover:** Background `hsl(210, 40%, 96%)` (`bg-muted`), Text `hsl(222, 47%, 11%)`.
  * **Disabled:** Text opacity `0.3`, border opacity `0.3`, `pointer-events-none`.

#### 2.2.3. Delete Button (削除)
* **Text:** `削除`
* **Colors & States:**
  * **Normal:** Background `hsl(0, 84%, 60%)` (Destructive Red - `#F83B3B`), Text `hsl(210, 40%, 98%)`.
  * **Hover:** Background `hsl(0, 84%, 50%)` (`#E51E1E`).
  * **Disabled:** Background `hsl(210, 40%, 96%)`, Text `hsl(215.4, 16.3%, 56.9%)`, opacity `0.5`, `pointer-events-none`.

#### 2.2.4. Approve Button (承認)
* **Text:** `承認`
* **Colors & States:**
  * **Normal:** Background `hsl(142.1, 76.2%, 36.3%)` (Success Green - `#10B981`), Text `hsl(355.7, 100%, 97.3%)`.
  * **Hover:** Background `hsl(142.1, 76.2%, 28%)` (`#047857`).
  * **Disabled:** Background `hsl(210, 40%, 96%)`, Text `hsl(215.4, 16.3%, 56.9%)`, opacity `0.5`, `pointer-events-none`.

---

## 3. Pagination System

Used at the bottom of data tables to navigate clean records.

* **Placement:** Bottom center of the container.
* **Component Dimensions:**
  * Touch target area for pagination arrows and page numbers: `40px` x `40px` (`w-10 h-10`).
  * Page button spacing: `4px` (`gap-1`).
* **States:**
  * **Active Page:** Background `hsl(221, 83%, 53%)` (Primary Blue), Text `hsl(210, 40%, 98%)`.
  * **Inactive Page:** Background transparent, Text `hsl(222, 47%, 11%)`, hover background `hsl(210, 40%, 96%)`.
  * **Disabled Arrows:** Text opacity `0.3`, `pointer-events-none`.
* **Row Count Messaging (Japanese):**
  * Format: `{total}件中 {start}〜{end}件を表示` (e.g. `359件中 11〜20件を表示`).
  * Position: Left-aligned on Desktop next to pagination; Centered on Mobile directly above pagination buttons.
  * Styling: Size `14px` (`text-sm` / `text-base`), Color `hsl(215.4, 16.3%, 40%)` (`text-muted-foreground` darker).

---

## 4. Modals & Dialogs Layout

All dialog overlays must lock body scrolling and center content on screen.

### 4.1. 1-Way Notification Popup (Alert Dialog)
* **Usage:** System status messages, strict errors, or single acknowledgments.
* **Width:** Fixed `max-w-[400px]` (centered relative to viewport).
* **Padding:** `24px` (`p-6`).
* **Button Layout:** Single full-width button (usually `OK` or `閉じる`) centered at the bottom.
  * Mobile height: `52px`.
  * Desktop height: `40px`.

### 4.2. 2-Way Confirmation Popup
* **Usage:** Operations requiring confirmation before database write (e.g. deleting a genba, approving an invoice).
* **Width:** Fixed `max-w-[480px]`.
* **Padding:** `24px` (`p-6`).
* **Buttons Alignment & Order (Japanese Standard):**
  * **Desktop Layout:** Right-aligned (`justify-end`).
    * **Left Button:** Cancel action (`キャンセル`) — Secondary style.
    * **Right Button:** Target action (e.g., `削除する`, `承認する`, `更新する`) — Primary or Destructive style.
    * Gap: `12px` (`gap-3`).
  * **Mobile Layout:** Full width stacked buttons.
    * **Top Button (Primary/Action):** Height `52px`, e.g., `削除する`.
    * **Bottom Button (Cancel/Dismiss):** Height `48px` transparent or ghost style, e.g., `キャンセル`.
    * Gap: `12px` (`space-y-3`).

### 4.3. Form Modals & Scrollable Dialogs
* **Usage:** Large forms (e.g., adding/editing a contract or genba) that might exceed the viewport height.
* **Layout Structure:**
  * **Parent Container (`Dialog.Content`):** Must enforce rounded corners on the scrollbar by clipping the content. Use classes: `flex flex-col max-h-[95vh] overflow-hidden rounded-xl`. Do NOT put `padding` or `overflow-y-auto` directly on the parent container.
  * **Header:** Must be pinned/sticky to the top of the modal so it's always visible. Use classes: `shrink-0 p-6 border-b z-10 bg-slate-50`.
  * **Scrollable Body:** The form content area itself handles the scrolling. Use classes: `flex-1 overflow-y-auto p-6`.

---

## 5. Strict Constraints & Prohibitions

### 5.1. Prohibition of Inline Styles
* **Rule:** Do NOT use the `style={{ ... }}` prop in JSX components. All styling must use Tailwind utility classes or custom tailwind configs.
* **Exception:** Dynamic styling that cannot be precomputed (e.g., inline variables for layout translation, animations, percentage progress values).

### 5.2. Mandatory Loading States
* **Rule:** Every server component or client-side component retrieving asynchronous data must define a visual placeholder.
* **Table Skeleton Loader:**
  * Must display a table shape with animated opacity pulses (`animate-pulse`).
  * Minimal skeleton rows: 5 rows. Columns must match the exact number of header fields.
  * NEVER use simple raw text strings like `"Loading..."` or blank areas.
* **Button Mutation States:**
  * When a form is submitting or an API call is active (mutating state), the button MUST be disabled (`disabled={isPending}`).
  * Display a spin-animated Lucide spinner icon (`Loader2` from `lucide-react`, className `animate-spin mr-2 h-4 w-4`).
  * Replace the button label with processing text:
    * `保存` → `保存中...` (Saving...)
    * `削除` → `削除中...` (Deleting...)
    * `承認` → `承認中...` (Approving...)

### 5.3. Mandatory Empty States
* **Rule:** If search filters or queries return 0 items, display a dedicated empty state container.
* **Dimensions:** Minimum height of `240px` (`h-60`).
* **Layout:** Centered column flex container (`flex flex-col items-center justify-center`).
* **Elements:**
  * **Icon:** A relevant greyed-out Lucide icon (e.g., `FileX`, `Inbox`, `Layers`) at size `48px` with color `hsl(215.4, 16.3%, 56.9% / 0.5)` (`text-muted-foreground/50`).
  * **Main text (Japanese):** Clear message, e.g. `データがありません` (No data), `該当する現場が見つかりません` (No matching genba found).
  * **Sub-action (Optional):** A small primary button to clear filters or add a new record.

---

## 6. Form Inputs & Data Formatting

### 6.1. Currency & Amount Inputs
* **Usage:** For any money/amount fields (e.g., `金額`, `単価`, `料金`).
* **Visuals & Behavior:**
  * Must display comma separators for thousands (e.g., `1,234,567`).
  * Text must be aligned to the right (`text-right`).
  * Must include a currency unit suffix `円` positioned absolutely on the right side.
* **Implementation:**
  * Must use `Controller` from `react-hook-form` rather than simple `register`.
  * The `input` should have `type="text"`.
  ---

## 7. Standard Page Layout & Table Integration (Standard List Screen Convention)

All list management pages (e.g. `現場一覧`, `取引先一覧`, `契約一覧`, `従業員管理`, `役職管理`, `ユーザー管理`) MUST follow a unified, standard layout structure:

### 7.1. Structure Hierarchy
1. **Outer Page Container:** Must use `space-y-6` for consistent vertical rhythm.
2. **Page Header Bar:**
   * Flex container: `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`.
   * Title & Subtitle: Title `h1` (`text-2xl font-bold text-slate-900 tracking-tight`) + Subtitle `p` (`text-sm text-slate-500 mt-1`).
   * Action Area: Primary action button using `#1E60F2` (`bg-[#1E60F2] hover:bg-[#0F4FD0] h-10 px-4 rounded-lg text-sm font-semibold text-white`).
3. **Filter & Search Toolbar Card:**
   * Card container: `flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end`.
   * Search input: Height `40px` (`h-10`), border `border-slate-200`, focus ring `#1E60F2` (`focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2]`), left `Search` icon.
4. **Data Result Summary Badge:**
   * Format: `条件に一致する[対象名]: [件数] 件`.
   * Styling: `text-sm font-medium text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm inline-block`, with count highlighted in `text-lg font-bold text-[#1E60F2] mx-1`.
5. **Data Table Component:**
   * All list management screens MUST use the shared `<DataTable>` component (`@/components/common/DataTable`).
   * Custom ad-hoc `<table>` implementations on list screens are strictly prohibited to guarantee uniform skeleton loading, pagination, and empty state behaviors.
