document.addEventListener("DOMContentLoaded", async () => {
  const { apiBaseUrl, apiSecret } = await chrome.storage.local.get(["apiBaseUrl", "apiSecret"]);
  if (apiBaseUrl) document.getElementById("apiBaseUrl").value = apiBaseUrl;
  if (apiSecret) document.getElementById("apiSecret").value = apiSecret;
});

document.getElementById("save").addEventListener("click", async () => {
  const apiBaseUrl = document.getElementById("apiBaseUrl").value.trim().replace(/\/$/, "");
  const apiSecret = document.getElementById("apiSecret").value.trim();
  await chrome.storage.local.set({ apiBaseUrl, apiSecret });
  const status = document.getElementById("status");
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 2000);
});
