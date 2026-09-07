# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

# Lyric Language Lab

A small language-learning app for understanding Indonesian, English, and Japanese lyrics. It does not play, scrape, or permanently store lyrics: the user pastes text, chooses languages, and receives a structured lesson.

## Stack

- React + TypeScript + Vite
- Express + TypeScript API server
- OpenAI structured JSON response
- Lucide icons

## Run locally

1. Install Node.js 20 or newer.
2. Install dependencies:

  ```bash
  npm install
  ```

3. Create a local environment file:

  ```powershell
  Copy-Item .env.example .env
  ```

4. Open `.env` and set `BITDEER_BASE_URL`, `BITDEER_MODEL_ID`, and `BITDEER_API_KEY`. The key is read only by the backend and is never bundled into the frontend.
5. Start the frontend and API together:

  ```bash
  npm run dev
  ```

  Open `http://localhost:5173`.

## Use the app

Choose a source and target language, paste your own lyrics, then select **Analyze lyrics**. The lesson includes line-by-line literal and natural translations, meaning and context, vocabulary, language notes, Japanese details when relevant, a learning summary, and a quiz with answer feedback.

Use **Try a sample** to test the interface without preparing text. Use the sun/moon button to switch themes.

## Checks

```bash
npm run build
npm run lint
```

The API rejects empty lyrics, identical languages, requests over 12,000 characters, missing configuration, and malformed AI responses. Lyrics are held in memory for the request only.

## Structure

```text
src/App.tsx       React lesson workflow and quiz UI
src/App.css       Responsive visual design
server/index.ts   Secure OpenAI API route
.env.example      Required environment variable template
vite.config.ts    Local /api proxy
```
