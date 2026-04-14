# Riso Simulator

A web-based Risograph print studio. Compose multi-layer prints using authentic Riso ink colors, paper stocks, geometric shapes, text, and uploaded images — then download your result or submit it to the collection.

## Features

- **Paper selection** — 9 paper stock colors (White, Cream, Natural, Newsprint, Kraft, and more)
- **PNG upload** — upload any PNG and convert it to a single Riso ink color using luminance-based colorization
- **Geometric shapes** — Rectangle, Circle, Triangle, Line; all draggable and resizable
- **Text tool** — 6 typefaces (Space Mono, Playfair Display, Bebas Neue, DM Serif Display, Inter, Courier Prime), adjustable font size
- **13 Riso ink colors** — authentic color palette: Black, Medium Blue, Bright Red, Fluoro Pink, Yellow, Orange, Kelly Green, Sunflower, Aqua, Mint, Orchid, Teal, Hunter Green
- **Multiply blend mode** — authentic ink overprinting when layers overlap
- **Grain overlay** — SVG noise texture simulates press grain
- **Layer panel** — reorder, toggle visibility, and delete layers
- **Download** — export your print as a PNG
- **Submit** — upload your design to a Firebase collection

## Stack

- React 18 + Vite 8
- Fabric.js 7 (canvas engine)
- Tailwind CSS 4
- Firebase (Firestore + Storage)

## Getting Started

```bash
npm install
npm run dev
```

## Firebase Setup (for Submit feature)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore** and **Storage** in your project
3. Copy `.env.example` to `.env` and fill in your Firebase config values:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

4. In Firebase Storage rules, allow writes (or restrict to authenticated users):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /submissions/{file} {
      allow read, write: if true;
    }
  }
}
```

5. In Firestore rules, allow writes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{doc} {
      allow read, write: if true;
    }
  }
}
```

The app works fully without Firebase configured — the Submit button will show a warning but everything else functions normally.

## Build

```bash
npm run build
```
