/**
 * DailyFlow Core Logic
 * Handles Task CRUD, LocalStorage persistence, and UI updates.
 */
// --- State Management ---
class TaskManager {
    constructor() {
        this.tasks = [];
        this.STORAGE_KEY = 'dailyflow_tasks';
        this.loadTasks();
    }
    // CREATE
    addTask(title, category, priority) {
        const newTask = {
            id: crypto.randomUUID(),
            title,
            completed: false,
            category,
            priority,
            createdAt: Date.now()
        };
        this.tasks.unshift(newTask); // Add to top
        this.saveTasks();
        return newTask;
    }
    // READ
    getTasks() {
        return this.tasks;
    }
    // UPDATE
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
        }
        return task;
    }
    // DELETE
    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        // Trigger UI refresh externally or via observer pattern (simplified here)
    }
    // HELPERS
    getStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percent };
    }
    saveTasks() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tasks));
    }
    loadTasks() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.tasks = JSON.parse(stored);
            }
            catch (e) {
                console.error('Failed to load tasks', e);
                this.tasks = [];
            }
        }
    }
}
// --- UI Controller ---
class UIController {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.listElement = document.getElementById('task-list');
        this.progressRing = document.getElementById('progress-ring');
        this.progressText = document.getElementById('progress-percent');
        this.remainingText = document.getElementById('tasks-remaining');
        this.dateElement = document.getElementById('current-date');
        this.init();
    }
    init() {
        this.renderDate();
        this.renderTasks();
        this.updateStats();
        this.bindEvents();
    }
    renderDate() {
        const date = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        // Capitalize first letter
        const dateString = date.toLocaleDateString('pl-PL', options);
        this.dateElement.textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
    }
    renderTasks() {
        const tasks = this.taskManager.getTasks();
        this.listElement.innerHTML = '';
        if (tasks.length === 0) {
            this.listElement.innerHTML = `
                <div class="text-center py-10 opacity-50 animate-fade-in">
                    <span class="material-symbols-outlined text-4xl mb-2">assignment_add</span>
                    <p>Brak zadań. Dodaj coś!</p>
                </div>
            `;
            return;
        }
        tasks.forEach(task => {
            const el = this.createTaskElement(task);
            this.listElement.appendChild(el);
        });
    }
    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `group bg-slate-800 rounded-xl p-4 shadow-md flex items-center justify-between transition-all duration-300 ${task.completed ? 'opacity-50' : ''}`;
        div.dataset.id = task.id;
        const priorityColor = task.priority === 'high' ? 'text-rose-500' : 'text-slate-500';
        const categoryIcon = this.getCategoryIcon(task.category);
        div.innerHTML = `
            <div class="flex items-center gap-4 flex-1">
                <label class="checkbox-wrapper relative flex items-center justify-center w-6 h-6 cursor-pointer">
                    <input type="checkbox" class="peer appearance-none w-full h-full" ${task.completed ? 'checked' : ''}>
                    <div class="w-6 h-6 border-2 border-slate-600 rounded-full transition-colors peer-hover:border-emerald-500 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-white stroke-current stroke-2 fill-none" viewBox="0 0 24 24" stroke-dasharray="24" stroke-dashoffset="24" style="transition: stroke-dashoffset 0.2s">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </label>
                
                <div class="flex-1">
                    <h4 class="text-sm font-medium text-slate-100 transition-all ${task.completed ? 'line-through text-slate-500' : ''}">${task.title}</h4>
                    <div class="flex items-center gap-2 mt-1">
                         <span class="text-[10px] uppercase font-bold text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">${task.category}</span>
                         ${task.priority === 'high' ? '<span class="text-[10px] text-rose-500 font-bold flex items-center gap-0.5"><span class="material-symbols-outlined text-[12px]">priority_high</span> PILNE</span>' : ''}
                    </div>
                </div>
            </div>

            <button class="delete-btn opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-500 transition-opacity focus:opacity-100" aria-label="Usuń">
                <span class="material-symbols-outlined text-lg">delete</span>
            </button>
        `;
        // Event: Checkbox Toggle
        const checkbox = div.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            this.taskManager.toggleTask(task.id);
            this.renderTasks(); // Re-render to update sort/styles
            this.updateStats();
        });
        // Event: Delete Button
        const deleteBtn = div.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            // Simple fade out
            div.style.transform = 'translateX(100%)';
            div.style.opacity = '0';
            setTimeout(() => {
                this.taskManager.deleteTask(task.id);
                this.renderTasks();
                this.updateStats();
            }, 300);
        });
        return div;
    }
    getCategoryIcon(cat) {
        switch (cat) {
            case 'work': return 'work';
            case 'health': return 'fitness_center';
            case 'personal': return 'person';
            default: return 'circle';
        }
    }
    updateStats() {
        const { total, completed, percent } = this.taskManager.getStats();
        // Update Text
        this.progressText.textContent = `${percent}%`;
        if (total === 0) {
            this.remainingText.textContent = "Brak zadań";
        }
        else if (completed === total) {
            this.remainingText.textContent = "Wszystko zrobione!";
        }
        else {
            const left = total - completed;
            this.remainingText.textContent = `${left} ${left === 1 ? 'zadanie' : (left > 1 && left < 5 ? 'zadania' : 'zadań')} do zrobienia`;
        }
        // Update Ring (Circumference ~251.2 for r=40)
        const circumference = 251.2;
        const offset = circumference - (percent / 100) * circumference;
        this.progressRing.style.strokeDashoffset = offset.toString();
        // Color shift based on completion
        if (percent === 100) {
            this.progressRing.classList.remove('text-emerald-500');
            this.progressRing.classList.add('text-emerald-400');
        }
        else {
            this.progressRing.classList.add('text-emerald-500');
        }
    }
    bindEvents() {
        const form = document.getElementById('add-task-form');
        const modal = document.getElementById('task-modal');
        const titleInput = document.getElementById('task-title');
        const catInput = document.getElementById('task-category');
        const prioInput = document.getElementById('task-priority');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = titleInput.value.trim();
            if (!title)
                return;
            this.taskManager.addTask(title, catInput.value, prioInput.value);
            // Reset and Close
            form.reset();
            modal.classList.add('hidden');
            this.renderTasks();
            this.updateStats();
        });
    }
}
// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    const app = new UIController(taskManager);
    // Quick Fix for Mobile Viewport Height
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});
