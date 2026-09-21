# Art Mode Slideshow

Web app that shows public-domain artwork fullscreen with slow crossfade
transitions, simulating the Samsung The Frame "Art Mode" on a regular
TV. Runs as a Docker container on a home server and is displayed via an
Android TV box browser in kiosk mode (no mouse/keyboard interaction).

## Status

MVP implemented: Express backend, static frontend, Docker setup below.
Not yet deployed to the home server.

## Deployment target

- Any machine with Docker.
- Container name: `art-mode-slideshow_web`.
- HTTP port: `8095` (host) mapped to the app's internal port.
- Image cache: bind mount `./cache:/app/cache`, a relative path that
  resolves under wherever this repo is cloned, no manual path setup
  needed.
- Settings persistence: bind mount `./data:/app/data`, same pattern as
  the cache mount above, holding `settings.json`.
- Docker network: none shared, Compose creates its own default network
  (`art-mode-slideshow_default`).
- Display device: an Android TV box, browser in kiosk mode pointed at
  the server's local IP and port.

## Planned stack

- Frontend: vanilla HTML/CSS/JS, no framework, single fullscreen page,
  no visible controls.
- Backend: Node.js/Express, minimal proxy toward museum APIs plus local
  image cache management.

## Planned MVP features

- Fullscreen slideshow with configurable crossfade (default 3s) and
  per-image display time (default 15 minutes).
- Image sources: Art Institute of Chicago API and Metropolitan Museum
  of Art API (both public, no API key required, public-domain works
  only). Rijksmuseum is a possible future addition, but it requires an
  API key, so it's out of the MVP for now.
- Optional local folder mode (`LOCAL_IMAGES_PATH`) to show personal
  photos instead of museum artwork.
- Letterboxed centering (`object-fit: contain`, black background) so
  images never get distorted regardless of TV aspect ratio.
- Local disk cache of downloaded images plus a small JSON index, so the
  same artwork isn't re-fetched repeatedly and the slideshow keeps
  working temporarily if the museum APIs are unreachable.
- A source whose image downloads keep failing is skipped for 15 minutes
  and shown as paused in the status panel, then retried automatically.
- Environment variables set the defaults on first boot
  (`SLIDE_INTERVAL_MINUTES`, `CROSSFADE_SECONDS`, `IMAGE_SOURCES`,
  `SHAPE_FILTERS`, `CACHE_MAX_AGE_DAYS`, `CACHE_MAX_SIZE_MB`,
  `LOCAL_IMAGES_PATH`, `CACHE_DIR`, `DATA_DIR`, `PORT`); the `/settings`
  panel below overrides them at runtime,
  persisted to `settings.json`, without touching Docker or restarting
  the container.

## Settings panel

`/settings` is a small unauthenticated form (reachable from any device
on the same local network, e.g. a phone) to change, without a restart:
slide interval, crossfade duration, which museum sources are enabled,
which image shape bands are allowed (checkboxes: Vertical, Square,
Rectangular, Panoramic, or an "Any" shortcut that checks all four - a
downloaded image passes if its real width/height ratio falls into any
selected band), an artist/culture filter and a region/origin filter
(both apply to AIC and Met; each accepts several `;`-separated values,
e.g. `Monet;Rembrandt`, one picked at random on every fetch), a subject
filter (checkboxes: Landscapes, Portraits, Still life, Religious, War,
Animals, Flowers, Children, Interiors, Nudes, Sea and boats, Architecture,
Everyday life, Mythology; with several selected, a work from any of them
is shown, and nothing selected means no subject filter), an art movement filter (Impressionism,
Baroque, Realism and so on; same rules, but only the Art Institute of
Chicago has a searchable movement field, so the Met is skipped while a
movement is selected), and the caption overlay (on/off, fixed or fade-after-delay, position). `/` (the
kiosk page) re-polls its config every cycle, so a change made in the
panel takes effect starting the next image, no manual reload needed on
the TV. Settings are written to
`data/settings.json` (bind-mounted, see above) and survive a container
restart; environment variables only supply the defaults the very first
time, before that file exists.

## Build and run

```
docker compose build
docker compose up -d
```

The app listens on host port `8095` (mapped from the container's
internal `3000`). Point the Android TV box's kiosk browser at
`http://<server-ip>:8095`.

For local development without Docker: `npm install && npm start`
(requires Node 18+ for global `fetch`).

## Environment variables

| Variable                  | Default    | Meaning                                                          |
|----------------------------|------------|-------------------------------------------------------------------|
| `PORT`                     | `3000`     | Internal port the Express server listens on.                     |
| `SLIDE_INTERVAL_MINUTES`   | `15`       | Minutes between each crossfade to a new artwork.                 |
| `CROSSFADE_SECONDS`        | `3`        | Duration of the CSS opacity crossfade transition.                |
| `IMAGE_SOURCES`            | `aic,met`  | Comma-separated list of enabled museum sources.                  |
| `SHAPE_FILTERS`            | `square,rectangular,panoramic` | Comma-separated list of allowed shape bands by real width/height ratio: `vertical` (< 1.0), `square` (1.0-1.3), `rectangular` (1.3-1.6), `panoramic` (>= 1.6). The default excludes `vertical` - portrait images aren't wanted on a TV. |
| `CACHE_MAX_AGE_DAYS`       | (unset)    | If set, removes any cache entry (and its image file) older than this many days. Disabled by default - cache grows forever unless opted in. Checked opportunistically right after each fresh download. |
| `CACHE_MAX_SIZE_MB`        | (unset)    | If set, keeps total cache size under this cap, evicting the oldest entries first. Disabled by default. Checked opportunistically right after each fresh download. |
| `CATEGORIES`               | (unset)    | Comma-separated subject categories an artwork must belong to (any one of them): `landscape`, `portrait`, `stillLife`, `religious`, `war`, `animals`, `flowers`, `children`, `interiors`, `nudes`, `seaAndBoats`, `architecture`, `everydayLife`, `mythology`. Unset means no subject filter. A source with no terms for the selected categories is skipped, not fetched unfiltered. |
| `MOVEMENTS`                | (unset)    | Comma-separated art movement keys (any one of them), for example `impressionism,postImpressionism`; the full list is in `src/sources/movements.js`. AIC only: while set, the Met is skipped. Unset means no movement filter. |
| `LOCAL_IMAGES_PATH`        | (unset)    | If set, serves images from this folder instead of the museum APIs (needs its own bind mount in `docker-compose.yml`). |
| `CACHE_DIR`                | `./cache`  | Folder where downloaded images and `index.json` are stored.      |
| `DATA_DIR`                 | `./data`   | Folder where `settings.json` (written by the `/settings` panel) is stored. |

## Phase 2 (not blocking for MVP)

- Endpoint to manually exclude artworks from the rotation.
- Explicit toggle for local-folder-only mode.
- Hook for a future ambient light sensor (e.g. ESP32) to adjust page
  brightness/contrast via an API call.

## License

MIT licensed, see [LICENSE](./LICENSE).
