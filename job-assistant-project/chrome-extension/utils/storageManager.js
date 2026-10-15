// chrome-extension/utils/storageManager.js

/**
 * @file Operações de armazenamento local (chrome.storage.local) e estrutura do currículo.
 */

/** Versão atual da estrutura do currículo. Incrementar ao mudar o formato salvo. */
export const CURRENT_RESUME_VERSION = 2;

/** Estrutura vazia do currículo; usada como base para preencher campos ausentes. */
export function emptyResume() {
    return {
        version: CURRENT_RESUME_VERSION,
        personal: {
            fullName: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            linkedin: '',
            portfolio: ''
        },
        experience: [],
        education: [],
        skills: { hard: [], soft: [] },
        coverLetter: '',
        financial: {}
    };
}

/**
 * Salva um valor no armazenamento local.
 * @param {string} key
 * @param {any} value
 */
export async function saveData(key, value) {
    try {
        await chrome.storage.local.set({ [key]: value });
    } catch (error) {
        console.error(`Erro ao salvar dados para a chave ${key}:`, error);
        throw new Error(`Falha ao salvar dados para ${key}.`);
    }
}

/**
 * Carrega um valor do armazenamento local.
 * @param {string} key
 * @returns {Promise<any|undefined>}
 */
export async function loadData(key) {
    try {
        const result = await chrome.storage.local.get(key);
        return result[key];
    } catch (error) {
        console.error(`Erro ao carregar dados para a chave ${key}:`, error);
        throw new Error(`Falha ao carregar dados para ${key}.`);
    }
}

/**
 * Migra um currículo salvo em versão antiga para a versão atual.
 * v1 → v2: adiciona formação, habilidades, carta e novos campos pessoais.
 * @param {Object} resume
 * @returns {Object}
 */
export function migrateResume(resume) {
    const base = emptyResume();
    if (!resume || typeof resume !== 'object') return base;

    return {
        ...base,
        ...resume,
        version: CURRENT_RESUME_VERSION,
        personal: { ...base.personal, ...(resume.personal || {}) },
        experience: Array.isArray(resume.experience) ? resume.experience : [],
        education: Array.isArray(resume.education) ? resume.education : [],
        skills: {
            hard: Array.isArray(resume.skills?.hard) ? resume.skills.hard : [],
            soft: Array.isArray(resume.skills?.soft) ? resume.skills.soft : []
        },
        coverLetter: typeof resume.coverLetter === 'string' ? resume.coverLetter : '',
        financial: resume.financial && typeof resume.financial === 'object' ? resume.financial : {}
    };
}

export async function saveUserResume(resume) {
    return saveData('userResume', { ...resume, version: CURRENT_RESUME_VERSION });
}

export async function loadUserResume() {
    const stored = await loadData('userResume');
    const resume = migrateResume(stored);
    if (stored && stored.version !== CURRENT_RESUME_VERSION) {
        await saveUserResume(resume);
    }
    return resume;
}
