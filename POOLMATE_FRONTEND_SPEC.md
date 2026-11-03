# POOLMATE — Frontend Product Requirements & Implementation Specification

**Version:** 1.0  
**Date:** 2 November 2026  
**Milestone:** Frontend-only interactive prototype  
**Status:** Development baseline — revise only through an explicit team decision

> This specification is the frontend implementation contract for the next PoolMate build. It is intentionally limited to the web frontend, its map experience, typed mock data, and API-ready service interfaces. It does not claim that production matching, payments, verification, or live fleet dispatch are implemented.

## 1. Product summary

PoolMate is an intra-city ride-booking and dynamic carpooling product. Its distinctive interaction is **instant-first, pool-when-feasible**: a rider can proceed with an ordinary ride without being forced to wait for another passenger, while the platform can offer a compatible co-rider during the journey when the live vehicle route can accommodate the additional pickup and drop safely.

The product's three primary differentiators are:

1. **Instant-first dynamic pooling:** a normal ride can proceed immediately; a compatible request may be inserted into the remaining route before pooling closes.
2. **Intra-city pooling:** short and medium urban journeys are in scope, initially using Jaipur as the demonstration city.
3. **Women-Only mode:** a rider can request a strictly restricted ride experience. The frontend must visibly preserve this requirement through search, results, booking, active ride, and fallback states.

The central technical concept in the supplied updated matching engine and patent disclosure is vehicle-centric route insertion: test a new pickup and drop against a vehicle's current position and ordered remaining stops, reject routes that violate hard limits, then rank only feasible choices. This milestone visualises those concepts; backend enforcement comes later.

## 2. Source baseline and decisions

The supplied materials are the baseline:

- **Patent/Invention Disclosure:** vehicle-centric matching, moving/waiting/empty vehicle result sections, current-position route insertion, capacity derived from verified vehicle records, temporary seat holds, route-version checks, Women-Only eligibility before candidate generation, live tracking/SOS, fallback to a solo ride, and illustrative route-segment fare allocation.
- **Matching Engine Updated Design v2:** initial formation and active insertion as separate branches; spatial and cheap compatibility filters before detailed route work; legal pickup/drop insertion; hard constraints before scoring; deterministic tests and simulation.
- **Matching Engine v1:** retained as historical context only. Its two-passenger assumptions must not override the updated multi-passenger design.
- **SRS v1.0:** useful for user roles, booking, driver, safety and admin workflows. Subscription/Professional Mode, Convo Mode, rewards and food pickup are legacy scope unless the team explicitly re-approves them.
- **Hackathon deck and existing web project:** visual and flow reference. Preserve useful existing UI and code. Do not replace the project stack or rewrite the repository without first auditing it.

### Product decisions for this frontend milestone

| Decision | Frontend rule |
|---|---|
| Default booking | Instant ride; no compulsory group-forming wait |
| Pooling | Optional and dynamic; joining happens only when a feasible offer exists |
| Scheduled booking | Include as a secondary booking type if it is already present or can be added without delaying instant flow; it is not the main USP |
| Geography | Intra-city journeys; seed Jaipur locations for the demo |
| Women-Only | A strict request requirement, not a decorative filter |
| Solo fallback | Never silently disable Women-Only; never claim a pool was created when it was not |
| Subscription/Professional Mode | Excluded from current milestone |
| Convo/social, food ordering, reward programme | Excluded from current milestone |
| Pricing | Display illustrative estimates only; show that actual fare requires backend confirmation |
| Driver supply | Demo/simulated drivers only unless a real authorised backend is connected |

## 3. Goals and non-goals

### Goals

- Deliver a polished, responsive rider and driver web experience.
- Provide an integrated interactive map with pickup, destination, vehicle markers, route line, pickup/drop markers and map controls.
- Support the Instant, optional Scheduled, Solo/Pool preference and Women-Only requirement in the UI.
- Show moving pool rides, waiting pool rides and empty vehicles as separate result groups.
- Demonstrate a joining-passenger offer on an active trip, including an updated route/ETA/fare preview.
- Provide a usable driver interface for availability, incoming requests/offers, route impact, seat availability and trip status.
- Reuse existing components, routes and design assets where they are sound.
- Keep frontend service/data contracts sufficiently clear that a later FastAPI backend can replace mocks without redesigning every component.
- Make mock/demo states explicit and reproducible.

### Non-goals for this milestone

