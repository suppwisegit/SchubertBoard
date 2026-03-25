import { useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle, Clock, Circle, Send } from 'lucide-react';
import './KidsDashboard.css';

// ─── Helpers ─────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.floor(hours / 24)} Tag(en)`;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// ─── Confetti ────────────────────────────────────────────────────────
const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

function Confetti({ onDone }: { onDone: () => void }) {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100 + '%',
    bg: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.5 + 's',
    size: Math.random() * 8 + 6,
    rotation: Math.random() * 360,
  }));

  setTimeout(onDone, 2000);

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: p.left,
          backgroundColor: p.bg,
          animationDelay: p.delay,
          width: p.size,
          height: p.size,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          transform: `rotate(${p.rotation}deg)`,
        }} />
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────
const KidsDashboard = () => {
  const { tasks, activities, updateTaskStatus, addComment } = useSocket();
  const [activeTab, setActiveTab] = useState<'feed' | 'tasks'>('feed');
  const [showConfetti, setShowConfetti] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Sort: high > medium > low, then by creation date
  const sortedTasks = [...tasks].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const pendingCount = tasks.filter(t => t.status !== 'completed').length;

  const handleStatusClick = useCallback((taskId: string, currentStatus: string) => {
    const next = currentStatus === 'pending' ? 'in_progress' as const :
                 currentStatus === 'in_progress' ? 'completed' as const : 'pending' as const;
    if (next === 'completed') setShowConfetti(true);
    updateTaskStatus(taskId, next);
  }, [updateTaskStatus]);

  const handleSendComment = (taskId: string) => {
    const text = commentInputs[taskId]?.trim();
    if (!text) return;
    addComment(taskId, text);
    setCommentInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  const getPriorityLabel = (p: string) => p === 'high' ? '🔴 Hoch' : p === 'medium' ? '🟡 Mittel' : '🟢 Niedrig';

  return (
    <div className="kids-dashboard">
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      <header className="dashboard-header glass-panel">
        <h1>SchubertBoard 🏂</h1>
        <p>Dein Familien-Hub</p>
        {tasks.length > 0 && (
          <div className="header-progress">
            <span className="progress-label">{completedCount}/{tasks.length} erledigt ({progressPercent}%)</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </header>

      <div className="tab-navigation glass-panel">
        <button className={activeTab === 'feed' ? 'active' : ''} onClick={() => setActiveTab('feed')}>
          📰 Neuigkeiten
          {activities.length > 0 && <span className="tab-badge">{activities.length}</span>}
        </button>
        <button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}>
          📋 Aufgaben
          {pendingCount > 0 && <span className="tab-badge warning">{pendingCount}</span>}
        </button>
      </div>

      <main className="tab-content glass-panel">
        <AnimatePresence mode="wait">
          {activeTab === 'feed' ? (
            <motion.div key="feed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="feed-list">
              <h2>Neuigkeiten & Aktivitäten</h2>
              {activities.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>Noch nichts passiert.</p>
                  <span>Sobald Mama eine Aufgabe erstellt, siehst du es hier!</span>
                </div>
              ) : (
                <div className="activity-feed">
                  {activities.map(a => (
                    <motion.div key={a.id} className={`feed-block ${a.type}`}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                      <div className="feed-block-header">
                        <span className="feed-type-badge">
                          {a.type === 'announcement' ? '📢 MITTEILUNG' :
                           a.type === 'new_task' ? '🚀 NEUE AUFGABE' :
                           a.type === 'status_update' ? '🔄 STATUS' :
                           a.type === 'deleted' ? '🗑️ GELÖSCHT' : '💬 KOMMENTAR'}
                        </span>
                        <span className="feed-time">{timeAgo(a.timestamp)}</span>
                      </div>
                      <div className="feed-block-content">
                        <h3>{a.title}</h3>
                        <p>{a.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="tasks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="tasks-container">
              <h2>Deine Aufgaben</h2>
              {sortedTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎉</div>
                  <p>Alles erledigt!</p>
                  <span>Keine offenen Aufgaben. Genieß deine Freizeit!</span>
                </div>
              ) : (
                <div className="task-grid">
                  {sortedTasks.map(task => (
                    <motion.div key={task.id} className={`task-card status-${task.status}`}
                      layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                      <div className="task-header">
                        <span className="priority-badge">{getPriorityLabel(task.priority)}</span>
                        <h3>{task.title}</h3>
                      </div>
                      {task.description && <p className="task-desc">{task.description}</p>}
                      <div className="task-meta">
                        <span className="assignee">👤 {task.assignee}</span>
                        <button className={`status-btn status-${task.status}`} onClick={() => handleStatusClick(task.id, task.status)}>
                          {task.status === 'completed' ? <><CheckCircle size={16} /> Erledigt</> :
                           task.status === 'in_progress' ? <><Clock size={16} /> In Arbeit</> :
                           <><Circle size={16} /> Offen</>}
                        </button>
                      </div>

                      {/* Comments */}
                      <div className="comments-section">
                        {task.comments.length > 0 && (
                          <ul className="comments-list">
                            {task.comments.map((c, i) => <li key={i}>💬 {c}</li>)}
                          </ul>
                        )}
                        <div className="comment-input-row">
                          <input
                            type="text"
                            placeholder="Kommentar..."
                            value={commentInputs[task.id] || ''}
                            onChange={e => setCommentInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleSendComment(task.id)}
                          />
                          <button className="send-btn" onClick={() => handleSendComment(task.id)}>
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default KidsDashboard;
