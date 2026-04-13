# SUPER PROMPT: UI/UX IMPLEMENTATION ROOT.VCR

## 🎯 OBJECTIVE
Implementasi UI/UX modern untuk aplikasi Root.VCR. Fokus pada tampilan yang clean, professional, dan fully responsive untuk semua device (mobile, tablet, desktop).

---

## 🎨 DESIGN SYSTEM

### Color Palette
```css
:root {
  /* Primary Colors */
  --primary-900: #0f172a;      /* Dark Navy - Sidebar, Headers */
  --primary-800: #1e293b;      /* Navy - Cards background dark mode */
  --primary-700: #334155;      /* Slate - Secondary elements */
  --primary-600: #475569;      /* Muted text */
  
  /* Accent Colors */
  --accent-primary: #3b82f6;   /* Blue - Primary buttons, links */
  --accent-secondary: #06b6d4; /* Cyan - Secondary actions */
  --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  
  /* Semantic Colors */
  --success: #22c55e;          /* Green - Active, Success */
  --warning: #f59e0b;          /* Orange - Warning, Pending */
  --danger: #ef4444;           /* Red - Error, Expired, Frozen */
  --info: #8b5cf6;             /* Purple - Info badges */
  
  /* Neutral Colors */
  --bg-primary: #f8fafc;       /* Light gray - Main background */
  --bg-secondary: #ffffff;     /* White - Cards */
  --bg-tertiary: #f1f5f9;      /* Lighter gray - Input backgrounds */
  --border: #e2e8f0;           /* Border color */
  --text-primary: #0f172a;     /* Dark text */
  --text-secondary: #64748b;   /* Muted text */
  --text-tertiary: #94a3b8;    /* Placeholder text */
}
```

### Typography
```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px - Labels, badges */
--text-sm: 0.875rem;   /* 14px - Body small */
--text-base: 1rem;     /* 16px - Body */
--text-lg: 1.125rem;   /* 18px - Subheadings */
--text-xl: 1.25rem;    /* 20px - Card titles */
--text-2xl: 1.5rem;    /* 24px - Section titles */
--text-3xl: 1.875rem;  /* 30px - Page titles */
--text-4xl: 2.25rem;   /* 36px - Hero numbers */
--text-5xl: 3rem;      /* 48px - Big stats */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing & Sizing
```css
/* Spacing Scale (8px base) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */

/* Border Radius */
--radius-sm: 0.375rem;  /* 6px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-2xl: 1.5rem;   /* 24px */
--radius-full: 9999px;  /* Pill shape */
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
--shadow-card-hover: 0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08);
```

---

## 📱 RESPONSIVE BREAKPOINTS

```css
/* Mobile First Approach */
--mobile: 0px;        /* Default - Mobile phones */
--tablet: 768px;      /* md - Tablets */
--laptop: 1024px;     /* lg - Laptops */
--desktop: 1280px;    /* xl - Desktops */
--wide: 1536px;       /* 2xl - Wide screens */
```

### Layout Behavior
| Device | Sidebar | Navigation | Cards Grid |
|--------|---------|------------|------------|
| Mobile (<768px) | Hidden | Bottom Nav | 1 column |
| Tablet (768-1023px) | Collapsed (icons) | Bottom Nav | 2 columns |
| Laptop (1024-1279px) | Expanded | Sidebar | 2-3 columns |
| Desktop (≥1280px) | Expanded | Sidebar | 3-4 columns |

---

## 🏗️ COMPONENT LIBRARY

### 1. Layout Components

#### AppShell (Main Layout)
```
Desktop/Laptop:
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────────┐ │
│ │          │ │ Header: Search + Notifications     │ │
│ │ Sidebar  │ ├────────────────────────────────────┤ │
│ │          │ │                                    │ │
│ │ - Logo   │ │         Main Content               │ │
│ │ - Nav    │ │         (Scrollable)               │ │
│ │ - User   │ │                                    │ │
│ │          │ │                                    │ │
│ └──────────┘ └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

