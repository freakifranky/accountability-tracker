// Server-side OAuth for the Calendar API — separate from, and unrelated to, the
// YouTube OAuth risk the eng review flagged (that integration was dropped
// entirely). This one's scope is calendar.events only.
//
// NOT YET VERIFIED against a real Google Cloud project — this environment has
// no Google credentials to test against. Needs: a GCP project with the
// Calendar API enabled, an OAuth client (Desktop app type is simplest for a
// personal single-user tool), and a one-time authorization to obtain
// GOOGLE_REFRESH_TOKEN (e.g. via Google's OAuth Playground, or a short local
// script — see README before shipping this).
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Calendar not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN"
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Google access token: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