- No real production ride dispatch or matching worker.
- No production-grade route insertion algorithm in the browser.
- No actual payments, UPI transfers, driver settlements or stored wallet balance.
- No real KYC, RC/DL verification or identity proofing.
- No claim of verified Women-Only eligibility based only on a frontend form.
- No guaranteed background GPS tracking when a browser tab is closed.
- No production emergency response centre or guaranteed emergency SMS/call delivery.
- No ML model training or claims of AI-powered matching.
- No city-wide supply, production reliability, or commercial launch claims.

## 4. Users and roles

### Rider
Searches an intra-city journey, chooses pickup and destination, selects a ride preference, views available options, books a ride, follows the active trip, reviews any proposed pool addition, and sees a fare breakdown.

### Driver
Views a driver dashboard, enables or disables demo availability, sees incoming ride/insert offers, reviews extra distance/time and expected additional earnings, accepts/declines in the prototype, and sees route, passenger count and trip progress.

### Admin (lightweight/demo, optional P2)
Views demo trips, users/vehicles and flagged safety events. Do not build a full operations platform before the rider and driver journeys work.

## 5. Core product behaviour

### 5.1 Instant-first booking

1. Rider opens the home/map screen.
2. Pickup defaults to current browser location only after explicit permission; the rider can edit it.
3. Rider chooses a destination using search suggestions or map selection.
4. Rider chooses Instant (default) or Scheduled (secondary if included).
5. Rider can select Solo or Pool-enabled. Pool-enabled means the trip may be offered for sharing; it does not force the rider to wait.
6. Women-Only can be enabled where the user is eligible in the demo profile. When enabled, the interface must display the restriction in search/results and active ride.
7. The frontend displays an estimate and a clear maximum/estimated fare label.
8. The rider confirms. A mock driver/vehicle assignment is shown with a clear DEMO label.
9. The trip begins as a normal trip. No co-rider is required for departure.

### 5.2 Dynamic co-rider offer during a trip

1. During an active demo trip, a sample compatible request may become available.
2. The active rider sees a non-blocking notice that a potential passenger can join, with proposed pickup/drop, extra time, route change and revised fare.
3. The existing rider can view the impact and accept or decline where product policy allows. This user preference does not override system safety limits in a real backend.
4. Driver sees the same route impact and can accept/decline.
5. The UI updates only after the simulated acceptance sequence succeeds.
6. If no candidate is feasible, no co-rider prompt appears and the original ride continues.
7. If the driver declines or a hold expires, the offer is removed and the route/fare remain unchanged.

The UI must never imply that a passenger has joined merely because a card was displayed.

### 5.3 Result list ordering

Follow the supplied patent's presentation concept:

1. **Moving pool rides** — vehicles already travelling with a compatible remaining route and available seats.
2. **Waiting pool rides** — vehicles in an optional short formation/wait state.
3. **Available vehicles** — eligible empty vehicles for solo or pool-enabled start.

The result list must provide a useful empty/loading/error state and a normal ride path. Sections are sorted by real estimated pickup ETA and feasible route impact when a backend exists; in this frontend-only phase, deterministic mock values are clearly marked.

### 5.4 Intra-city / flexible pickup

- The demo city is Jaipur.
- Provide representative local test points such as university/campus gates, metro/railway/bus nodes, office/residential landmarks and common public meeting points.
- Let users select a pickup/drop by search and map click.
- A suggested nearby meeting point may be shown as an optional convenience, not silently substituted.
- Show walking distance to a suggested point if it is available in mock data.
- Avoid claiming every pin is a verified safe pickup location.

### 5.5 Women-Only requirement

- Use an explicit toggle with explanatory text.
- The selected requirement remains visible throughout the booking and trip screens.
- In demo mode, a verified demo profile and eligible vehicle fixture may be used, but the UI must say “Demo verification”.
- If no eligible match exists, show “No eligible Women-Only ride found yet” with wait/search-again or change-preference actions. Do not silently switch to a mixed ride.
- If the user chooses to turn off Women-Only, require an explicit action and explain that the search criteria will change.
- Do not expose the other passengers' names or personal contact/location details.

## 6. Frontend information architecture

Use the routes and naming style already present where sensible. The following is a logical target, not an instruction to create duplicate routes:

