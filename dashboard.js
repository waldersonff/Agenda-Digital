import { auth, database } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, set, get, push, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Check authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('user-name').textContent = user.displayName || user.email;
        loadTasks();
        loadGamification();
        renderCalendar();
        loadNotes();
    } else {
        window.location.href = 'login.html';
    }
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('#theme-toggle i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
});

// Load theme on page load
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    const icon = document.querySelector('#theme-toggle i');
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    });
});

// Calendar functionality
let currentCalendarDate = new Date();

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Update month/year display
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('current-month-year').textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    calendar.innerHTML = '';

    // Get tasks for the current month to mark days with tasks
    const userId = auth.currentUser.uid;
    const tasksRef = ref(database, `users/${userId}/tasks`);
    get(tasksRef).then((snapshot) => {
        const tasks = snapshot.val() || {};
        const daysWithTasks = new Set();

        Object.values(tasks).forEach(task => {
            if (task.date) {
                const taskDate = new Date(task.date);
                if (taskDate.getMonth() === month && taskDate.getFullYear() === year) {
                    daysWithTasks.add(taskDate.getDate());
                }
            }
        });

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const date = new Date(d); // Create a copy to avoid closure issues
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = date.getDate();

            const today = new Date();
            if (date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate()) {
                dayElement.classList.add('today');
            }

            if (date.getMonth() !== month) {
                dayElement.style.opacity = '0.5';
            }

            // Mark days with tasks
            if (daysWithTasks.has(date.getDate()) && date.getMonth() === month) {
                dayElement.classList.add('has-tasks');
            }

            dayElement.addEventListener('click', () => {
                showTasksForDate(date);
            });

            calendar.appendChild(dayElement);
        }
    });
}

// Month navigation
document.getElementById('prev-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
});

// Show tasks for a specific date in modal
function showTasksForDate(date) {
    const modal = document.getElementById('task-modal');
    const modalDate = document.getElementById('modal-date');
    const modalTasks = document.getElementById('modal-tasks');

    modalDate.textContent = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const userId = auth.currentUser.uid;
    const tasksRef = ref(database, `users/${userId}/tasks`);
    get(tasksRef).then((snapshot) => {
        const tasks = snapshot.val() || {};
        const dayTasks = Object.keys(tasks).filter(key => {
            const task = tasks[key];
            if (!task.date) return false;
            const taskDate = new Date(task.date);
            return taskDate.getFullYear() === date.getFullYear() &&
                   taskDate.getMonth() === date.getMonth() &&
                   taskDate.getDate() === date.getDate();
        }).map(key => ({ key, ...tasks[key] }));

        modalTasks.innerHTML = '';

        if (dayTasks.length === 0) {
            modalTasks.innerHTML = '<p style="text-align: center; color: #64748b; font-style: italic;">Nenhuma tarefa para este dia</p>';
        } else {
            dayTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                modalTasks.appendChild(taskElement);
            });
        }

        modal.style.display = 'block';

        // Close modal when clicking outside or on close button
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.onclick = () => modal.style.display = 'none';

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    });
}

// Create task element for modal
function createTaskElement(task) {
    const li = document.createElement('li');
    li.classList.add('task-item');
    if (task.completed) li.classList.add('completed');
    li.classList.add(`task-priority-${task.priority || 'medium'}`);

    // Check if task is due soon or overdue
    if (task.date) {
        const taskDate = new Date(task.date);
        const today = new Date();
        const diffTime = taskDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0 && !task.completed) {
            li.classList.add('overdue');
        } else if (diffDays <= 1 && !task.completed) {
            li.classList.add('due-soon');
        }
    }

    li.innerHTML = `
        <span>${task.text}</span>
        <div>
            <button onclick="toggleTask('${task.key}', ${task.completed})">${task.completed ? 'Desmarcar' : 'Marcar'}</button>
            <button onclick="deleteTask('${task.key}')">Excluir</button>
        </div>
    `;

    return li;
}

// Task search
document.getElementById('search-input').addEventListener('input', (e) => {
    searchTasks(e.target.value);
});

