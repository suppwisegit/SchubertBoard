import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// ─── Types ───────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed';
  comments: string[];
  createdAt: string;
}

interface Activity {
  id: string;
  type: 'announcement' | 'status_update' | 'new_task' | 'comment' | 'deleted';
  title: string;
  content: string;
  timestamp: string;
}

interface AppData {
  tasks: Task[];
  activities: Activity[];
  announcements: string[];
}

// ─── Persistence ─────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, '..', 'data.json');

function loadData(): AppData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load data.json, starting fresh:', e);
  }
  return { tasks: [], activities: [], announcements: [] };
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks, activities, announcements }, null, 2));
  } catch (e) {
    console.error('Failed to save data.json:', e);
  }
}

// ─── State ───────────────────────────────────────────────────────────
const data = loadData();
let tasks: Task[] = data.tasks;
let activities: Activity[] = data.activities;
let announcements: string[] = data.announcements;

const uid = () => Math.random().toString(36).substring(2, 9);

const addActivity = (type: Activity['type'], title: string, content: string) => {
  const activity: Activity = {
    id: uid(),
    type,
    title,
    content,
    timestamp: new Date().toISOString()
  };
  activities.unshift(activity);
  if (activities.length > 100) activities = activities.slice(0, 100);
  io.emit('new_activity', activity);
  saveData();
};

// ─── Socket Handlers ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🟢 Connected: ${socket.id}`);
  socket.emit('initial_data', { tasks, announcements, activities });

  socket.on('create_task', (taskData: Omit<Task, 'id' | 'status' | 'comments' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: uid(),
      status: 'pending',
      comments: [],
      createdAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    io.emit('task_created', newTask);
    addActivity('new_task', '🚀 Neue Aufgabe', `${newTask.assignee} hat eine neue Aufgabe: "${newTask.title}"`);
  });

  socket.on('update_task_status', ({ id, status }: { id: string, status: Task['status'] }) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      const oldStatus = task.status;
      task.status = status;
      io.emit('task_updated', task);
      const emoji = status === 'completed' ? '🎉' : status === 'in_progress' ? '⏳' : '🔄';
      const statusText = status === 'completed' ? 'erledigt' : status === 'in_progress' ? 'in Arbeit' : 'wieder offen';
      addActivity('status_update', `${emoji} Status: ${statusText}`, `"${task.title}" (${task.assignee}) ist jetzt ${statusText}.`);
    }
  });

  socket.on('add_comment', ({ id, comment }: { id: string, comment: string }) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.comments.push(comment);
      io.emit('task_updated', task);
      addActivity('comment', '💬 Kommentar', `Zu "${task.title}": "${comment}"`);
    }
  });

  socket.on('delete_task', (id: string) => {
    const idx = tasks.findIndex(t => t.id === id);
    const task = tasks[idx];
    if (idx !== -1 && task) {
      const title = task.title;
      tasks.splice(idx, 1);
      io.emit('task_deleted', id);
      addActivity('deleted', '🗑️ Gelöscht', `"${title}" wurde entfernt.`);
    }
  });

  socket.on('create_announcement', (text: string) => {
    announcements.push(text);
    io.emit('announcement_created', text);
    addActivity('announcement', '📢 Mitteilung', text);
  });

  socket.on('disconnect', () => console.log(`🔴 Disconnected: ${socket.id}`));
});

// Statische Dateien aus dem Frontend-Build servieren
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get(/(.*)/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n  🏂 SchubertBoard Server running on http://localhost:${PORT}\n`);
});
