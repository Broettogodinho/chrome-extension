// chrome-extension/content.js

/**
 * @file Content script injetado sob demanda (popup ou atalho) junto com utils/formMapper.js.
 * Recebe o currículo e preenche os campos reconhecidos da página.
 * A guarda abaixo evita registrar o listener duas vezes quando o usuário
 * aciona o preenchimento mais de uma vez na mesma página.
 */
(function () {
    'use strict';
    if (globalThis.__jobAssistantContentLoaded) return;
    globalThis.__jobAssistantContentLoaded = true;

    const HIGHLIGHT_STYLE_ID = 'job-assistant-style';

    function addHighlightStyle() {
        if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = HIGHLIGHT_STYLE_ID;
        style.textContent = '.job-assistant-filled{outline:2px solid #2e7d32 !important;outline-offset:1px;transition:outline-color 2s}';
        document.documentElement.append(style);
    }

    function clearHighlightLater() {
        setTimeout(() => {
            document.querySelectorAll('.job-assistant-filled').forEach((el) => el.classList.remove('job-assistant-filled'));
        }, 4000);
    }

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== 'JOB_ASSISTANT_AUTOFILL') return false;
        try {
            const mapper = globalThis.JobAssistantFormMapper;
            if (!mapper) throw new Error('Mapeador de formulário não carregado.');
            addHighlightStyle();
            const result = mapper.fillForm(document, message.resume);
            clearHighlightLater();
            sendResponse({ ok: true, ...result });
        } catch (error) {
            sendResponse({ ok: false, error: error.message });
        }
        return false;
    });
})();