| Route/view | Purpose | Priority |
|---|---|---|
| Home / Rider dashboard | Search form + live map + trip mode controls | P0 |
| Pickup/destination selection | Search suggestions and map pin selection | P0 |
| Ride options | Moving, waiting and available vehicle cards | P0 |
| Booking confirmation | Fare, pickup, destination, ride preferences | P0 |
| Active trip | Live/demo map, route, ETA, trip status, SOS affordance | P0 |
| Pool offer preview | Extra pickup/drop, delay and fare change | P0 |
| Driver dashboard | Online state, current trip, incoming offers | P0 |
| Driver offer detail | Accept/decline, seats, route impact and earning preview | P0 |
| Profile / settings | Demo identity, role, preferences and emergency contacts | P1 |
| Driver vehicle registration | Vehicle details and document status (mock only) | P1 |
| Safety centre | Emergency contact setup and demo incident/report flow | P1 |
| Admin overview | Minimal demo activity table | P2 |

### Required navigation

- Clear rider/driver mode switch.
- Main navigation with Home/Find Ride, Trips, Safety and Profile as appropriate to the current role.
- Driver dashboard must not be mixed into the rider booking form.
- Mobile layout must prioritise map/search and a bottom sheet or stacked card panel.

## 7. Map experience requirements

### Map library

Inspect the existing repository first. If Leaflet is already installed and functioning, reuse it rather than changing map libraries. Use OpenStreetMap-compatible tiles only with required attribution and respect the tile provider's usage policy. The map component should be isolated behind a small adapter so tile/routing providers can change later.

### Map behaviours

- Render a real map centred on the selected city or user's permitted current location.
- Show pickup and destination markers with distinct shapes/labels.
- Draw a route polyline between pickup and destination. In this milestone the line may be supplied by deterministic demo geometry; do not describe it as a live optimised road route unless it is returned by a routing service.
- Render nearby demo vehicle markers, with a visible DEMO indicator/legend.
- On marker click, open a compact information card; do not expose passenger identities.
- Provide zoom in/out, locate-me, reset-view and clear-selection controls.
- Support map click to set or move pickup/destination only when the user has selected the relevant field.
- Show route stops and direction for active trips.
- On a pool offer, preview the additional pickup/drop and alternative route before the UI claims acceptance.
- Provide list/map view switching on small screens.
- Provide loading, permission-denied, unsupported-geolocation and map-load-failure states.
- If geolocation is denied, keep manual search fully usable.

### Location data and privacy

- Browser geolocation is opt-in and used only while the page is active for this prototype.
- Never send a user's real coordinates to a third party from client code without an explicit approved provider design.
- Never hardcode a home address or precise real-person location in fixtures.
- Never use random markers that look like genuine drivers without a DEMO label.
- Do not store continuous location history in browser local storage.

### Mapping service boundaries

Create a frontend `MapProvider`/`LocationService` abstraction for:

- address/landmark suggestions,
- coordinate-to-label display,
- route geometry and ETA estimate,
- optional current-position lookup.

For the prototype, use curated Jaipur suggestions and route fixtures. Do not build high-frequency autocomplete against a public geocoding endpoint with usage restrictions. Never put private API keys or unrestricted server credentials in browser code.

## 8. UX and visual design direction

The UI should feel like a calm, premium mobility product influenced by the clarity and simple information hierarchy of Uber, without copying its branding or exact screens.

### Required visual direction

- Strictly neutral palette: white, off-white, light grey, mid grey, charcoal and near-black.
- No purple, violet, neon, saturated gradients or punchy accent colours.
- Use black/charcoal for primary CTAs, white surfaces, subtle grey borders and subdued text.
- Use restrained shadows and generous whitespace.
- Use one coherent typography scale and a consistent spacing system.
- Rounded corners should be moderate and consistent; avoid excessive pill/card decoration.
- Use clear map labels and clean vehicle icons; avoid decorative clutter.
- Use monochrome icons with consistent stroke weight.
- SOS must remain visually obvious and accessible even in the monochrome system; use an unmistakable label, icon, strong contrast and confirmation step.
- Do not use colour alone to communicate status; include text and icons.

### Responsive behaviour

- Desktop: map and results panel can sit side-by-side.
- Tablet: adaptive split layout or collapsible panel.
- Mobile: full-width map with a bottom sheet/search panel and thumb-friendly controls.
- Avoid horizontal scrolling and clipped cards.

### Interaction details

- Make primary next action obvious.
- Show inline validation near the relevant field.
- Use skeletons or restrained loading states, not indefinite spinners.
- Confirm cancellation, turning off Women-Only, and rejecting a pool change where appropriate.
- Use toasts only for short, non-critical status; important trip changes belong in the active trip panel.

## 9. Reusable frontend components

