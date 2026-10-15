// chrome-extension/background.js (service worker, módulo ES)

import { loadUserResume } from './utils/storageManager.js';
import { autofillActiveTab } from './utils/autofill.js';

// Na instalação/atualização, garante que o currículo salvo esteja na versão atual.
chrome.runtime.onInstalled.addListener(async () => {
    try {
        await loadUserResume();
    } catch (error) {
        console.error('Falha ao inicializar o armazenamento:', error);
    }
});

/** Mostra o resultado no ícone da extensão por alguns segundos. */
async function flashBadge(tabId, text, color) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    await chrome.action.setBadgeText({ tabId, text });
    setTimeout(() => chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {}), 4000);
}

// Atalho de teclado (Alt+Shift+F por padrão) para preencher sem abrir o popup.
chrome.commands.onCommand.addListener(async (command, tab) => {
    if (command !== 'autofill-form' || !tab?.id) return;
    try {
        const result = await autofillActiveTab(tab);
        await flashBadge(tab.id, String(result.filled), result.filled ? '#2e7d32' : '#9e9e9e');
    } catch (error) {
        console.warn('Preenchimento via atalho falhou:', error.message);
        await flashBadge(tab.id, '!', '#c62828');
    }
});
