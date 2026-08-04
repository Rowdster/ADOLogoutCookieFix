const message = document.querySelector("#message");
const cancelButton = document.querySelector("#cancel");
const confirmButton = document.querySelector("#confirm");

async function clearCookies() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await chrome.runtime.sendMessage({ type: "clear-cookies", tabId: tab.id });
  }
  window.close();
}

cancelButton.addEventListener("click", () => window.close());
confirmButton.addEventListener("click", clearCookies);

async function initialize() {
  const { confirmBeforeClearing = true } = await chrome.storage.sync.get("confirmBeforeClearing");
  if (!confirmBeforeClearing) {
    message.textContent = "Clearing cookies...";
    cancelButton.hidden = true;
    confirmButton.hidden = true;
    await clearCookies();
  }
}

initialize();