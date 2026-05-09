/*
  Curvele Spotify Player
  1. Make a Spotify app at https://developer.spotify.com/dashboard
  2. Add this Redirect URI in Spotify Dashboard:
     https://player.curvele.cc/
  3. Paste your Client ID below.
  4. Do NOT paste a Client Secret into a public GitHub Pages site.
*/

const CLIENT_ID = "PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE";
const REDIRECT_URI = "https://player.curvele.cc/";

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-playback-state",
  "user-modify-playback-state"
];

let accessToken = null;
let player = null;
let deviceId = null;
let isPaused = true;

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const playlistGrid = document.getElementById("playlistGrid");
const statusBox = document.getElementById("statusBox");
const userInfo = document.getElementById("userInfo");
const deviceStatus = document.getElementById("deviceStatus");
const dot = document.querySelector(".dot");

const trackName = document.getElementById("trackName");
const artistName = document.getElementById("artistName");
const albumArt = document.getElementById("albumArt");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const playPauseBtn = document.getElementById("playPauseBtn");

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.style.color = isError ? "#ffb3b3" : "";
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function generateRandomString(length = 64) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map(x => possible[x % possible.length]).join("");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest("SHA-256", data);
}

async function login() {
  if (!CLIENT_ID || CLIENT_ID.includes("PASTE_YOUR")) {
    setStatus("Add your Spotify Client ID in app.js first.", true);
    return;
  }

  const verifier = generateRandomString();
  const challenge = base64UrlEncode(await sha256(verifier));

  localStorage.setItem("spotify_code_verifier", verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge,
    redirect_uri: REDIRECT_URI
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const verifier = localStorage.getItem("spotify_code_verifier");

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error("Could not get Spotify access token.");
  }

  const data = await response.json();
  localStorage.setItem("spotify_access_token", data.access_token);

  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
  }

  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem("spotify_expires_at", String(expiresAt));

  return data.access_token;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (!refreshToken) return null;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) return null;

  const data = await response.json();
  localStorage.setItem("spotify_access_token", data.access_token);

  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
  }

  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem("spotify_expires_at", String(expiresAt));

  return data.access_token;
}

async function getValidToken() {
  const storedToken = localStorage.getItem("spotify_access_token");
  const expiresAt = Number(localStorage.getItem("spotify_expires_at") || 0);

  if (storedToken && Date.now() < expiresAt - 60000) {
    return storedToken;
  }

  return await refreshAccessToken();
}

async function spotifyFetch(url, options = {}) {
  const token = await getValidToken();
  if (!token) throw new Error("Not logged in.");

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify API error: ${response.status} ${text}`);
  }

  if (response.status === 204) return null;
  return await response.json();
}

async function loadProfile() {
  const profile = await spotifyFetch("https://api.spotify.com/v1/me");
  userInfo.textContent = profile.display_name ? `Logged in as ${profile.display_name}` : "Logged in";
}

async function loadPlaylists() {
  playlistGrid.innerHTML = "";
  setStatus("Loading playlists...");

  let url = "https://api.spotify.com/v1/me/playlists?limit=50";
  const playlists = [];

  while (url) {
    const data = await spotifyFetch(url);
    playlists.push(...data.items);
    url = data.next;
  }

  if (!playlists.length) {
    setStatus("No playlists found.");
    return;
  }

  for (const playlist of playlists) {
    const card = document.createElement("button");
    card.className = "playlist";

    const imageUrl = playlist.images?.[0]?.url || "";
    card.innerHTML = `
      ${imageUrl ? `<img src="${imageUrl}" alt="">` : `<div class="blank-cover"></div>`}
      <p class="playlist-title">${escapeHtml(playlist.name)}</p>
      <p class="small">${playlist.tracks.total} tracks</p>
    `;

    card.addEventListener("click", () => playPlaylist(playlist.uri, playlist.name));
    playlistGrid.appendChild(card);
  }

  setStatus(`Loaded ${playlists.length} playlists. Choose one to play.`);
}

async function transferPlaybackHere() {
  if (!deviceId) {
    setStatus("Spotify browser device is not ready yet.", true);
    return false;
  }

  await spotifyFetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_ids: [deviceId],
      play: false
    })
  });

  return true;
}

async function playPlaylist(contextUri, playlistName) {
  try {
    const ready = await transferPlaybackHere();
    if (!ready) return;

    await spotifyFetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context_uri: contextUri })
    });

    setStatus(`Playing: ${playlistName}`);
  } catch (error) {
    console.error(error);
    setStatus("Could not start playback. Make sure you have Spotify Premium and no ad blocker is blocking Spotify.", true);
  }
}

window.onSpotifyWebPlaybackSDKReady = async () => {
  accessToken = await getValidToken();
  if (!accessToken) return;

  player = new Spotify.Player({
    name: "Curvele Web Player",
    getOAuthToken: async cb => {
      const token = await getValidToken();
      cb(token);
    },
    volume: 0.7
  });

  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    deviceStatus.textContent = "Spotify browser device ready";
    dot.classList.add("ready");
    setStatus("Ready. Pick a playlist.");
  });

  player.addListener("not_ready", ({ device_id }) => {
    if (deviceId === device_id) deviceId = null;
    deviceStatus.textContent = "Spotify browser device disconnected";
    dot.classList.remove("ready");
  });

  player.addListener("player_state_changed", state => {
    if (!state) return;

    isPaused = state.paused;
    playPauseBtn.textContent = isPaused ? "▶" : "⏸";

    const current = state.track_window.current_track;
    trackName.textContent = current?.name || "Nothing yet";
    artistName.textContent = current?.artists?.map(a => a.name).join(", ") || "";

    const image = current?.album?.images?.[0]?.url;
    if (image) {
      albumArt.src = image;
      albumArt.classList.remove("hidden");
    }
  });

  player.addListener("initialization_error", ({ message }) => setStatus(message, true));
  player.addListener("authentication_error", ({ message }) => setStatus(message, true));
  player.addListener("account_error", ({ message }) => setStatus("Spotify Premium is required for browser playback.", true));
  player.addListener("playback_error", ({ message }) => setStatus(message, true));

  player.connect();
};

async function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");

  if (error) {
    setStatus(`Spotify login error: ${error}`, true);
    return;
  }

  try {
    if (code) {
      setStatus("Finishing Spotify login...");
      accessToken = await exchangeCodeForToken(code);
      window.history.replaceState({}, document.title, REDIRECT_URI);
    } else {
      accessToken = await getValidToken();
    }

    if (accessToken) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      refreshBtn.classList.remove("hidden");

      await loadProfile();
      await loadPlaylists();
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

function logout() {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_expires_at");
  localStorage.removeItem("spotify_code_verifier");
  window.location.href = REDIRECT_URI;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
refreshBtn.addEventListener("click", loadPlaylists);

prevBtn.addEventListener("click", () => player?.previousTrack());
nextBtn.addEventListener("click", () => player?.nextTrack());
playPauseBtn.addEventListener("click", () => player?.togglePlay());

init();
