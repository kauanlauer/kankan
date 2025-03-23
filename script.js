// Inicialização do Supabase
const supabaseUrl = "https://kngcohputrawfkexcsmz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZ2NvaHB1dHJhd2ZrZXhjc216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwOTQ1ODMsImV4cCI6MjA1NzY3MDU4M30.MT3gfizwHeWR7IsaDdfxFTlrkG5HrpwpWQlPnGUTozs";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Elementos do DOM
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const confirmModal = document.getElementById('confirm-modal');
const closeButtons = document.querySelectorAll('.close-btn');
const themeToggle = document.getElementById('theme-toggle');
const taskForm = document.getElementById('task-form');
const cancelBtn = document.getElementById('cancel-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const closeConfirmBtn = document.getElementById('close-confirm');

// Variáveis globais
let currentTaskId = null;
let deleteTaskId = null;

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    loadTheme();
    setupEventListeners();
    setupDragAndDrop();
    await loadTasks();
    updateColumnCounts();
}

// Configuração dos event listeners
function setupEventListeners() {
    // Botão de adicionar tarefa
    addTaskBtn.addEventListener('click', () => openTaskModal());
    
    // Fechamento de modais
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            taskModal.style.display = 'none';
            confirmModal.style.display = 'none';
        });
    });
    
    cancelBtn.addEventListener('click', () => taskModal.style.display = 'none');
    cancelDeleteBtn.addEventListener('click', () => confirmModal.style.display = 'none');
    closeConfirmBtn.addEventListener('click', () => confirmModal.style.display = 'none');
    
    // Clique fora do modal para fechar
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) taskModal.style.display = 'none';
        if (e.target === confirmModal) confirmModal.style.display = 'none';
    });
    
    // Tema
    themeToggle.addEventListener('click', toggleTheme);
    
    // Formulário
    taskForm.addEventListener('submit', saveTask);
    
    // Exclusão
    confirmDeleteBtn.addEventListener('click', deleteTask);
}

// Carrega os trabalhos do Supabase
async function loadTasks() {
    try {
        const { data, error } = await supabaseClient
            .from('trabalhos')
            .select('*')
            .order('data_entrega', { ascending: true });

        if (error) throw error;

        // Limpa os contêineres antes de adicionar novos cards
        document.querySelectorAll('.tasks-container').forEach(container => {
            container.innerHTML = '';
        });

        // Popula as colunas do kanban
        if (data && data.length > 0) {
            data.forEach(task => {
                addTaskCard(task);
            });
        }
        
        return data || [];
    } catch (error) {
        console.error('Erro ao carregar trabalhos:', error);
        showToast('Erro ao carregar os trabalhos. Verifique a conexão.', 'error');
        return [];
    }
}

// Atualiza contadores das colunas
function updateColumnCounts() {
    const statuses = ['nao_comecou', 'em_andamento', 'finalizado'];
    
    statuses.forEach(status => {
        const container = document.querySelector(`#${status} .tasks-container`);
        const countElement = document.getElementById(`${status}-count`);
        
        if (container && countElement) {
            const taskCount = container.querySelectorAll('.task-card').length;
            countElement.textContent = taskCount;
        }
    });
}

// Adiciona um card de trabalho ao kanban
function addTaskCard(task) {
    const container = document.querySelector(`#${task.status} .tasks-container`);
    if (!container) return;
    
    // Verificar se a data de entrega já passou
    const isOverdue = task.data_entrega && new Date(task.data_entrega) < new Date() && task.status !== 'finalizado';
    
    const taskCard = document.createElement('div');
    taskCard.className = `task-card ${isOverdue ? 'vencido' : ''}`;
    taskCard.dataset.id = task.id;
    taskCard.draggable = true;
    
    // Limitar descrição para exibição
    const description = task.descricao ? task.descricao : '';
    
    taskCard.innerHTML = `
        <div class="task-header">
            <span class="materia" title="${task.materia}">${task.materia}</span>
            <div class="task-actions">
                <button class="edit-btn" title="Editar" onclick="editTask(${task.id})">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="delete-btn" title="Excluir" onclick="confirmDeleteTask(${task.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <div class="task-title">${task.titulo}</div>
        ${description ? `<div class="task-description">${description}</div>` : ''}
        <div class="task-footer">
            ${task.data_entrega ? `
                <div class="task-date" title="${formatDateLong(task.data_entrega)}">
                    <i class="far fa-calendar-alt"></i>
                    ${formatDate(task.data_entrega)}
                </div>
            ` : ''}
        </div>
    `;
    
    // Adiciona funcionalidade de drag-and-drop
    taskCard.addEventListener('dragstart', handleDragStart);
    
    container.appendChild(taskCard);
}

// Formata a data para exibição abreviada
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit'
    });
}

