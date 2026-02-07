# Navigation

## Choice: Expo Router (file-based tabs)

We use **Expo Router** with a single tab navigator for the three main screens. No extra navigation library.

- **Why tabs:** Home, Practice, and Progress are equal top-level sections; switching between them is common. Tabs make that obvious and one-tap.
- **Why Expo Router:** It’s already in the stack, uses the file system for routes (`app/(tabs)/home.tsx` → Home), and works for web and native. No React Navigation setup or separate config.
- **Tradeoff:** For deeper flows (e.g. “Rudiment detail” or “Session summary”) we’d add a stack inside a tab or extra routes; for this layout, tabs are enough.

## Structure

```
app/
  (tabs)/
    _layout.tsx   → Tab navigator (Home | Practice | Progress)
    home.tsx      → Route: Home screen
    practice.tsx  → Route: Practice screen
    progress.tsx  → Route: Progress screen
```

Each route file only wires data and callbacks; the actual UI lives in `components/screens/` so screens stay presentational and logic stays in hooks or lib.
