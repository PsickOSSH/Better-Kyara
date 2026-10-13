const isFirefox = typeof browser !== 'undefined';
const browserAPI = isFirefox ? browser : chrome;
const actionAPI = browserAPI.action || browserAPI.browserAction;

if (actionAPI) {
  actionAPI.onClicked.addListener(async () => {
    try {
      await browserAPI.tabs.create({ url: "https://kyara.games" });
    } catch (error) {
      console.error("Erreur lors de l'ouverture de l'onglet", error);
    }
  });
} else {
  console.warn("Action API non disponible");
}