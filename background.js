/**
 * Background Service Worker
 * Handles extension icon click to open the main application
 */

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('domara installed');
  } else if (details.reason === 'update') {
    console.log(`domara updated to ${chrome.runtime.getManifest().version}`);
  }
});
