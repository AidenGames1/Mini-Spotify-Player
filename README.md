# Curvele Spotify Player

This version supports two auth methods:

1. Normal Spotify login with PKCE.
2. Manual temporary access token paste.

## Normal login setup

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

Do not add a Client Secret to this public site.

## Manual token setup

On the webpage, paste only the token part.

Example:

```txt
Authorization: Bearer ABC123
```

Paste only:

```txt
ABC123
```

The page also tries to clean it if you accidentally paste `Bearer ABC123`.

Manual tokens expire quickly. When it stops working, paste a fresh token.

## Upload to GitHub Pages

Upload:

- `index.html`
- `style.css`
- `app.js`

to the GitHub Pages repo for `player.curvele.cc`.

## Notes

- Full browser playback requires Spotify Premium.
- Manual tokens should not be committed to GitHub.
- The token is stored only in this browser's localStorage.
