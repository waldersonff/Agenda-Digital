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
    } else {
        window.location.href = 'login.html';
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    });
});

// Calendar
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    // Clear previous
    calendar.innerHTML = '';

    // Days of week
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    days.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.classList.add('calendar-day');
        calendar.appendChild(dayEl);
    });

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        const emptyEl = document.createElement('div');
        emptyEl.classList.add('calendar-day');
        calendar.appendChild(emptyEl);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.classList.add('calendar-day');
        dayEl.addEventListener('click', () => {
            // Highlight selected day or show tasks for that day
            alert(`Dia ${day} selecionado`);
        });
        calendar.appendChild(dayEl);
    }
}

// Tasks
document.getElementById('add-task-btn').addEventListener('click', addTask);

function addTask() {
    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date');
    const taskText = taskInput.value.trim();
    const date = taskDate.value;

    if (taskText && date) {
        const userId = auth.currentUser.uid;
        const tasksRef = ref(database, `users/${userId}/tasks`);
        const newTaskRef = push(tasksRef);
        set(newTaskRef, {
            text: taskText,
            date: date,
            completed: false
        }).then(() => {
            taskInput.value = '';
            taskDate.value = '';
            loadTasks();
        });
    }
}

function loadTasks() {
    const userId = auth.currentUser.uid;
    const tasksRef = ref(database, `users/${userId}/tasks`);
    get(tasksRef).then((snapshot) => {
        const tasks = snapshot.val();
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';

        if (tasks) {
            Object.keys(tasks).forEach(key => {
                const task = tasks[key];
                const li = document.createElement('li');
                li.classList.add('task-item');
                if (task.completed) li.classList.add('completed');

                li.innerHTML = `
                    <span>${task.text} (${task.date})</span>
                    <div>
                        <button onclick="toggleTask('${key}', ${task.completed})">${task.completed ? 'Desmarcar' : 'Marcar'}</button>
                        <button onclick="deleteTask('${key}')">Excluir</button>
                    </div>
                `;
                taskList.appendChild(li);
            });
        }
    });
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
        set(gamRef, gam).then(() => {
            loadGamification();
        });
    });
}
