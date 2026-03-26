import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { PlusCircle, Trash2, Megaphone, CheckCircle, Clock, Circle } from 'lucide-react';
import './ParentDashboard.css';

const PRESETS = [
  { title: 'Wäsche machen', description: 'Wäsche waschen und aufhängen', priority: 'medium' as const, emoji: '👕' },
  { title: 'Zimmer aufräumen', description: 'Boden frei machen und staubsaugen', priority: 'high' as const, emoji: '🧹' },
  { title: 'Spülmaschine ausräumen', description: 'Geschirr in die Schränke räumen', priority: 'medium' as const, emoji: '🍽️' },
  { title: 'Müll rausbringen', description: 'Restmüll und Papier entsorgen', priority: 'medium' as const, emoji: '🗑️' },
  { title: 'Tisch decken', description: 'Teller, Besteck und Gläser', priority: 'low' as const, emoji: '🍴' },
  { title: 'Haustier füttern', description: 'Futter und frisches Wasser', priority: 'high' as const, emoji: '🐾' },
  { title: 'Einkaufen gehen', description: 'Einkaufsliste mitnehmen!', priority: 'medium' as const, emoji: '🛒' },
  { title: 'Staubsaugen', description: 'Alle Zimmer durchgehen', priority: 'medium' as const, emoji: '🧹' },
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const ParentDashboard = () => {
  const { parentSecret } = useParams();
  const { tasks, createTask, deleteTask, createAnnouncement } = useSocket();
  const [announcementText, setAnnouncementText] = useState('');
  const [newTask, setNewTask] = useState<{
    title: string; description: string; priority: 'low'|'medium'|'high'; assignee: string;
  }>({ title: '', description: '', priority: 'medium', assignee: '' });

  const isAuthorized = parentSecret === 'mama123' || parentSecret === 'papa456';

  if (!isAuthorized) {
    return (
      <div className="unauthorized glass-panel">
        <div className="empty-icon">🔒</div>
        <h1>Zugang verweigert</h1>
        <p>Dieser Bereich ist nur für Eltern bestimmt.</p>
      </div>
    );
  }

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    createTask({ ...newTask, assignee: newTask.assignee.trim() || 'Alle' });
    setNewTask({ title: '', description: '', priority: 'medium', assignee: '' });
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText) return;
    createAnnouncement(announcementText);
    setAnnouncementText('');
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setNewTask({ ...newTask, title: p.title, description: p.description, priority: p.priority });
  };

  const sortedTasks = [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const parentName = parentSecret === 'mama123' ? 'Mama' : 'Papa';

  return (
    <div className="parent-dashboard">
      <header className="dashboard-header glass-panel">
        <h1>Hallo, {parentName} 👋</h1>
        <p>SchubertBoard — Eltern-Kontrolle</p>
        {tasks.length > 0 && (
          <div className="header-progress">
            <span className="progress-label">{completedCount}/{tasks.length} erledigt ({progressPercent}%)</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </header>

      <div className="grid-container">
        <section className="task-creation glass-panel">
          <h2>Neue Aufgabe erstellen</h2>

          <div className="presets-list">
            <p>⚡ Schnellvorlagen</p>
            <div className="preset-badges">
              {PRESETS.map((p, i) => (
                <button key={i} className="preset-btn" onClick={() => applyPreset(p)}>
                  {p.emoji} {p.title}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateTask}>
            <input type="text" placeholder="Titel der Aufgabe" value={newTask.title}
              onChange={e => setNewTask({...newTask, title: e.target.value})} required />
            <textarea placeholder="Beschreibung (optional)" value={newTask.description}
              onChange={e => setNewTask({...newTask, description: e.target.value})} rows={2} />
            <div className="form-row">
              <select value={newTask.priority}
                onChange={e => setNewTask({...newTask, priority: e.target.value as 'low'|'medium'|'high'})}>
                <option value="low">🟢 Niedrig</option>
                <option value="medium">🟡 Mittel</option>
                <option value="high">🔴 Hoch</option>
              </select>
              <input type="text" placeholder="Zugewiesen an (leer = Alle)" value={newTask.assignee}
                onChange={e => setNewTask({...newTask, assignee: e.target.value})} />
            </div>
            <button type="submit" className="primary full-width">
              <PlusCircle size={18} /> Aufgabe erstellen
            </button>
          </form>
        </section>

        <section className="side-panels">
          <div className="announcements glass-panel">
            <h2>📢 Mitteilung senden</h2>
            <form onSubmit={handleSendAnnouncement}>
              <textarea placeholder="Nachricht an die ganze Familie…" value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)} rows={3} required />
              <button type="submit" className="primary full-width">
                <Megaphone size={18} /> Senden
              </button>
            </form>
          </div>

          <div className="task-management glass-panel">
            <h2>📋 Aufgaben-Übersicht</h2>
            {sortedTasks.length === 0 ? (
              <div className="empty-state-small">
                <p>Keine Aufgaben vorhanden.</p>
              </div>
            ) : (
              <ul className="task-list-admin">
                {sortedTasks.map(task => (
                  <li key={task.id} className={`task-row status-${task.status}`}>
                    <div className="task-info">
                      <div className="task-title-row">
                        <span className="status-icon">
                          {task.status === 'completed' ? <CheckCircle size={16} /> :
                           task.status === 'in_progress' ? <Clock size={16} /> : <Circle size={16} />}
                        </span>
                        <strong>{task.title}</strong>
                      </div>
                      <div className="task-badges">
                        <span className="badge">👤 {task.assignee}</span>
                        <span className={`badge status-${task.status}`}>
                          {task.status === 'pending' ? 'Offen' : task.status === 'in_progress' ? 'In Arbeit' : 'Erledigt'}
                        </span>
                        <span className="badge priority">{task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}</span>
                      </div>
                      {task.comments.length > 0 && (
                        <div className="last-comment">💬 „{task.comments[task.comments.length - 1]}"</div>
                      )}
                    </div>
                    <button className="danger icon-only" onClick={() => deleteTask(task.id)} title="Löschen">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ParentDashboard;