function searchTasks(query) {
    const userId = auth.currentUser.uid;
    const tasksRef = ref(database, `users/${userId}/tasks`);
    get(tasksRef).then((snapshot) => {
        const tasks = snapshot.val();
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';

        if (tasks) {
            const taskArray = Object.keys(tasks).map(key => ({ key, ...tasks[key] }));
            taskArray.sort((a, b) => new Date(a.date) - new Date(b.date));

            const filteredTasks = taskArray.filter(task =>
                task.text.toLowerCase().includes(query.toLowerCase()) ||
                (task.category && getCategoryName(task.category).toLowerCase().includes(query.toLowerCase()))
            );

            filteredTasks.forEach(task => {
                const li = document.createElement('li');
                li.classList.add('task-item');
                if (task.completed) li.classList.add('completed');
                li.classList.add(`task-priority-${task.priority || 'medium'}`);
                li.classList.add(`task-category-${task.category || 'outros'}`);

                // Check if task is due soon or overdue
                if (task.date) {
                    const taskDate = new Date(task.date);
                    const today = new Date();
                    const diffTime = taskDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0 && !task.completed) {
                        li.classList.add('overdue');
                    } else if (diffDays <= 1 && !task.completed) {
                        li.classList.add('due-soon');
                    }
                }

                li.draggable = true;
                li.addEventListener('dragstart', handleDragStart);
                li.addEventListener('dragend', handleDragEnd);

                li.innerHTML = `
                    <span>${task.text} (${task.date}) <small class="task-category">${getCategoryName(task.category)}</small></span>
                    <div>
                        <button onclick="toggleTask('${task.key}', ${task.completed})">${task.completed ? 'Desmarcar' : 'Marcar'}</button>
                        <button onclick="deleteTask('${task.key}')">Excluir</button>
                    </div>
                `;
                taskList.appendChild(li);
            });
        }
    });
}

// Task filters
document.getElementById('filter-all').addEventListener('click', () => filterTasks('all'));
document.getElementById('filter-pending').addEventListener('click', () => filterTasks('pending'));
document.getElementById('filter-completed').addEventListener('click', () => filterTasks('completed'));
document.getElementById('category-filter').addEventListener('change', (e) => filterTasks('all', e.target.value));

function filterTasks(filter, categoryFilter = 'all') {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.tagName === 'BUTTON') btn.classList.remove('active');
    });
    document.getElementById(`filter-${filter}`).classList.add('active');
    loadTasks(filter, categoryFilter);
}

// Tasks
document.getElementById('add-task-btn').addEventListener('click', addTask);

function addTask() {
    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date');
    const taskPriority = document.getElementById('task-priority');
    const taskCategory = document.getElementById('task-category');
    const taskText = taskInput.value.trim();
    const date = taskDate.value;
    const priority = taskPriority.value;
    const category = taskCategory.value;

    if (taskText && date) {
        const userId = auth.currentUser.uid;
        const tasksRef = ref(database, `users/${userId}/tasks`);
        const newTaskRef = push(tasksRef);
        set(newTaskRef, {
            text: taskText,
            date: date,
            priority: priority,
            category: category,
            completed: false,
            createdAt: new Date().toISOString()
        }).then(() => {
            taskInput.value = '';
            taskDate.value = '';
            taskPriority.value = 'medium';
            taskCategory.value = 'trabalho';
            // Navigate calendar to the month of the added task
            const taskDateObj = new Date(date);
            currentCalendarDate.setFullYear(taskDateObj.getFullYear());
            currentCalendarDate.setMonth(taskDateObj.getMonth());
            loadTasks();
            renderCalendar(); // Re-render calendar to show new task on correct day
        });
    }
}

