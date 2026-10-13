# ScrapBook

A collage of aesthetics: 26 single-screen "channels", each its own world, on one dial.
Next.js 16, React 19, Bun.

## Run it

```bash
bun install
bun run dev        # http://localhost:3000
bun run check      # typecheck + lint
```

## Images

Pages ask for an image by slot, never by filename (`lib/assets.ts`, `lib/asset-manifest.json`).

- `raw/` — originals. Local only, gitignored.
- `public/dev-assets/` — processed WebP. Local only, gitignored. This is what `bun run dev` shows.
- Cloudflare R2, bucket `markc-assets`, prefix `scrapbook/` — what production shows, through same-origin `/media/...` paths.

After adding or changing images:

```bash
node scripts/images/process.mjs <channel>   # raw -> WebP + manifest
node scripts/r2/upload.mjs --confirm        # WebP -> bucket (needs .env.local keys)
node scripts/r2/verify.mjs                  # bucket has everything the manifest lists
```

Upload before pushing, or production will ask for files the bucket does not have.

## Deploy

Import the repo in Vercel. Nothing to configure: `vercel.json` sets the install and build
commands, and `.env.production` (public values only) points production at the bucket.
The R2 keys in `.env.local` are for the upload scripts and are never needed by the site.

To check a production build locally:

```bash
bun run build && bunx next start -p 3001
node scripts/prodcheck.mjs 3001
```
