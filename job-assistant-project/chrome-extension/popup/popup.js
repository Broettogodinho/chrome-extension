// Variável global para gerar IDs únicos para os blocos de experiência.
let experienceCounter = 0;

// Importa as funções do nosso gerenciador de armazenamento centralizado.
import { saveUserResume, loadUserResume } from '../utils/storageManager.js';

/**
 * Cria e retorna um novo bloco HTML para uma experiência profissional.
 * @param {Object} [experience={}] - Objeto contendo os dados da experiência para preencher os campos.
 * @returns {HTMLElement} O elemento <div> que representa o bloco da experiência.
 */
function createExperienceBlock(experience = {}) {
    experienceCounter++; // Incrementa para um novo ID único para o bloco

    const experienceDiv = document.createElement('div');
    experienceDiv.classList.add('experience-item');
    experienceDiv.dataset.id = experienceCounter; // Armazena o ID no dataset do elemento

    // Usa operadores OR para garantir string vazia se o valor não existir no objeto experience
    experienceDiv.innerHTML = `
        <h3>Experiência #${experienceCounter}</h3>
        <label for="jobTitle-${experienceCounter}">Cargo:</label>
        <input type="text" id="jobTitle-${experienceCounter}" class="job-title" value="${experience.cargo || ''}" required><br><br>

        <label for="company-${experienceCounter}">Empresa:</label>
        <input type="text" id="company-${experienceCounter}" class="company" value="${experience.empresa || ''}" required><br><br>

        <label for="startDate-${experienceCounter}">Data de Início (MM/AAAA):</label>
        <input type="month" id="startDate-${experienceCounter}" class="start-date" value="${experience.dataInicio || ''}"><br><br>

        <label for="endDate-${experienceCounter}">Data de Fim (MM/AAAA):</label>
        <input type="month" id="endDate-${experienceCounter}" class="end-date" value="${experience.dataFim === 'Atual' ? '' : (experience.dataFim || '')}">
        <input type="checkbox" id="currentJob-${experienceCounter}" class="current-job-checkbox" ${experience.dataFim === 'Atual' ? 'checked' : ''}> Atual<br><br>

        <label for="description-${experienceCounter}">Descrição das Atividades:</label>
        <textarea id="description-${experienceCounter}" class="description" rows="4">${experience.descricao || ''}</textarea><br><br>

        <button type="button" class="remove-experience-btn">Remover</button>
        <hr>
    `;

    // --- Adição de Listeners para o Bloco Criado ---

    // Listener para o botão "Remover"
    const removeBtn = experienceDiv.querySelector('.remove-experience-btn');
    removeBtn.addEventListener('click', () => {
        experienceDiv.remove(); 
    });

    // Listener para o checkbox "Atual" (desabilita/habilita o campo de Data de Fim)
    const currentJobCheckbox = experienceDiv.querySelector(`#currentJob-${experienceCounter}`);
    const endDateInput = experienceDiv.querySelector(`#endDate-${experienceCounter}`);

    currentJobCheckbox.addEventListener('change', () => {
        if (currentJobCheckbox.checked) {
            endDateInput.value = ''; 
            endDateInput.disabled = true; 
        } else {
            endDateInput.disabled = false; 
        }
    });

    // Inicializa o estado do campo de Data de Fim com base no checkbox "Atual" carregado
    if (currentJobCheckbox.checked) {
        endDateInput.disabled = true;
    }

    return experienceDiv;
}

/**
 * Carrega todos os dados do currículo do armazenamento local e preenche o formulário.
 */
async function loadResumeData() {
    try {
        // Usa a função loadUserResume do storageManager.js para carregar
        const userResume = await loadUserResume();

        // --- 1. Carrega Dados Pessoais ---
        const personalData = userResume.personal || {};
        document.getElementById('fullName').value = personalData.fullName || '';
        document.getElementById('email').value = personalData.email || '';
        document.getElementById('phone').value = personalData.phone || '';
        document.getElementById('address').value = personalData.address || '';

        // --- 2. Carrega Experiências Profissionais ---
        const experiencesContainer = document.getElementById('experiencesContainer');
        experiencesContainer.innerHTML = ''; 
        experienceCounter = 0; 

        if (userResume.experience && Array.isArray(userResume.experience)) {
            userResume.experience.forEach(exp => {
                experiencesContainer.appendChild(createExperienceBlock(exp));
            });
        }

        // Se nenhuma experiência foi carregada (ex: usuário novo ou array vazio), adiciona um bloco vazio por padrão
        if (!userResume.experience || userResume.experience.length === 0) {
            experiencesContainer.appendChild(createExperienceBlock());
        }

    } catch (error) {
        console.error('Erro ao carregar currículo no pop-up:', error);
        alert('Não foi possível carregar o currículo. Tente novamente.');
    }
}

/**
 * Coleta todos os dados do formulário do currículo e os salva no armazenamento local.
 * @returns {Promise<boolean>} Uma promessa que resolve para true se o salvamento foi bem-sucedido, false caso contrário.
 */
async function saveResumeData() {
    // --- 1. Coleta Dados Pessoais ---
    const personalData = {
        fullName: document.getElementById('fullName').value.trim(), // .trim() para remover espaços em branco no início/fim
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim()
    };

    // Validação básica de e-mail
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
        // Se o checkbox "Atual" estiver marcado, define a data de fim como a string 'Atual'
        if (currentJobCheckbox.checked) {
            endDateValue = 'Atual';
        }

        // Só salva uma experiência se os campos essenciais (Cargo, Empresa, Data de Início) estiverem preenchidos
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

    // --- 3. Constrói o Objeto userResume Completo ---
    // Começa com o objeto userResume carregado (se houver) para preservar outras seções
    const userResume = await loadUserResume(); 

    userResume.personal = personalData;
    userResume.experience = experiences;
    // userResume.education = ...; // (Será adicionado posteriormente)
    // userResume.skills = ...;    // (Será adicionado posteriormente)
    // userResume.coverLetter = ...; // (Será adicionado posteriormente)

    try {
        // Usa a função saveUserResume do storageManager.js para salvar o objeto userResume completo
        await saveUserResume(userResume);
        alert('Currículo salvo com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao salvar currículo no pop-up:', error);
        alert('Ocorreu um erro ao salvar o currículo. Verifique o console para mais detalhes.');
        return false;
    }
}

// --- Listener para o Evento DOMContentLoaded ---
// Garante que o script só execute depois que o DOM do pop-up estiver completamente carregado.
document.addEventListener('DOMContentLoaded', () => {
    // Carrega todos os dados do currículo (pessoais e experiências) quando o pop-up é aberto
    loadResumeData();

    // Obtém referências aos elementos do DOM
    const resumeForm = document.getElementById('resumeForm');
    const addExperienceBtn = document.getElementById('addExperienceBtn'); // Certifique-se de que este botão existe no seu popup.html

    // Listener de evento para o envio do formulário (botão "Salvar Currículo")
       resumeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveResumeData();
    });

    // Listener de evento para o botão "Adicionar Experiência"
    addExperienceBtn.addEventListener('click', () => {
        const experiencesContainer = document.getElementById('experiencesContainer');
        experiencesContainer.appendChild(createExperienceBlock());
    });
});