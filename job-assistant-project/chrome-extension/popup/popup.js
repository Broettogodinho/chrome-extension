// chrome-extension/popup/popup.js

// Variável global para gerar IDs únicos para os blocos de experiência e outras seções dinâmicas.
let dynamicBlockCounter = 0;

// Importa as funções do nosso gerenciador de armazenamento centralizado.
import { saveUserResume, loadUserResume } from '../utils/storageManager.js';

/**
 * Alterna a visibilidade das abas no pop-up.
 * @param {string} tabIdToShow - O ID do conteúdo da aba a ser exibido (ex: 'resumeContent', 'financeContent').
 */
function showTab(tabIdToShow) {
    // Garante que todos os botões e conteúdos de aba sejam desativados primeiro
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // CORREÇÃO: Certifique-se de que há um PONTO entre 'tabIdToShow' e 'replace'
    // A linha original 'document.getElementById(`tab${tabIdToShowreplace('Content', '')}`);' estava com erro
    const tabButtonId = `tab${tabIdToShow.replace('Content', '')}`; // Corrigido o erro de digitação
    const tabButton = document.getElementById(tabButtonId);
    const tabContent = document.getElementById(tabIdToShow);

    if (tabButton) {
        tabButton.classList.add('active');
    } else {
        console.error(`Erro: Botão de aba com ID '${tabButtonId}' não encontrado no HTML.`);
    }

    if (tabContent) {
        tabContent.classList.add('active');
    } else {
        console.error(`Erro: Conteúdo de aba com ID '${tabIdToShow}' não encontrado no HTML.`);
    }
}

/**
 * Cria e retorna um novo bloco HTML para uma experiência profissional.
 * @param {Object} [experience={}] - Objeto contendo os dados da experiência para preencher os campos.
 * @returns {HTMLElement} O elemento <div> que representa o bloco da experiência.
 */
function createExperienceBlock(experience = {}) {
    dynamicBlockCounter++;

    const experienceDiv = document.createElement('div');
    experienceDiv.classList.add('experience-item');
    experienceDiv.dataset.id = dynamicBlockCounter;

    const cargo = experience.cargo || '';
    const empresa = experience.empresa || '';
    const dataInicio = experience.dataInicio || '';
    const dataFim = experience.dataFim === 'Atual' ? '' : (experience.dataFim || '');
    const isAtual = experience.dataFim === 'Atual' || experience.isAtual || false;

    const descricao = experience.descricao || '';

    experienceDiv.innerHTML = `
        <h3>Experiência #${dynamicBlockCounter}</h3>
        <label for="jobTitle-${dynamicBlockCounter}">Cargo:</label>
        <input type="text" id="jobTitle-${dynamicBlockCounter}" class="job-title" value="${cargo}" required><br><br>

        <label for="company-${dynamicBlockCounter}">Empresa:</label>
        <input type="text" id="company-${dynamicBlockCounter}" class="company" value="${empresa}" required><br><br>

        <label for="startDate-${dynamicBlockCounter}">Data de Início (MM/AAAA):</label>
        <input type="month" id="startDate-${dynamicBlockCounter}" class="start-date" value="${dataInicio}"><br><br>

        <label for="endDate-${dynamicBlockCounter}">Data de Fim (MM/AAAA):</label>
        <input type="month" id="endDate-${dynamicBlockCounter}" class="end-date" value="${dataFim}" ${isAtual ? 'disabled' : ''}>
        <input type="checkbox" id="currentJob-${dynamicBlockCounter}" class="current-job-checkbox" ${isAtual ? 'checked' : ''}> Atual<br><br>

        <label for="description-${dynamicBlockCounter}">Descrição das Atividades:</label>
        <textarea id="description-${dynamicBlockCounter}" class="description" rows="4">${descricao}</textarea><br><br>

        <button type="button" class="remove-experience-btn">Remover</button>
        <hr>
    `;

    // --- Adição de Listeners para o Bloco Criado ---
    const removeBtn = experienceDiv.querySelector('.remove-experience-btn');
    removeBtn.addEventListener('click', () => {
        experienceDiv.remove();
    });

    const currentJobCheckbox = experienceDiv.querySelector(`#currentJob-${dynamicBlockCounter}`);
    const endDateInput = experienceDiv.querySelector(`#endDate-${dynamicBlockCounter}`);

    currentJobCheckbox.addEventListener('change', () => {
        if (currentJobCheckbox.checked) {
            endDateInput.value = '';
            endDateInput.disabled = true;
        } else {
            endDateInput.disabled = false;
        }
    });

    if (currentJobCheckbox.checked) {
        endDateInput.disabled = true;
    }

    return experienceDiv;
}

