---
name: tina-exhibition-ui
description: Design, implement, or review TINA medicine exhibition interfaces, UI variants, exhibit configuration, demo medicine presentation, QR-first mobile flows, or the water-drop assistant. Use for this repository's frontend exhibition experience; do not activate for backend-only API or infrastructure work that has no user-facing effect.
---

# TINA Exhibition UI

Build a QR-first exhibition interface in which a visitor understands the current sample quickly and reaches contextual help only through TINA's water-drop character.

## Read before changing UI

Read:

1. `PRODUCT.md`.
2. `frontend/src/config/exhibit-ui.json` and its schema when present.
3. `backend/data/medicines.json` or the current canonical Demo source.
4. The shared medicine loader/session code and `frontend/public/widget/water-drop.js`.

Treat existing rendered styling as evidence, not authority, when the request is a redesign. Preserve the product and interaction invariants below.

## Product invariants

- The visitor arrives from an item QR code at `/medicine/:id`; do not add a product-selection home page or an in-page scanner.
- The water drop is the only Agent chat entry. Do not add a standalone chat route, duplicated AI button, or secondary floating launcher.
- Medicine fetching, field interpretation, session persistence, chat transport, and widget loading stay shared across variants.
- Mobile scan usage is primary. Verify 320 px, a representative modern phone width, and desktop without horizontal overflow.
- Medicine detail must remain readable if chat-session initialization or the LLM is unavailable.
- All authored medicine content remains explicitly synthetic Demo material and must not masquerade as medical advice or a real approval claim.

## Configuration contract

Keep medicine facts separate from presentation decisions. UI configuration may control:

- `variant`: the visual and interaction direction.
- `visible`: whether a supported field or section is rendered.
- `priority` and `order`: its information hierarchy.
- `presentation`: the component treatment, such as hero, quick fact, warning, narrative, or metadata.
- `interactionRole`: whether the item is static information, progressive disclosure, or a TINA prompt source.

Validate the JSON against `frontend/src/config/exhibit-ui.schema.json` when it exists. Do not store dosage facts, claims, manufacturer facts, or other medicine-domain content in the UI config.

## Variant quality

Candidate variants must change information architecture, composition, typography, spatial rhythm, assistant prominence, and interaction—not merely color tokens. A comparison route must allow the same medicine to be viewed in every variant so content preference is not confused with design preference.

Use the installed `ui-ux-pro-max` Skill for a new design system when available. Use `impeccable` critique, audit, and polish at the finishing stage when available. Project constraints in this Skill take precedence over generic aesthetic recommendations.

## Water-drop character

Preserve Shadow DOM isolation, click-to-open, drag behavior, session context, placement logic, keyboard close, and mobile safe areas. Model explicit states when relevant: `idle`, `hover`, `pressed`, `dragging`, `opening`, `thinking`, `answering`, `success`, `error`, and `sleep`.

Motion must explain state or acknowledge input. Use transform/opacity-based motion, keep content usable without animation, and implement `prefers-reduced-motion` behavior. The character should feel expressive and premium, never mechanically bouncy or cartoonishly excessive.

## Finish checks

- Build and type-check the frontend; run backend tests when domain data or API schemas changed.
- Confirm direct links, reload behavior on the deployment target, invalid medicine handling, and default redirects.
- Verify content order follows config, Demo labeling remains visible, and no redundant Agent or scan entry exists.
- Inspect keyboard focus, dialog semantics, 44 px touch targets, contrast, text wrapping, safe areas, reduced motion, and slow/error states.
- Compare all variants with the same medicine before declaring them meaningfully distinct.
