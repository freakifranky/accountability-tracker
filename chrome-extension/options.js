document.addEventListener("DOMContentLoaded", async () => {
  const { apiBaseUrl, apiSecret, excludePatterns = [] } = await chrome.storage.local.get([
    "apiBaseUrl",
    "apiSecret",
    "excludePatterns",
  ]);
  if (apiBaseUrl) document.getElementById("apiBaseUrl").value = apiBaseUrl;
  if (apiSecret) document.getElementById("apiSecret").value = apiSecret;
  if (excludePatterns.length > 0) document.getElementById("excludePatterns").value = excludePatterns.join("\n");
});

document.getElementById("save").addEventListener("click", async () => {
  const apiBaseUrl = document.getElementById("apiBaseUrl").value.trim().replace(/\/$/, "");
  const apiSecret = document.getElementById("apiSecret").value.trim();
  const excludePatterns = document
    .getElementById("excludePatterns")
    .value.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  await chrome.storage.local.set({ apiBaseUrl, apiSecret, excludePatterns });
  const status = document.getElementById("status");
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 2000);
});