/**
 * Carrega todos os dados (currículo e financeiros) do armazenamento local e preenche o formulário.
 */
async function loadAllData() {
    try {
        const userResume = await loadUserResume();

        // --- 1. Carrega Dados Pessoais (da US02) ---
        const personalData = userResume.personal || {};
        document.getElementById('fullName').value = personalData.fullName || '';
        document.getElementById('email').value = personalData.email || '';
        document.getElementById('phone').value = personalData.phone || '';
        document.getElementById('address').value = personalData.address || '';

        // --- 2. Carrega Experiências Profissionais (da US03) ---
        const experiencesContainer = document.getElementById('experiencesContainer');
        experiencesContainer.innerHTML = '';
        dynamicBlockCounter = 0; // Reinicia o contador para IDs únicos ao recarregar a seção

        if (userResume.experience && Array.isArray(userResume.experience)) {
            userResume.experience.forEach(exp => {
                experiencesContainer.appendChild(createExperienceBlock(exp));
            });
        }
        if (!userResume.experience || userResume.experience.length === 0) {
            experiencesContainer.appendChild(createExperienceBlock());
        }

        // --- 3. Carrega Dados Financeiros ---
        const financialData = userResume.financial || {};
        document.getElementById('salaryClt').value = financialData.salaryClt || 0;
        document.getElementById('vrClt').value = financialData.vrClt || 0;
        document.getElementById('healthPlanClt').value = financialData.healthPlanClt || 0;
        document.getElementById('annualGrossSalaryClt').value = financialData.annualGrossSalaryClt || 0;
        document.getElementById('bonusClt').value = financialData.bonusClt || 0;
        document.getElementById('timeInCompanyYearsClt').value = financialData.timeInCompanyYearsClt || 1;

        document.getElementById('salaryPj').value = financialData.salaryPj || 0;
        document.getElementById('accountantCostPj').value = financialData.accountantCostPj || 0;
        document.getElementById('taxesPjPercent').value = financialData.taxesPjPercent || 6;
        document.getElementById('healthPlanPj').value = financialData.healthPlanPj || 0;
        document.getElementById('bonusPj').value = financialData.bonusPj || 0;

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Não foi possível carregar os dados. Tente novamente.');
    }
}

/**
 * Coleta todos os dados do formulário (currículo e financeiros) e os salva no armazenamento local.
 * @returns {Promise<boolean>} Uma promessa que resolve para true se o salvamento foi bem-sucedido, false caso contrário.
 */
