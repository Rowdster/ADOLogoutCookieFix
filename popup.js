const message = document.querySelector("#message");
const cancelButton = document.querySelector("#cancel");
const confirmButton = document.querySelector("#confirm");
let cookieOrigins = [];
confirmButton.disabled = true;

async function clearCookies() {
  cancelButton.disabled = true;
  confirmButton.disabled = true;
  message.textContent = "Clearing cookies...";

  try {
    if (cookieOrigins.length === 0) {
      message.textContent = "No cookie sites are selected in Settings.";
      cancelButton.disabled = false;
      confirmButton.disabled = false;
      return;
    }

    const granted = await chrome.permissions.request({ origins: cookieOrigins });
    if (!granted) {
      message.textContent = "Cookie access was not granted.";
      cancelButton.disabled = false;
      confirmButton.disabled = false;
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      message.textContent = "Unable to identify the active tab.";
      cancelButton.disabled = false;
      confirmButton.disabled = false;
      return;
    }

    const result = await chrome.runtime.sendMessage({ type: "clear-cookies", tabId: tab.id });
    if (result?.status === "cleared") {
      message.textContent = `Cleared ${result.clearedCount} ${result.clearedCount === 1 ? "cookie" : "cookies"}.`;
      confirmButton.hidden = true;
      cancelButton.textContent = "Close";
      cancelButton.disabled = false;
      return;
    }

    message.textContent = result?.message ?? "Unable to clear cookies.";
  } catch (error) {
    console.error("Unable to clear cookies:", error);
    message.textContent = "Unable to contact the extension background worker.";
  }

  cancelButton.disabled = false;
  confirmButton.disabled = false;
}

cancelButton.addEventListener("click", () => window.close());
confirmButton.addEventListener("click", clearCookies);

async function initialize() {
  const { confirmBeforeClearing = true } = await chrome.storage.sync.get("confirmBeforeClearing");
  const permissionDetails = await chrome.runtime.sendMessage({ type: "get-cookie-origins" });
  cookieOrigins = permissionDetails?.origins ?? [];
  if (!confirmBeforeClearing) {
    message.textContent = "Clearing cookies...";
    cancelButton.hidden = true;
    confirmButton.hidden = true;
    await clearCookies();
    return;
  }

  confirmButton.disabled = false;
}

initialize();