Recommended reusable components (reuse existing equivalents where they exist):

- `AppShell`, `TopBar`, `SideNav` / `MobileNav`
- `RideSearchPanel`, `LocationSearchField`, `LocationSuggestionList`
- `RideModeSelector`, `PoolPreferenceToggle`, `WomenOnlyToggle`
- `RideMap`, `VehicleMarker`, `PickupMarker`, `DestinationMarker`, `RoutePolyline`, `MapControls`
- `RideResultsPanel`, `RideSection`, `RideOptionCard`
- `FareSummary`, `FareBreakdown`, `ETAChip`, `SeatAvailability`
- `BookingConfirmation`, `TripStatusHeader`, `ActiveTripPanel`
- `PoolJoinOfferCard`, `RouteChangePreview`
- `DriverAvailabilityToggle`, `DriverOfferCard`, `DriverTripPanel`, `EarningsSummary`
- `SafetyActionPanel`, `SOSButton`, `EmergencyContactCard`
- `EmptyState`, `ErrorState`, `LoadingSkeleton`, `DemoModeBadge`

Do not create all these as separate files automatically. Group components according to the existing project's conventions and avoid unnecessary fragmentation.

## 10. Frontend data contracts

Define explicit TypeScript types. Suggested minimum concepts:

```ts
type LatLng = { lat: number; lng: number };
type BookingMode = "INSTANT" | "SCHEDULED";
type PoolPreference = "SOLO" | "POOL_ENABLED";
type RideCategory = "MOVING_POOL" | "WAITING_POOL" | "EMPTY_VEHICLE";
type VehicleStatus = "IDLE" | "EN_ROUTE" | "ACTIVE_POOLING" | "POOLING_CLOSED";
type PassengerStatus = "REQUESTED" | "OFFERED" | "RESERVED" | "ONBOARD" | "DROPPED";
type WomenOnlyStatus = "OFF" | "REQUESTED" | "DEMO_VERIFIED";

interface RideSearchInput {
  pickup: LatLng;
  pickupLabel: string;
  destination: LatLng;
  destinationLabel: string;
  bookingMode: BookingMode;
  poolPreference: PoolPreference;
  womenOnly: boolean;
  scheduledAt?: string;
  seats: number;
}

interface RideOption {
  id: string;
  category: RideCategory;
  vehicleType: string;
  pickupEtaMinutes: number;
  estimatedFare: number;
  maximumFare?: number;
  availableSeats: number;
  onboardCount: number;
  extraDelayMinutes?: number;
  extraDistanceKm?: number;
  routePolyline?: LatLng[];
  demo: true;
}
```

Use discriminated unions and stricter types where useful. Do not trust frontend types as backend validation.

### Service layer

Keep components independent of fixture details. Suggested interface boundaries:

```ts
interface RideService {
  estimate(input: RideSearchInput): Promise<FareEstimate>;
  search(input: RideSearchInput): Promise<RideOption[]>;
  createBooking(input: RideSearchInput, optionId?: string): Promise<Booking>;
  getActiveTrip(tripId: string): Promise<Trip>;
  respondToPoolOffer(offerId: string, decision: "ACCEPT" | "DECLINE"): Promise<Trip>;
}

interface LocationService {
  suggest(query: string): Promise<LocationSuggestion[]>;
  getCurrentPosition(): Promise<LatLng>;
}
```

In the prototype, implement `MockRideService` and `MockLocationService`. Keep the same interface so later backend integration replaces the implementation, not every screen.

## 11. Demo data and simulation rules

- Use Jaipur coordinates and plausible demo landmarks.
- Use a fixed, seeded set of demo vehicles so screenshots and tests are repeatable.
- Every demo vehicle, driver, match, fare and location must be labelled as demo/sample in the UI where confusion is possible.
- A demo GPS simulation may move a vehicle along a predefined route while the active-trip screen is open.
- Provide a pause/reset control for the simulation in development mode.
- Do not claim a demo vehicle is a real nearby driver.
- Do not claim that the UI performs production route insertion. It may show a backend-ready mock response representing a feasible insertion.
- Use deterministic scenarios for: no matches, one moving match, waiting match, full vehicle, Women-Only no-match, offer declined, offer accepted and stale location.

## 12. State and interaction model

Use one coherent source of truth for booking/trip state. Prefer the existing state-management approach if it is already established; otherwise use React state/context or a lightweight store appropriate to the project size.

Required UI states:

