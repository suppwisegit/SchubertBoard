import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed';
  comments: string[];
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'announcement' | 'status_update' | 'new_task' | 'comment' | 'deleted';
  title: string;
  content: string;
  timestamp: string;
}

export interface Toast {
  id: string;
  message: string;
  icon: string;
  leaving?: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  tasks: Task[];
  activities: Activity[];
  toasts: Toast[];
  isConnected: boolean;
  createTask: (task: Omit<Task, 'id' | 'status' | 'comments' | 'createdAt'>) => void;
  updateTaskStatus: (id: string, status: Task['status']) => void;
  deleteTask: (id: string) => void;
  addComment: (id: string, comment: string) => void;
  createAnnouncement: (text: string) => void;
  addToast: (message: string, icon?: string) => void;
  dismissToast: (id: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};

// ─── Provider ────────────────────────────────────────────────────────
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Toast system
  const addToast = useCallback((message: string, icon = '✅') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, icon }]);
    // Auto dismiss after 3s
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('initial_data', (data: { tasks: Task[], activities: Activity[] }) => {
      setTasks(data.tasks || []);
      setActivities(data.activities || []);
    });

    newSocket.on('new_activity', (act: Activity) => {
      setActivities(prev => [act, ...prev].slice(0, 100));
    });

    newSocket.on('task_created', (t: Task) => setTasks(prev => [...prev, t]));
    newSocket.on('task_updated', (t: Task) => setTasks(prev => prev.map(x => x.id === t.id ? t : x)));
    newSocket.on('task_deleted', (id: string) => setTasks(prev => prev.filter(x => x.id !== id)));

    return () => { newSocket.disconnect(); };
  }, []);

  // Actions
  const createTask = (task: Omit<Task, 'id' | 'status' | 'comments' | 'createdAt'>) => {
    socket?.emit('create_task', task);
    addToast(`Aufgabe "${task.title}" erstellt`, '🚀');
  };

  const updateTaskStatus = (id: string, status: Task['status']) => {
    socket?.emit('update_task_status', { id, status });
    const label = status === 'completed' ? 'erledigt 🎉' : status === 'in_progress' ? 'in Arbeit ⏳' : 'wieder offen 🔄';
    addToast(`Status: ${label}`, status === 'completed' ? '🎉' : '🔄');
  };

  const deleteTask = (id: string) => {
    socket?.emit('delete_task', id);
    addToast('Aufgabe gelöscht', '🗑️');
  };

  const addComment = (id: string, comment: string) => {
    socket?.emit('add_comment', { id, comment });
    addToast('Kommentar hinzugefügt', '💬');
  };

  const createAnnouncement = (text: string) => {
    socket?.emit('create_announcement', text);
    addToast('Ankündigung gesendet!', '📢');
  };

  return (
    <SocketContext.Provider value={{
      socket, tasks, activities, toasts, isConnected,
      createTask, updateTaskStatus, deleteTask, addComment, createAnnouncement,
      addToast, dismissToast
    }}>
      {children}
    </SocketContext.Provider>
  );
};
