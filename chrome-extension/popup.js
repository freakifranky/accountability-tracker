document.getElementById("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById("scanNow").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "scan-now" });
  window.close();
});

(async () => {
  const { lastScanAt, lastScanResult } = await chrome.storage.local.get(["lastScanAt", "lastScanResult"]);
  if (lastScanAt) {
    document.getElementById("lastScan").textContent = `Last scan: ${new Date(lastScanAt).toLocaleString()}`;
  }
  if (lastScanResult) {
    document.getElementById("lastResult").textContent = lastScanResult;
  }
})();
