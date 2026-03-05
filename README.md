# The PATH Pilot

Expo app for PATH navigation, with an AI-powered "I'm Lost" flow backed by a Node proxy.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Set at least:

- `OPENAI_API_KEY`

4. Start app + proxy together:

```bash
npm run dev
```

This starts:

- Expo app (`npm run start`)
- Vision proxy (`npm run server`)

## Use the app anywhere (not just on your home Wi-Fi)

Run the proxy on a public HTTPS URL, then point the app to it.

### Option A: Render (template included)

1. Create a new Render Blueprint service from this repo (`render.yaml` is included).
2. Set env vars in Render:
- `OPENAI_API_KEY` (required)
- `OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)
- `OPENAI_VISION_MODEL` (default: `gpt-4o-mini`)
- `PROXY_SHARED_SECRET` (required for public deployment security)
3. Copy your Render service URL (example: `https://path-pilot-proxy.onrender.com`).
4. In local `.env` for Expo, set:
- `EXPO_PUBLIC_API_BASE_URL=https://path-pilot-proxy.onrender.com`
- `EXPO_PUBLIC_PROXY_SHARED_SECRET=<same value as PROXY_SHARED_SECRET>`
5. Restart Expo with cache clear:

```bash
npx expo start -c
```

Now the app can call the proxy from any network.

## Environment variables

Server:

- `PORT` optional, defaults to `8787`
- `OPENAI_API_KEY` required
- `OPENAI_BASE_URL` optional
- `OPENAI_VISION_MODEL` optional
- `PROXY_SHARED_SECRET` optional but strongly recommended for public URLs

Expo app:

- `EXPO_PUBLIC_API_BASE_URL` optional. If unset, the app tries local dev host detection.
- `EXPO_PUBLIC_PROXY_SHARED_SECRET` optional. Should match `PROXY_SHARED_SECRET` when auth is enabled.

## Security notes

- Never put `OPENAI_API_KEY` in client code or Expo public env vars.
- If the key was ever exposed, rotate it immediately.
- Keep `PROXY_SHARED_SECRET` set when proxy is publicly reachable.
