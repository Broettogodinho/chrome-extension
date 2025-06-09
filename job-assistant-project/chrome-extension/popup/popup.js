// popup/popup.js

// Função para carregar dados do currículo
async function loadResumeData() {
    try {
        const result = await chrome.storage.local.get('userResume');
        const userResume = result.userResume || {};
        const personalData = userResume.personal || {};

        document.getElementById('fullName').value = personalData.fullName || '';
        document.getElementById('email').value = personalData.email || '';
        document.getElementById('phone').value = personalData.phone || '';
        document.getElementById('address').value = personalData.address || '';
    } catch (error) {
        console.error('Erro ao carregar currículo:', error);
    }
}

// Função para salvar dados do currículo
async function saveResumeData() {
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;

    // Validação básica de e-mail
    if (!email || !email.includes('@') || !email.includes('.')) {
        alert('Por favor, insira um e-mail válido.');
        return false; // Impede o salvamento
    }

    const personalData = {
        fullName: fullName,
        email: email,
        phone: phone,
        address: address
    };

    try {
        // Carrega a estrutura completa para não sobrescrever outras seções (se houver)
        const result = await chrome.storage.local.get('userResume');
        const userResume = result.userResume || {};
        userResume.personal = personalData; // Atualiza apenas a seção pessoal

        await chrome.storage.local.set({ 'userResume': userResume });
        alert('Informações pessoais salvas com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao salvar currículo:', error);
        alert('Ocorreu um erro ao salvar as informações.');
        return false;
    }
}

// Adiciona o evento ao botão de salvar
document.addEventListener('DOMContentLoaded', () => {
    loadResumeData(); // Carrega os dados ao abrir o pop-up

    const form = document.getElementById('resumeForm');
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página do pop-up
        await saveResumeData();
    });
});