- idle,
- editing pickup/destination,
- estimating,
- searching,
- results available,
- no results,
- booking pending,
- driver assigned,
- active trip,
- pool offer received,
- pool offer accepted,
- pool offer declined/expired,
- trip completed,
- request cancelled,
- map/geolocation error.

State transitions must be explicit. A visual state update must follow a successful mock service response; do not update the UI optimistically into a completed state without handling failure.

## 13. Accessibility and quality requirements

- Keyboard-accessible forms, toggles, menus and modal dialogs.
- Visible focus state.
- Proper labels and accessible names for map controls.
- Do not communicate status with colour only.
- Adequate contrast for text and controls.
- Respect reduced-motion preferences.
- Avoid map-only workflows: all key selection tasks need a searchable/list-based alternative.
- Add useful empty, loading, validation and error states.
- Avoid layout shift while the map loads.

## 14. Acceptance criteria

The frontend milestone is complete only when all P0 criteria pass:

1. The app starts locally using the repository's documented command.
2. Rider can select/edit pickup and destination by text and map interaction.
3. Geolocation permission is optional; manual selection still works when denied.
4. Map displays route geometry and a clearly labelled set of Jaipur demo vehicles.
5. Instant is the default booking type; no forced initial waiting is shown.
6. Rider can choose Solo or Pool-enabled.
7. Women-Only selection remains visible and is never silently removed during fallback.
8. Result list shows moving, waiting and empty vehicle groupings with deterministic demo content.
9. Rider can view a fare/ETA estimate and reach a booking confirmation state.
10. Active trip screen displays route, driver/vehicle demo details, status and location simulation.
11. A simulated pool offer shows proposed pickup/drop, delay and fare impact before acceptance.
12. Driver view can toggle demo availability and accept/decline an incoming offer.
13. UI updates are consistent across rider and driver demo views where the app architecture supports shared state.
14. No fake payment, KYC, production dispatch or real-time matching claims are made.
15. Desktop, tablet and mobile layouts work without horizontal overflow.
16. Build, lint and available tests pass; changed core flows have basic component/service tests.

## 15. Implementation sequence

Work in small, reviewable chunks. Complete and verify each before starting the next:

1. Read-only repository audit; identify current stack and preserve working code.
2. App shell, route inventory, neutral design tokens and responsive layout.
3. Map foundation, Jaipur demo locations, pickup/drop selection and map controls.
4. Rider search form and booking mode/pool/Women-Only controls.
5. Mock ride discovery and moving/waiting/empty result cards.
6. Booking confirmation and active trip screen.
7. Pool-join offer and route/fare preview.
8. Driver dashboard, availability and offer interaction.
9. Profile/vehicle/safety UI and SOS demo interaction.
10. Responsive polish, accessibility, loading/error/empty states and regression checks.

Do not proceed to backend implementation, real payments or ML during these chunks.

## 16. Definition of done

A feature is done only when the user journey works from the UI, loading/error/empty states exist, the layout is responsive, data comes through a service abstraction rather than embedded fixture logic in components, and the project builds without introducing unrelated regressions. The team must be able to tell a reviewer exactly which parts are interactive demo simulations and which parts are connected to a real provider.

## 17. Reference links and source files

- Existing frontend (link referenced in the hackathon deck): https://atharv751.github.io/Pool-Mate/
- Public repository referenced by the team: https://github.com/Atharv751/Pool-Mate
- Supplied `PoolMate_Matching_Engine_Updated_Dynamic_v3_.pdf` — algorithmic baseline.
- Supplied `PoolMate_Matching_Engine_Final_Design(4).pdf` — historical v1 context.
- Supplied `OurPoolMate_Patent_Invention_Disclosure (1).docx` and duplicate disclosure — detailed product/route/fare concept.
- Supplied `Pool_Mate_SRS (1).docx` — functional and nonfunctional baseline; legacy features must be reconciled.
- Supplied `TEAM CYPHERS - POOL MATE - BUILD WITH INDIA (HACKATHON) (2).pptx` — original product pitch and frontend link.

**Important:** This PRD defines the current frontend milestone. It is not a legal opinion, production safety certification, or evidence of deployed matching performance.


## Local development workflow
This project is being built directly in VS Code with Claude Code and a Claude Pro account. Git is not part of the required workflow. Do not require Git installation, Git commands, branches, commits, pushes, or pull requests. Claude Code should edit the currently opened local folder directly. Before risky multi-file changes, create a local backup of only the affected files under `backups/`; never back up `node_modules`, build output, caches, or secrets.
