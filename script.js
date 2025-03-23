// Inicialização do Supabase
const supabaseUrl = "https://kngcohputrawfkexcsmz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZ2NvaHB1dHJhd2ZrZXhjc216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwOTQ1ODMsImV4cCI6MjA1NzY3MDU4M30.MT3gfizwHeWR7IsaDdfxFTlrkG5HrpwpWQlPnGUTozs";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Elementos do DOM
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const confirmModal = document.getElementById('confirm-modal');
const closeBtn = document.querySelector('.close');
const themeToggle = document.getElementById('theme-toggle');
const taskForm = document.getElementById('task-form');
const cancelBtn = document.getElementById('cancel-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');

// Variáveis globais
let currentTaskId = null;
let deleteTaskId = null;

// Manipuladores de eventos
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadTheme();
    setupEventListeners();
    setupDragAndDrop();
});

function setupEventListeners() {
    // Evento para abrir o modal de novo trabalho
    addTaskBtn.addEventListener('click', () => {
        openTaskModal();
    });

    // Evento para fechar o modal
    closeBtn.addEventListener('click', closeTaskModal);
    cancelBtn.addEventListener('click', closeTaskModal);

    // Evento para alternar entre temas claro e escuro
    themeToggle.addEventListener('click', toggleTheme);

    // Evento para salvar um trabalho
    taskForm.addEventListener('submit', saveTask);

    // Eventos para confirmação de exclusão
    confirmDeleteBtn.addEventListener('click', deleteTask);
    cancelDeleteBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });
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
    } catch (error) {
        console.error('Erro ao carregar trabalhos:', error);
        alert('Não foi possível carregar os trabalhos. Verifique se a tabela "trabalhos" existe no Supabase.');
    }
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
    
    taskCard.innerHTML = `
        <div class="task-header">
            <span class="materia">${task.materia}</span>
            <div class="task-actions">
                <button class="edit-btn" onclick="editTask(${task.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="confirmDeleteTask(${task.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="task-title">${task.titulo}</div>
        <div class="task-description">${task.descricao || ''}</div>
        <div class="task-footer">
            ${task.data_entrega ? `
                <div class="task-date">
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

// Formata a data para exibição
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Abre o modal para adicionar um novo trabalho
function openTaskModal(taskId = null) {
    document.getElementById('modal-title').textContent = taskId ? 'Editar Trabalho' : 'Novo Trabalho';
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
        alert('Não foi possível carregar os dados do trabalho.');
        closeTaskModal();
    }
}

// Fecha o modal de trabalho
function closeTaskModal() {
    taskModal.style.display = 'none';
    taskForm.reset();
    currentTaskId = null;
}

// Salva um trabalho (cria ou atualiza)
async function saveTask(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    const materia = document.getElementById('materia').value;
    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;
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
        
        closeTaskModal();
        loadTasks();
    } catch (error) {
        console.error('Erro ao salvar trabalho:', error);
        alert('Não foi possível salvar o trabalho. Tente novamente.');
    }
}

// Prepara para editar um trabalho
function editTask(taskId) {
    openTaskModal(taskId);
}

// Abre o modal de confirmação de exclusão
function confirmDeleteTask(taskId) {
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
        loadTasks();
    } catch (error) {
        console.error('Erro ao excluir trabalho:', error);
        alert('Não foi possível excluir o trabalho.');
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
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTask.dataset.id);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

async function handleDrop(e) {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    const newStatus = e.currentTarget.id;
    const taskId = draggedTask.dataset.id;
    
    try {
        const { error } = await supabaseClient
            .from('trabalhos')
            .update({ status: newStatus })
            .eq('id', taskId);
            
        if (error) throw error;
        
        // Recarregar os trabalhos para atualizar a interface
        loadTasks();
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Não foi possível mover o trabalho.');
    }
    
    draggedTask = null;
}