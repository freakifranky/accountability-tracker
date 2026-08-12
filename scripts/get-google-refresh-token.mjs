#!/usr/bin/env node
// One-time helper: turns a Google OAuth Client ID + Secret into a refresh
// token for Calendar API access. Run this ONCE locally after creating an
// OAuth client in Google Cloud Console (see chrome-extension-free instructions
// in the PR description / README). Never run this on a server — it opens a
// browser and needs your own Google login.
//
// Usage:
//   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-refresh-token.mjs
//
// Prints a GOOGLE_REFRESH_TOKEN to paste into .env.local / Vercel env vars.

import http from "http";
import { URL } from "url";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 53682; // arbitrary local port, must match the redirect URI registered on the OAuth client
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars first.");
  console.error("Get these from Google Cloud Console → APIs & Services → Credentials");
  console.error("  → Create Credentials → OAuth client ID → Application type: Desktop app");
  console.error(`  (Desktop app type doesn't require registering a redirect URI, but if`);
  console.error(`   Google's console prompts for one, use: ${REDIRECT_URI})`);
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline"); // required to get a refresh_token back
authUrl.searchParams.set("prompt", "consent"); // forces a refresh_token even on repeat runs

console.log("\n1. Open this URL in your browser and approve access:\n");
console.log(authUrl.toString());
console.log(`\n2. Waiting for the redirect back to ${REDIRECT_URI} ...\n`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end(`Error: ${error}. Check the terminal and try again.`);
    console.error(`\nGoogle returned an error: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.end("No code received.");
    return;
  }

  res.end("Success — you can close this tab and go back to the terminal.");
  server.close();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.refresh_token) {
    console.error("\nFailed to get a refresh token:", tokenData);
    console.error(
      "\nIf refresh_token is missing, you likely authorized this app before — revoke access at"
    );
    console.error(
      "https://myaccount.google.com/permissions and run this script again (prompt=consent forces a fresh one)."
    );
    process.exit(1);
  }

  console.log("\nDone. Add this to .env.local / your Vercel project's env vars:\n");
  console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
  console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
  console.log(`GOOGLE_REFRESH_TOKEN=${tokenData.refresh_token}`);
  console.log(
    "\nNote: with the OAuth consent screen in \"Testing\" mode, this refresh token expires after 7 days of inactivity — see TODOS.md for the tradeoff we accepted on this."
  );
  process.exit(0);
});

server.listen(PORT);
