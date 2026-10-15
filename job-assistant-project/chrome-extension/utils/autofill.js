// chrome-extension/utils/autofill.js

/**
 * @file Injeta o mapeador e o content script na aba ativa e pede o preenchimento.
 * Usado pelo popup (botão) e pelo service worker (atalho de teclado).
 * Depende apenas da permissão "activeTab" + "scripting": nada roda em páginas
 * sem uma ação explícita do usuário.
 */

import { loadUserResume } from './storageManager.js';

const RESTRICTED_URL = /^(chrome|edge|about|chrome-extension|devtools|view-source):|^https:\/\/chrome\.google\.com\/webstore|^https:\/\/chromewebstore\.google\.com/;

/**
 * Preenche o formulário da aba informada (ou da aba ativa).
 * @param {chrome.tabs.Tab} [tab]
 * @returns {Promise<{filled:number, total:number, fields:string[]}>}
 */
export async function autofillActiveTab(tab) {
    const target = tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!target?.id) throw new Error('Nenhuma aba ativa encontrada.');
    if (target.url && RESTRICTED_URL.test(target.url)) {
        throw new Error('O Chrome não permite preencher esta página. Abra o formulário da vaga.');
    }

    const resume = await loadUserResume();
    if (!resume.personal?.fullName && !resume.personal?.email) {
        throw new Error('Salve seu currículo antes de preencher formulários.');
    }

    await chrome.scripting.executeScript({
        target: { tabId: target.id },
        files: ['utils/formMapper.js', 'content.js']
    });

    const response = await chrome.tabs.sendMessage(target.id, { type: 'JOB_ASSISTANT_AUTOFILL', resume });
    if (!response?.ok) throw new Error(response?.error || 'A página não respondeu ao preenchimento.');
    return response;
}
