const COOKIE_SITES = [
  { domain: "visualstudio.com", origin: "https://*.visualstudio.com/*" },
  { domain: "dev.azure.com", origin: "https://dev.azure.com/*" },
  { domain: "microsoftonline.com", origin: "https://*.microsoftonline.com/*" },
  { domain: "msauth.net", origin: "https://*.msauth.net/*" },
  { domain: "msftauth.net", origin: "https://*.msftauth.net/*" },
  { domain: "login.live.com", origin: "https://login.live.com/*" }
];

const DEFAULT_TARGET_URL = "https://dev.azure.com/";
const DEFAULT_COOKIE_DOMAINS = COOKIE_SITES.map(({ domain }) => domain);
const CLEAR_NOTIFICATION_ID = "cookies-cleared";

async function getTargetUrl() {
  const { targetUrl = DEFAULT_TARGET_URL } = await chrome.storage.sync.get("targetUrl");
  return targetUrl;
}

async function shouldRedirectToLogin() {
  const { redirectToLogin = true } = await chrome.storage.sync.get("redirectToLogin");
  return redirectToLogin;
}

async function hasSavedTargetUrl() {
  const { targetUrl } = await chrome.storage.sync.get("targetUrl");
  return typeof targetUrl === "string" && targetUrl.length > 0;
}

async function getSelectedCookieSites() {
  const { cookieDomains = DEFAULT_COOKIE_DOMAINS } = await chrome.storage.sync.get("cookieDomains");
  const selectedDomains = new Set(cookieDomains);
  return COOKIE_SITES.filter(({ domain }) => selectedDomains.has(domain));
}

async function clearCookies(tab) {
  if (!(await hasSavedTargetUrl())) {
    await chrome.runtime.openOptionsPage();
    return;
  }

  const selectedSites = await getSelectedCookieSites();
  const cookieOrigins = selectedSites.map(({ origin }) => origin);
  const hasCookieAccess = await chrome.permissions.contains({ origins: cookieOrigins });
  if (!hasCookieAccess) {
    const granted = await chrome.permissions.request({ origins: cookieOrigins });
    if (!granted) {
      console.info("Cookie access was not granted.");
      return;
    }
  }

  let clearedCount = 0;

  await chrome.action.setBadgeText({ text: "...", tabId: tab.id });
  await chrome.action.setBadgeBackgroundColor({ color: "#5b5b5b", tabId: tab.id });

  for (const { domain } of selectedSites) {
    try {
      const cookies = await chrome.cookies.getAll({ domain: domain });
      for (const cookie of cookies) {
        const protocol = cookie.secure ? "https:" : "http:";
        const cookieDomain = cookie.domain.startsWith(".")
          ? cookie.domain.slice(1)
          : cookie.domain;
        const url = `${protocol}//${cookieDomain}${cookie.path}`;
        const removedCookie = await chrome.cookies.remove({
          url: url,
          name: cookie.name,
          storeId: cookie.storeId
        });

        if (removedCookie) {
          clearedCount++;
        }
      }
    } catch (error) {
      console.error(`Error clearing cookies for ${domain}:`, error);
    }
  }

  const badgeText = clearedCount > 99 ? "99+" : String(clearedCount);
  await chrome.action.setBadgeText({ text: badgeText, tabId: tab.id });
  await chrome.action.setBadgeBackgroundColor({ color: "#107c10", tabId: tab.id });
  console.info(`Cleared ${clearedCount} Azure DevOps/Microsoft cookies.`);
  await chrome.notifications.create(CLEAR_NOTIFICATION_ID, {
    type: "basic",
    iconUrl: "storeicon.png",
    title: "ADO Cookie Fixer",
    message: `Cleared ${clearedCount} ${clearedCount === 1 ? "cookie" : "cookies"}.`
  });

  if (await shouldRedirectToLogin()) {
    await chrome.tabs.update(tab.id, { url: await getTargetUrl() });
  }
}

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "manage-settings",
      title: "Manage settings",
      contexts: ["action"]
    });
  });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  createContextMenu();
  if (reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(createContextMenu);

chrome.contextMenus.onClicked.addListener(({ menuItemId }) => {
  if (menuItemId === "manage-settings") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "clear-cookies" || !Number.isInteger(message.tabId)) {
    return;
  }

  chrome.tabs.get(message.tabId).then(clearCookies);
});