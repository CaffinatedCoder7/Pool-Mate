# Pool-Mate

PoolMate — instant-first, intra-city carpooling web prototype (frontend only).
All drivers, fares, locations and verification states are **demo data**; there is
no backend in this milestone.

See `CLAUDE.md` and `POOLMATE_FRONTEND_SPEC.md` for product rules.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # TypeScript only
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

Optional: copy `.env.example` to `.env.local` to set `VITE_API_BASE_URL` (future FastAPI).

## Structure

```
src/
  components/
    ui/        Design-system primitives (Button, TextField, Switch, SegmentedControl,
               Card, Badge/DemoBadge, Dialog/ConfirmDialog, Notice, Toaster, Skeleton,
               EmptyState, Spinner) — import from "@/components/ui"
    driver/    Driver dashboard, offer approval and trip controls
    safety/    Shared safety centre (SOS, contacts, share preview, reports)
    layout/    AppShell, TopBar, SideNav, MobileNav, RoleSwitch, UserMenu, Page,
               MapPageLayout, Logo
    map/       MapPlaceholder (blank stand-in; real map arrives later)
  context/     AuthContext (mock session), NotificationContext (toasts)
  services/    Service interfaces + mock implementations; index.ts is the registry
  routes/      paths, guards, router
  navigation/  Rider and driver nav definitions
  pages/       Route screens (most are placeholders for later chunks)
  types/       Domain types shared with the future API
  styles/      Global CSS and colour tokens
```

Design tokens live in `tailwind.config.ts` and `src/styles/index.css`; the reusable primitives are in
`src/components/ui`. There is no public showcase route — read the components directly.