Mobile/Tablet:
┌─────────────────────────┐
│ Header: Logo + Avatar   │
├─────────────────────────┤
│                         │
│     Main Content        │
│     (Scrollable)        │
│                         │
├─────────────────────────┤
│ Bottom Navigation       │
│ [🏠] [📋] [📊] [⚙️]    │
└─────────────────────────┘
```

#### Sidebar (Desktop)
- Width: 260px expanded, 72px collapsed
- Background: var(--primary-900)
- Logo area with brand name
- Navigation items with icons + labels
- Active state: accent background with left border
- Hover state: subtle background change
- User profile section at bottom
- Collapse toggle button

#### Bottom Navigation (Mobile)
- Fixed bottom, height: 64px
- Background: white with top shadow
- 4-5 nav items with icons + small labels
- Active state: accent color icon + label
- Safe area padding for notched devices

### 2. Header Component
- Height: 64px
- Sticky top
- Contains:
  - Page title / Breadcrumb (desktop)
  - Search bar (expandable on mobile)
  - Notification bell with badge
  - User avatar dropdown

### 3. Card Components

#### Stats Card
```
┌─────────────────────────────┐
│ 📊  +12% ↗                  │
│                             │
│ VCR TODAY                   │
│ 2,450                       │  ← Large number
│                             │
└─────────────────────────────┘
- Background: white
- Padding: 20px
- Border radius: 16px
- Shadow: shadow-card
- Hover: shadow-card-hover + slight translateY
- Icon with accent background (rounded)
- Trend indicator (green up / red down)
```

#### Wallet Card (Featured)
```
┌─────────────────────────────┐
│ ░░░░ GRADIENT BG ░░░░░░░░  │
│                             │
│ Available Balance           │
│ Rp 4.280.000               │  ← Extra large, white
│                             │
│ [⊕ Top Up]  [↗ Withdraw]   │
└─────────────────────────────┘
- Background: accent-gradient
- Text: white
- Border radius: 20px
- Padding: 24px
- Shadow: shadow-xl
```

#### Voucher Item Card
```
┌─────────────────────────────┐
│ ┌──┐ RT-7729-XQ            │
│ │🎫│ 2 Hour • Generated    │
│ └──┘ 10:24              🟢 │
└─────────────────────────────┘
- Background: white or bg-tertiary
- Left icon/indicator
- Status badge (color coded)
- Subtle border or shadow
- Tap/hover state
```

#### Reseller Card
```
┌─────────────────────────────┐
│ ┌────┐ Ahmad Yusuf   🟢    │
│ │ 👤 │ ahmad@mail.com      │
│ └────┘                      │
│ Fee: 15.0%    Rp 2.500.000 │
│                             │
│ [Edit]            [Freeze] │
└─────────────────────────────┘
- Avatar circle with image/initials
- Status badge
- Key metrics displayed
- Action buttons
```

### 4. Form Components

#### Input Field
```
┌─────────────────────────────┐
│ EMAIL ADDRESS               │  ← Label (small, muted)
│ ┌─────────────────────────┐ │
│ │ ✉️  admin@rootvcr.com   │ │  ← Icon + Input
│ └─────────────────────────┘ │
└─────────────────────────────┘
- Background: var(--bg-tertiary)
- Border: transparent (focus: accent)
- Border radius: 12px
- Padding: 14px 16px
- Left icon optional
- Focus ring: accent color
```

#### Select Dropdown
- Same styling as input
- Chevron icon right
- Dropdown with shadow-lg
- Options with hover state
- Selected with checkmark

#### Toggle Switch
- Width: 48px, Height: 24px
- Active: accent gradient background
- Inactive: gray background
- Smooth transition animation

#### Slider
- Track: gray, 4px height
- Progress: accent gradient
- Thumb: white circle with shadow
- Value tooltip on drag

### 5. Button Components

#### Primary Button
```css
background: var(--accent-gradient);
color: white;
padding: 12px 24px;
border-radius: 12px;
font-weight: 600;
box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
/* Hover: brightness increase + shadow grow */
/* Active: scale(0.98) */
```

#### Secondary Button
```css
background: white;
color: var(--primary-900);
border: 1px solid var(--border);
/* Same sizing as primary */
/* Hover: bg-tertiary */
```

#### Icon Button
```css
width: 40px;
height: 40px;
border-radius: 10px;
display: flex;
align-items: center;
justify-content: center;
/* Variants: ghost, outlined, filled */
```

### 6. Badge Components

#### Status Badge
```css
/* Active/Success */
background: rgba(34, 197, 94, 0.1);
color: #22c55e;
padding: 4px 10px;
border-radius: 999px;
font-size: 12px;
font-weight: 500;