function loadTasks(filter = 'all', categoryFilter = 'all') {
    const userId = auth.currentUser.uid;
    const tasksRef = ref(database, `users/${userId}/tasks`);
    get(tasksRef).then((snapshot) => {
        const tasks = snapshot.val();
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';

        if (tasks) {
            const taskArray = Object.keys(tasks).map(key => ({ key, ...tasks[key] }));
            taskArray.sort((a, b) => new Date(a.date) - new Date(b.date));

            taskArray.forEach(task => {
                if (filter === 'pending' && task.completed) return;
                if (filter === 'completed' && !task.completed) return;
                if (categoryFilter !== 'all' && task.category !== categoryFilter) return;

                const li = document.createElement('li');
                li.classList.add('task-item');
                if (task.completed) li.classList.add('completed');
                li.classList.add(`task-priority-${task.priority || 'medium'}`);
                li.classList.add(`task-category-${task.category || 'outros'}`);

                // Check if task is due soon or overdue
                if (task.date) {
                    const taskDate = new Date(task.date);
                    const today = new Date();
                    const diffTime = taskDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0 && !task.completed) {
                        li.classList.add('overdue');
                    } else if (diffDays <= 1 && !task.completed) {
                        li.classList.add('due-soon');
                    }
                }

                li.innerHTML = `
                    <span>${task.text} (${task.date}) <small class="task-category">${getCategoryName(task.category)}</small></span>
                    <div>
                        <button onclick="toggleTask('${task.key}', ${task.completed})">${task.completed ? 'Desmarcar' : 'Marcar'}</button>
                        <button onclick="deleteTask('${task.key}')">Excluir</button>
                    </div>
                `;
                taskList.appendChild(li);
            });
        }
    });
}

function getCategoryName(category) {
    const categories = {
        'pessoal': 'Pessoal',
        'trabalho': 'Trabalho',
        'estudos': 'Estudos',
        'saude': 'Saúde',
        'outros': 'Outros'
    };
    return categories[category] || 'Outros';
}

window.toggleTask = function(key, completed) {
    const userId = auth.currentUser.uid;
    const taskRef = ref(database, `users/${userId}/tasks/${key}`);
    update(taskRef, { completed: !completed }).then(() => {
        loadTasks();
        if (!completed) {
            updateGamification(10); // Points for completing task
        }
    });
};

window.deleteTask = function(key) {
    const userId = auth.currentUser.uid;
    const taskRef = ref(database, `users/${userId}/tasks/${key}`);
    remove(taskRef).then(() => {
        loadTasks();
        renderCalendar(); // Re-render calendar to remove task indicator if no more tasks on that day
    });
};

// Gamification
function loadGamification() {
    const userId = auth.currentUser.uid;
    const gamRef = ref(database, `users/${userId}/gamification`);
    get(gamRef).then((snapshot) => {
        const gam = snapshot.val() || { points: 0, level: 1, badges: [] };
        document.getElementById('points-value').textContent = gam.points;
        document.getElementById('level-value').textContent = gam.level;
        document.getElementById('badges-list').textContent = gam.badges.join(', ') || 'Nenhum';
        updateProgressBar(gam.points, gam.level);
    });
}

function updateGamification(pointsEarned) {
    const userId = auth.currentUser.uid;
    const gamRef = ref(database, `users/${userId}/gamification`);
    get(gamRef).then((snapshot) => {
        const gam = snapshot.val() || { points: 0, level: 1, badges: [] };
        gam.points += pointsEarned;
        gam.level = Math.floor(gam.points / 100) + 1; // Level up every 100 points
        if (gam.points >= 50 && !gam.badges.includes('Primeira Tarefa')) {
            gam.badges.push('Primeira Tarefa');
        }
        if (gam.points >= 200 && !gam.badges.includes('Produtivo')) {
            gam.badges.push('Produtivo');
        }
        if (gam.points >= 500 && !gam.badges.includes('Mestre das Tarefas')) {
            gam.badges.push('Mestre das Tarefas');
        }
        set(gamRef, gam).then(() => {
            loadGamification();
            updateProgressBar(gam.points, gam.level);
        });
    });
}

function updateProgressBar(points, level) {
    const progressFill = document.getElementById('progress-fill');
    const pointsToNextLevel = (level * 100) - points;
    const progressPercent = ((100 - pointsToNextLevel) / 100) * 100;
    progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
}

// Notes
document.getElementById('add-note-btn').addEventListener('click', addNote);

function addNote() {
    const noteInput = document.getElementById('note-input');
    const noteText = noteInput.value.trim();

    if (noteText) {
        const userId = auth.currentUser.uid;
        const notesRef = ref(database, `users/${userId}/notes`);
        const newNoteRef = push(notesRef);
        set(newNoteRef, {
            text: noteText,
            createdAt: new Date().toISOString()
        }).then(() => {
            noteInput.value = '';
            loadNotes();
        });
    }
}