// Formata a data para exibição completa
function formatDateLong(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Abre o modal para adicionar ou editar um trabalho
function openTaskModal(taskId = null) {
    document.getElementById('modal-title').textContent = taskId ? 'Editar trabalho' : 'Novo trabalho';
    document.getElementById('task-id').value = taskId || '';
    taskForm.reset();
    
    if (taskId) {
        currentTaskId = taskId;
        loadTaskData(taskId);
    } else {
        currentTaskId = null;
        document.getElementById('status').value = 'nao_comecou';
    }
    
    taskModal.style.display = 'block';
    
    // Foca no primeiro campo
    setTimeout(() => {
        document.getElementById('materia').focus();
    }, 100);
}

// Carrega os dados de um trabalho para edição
async function loadTaskData(taskId) {
    try {
        const { data, error } = await supabaseClient
            .from('trabalhos')
            .select('*')
            .eq('id', taskId)
            .single();
            
        if (error) throw error;
        
        document.getElementById('materia').value = data.materia;
        document.getElementById('titulo').value = data.titulo;
        document.getElementById('descricao').value = data.descricao || '';
        document.getElementById('status').value = data.status;
        
        if (data.data_entrega) {
            const date = new Date(data.data_entrega);
            const tzoffset = date.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date - tzoffset)).toISOString().slice(0, 16);
            document.getElementById('data-entrega').value = localISOTime;
        }
    } catch (error) {
        console.error('Erro ao carregar dados do trabalho:', error);
        showToast('Erro ao carregar os dados do trabalho.', 'error');
        taskModal.style.display = 'none';
    }
}

// Salva um trabalho (cria ou atualiza)
async function saveTask(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    const materia = document.getElementById('materia').value.trim();
    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const status = document.getElementById('status').value;
    const dataEntrega = document.getElementById('data-entrega').value;
    
    const taskData = {
        materia,
        titulo,
        descricao,
        status,
        data_entrega: dataEntrega || null
    };
    
    try {
        let response;
        
        if (taskId) {
            // Atualiza um trabalho existente
            response = await supabaseClient
                .from('trabalhos')
                .update(taskData)
                .eq('id', taskId);
        } else {
            // Cria um novo trabalho
            response = await supabaseClient
                .from('trabalhos')
                .insert([taskData]);
        }
        
        if (response.error) throw response.error;
        
        taskModal.style.display = 'none';
        
        // Recarrega os trabalhos e atualiza contadores
        await loadTasks();
        updateColumnCounts();
        
        showToast(taskId ? 'Trabalho atualizado com sucesso.' : 'Novo trabalho adicionado.', 'success');
    } catch (error) {
        console.error('Erro ao salvar trabalho:', error);
        showToast('Não foi possível salvar o trabalho.', 'error');
    }
}

// Prepara para editar um trabalho
function editTask(taskId) {
    event.stopPropagation();
    openTaskModal(taskId);
}

// Abre o modal de confirmação de exclusão
function confirmDeleteTask(taskId) {
    event.stopPropagation();
    deleteTaskId = taskId;
    confirmModal.style.display = 'block';
}

// Exclui um trabalho
async function deleteTask() {
    if (!deleteTaskId) return;
    
    try {
        const { error } = await supabaseClient
            .from('trabalhos')
            .delete()
            .eq('id', deleteTaskId);
            
        if (error) throw error;
        
        confirmModal.style.display = 'none';
        deleteTaskId = null;
        
        // Recarrega os trabalhos e atualiza contadores
        await loadTasks();
        updateColumnCounts();
        
        showToast('Trabalho excluído com sucesso.', 'success');
    } catch (error) {
        console.error('Erro ao excluir trabalho:', error);
        showToast('Não foi possível excluir o trabalho.', 'error');
    }
}

// Funções para alternar o tema (claro/escuro)
function toggleTheme() {
    const body = document.body;
    const icon = themeToggle.querySelector('i');
    
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const icon = themeToggle.querySelector('i');
    
    if (savedTheme === 'dark') {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        body.classList.add('light-mode');
        icon.classList.add('fa-moon');
    }
}

// Variável para armazenar o card sendo arrastado
let draggedTask = null;

// Configuração de drag-and-drop
function setupDragAndDrop() {
    document.querySelectorAll('.column').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTask.dataset.id);
    
    setTimeout(() => {
        draggedTask.classList.add('dragging');
    }, 0);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    
    this.classList.remove('drag-over');
    
    if (!draggedTask) return;
    
    draggedTask.classList.remove('dragging');
    
    const newStatus = e.currentTarget.id;
    const taskId = draggedTask.dataset.id;
    
    try {
        const { error } = await supabaseClient
            .from('trabalhos')
            .update({ status: newStatus })
            .eq('id', taskId);
            
        if (error) throw error;
        
        // Recarregar os trabalhos para atualizar a interface
        await loadTasks();
        updateColumnCounts();
        
        showToast('Status do trabalho atualizado.', 'success');
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showToast('Não foi possível mover o trabalho.', 'error');
    }
    
    draggedTask = null;
}

// Função para exibir toast de notificação
function showToast(message, type = 'info') {
    // Verifica se já existe um toast e remove
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Cria um novo toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Exibe o toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove o toast após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Adiciona estilos para o toast dinamicamente
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            max-width: 300px;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
        }
        
        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .toast-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .light-mode .toast.success {
            background-color: #ecfdf5;
            color: #047857;
            border-left: 4px solid #10b981;
        }
        
        .light-mode .toast.error {
            background-color: #fef2f2;
            color: #b91c1c;
            border-left: 4px solid #ef4444;
        }
        
        .light-mode .toast.info {
            background-color: #eff6ff;
            color: #1e40af;
            border-left: 4px solid #3b82f6;
        }
        
        .dark-mode .toast.success {
            background-color: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border-left: 4px solid #10b981;
        }
        
        .dark-mode .toast.error {
            background-color: rgba(239, 68, 68, 0.2);
            color: #f87171;
            border-left: 4px solid #ef4444;
        }
        
        .dark-mode .toast.info {
            background-color: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            border-left: 4px solid #3b82f6;
        }
        
        @media (max-width: 768px) {
            .toast {
                left: 20px;
                right: 20px;
                max-width: calc(100% - 40px);
            }
        }
    `;
    document.head.appendChild(style);
})();