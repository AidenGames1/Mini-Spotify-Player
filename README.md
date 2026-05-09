# Curvele Spotify Player

A lightweight Spotify playlist player for GitHub Pages.

## Setup

1. Go to the Spotify Developer Dashboard.
2. Create an app.
3. Add this Redirect URI:

```txt
https://player.curvele.cc/
```

4. Copy your Spotify Client ID.
5. Open `app.js`.
6. Replace:

```js
const CLIENT_ID = "PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE";
```

with your real Client ID.

Do not add a Client Secret. This is a public static website.

## Upload to GitHub Pages

Upload these files to your GitHub repository:

- `index.html`
- `style.css`
- `app.js`

Then open:

```txt
https://player.curvele.cc/
```

## Notes

- Full browser playback requires Spotify Premium.
- The first login may show a Spotify permission screen.
- If playback does not start, open Spotify normally once, then try the site again.