/* Other variants: warning, danger, info, neutral */
```

#### Counter Badge
```css
/* Notification badge */
min-width: 18px;
height: 18px;
background: var(--danger);
color: white;
font-size: 11px;
border-radius: 999px;
```

### 7. Modal/Dialog

```
┌──────────────────────────────────────┐
│                                  ✕   │
│           [Success Icon]             │
│              SUCCESS                 │
│        Voucher ready for use         │
│                                      │
│  ┌────────────────────────────────┐  │
│  │          VOUCHER CARD          │  │
│  │         (see design)           │  │
│  └────────────────────────────────┘  │
│                                      │
│     [📋 Copy]      [📤 Share]        │
│                                      │
│   [WhatsApp] [Telegram] [SMS]        │
│                                      │
│        DONE, BACK TO DASHBOARD       │
└──────────────────────────────────────┘
- Centered overlay
- Background: white, radius-2xl
- Max-width: 400px (mobile: 90%)
- Padding: 24px
- Backdrop: black 50% opacity + blur
- Animation: fade + scale in
```

### 8. Table Component (Desktop)

```
┌────────────────────────────────────────────────────────────┐
│ VOUCHER CODE │ PROFILE    │ GENERATED  │ STATUS  │ ACTION │
├──────────────┼────────────┼────────────┼─────────┼────────┤
│ 293-8472     │ Ultra High │ 24 Oct ... │ 🟡 UNUSED│ 📋 👁  │
├──────────────┼────────────┼────────────┼─────────┼────────┤
│ 112-9904     │ Standard   │ 23 Oct ... │ 🟢 ACTIVE│ 📋 👁  │
└──────────────┴────────────┴────────────┴─────────┴────────┘
- Header: bg-tertiary, font-medium, text-secondary
- Rows: hover state with bg-tertiary
- Zebra striping optional
- Sticky header on scroll
- Pagination at bottom
```

### 9. Chart Components

#### Area/Line Chart
- Gradient fill under line
- Smooth curve (tension: 0.4)
- Grid lines: subtle dashed
- Tooltip on hover
- Legend at top or bottom

#### Donut Chart
- Center text with main value
- Segment colors from palette
- Legend beside or below
- Hover: segment highlight

#### Bar Chart
- Rounded corners on bars
- Gradient fill
- Value labels on hover
- Horizontal or vertical

---

## 📄 PAGE SPECIFICATIONS

### Authentication Pages

#### Login Page
**Desktop Layout:**
- Split screen: 50% branding / 50% form
- Left side: Gradient background (primary-900 to accent), large logo, tagline
- Right side: White background, centered form

**Mobile Layout:**
- Full screen white
- Logo at top (centered, smaller)
- Form below
- Sticky login button at bottom

**Form Elements:**
- Email input with mail icon
- Password input with lock icon + show/hide toggle
- Remember me checkbox
- Primary login button (full width)
- Forgot password link
- Optional: SSO button

---

### Reseller Panel

#### Dashboard
**Stats Section (Top):**
- Wallet balance card (featured, gradient)
- VCR Today card
- Active Users card (real-time indicator)

**Generate Voucher Section:**
- Profile dropdown (show price)
- Quantity input
- Generate button (prominent)

**Recent Vouchers Section:**
- List of today's vouchers
- Each item: code, profile, time, status
- "View All" link

**Mobile:** Single column, scrollable
**Tablet:** 2 column grid for stats
**Desktop:** 3-4 column grid, sidebar visible

#### Voucher Management
- Filter bar: Status, Profile, Date Range
- Search input
- Table (desktop) / Card list (mobile)
- Export buttons: PDF, Excel
- Pagination

#### Analytics
- Period selector tabs: Today, Week, Month
- Stats summary cards
- Charts section:
  - Saldo usage (donut)
  - Generation trend (line)
  - Profile popularity (horizontal bar)

#### Settings
- Profile section: Avatar, name, email, phone, location
- Security section: Change password
- Logout button

---

### Admin Panel

#### Dashboard
**Stats Row:**
- VCR Today (all resellers)
- Total Reseller Saldo
- Revenue MTD
- Active Resellers
- PPPoE Status

**Quick Generate Card**

**Revenue Chart (Area/Line)**

**Top Resellers Leaderboard:**
- Ranked list with avatars
- Medal icons for top 3

**System Activity Feed:**
- Recent activities with icons
- Timestamps
- "View All" link

#### Wallet Management
- Total balance header card
- Search resellers
- Reseller list with balances
- Topup/Adjust modal
- Transaction history per reseller
- Export reports

#### Reseller Management
- Add reseller button
- Search + status filter
- Reseller cards/table:
  - Avatar, name, email
  - Fee percentage
  - Balance
  - Status badge
  - Actions: Edit, Freeze/Unfreeze
- Add/Edit modal with form

#### Voucher Management
**Tabs:**
1. Voucher Settings
   - Code prefix input
   - Code length slider
   - Character format radio
   - Username=Password toggle
   - Live preview card

2. Profile Management
   - Sync from MikroTik button
   - Add profile button
   - Profiles table/cards
   - Edit modal

3. All Vouchers
   - Advanced filters
   - Bulk actions
   - Full voucher table
   - Export options
   - Delete cookies button

4. PPPoE Management
   - Sync button
   - Users table with status

#### Settings
**Tabs:**
1. Profile
2. MikroTik Connection
   - Host, ports, credentials
   - Connection status indicator
   - Test & Sync buttons
3. Hotspot Settings
   - Login URL, company name, logo
4. Backup
   - Auto backup toggle
   - Schedule, retention
   - Manual backup/restore
5. Security
   - Change password
   - Active sessions

---

## 🎬 ANIMATIONS & TRANSITIONS

```css
/* Default transition */
transition: all 0.2s ease;