async function saveAllData() {
    // --- 1. Coleta Dados Pessoais ---
    const personalData = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim()
    };

    if (!personalData.email || !personalData.email.includes('@') || !personalData.email.includes('.')) {
        alert('Por favor, insira um e-mail válido.');
        return false;
    }

    // --- 2. Coleta Experiências Profissionais ---
    const experiences = [];
    const experienceItems = document.querySelectorAll('.experience-item');

    experienceItems.forEach(item => {
        const jobTitle = item.querySelector('.job-title').value.trim();
        const company = item.querySelector('.company').value.trim();
        const startDate = item.querySelector('.start-date').value.trim();
        const endDateInput = item.querySelector('.end-date');
        const currentJobCheckbox = item.querySelector('.current-job-checkbox');
        const description = item.querySelector('.description').value.trim();

        let endDateValue = endDateInput.value.trim();
        if (currentJobCheckbox.checked) {
            endDateValue = 'Atual';
        }

        if (jobTitle && company && startDate) {
            experiences.push({
                cargo: jobTitle,
                empresa: company,
                dataInicio: startDate,
                dataFim: endDateValue,
                descricao: description
            });
        }
    });

    // --- 3. Coleta Dados Financeiros ---
    const financialData = {
        salaryClt: parseFloat(document.getElementById('salaryClt').value) || 0,
        vrClt: parseFloat(document.getElementById('vrClt').value) || 0,
        healthPlanClt: parseFloat(document.getElementById('healthPlanClt').value) || 0,
        annualGrossSalaryClt: parseFloat(document.getElementById('annualGrossSalaryClt').value) || 0,
        bonusClt: parseFloat(document.getElementById('bonusClt').value) || 0,
        timeInCompanyYearsClt: parseFloat(document.getElementById('timeInCompanyYearsClt').value) || 1,

        salaryPj: parseFloat(document.getElementById('salaryPj').value) || 0,
        accountantCostPj: parseFloat(document.getElementById('accountantCostPj').value) || 0,
        taxesPjPercent: parseFloat(document.getElementById('taxesPjPercent').value) || 6,
        healthPlanPj: parseFloat(document.getElementById('healthPlanPj').value) || 0,
        bonusPj: parseFloat(document.getElementById('bonusPj').value) || 0
    };

    // --- 4. Constrói o Objeto userResume Completo ---
    const userResume = await loadUserResume();

    userResume.personal = personalData;
    userResume.experience = experiences;
    userResume.financial = financialData;

    try {
        await saveUserResume(userResume);
        alert('Dados salvos com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Ocorreu um erro ao salvar os dados. Verifique o console para mais detalhes.');
        return false;
    }
}


// --- Listener para o Evento DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    // Carrega todos os dados (currículo e financeiros) quando o pop-up é aberto
    loadAllData();

    // --- Gerenciamento de Abas ---
    const tabResumeButton = document.getElementById('tabResume');
    const tabFinanceButton = document.getElementById('tabFinance');

    if (tabResumeButton) {
        tabResumeButton.addEventListener('click', () => showTab('resumeContent'));
    } else {
        console.error("Erro: Botão 'tabResume' não encontrado para adicionar listener!");
    }

    if (tabFinanceButton) {
        tabFinanceButton.addEventListener('click', () => showTab('financeContent'));
    } else {
        console.error("Erro: Botão 'tabFinance' não encontrado para adicionar listener!");
    }

    // Ativa a aba de currículo por padrão ao carregar
    showTab('resumeContent'); // Esta chamada agora está segura dentro do DOMContentLoaded


    // --- Eventos do Formulário de Currículo ---
    // Corrigido o ID do formulário 'rsumeForms' para 'resumeForm'
    const resumeForm = document.getElementById('resumeForm');
    if (resumeForm) {
        resumeForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await saveAllData();
        });
    } else {
        console.error("Erro: Formulário 'resumeForm' não encontrado para adicionar listener!");
    }

    // Evento para adicionar nova experiência
    const addExperienceBtn = document.getElementById('addExperienceBtn');
    if (addExperienceBtn) {
        addExperienceBtn.addEventListener('click', () => {
            const experiencesContainer = document.getElementById('experiencesContainer');
            if (experiencesContainer) {
                experiencesContainer.appendChild(createExperienceBlock());
            } else {
                console.error("Erro: Container de experiências 'experiencesContainer' não encontrado!");
            }
        });
    } else {
        console.error("Erro: Botão 'addExperienceBtn' não encontrado para adicionar listener!");
    }


    const financeForm = document.getElementById('financeForm');
    if (financeForm) {
        financeForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await saveAllData();
            alert('Dados financeiros salvos para simulação. Prossiga para os cálculos!');
        });
    } else {
        console.error("Erro: Formulário 'financeForm' não encontrado para adicionar listener!");
    }
});