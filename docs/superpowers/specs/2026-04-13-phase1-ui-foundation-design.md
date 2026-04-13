# Phase 1 UI Foundation — Design Spec
**Date:** 2026-04-13  
**Project:** Root.VCR — Sistem Manajemen Voucher RT/RW Net  
**Scope:** Foundation layer only (design tokens, shadcn/ui setup, layout components, responsive logic)

---

## 1. Design Tokens

### Color Palette (Indigo-based, CSS custom properties via shadcn/ui)

| Token | Value | Usage |
|---|---|---|
| `primary` | `indigo-600` (#4f46e5) | CTA buttons, active nav items |
| `primary-hover` | `indigo-700` | Button hover state |
| `primary-bg` | `indigo-50` (#eef2ff) | Active nav item background |
| `background` | `white` / `gray-50` | Page background |
| `surface` | `white` | Cards, sidebar |
| `border` | `gray-200` | Dividers, input borders |
| `text-primary` | `gray-900` | Main content text |
| `text-secondary` | `gray-500` | Labels, hints |
| `text-inverse` | `white` | Text on dark backgrounds |

### Status Colors
| State | Color |
|---|---|
| success | `emerald-500` |
| warning | `amber-500` |
| danger | `red-500` |
| info | `blue-500` |

### Typography
- Font: **Inter** (via `next/font/google`, already configured)
- Scale: Tailwind defaults

### Spacing & Layout
- Sidebar width: `240px` (desktop, fixed)
- Header height: `56px`
- BottomNav height: `64px` (mobile only)
- Shadows: `shadow-sm` (cards), `shadow-md` (dropdowns/modals)

---

## 2. Component Architecture

### Slot Pattern
`AppShell` receives `navItems` as a prop. Each role provides its own nav config, keeping the shell logic clean.

### File Structure

```
src/
├── components/
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── separator.tsx
│   └── layout/
│       ├── AppShell.tsx           # Main wrapper
│       ├── Sidebar.tsx            # Desktop nav (240px fixed)
│       ├── Header.tsx             # Top bar (title + avatar)
│       ├── BottomNav.tsx          # Mobile nav (fixed bottom)
│       └── nav-config.ts          # NavItem type + ADMIN_NAV + RESELLER_NAV
│
└── app/
    ├── (auth)/login/layout.tsx    # Centered card layout (styled)
    └── (dashboard)/
        ├── layout.tsx             # Minimal (auth guard only)
        ├── admin/layout.tsx       # <AppShell navItems={ADMIN_NAV} />
        └── reseller/layout.tsx    # <AppShell navItems={RESELLER_NAV} />
```

### NavItem Type
```ts
type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}
```

### Nav Configurations
**ADMIN_NAV:** Dashboard, Vouchers, Resellers, Wallet, Analytics, Settings  
**RESELLER_NAV:** Dashboard, Vouchers, Analytics, Settings

---

## 3. Responsive Logic

### Breakpoints (mobile-first, Tailwind defaults)
| Breakpoint | Width | Behavior |
|---|---|---|
| default | < 768px | Mobile layout |
| `md` | ≥ 768px | Tablet |
| `lg` | ≥ 1024px | Desktop layout |

### AppShell Per Breakpoint
| Element | Mobile | Desktop (`lg+`) |
|---|---|---|
| Sidebar | Hidden | Fixed left, 240px |
| Header | Full width | `ml-[240px]` |
| BottomNav | Fixed bottom, visible | Hidden |
| Main content | Full width, `pb-16` | `ml-[240px]`, `pb-0` |

**Note:** No drawer/toggle in Phase 1. Sidebar is always-visible on desktop; BottomNav replaces it on mobile. Keeps implementation simple for MVP.

### BottomNav Behavior
- Max 4 items (icon + label)
- Active: `indigo-600` icon + label
- Inactive: `gray-400`
- Role-aware via `nav-config.ts`

### Header Behavior
- Left: dynamic page title (derived from current route)
- Right: Avatar with dropdown (user name + logout action)
- Compact on mobile, same structure on desktop

---

## 4. shadcn/ui Setup

- Initialize with `npx shadcn@latest init`
- Style: `default`, CSS variables: `yes`, base color: `indigo`
- Output dir: `src/components/ui`
- Components to add in Phase 1: `button`, `card`, `badge`, `avatar`, `dropdown-menu`, `separator`
- Tailwind config extended with shadcn CSS variable tokens

---

## 5. Out of Scope (Phase 1)

- No sidebar mobile drawer/toggle
- No dark mode
- No page content (dashboard widgets, tables, forms)
- No animations beyond Tailwind defaults
- No Zustand/React Query setup

---

## 6. Implementation Order

1. Setup `tailwind.config.ts` with design tokens + shadcn CSS variable support
2. Update `globals.css` with CSS custom properties
3. Run `shadcn init` and add Phase 1 components
4. Create `nav-config.ts`
5. Build `Sidebar.tsx`
6. Build `Header.tsx`
7. Build `BottomNav.tsx`
8. Build `AppShell.tsx` (composes 5–7)
9. Wire `admin/layout.tsx` → `<AppShell navItems={ADMIN_NAV} />`
10. Wire `reseller/layout.tsx` → `<AppShell navItems={RESELLER_NAV} />`
11. Style `(auth)/login/layout.tsx` (centered card)