function loadNotes() {
    const userId = auth.currentUser.uid;
    const notesRef = ref(database, `users/${userId}/notes`);
    get(notesRef).then((snapshot) => {
        const notes = snapshot.val();
        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';

        if (notes) {
            Object.keys(notes).forEach(key => {
                const note = notes[key];
                const noteDiv = document.createElement('div');
                noteDiv.classList.add('note-item');
                noteDiv.innerHTML = `
                    <p>${note.text}</p>
                    <button class="delete-note" onclick="deleteNote('${key}')">×</button>
                `;
                notesList.appendChild(noteDiv);
            });
        }
    });
}

window.deleteNote = function(key) {
    const userId = auth.currentUser.uid;
    const noteRef = ref(database, `users/${userId}/notes/${key}`);
    remove(noteRef).then(() => {
        loadNotes();
    });
};

// Drag and drop functionality
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.style.opacity = '0.5';
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedElement = null;
}

// Add drop zones for drag and drop (optional, for future enhancement)

// Notification system for due tasks
function checkDueTasks() {
    const userId = auth.currentUser.uid;
    const tasksRef = ref(database, `users/${userId}/tasks`);
    get(tasksRef).then((snapshot) => {
        const tasks = snapshot.val();
        if (tasks) {
            const now = new Date();
            const dueSoonTasks = [];
            const overdueTasks = [];

            Object.values(tasks).forEach(task => {
                if (!task.completed && task.date) {
                    const taskDate = new Date(task.date);
                    const diffTime = taskDate - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                        overdueTasks.push(task);
                    } else if (diffDays <= 1) {
                        dueSoonTasks.push(task);
                    }
                }
            });

            // Show notifications
            if (overdueTasks.length > 0) {
                showNotification(`Você tem ${overdueTasks.length} tarefa(s) vencida(s)!`, 'overdue');
            }
            if (dueSoonTasks.length > 0) {
                showNotification(`Você tem ${dueSoonTasks.length} tarefa(s) vencendo em breve!`, 'due-soon');
            }
        }
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Check for due tasks on page load and periodically
setInterval(checkDueTasks, 60000); // Check every minute
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ... existing code ...
        checkDueTasks(); // Check immediately on login
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'n':
                e.preventDefault();
                document.getElementById('task-input').focus();
                break;
            case 's':
                e.preventDefault();
                document.getElementById('search-input').focus();
                break;
            case '/':
                e.preventDefault();
                document.getElementById('note-input').focus();
                break;
        }
    }
});

// Export data functionality
document.getElementById('export-btn').addEventListener('click', exportData);

function exportData() {
    const userId = auth.currentUser.uid;
    const data = {};

    Promise.all([
        get(ref(database, `users/${userId}/tasks`)),
        get(ref(database, `users/${userId}/notes`)),
        get(ref(database, `users/${userId}/gamification`))
    ]).then(([tasksSnap, notesSnap, gamSnap]) => {
        data.tasks = tasksSnap.val() || {};
        data.notes = notesSnap.val() || {};
        data.gamification = gamSnap.val() || {};

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agenda-digital-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Dados exportados com sucesso!', 'success');
    });
}

// Import data functionality
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', importData);

function importData(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const userId = auth.currentUser.uid;

                // Import tasks
                if (data.tasks) {
                    const tasksRef = ref(database, `users/${userId}/tasks`);
                    set(tasksRef, data.tasks);
                }

                // Import notes
                if (data.notes) {
                    const notesRef = ref(database, `users/${userId}/notes`);
                    set(notesRef, data.notes);
                }

                // Import gamification
                if (data.gamification) {
                    const gamRef = ref(database, `users/${userId}/gamification`);
                    set(gamRef, data.gamification);
                }

                loadTasks();
                loadNotes();
                loadGamification();
                renderCalendar();

                showNotification('Dados importados com sucesso!', 'success');
            } catch (error) {
                showNotification('Erro ao importar dados. Verifique o arquivo.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Add export/import buttons to the UI (assuming they exist in HTML)