/* Page transitions */
animation: fadeIn 0.3s ease;

/* Card hover */
transform: translateY(-2px);
box-shadow: var(--shadow-card-hover);

/* Button press */
transform: scale(0.98);

/* Modal entrance */
animation: modalIn 0.25s ease;
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Skeleton loading */
animation: shimmer 1.5s infinite;
background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
```

---

## 🔧 IMPLEMENTATION NOTES

### Tech Stack
- Next.js 14 App Router
- Tailwind CSS (extend with custom theme)
- shadcn/ui components as base
- Lucide React icons
- Recharts for charts
- Framer Motion for animations (optional)

### File Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── wallet/page.tsx
│   │   │   ├── resellers/page.tsx
│   │   │   ├── vouchers/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── reseller/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── vouchers/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── layout.tsx (AppShell)
│   └── layout.tsx
├── components/
│   ├── ui/              (shadcn components)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── BottomNav.tsx
│   │   └── AppShell.tsx
│   ├── cards/
│   │   ├── StatsCard.tsx
│   │   ├── WalletCard.tsx
│   │   ├── VoucherCard.tsx
│   │   └── ResellerCard.tsx
│   ├── charts/
│   │   ├── AreaChart.tsx
│   │   ├── DonutChart.tsx
│   │   └── BarChart.tsx
│   ├── modals/
│   │   ├── VoucherSuccessModal.tsx
│   │   ├── TopupModal.tsx
│   │   └── ConfirmModal.tsx
│   └── shared/
│       ├── Badge.tsx
│       ├── EmptyState.tsx
│       └── LoadingSkeleton.tsx
└── styles/
    └── globals.css
```

### Accessibility
- Focus visible states
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Screen reader friendly

### Performance
- Lazy load modals and charts
- Image optimization with next/image
- Skeleton loading states
- Optimistic UI updates

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Foundation
- [ ] Setup Tailwind config with design tokens
- [ ] Create base UI components (Button, Input, Card, Badge)
- [ ] Create AppShell layout (Sidebar + Header + BottomNav)
- [ ] Implement responsive logic

### Phase 2: Auth
- [ ] Login page (desktop + mobile)
- [ ] Auth redirect logic

### Phase 3: Reseller Panel
- [ ] Dashboard page
- [ ] Generate voucher flow + success modal
- [ ] Voucher management page
- [ ] Analytics page with charts
- [ ] Settings page

### Phase 4: Admin Panel
- [ ] Dashboard page
- [ ] Wallet management
- [ ] Reseller management
- [ ] Voucher settings + profiles
- [ ] All vouchers view
- [ ] Analytics
- [ ] Settings (MikroTik, backup, security)

### Phase 5: Polish
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Animations
- [ ] Dark mode (optional)

---

**Baca PRD.md untuk detail fitur dan API endpoints. Implementasi UI harus connect ke API yang sudah dibuat.**
