// Variável global para gerar IDs únicos para os blocos de experiência.
let experienceCounter = 0;

function createExperienceBlock(experience = {}) {
    experienceCounter++; 

    const experienceDiv = document.createElement('div');
    experienceDiv.classList.add('experience-item'); 
    experienceDiv.dataset.id = experienceCounter; 

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
        <hr> `;

   
    

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

    // Inicializa o estado do campo de Data de Fim com base no checkbox "Atual",
    
    if (currentJobCheckbox.checked) {
        endDateInput.disabled = true;
    }

    return experienceDiv;
}

async function loadResumeData() {
    try {
        const result = await chrome.storage.local.get('userResume');
        const userResume = result.userResume || {};

        // 1. Carrega Dados Pessoais
        const personalData = userResume.personal || {};
        document.getElementById('fullName').value = personalData.fullName || '';
        document.getElementById('email').value = personalData.email || '';
        document.getElementById('phone').value = personalData.phone || '';
        document.getElementById('address').value = personalData.address || '';

        // 2. Carrega Experiências Profissionais
        const experiencesContainer = document.getElementById('experiencesContainer');
        experiencesContainer.innerHTML = ''; 
        experienceCounter = 0; 

        if (userResume.experience && Array.isArray(userResume.experience)) {
            userResume.experience.forEach(exp => {
                experiencesContainer.appendChild(createExperienceBlock(exp));
            });
        }

        // Se nenhuma experiência foi carregada (ex: usuário novo), adiciona um bloco vazio por padrão
        if (!userResume.experience || userResume.experience.length === 0) {
            experiencesContainer.appendChild(createExperienceBlock());
        }

    } catch (error) {
        console.error('Erro ao carregar currículo:', error);
    }
}

async function saveResumeData() {
    // 1. Coleta Dados Pessoais
    const personalData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value
    };

    // Validação básica de e-mail
    if (!personalData.email || !personalData.email.includes('@') || !personalData.email.includes('.')) {
        alert('Por favor, insira um e-mail válido.');
        return false; // Impede o salvamento se o e-mail for inválido
    }

    // 2. Coleta Experiências Profissionais
    const experiences = [];
    // Seleciona todos os elementos com a classe 'experience-item' dentro do container
    const experienceItems = document.querySelectorAll('.experience-item');

    experienceItems.forEach(item => {
        const jobTitle = item.querySelector('.job-title').value;
        const company = item.querySelector('.company').value;
        const startDate = item.querySelector('.start-date').value;
        const endDateInput = item.querySelector('.end-date');
        const currentJobCheckbox = item.querySelector('.current-job-checkbox');
        const description = item.querySelector('.description').value;

        let endDateValue = endDateInput.value;
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

    try {
        // Carrega a estrutura userResume existente para não sobrescrever outras seções, se houver
        const result = await chrome.storage.local.get('userResume');
        const userResume = result.userResume || {};

        // Atualiza as seções pessoal e de experiência do objeto userResume
        userResume.personal = personalData;
        userResume.experience = experiences; 

        // Salva o objeto userResume completo de volta em chrome.storage.local
        await chrome.storage.local.set({ 'userResume': userResume });
        alert('Currículo salvo com sucesso!'); 
        return true;
    } catch (error) {
        console.error('Erro ao salvar currículo:', error);
        alert('Ocorreu um erro ao salvar o currículo.');
        return false;
    }
}

// Listener para o evento DOMContentLoaded 

document.addEventListener('DOMContentLoaded', () => {
    // Carrega todos os dados do currículo (pessoais e experiências) quando o pop-up é aberto
    loadResumeData();

    // Obtém referências ao formulário e ao botão "Adicionar Experiência"
    const resumeForm = document.getElementById('resumeForm');
    // Certifique-se de que este botão existe no seu popup.html
    const addExperienceBtn = document.getElementById('addExperienceBtn'); 

    // Listener de evento para o envio do formulário (botão "Salvar Currículo")
    resumeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveResumeData(); 
    });

    // Listener de evento para o botão "Adicionar Experiência"
    addExperienceBtn.addEventListener('click', () => {
        const experiencesContainer = document.getElementById('experiencesContainer');
        // Adiciona um novo bloco de experiência vazio ao container
        experiencesContainer.appendChild(createExperienceBlock());
    });
});