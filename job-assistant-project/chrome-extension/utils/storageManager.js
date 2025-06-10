// chrome-extension/utils/storageManager.js

/**
 * @file Gerencia as operações de armazenamento local da extensão usando chrome.storage.local.
 */

// Define a versão atual da estrutura do currículo
const CURRENT_RESUME_VERSION = 1;

/**
 * Salva um valor no armazenamento local da extensão.
 * @param {string} key - A chave sob a qual o valor será armazenado (ex: 'userResume', 'financialData').
 * @param {any} value - O valor a ser armazenado. Pode ser um objeto, array, string, etc.
 * @returns {Promise<void>} Uma promessa que resolve quando o valor é salvo.
 */
export async function saveData(key, value) {
    try {
        
        const dataToSave = { [key]: value };
        await chrome.storage.local.set(dataToSave);
        console.log(`Dados salvos com sucesso para a chave: ${key}`);
    } catch (error) {
        console.error(`Erro ao salvar dados para a chave ${key}:`, error);
        throw new Error(`Falha ao salvar dados para ${key}.`);
    }
}

/**
 * Carrega um valor do armazenamento local da extensão.
 * @param {string} key - A chave do valor a ser carregado (ex: 'userResume', 'financialData').
 * @returns {Promise<any | undefined>} Uma promessa que resolve com o valor carregado, ou undefined se não encontrado.
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
 * Funções específicas para o currículo (userResume) 
 */
export async function saveUserResume(resume) {
    resume.version = CURRENT_RESUME_VERSION;
    return saveData('userResume', resume);
}

export async function loadUserResume() {
    let userResume = await loadData('userResume');

    // Implementação básica da estratégia de migração:
    if (userResume && userResume.version < CURRENT_RESUME_VERSION) {
        console.warn(`Migrando dados do currículo da versão ${userResume.version} para ${CURRENT_RESUME_VERSION}.`);
        // userResume = migrateResumeStructure(userResume, userResume.version, CURRENT_RESUME_VERSION);
        // await saveUserResume(userResume); // Salva o currículo migrado
    } else if (!userResume) {
        userResume = {}; 
    }
    return userResume;
}