const DEFAULT_TARGET_URL = "https://dev.azure.com/";
const DEFAULT_COOKIE_DOMAINS = [
  "visualstudio.com",
  "dev.azure.com",
  "microsoftonline.com",
  "msauth.net",
  "msftauth.net",
  "login.live.com"
];
const targetUrlInput = document.querySelector("#target-url");
const status = document.querySelector("#status");
const cookieDomainInputs = document.querySelectorAll("input[name='cookie-domain']");
const confirmBeforeClearingInput = document.querySelector("#confirm-before-clearing");
const redirectToLoginInput = document.querySelector("#redirect-to-login");

async function loadSettings() {
  const {
    targetUrl = DEFAULT_TARGET_URL,
    cookieDomains = DEFAULT_COOKIE_DOMAINS,
    confirmBeforeClearing = true,
    redirectToLogin = true
  } = await chrome.storage.sync.get([
    "targetUrl",
    "cookieDomains",
    "confirmBeforeClearing",
    "redirectToLogin"
  ]);
  targetUrlInput.value = targetUrl;
  confirmBeforeClearingInput.checked = confirmBeforeClearing;
  redirectToLoginInput.checked = redirectToLogin;
  const selectedDomains = new Set(cookieDomains);
  for (const input of cookieDomainInputs) {
    input.checked = selectedDomains.has(input.value);
  }
}

document.querySelector("#settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const targetUrl = new URL(targetUrlInput.value).href;
    const cookieDomains = Array.from(cookieDomainInputs)
      .filter(({ checked }) => checked)
      .map(({ value }) => value);
    await chrome.storage.sync.set({
      targetUrl,
      cookieDomains,
      confirmBeforeClearing: confirmBeforeClearingInput.checked,
      redirectToLogin: redirectToLoginInput.checked
    });
    targetUrlInput.value = targetUrl;
    status.textContent = "Saved.";
  } catch {
    status.textContent = "Enter a valid URL.";
  }
});

loadSettings();