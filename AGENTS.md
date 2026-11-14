# AI Agent Guidelines — Mantine UI (`client/`)

These rules are mandatory for every UI task in `client/`.

## 1. Verified Project Stack (`client/package.json`)

- **UI Core & Hooks**: `@mantine/core` `9.8.0`, `@mantine/hooks` `9.8.0`
- **Framework & Routing**: `react` `^19.2.0`, `react-router-dom` `^7.9.4`
- **Styling Toolchain**: `postcss-preset-mantine` `1.18.0`, `postcss-simple-vars` (`$mantine-breakpoint-xs`..`xl` in `client/postcss.config.cjs`), `stylelint`
- **Build, Lint, Format & Test**: `vite-plus` (`vp`), `oxc-config-mantine`, `vitest`, `@storybook/react-vite`, `yarn@4.18.1`
- **Not pre-installed**: `@mantine/form`, `@mantine/notifications`, `@mantine/modals`, `@mantine/dates`, `@tabler/icons-react`, `@phosphor-icons/react`. Always inspect `client/package.json` before importing an extension package; run `yarn add` in `client/` only when a feature needs it.

## 2. Official Documentation Lookup Protocol

Never guess Mantine v9 APIs or copy deprecated v6/v7/v8 patterns. Always check:

1. **API, Props, Hooks, Form, Theme & Styles (`v9`)**: Look up `https://mantine.dev/`
   - Core components: `https://mantine.dev/core/package/` (and `/core/<component>/`)
   - Hooks: `https://mantine.dev/hooks/package/` (and `/hooks/<hook>/`)
   - Forms & validation: `https://mantine.dev/form/use-form/`
   - Styling, PostCSS & Styles API: `https://mantine.dev/styles/mantine-styles/`, `/styles/postcss-preset/`, `/styles/styles-api/`
   - Theming & color schemes: `https://mantine.dev/theming/theme-object/`, `/theming/color-schemes/`
2. **Prebuilt UI Blocks & Layouts**: Look up `https://ui.mantine.dev/`
   - Browse `Application UI` (Navbars, Headers, Footers, Inputs, Cards, Stats, Tables, Dropzones), `Page Sections` (Hero, Features, Banners, Pricing, FAQs, Contact), and `Blog` before designing sections from scratch.
   - **Mandatory snippet adaptation**: Never paste `ui.mantine.dev` code verbatim without checking:
     - Install any missing dependencies (such as an icon package) or swap to what is installed.
     - Replace any raw HTML or non-semantic tags with Mantine equivalents per Section 3.
     - Convert any raw `px` spacing/font values in CSS Modules to `rem()` / `--mantine-*` tokens and keep CSS in `*.module.css`.

## 3. Strict UI Rules (Zero-Tolerance)

1. **Maximize Mantine UI**: Use `@mantine/core` and `@mantine/hooks` first. Do not add third-party UI libraries when Mantine covers the requirement.
2. **Build custom components on Mantine primitives**: When Mantine lacks a specialized widget, compose it from Mantine elements (`Box`, `Paper`, `UnstyledButton`, `Group`, `Stack`, `Input.Wrapper`, `InputBase`, polymorphic `component="..."`, `createPolymorphicComponent`) so it inherits theme tokens, style props, and Styles API.
3. **No raw HTML elements**: Never write raw `<div>`, `<span>`, `<p>`, `<h1>`-`<h6>`, `<button>`, `<a>`, `<form>`, `<input>`, `<select>`, `<textarea>`, `<ul>`, `<ol>`, `<li>`, `<table>`, `<hr>`, `<img>`, or inline `<svg>` in JSX when Mantine provides an equivalent (`Box`/`Stack`/`Group`/`Paper`, `Text`, `Title`, `Button`/`ActionIcon`/`UnstyledButton`/`CloseButton`, `Anchor`, `<Box component="form">`, `TextInput`/`Select`/`Textarea`, `List`, `Table`, `Divider`, `Image`/`Avatar`, icon library).
4. **No non-semantic elements**:
   - Never attach `onClick` to `<Box>`, `<Paper>`, or `<Text>` instead of `<Button>`, `<UnstyledButton>`, or `<Anchor>`.
   - Preserve semantic landmarks via polymorphic `component` (`<Box component="main"|"section"|"article"|"nav"|"header"|"footer">` or `AppShell.*`), sequential `<Title order={1..6}>`, and `aria-label` on icon-only buttons (`ActionIcon`, `CloseButton`).
   - Rare technical DOM mount containers (e.g., third-party canvas/map/chart ref) must use `<Box ref={...} />` with a 1-line comment explaining why.
5. **No competing styling frameworks**: Do not install Tailwind CSS, `styled-components`, Emotion, or similar CSS-in-JS libraries.
6. **No hardcoded `px` for font sizes or spacing**: Use Mantine theme scale (`xs`–`xl`), CSS variables (`--mantine-spacing-*`, `--mantine-font-size-*`, `--mantine-radius-*`), PostCSS `rem()` / `em()`, or Mantine numeric props (auto-converted to `rem`). Never hardcode string/CSS `px` for typography, padding, margin, gap, or radius (only `1px` hairline borders or fixed media dimensions are allowed).

## 4. Testing & Verification (`client/`)

- Import `{ render, screen, userEvent }` from `@test-utils` (`client/test-utils/render.tsx`), never `render` directly from `@testing-library/react`.
- Keep `@mantine/core/styles.css` imported first in `client/src/App.tsx`, followed by extension stylesheets, then `*.module.css`.
- After UI changes, run inside `client/`:
  - `yarn check` (typecheck + `oxlint` + `oxfmt`)
  - `yarn stylelint`
  - `yarn vitest`
  - `yarn build` (or run all via `yarn test`)

## 5. Project Documentation

Read [docs/mantine/README.md](./docs/mantine/README.md) for the Vietnamese lookup map, strict rule examples, and setup/form/hook/testing patterns.
