import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { db } from '../services/db';
import { CheckCircle2, Circle, Trash2, Plus, Calendar, AlertCircle } from 'lucide-react';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await db.getTasks();
      setTasks(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      priority: 'medium',
      createdAt: new Date()
    };

    try {
      await db.saveTask(newTask);
      setTasks(prev => [newTask, ...prev]);
      setNewTaskText('');
    } catch (error) {
      console.error("Failed to save task", error);
    }
  };

  const toggleTask = async (task: Task) => {
    const updatedTask = { ...task, completed: !task.completed };
    try {
      await db.saveTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    } catch (error) {
      console.error("Failed to update task", error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await db.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 tracking-tighter">Strategic Ledger</h1>
          <p className="text-mirror-subtext">Action items and cognitive commitments.</p>
        </div>
        <div className="px-6 py-5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl text-center min-w-[130px] shadow-2xl">
          <span className="block text-4xl font-bold text-mirror-accent mb-1">{activeTasks.length}</span>
          <span className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Active</span>
        </div>
      </div>

      <form onSubmit={handleAddTask} className="mb-8 relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Plus className="h-5 w-5 text-mirror-subtext/40 group-focus-within:text-mirror-accent transition-colors" />
        </div>
        <input 
          type="text" 
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Add a new strategic objective..."
          className="block w-full pl-12 pr-4 py-4 bg-mirror-text/5 border border-mirror-border rounded-2xl text-sm text-mirror-text placeholder:text-mirror-subtext/50 focus:outline-none focus:ring-2 focus:ring-mirror-accent/20 focus:border-mirror-accent/50 transition-all"
        />
      </form>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
        {loading ? (
          <div className="text-center py-10 text-mirror-subtext">Loading ledger...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 glass-matte rounded-[2.5rem] border border-dashed border-mirror-border">
            <CheckCircle2 className="w-12 h-12 text-mirror-subtext/20 mx-auto mb-4" />
            <p className="text-mirror-subtext text-sm">Ledger is empty. <br/> Capture insights and actions here.</p>
          </div>
        ) : (
          <>
            {activeTasks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 pb-2 border-b border-mirror-border/50">
                  <div className="w-2 h-2 rounded-full bg-mirror-accent animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-mirror-text">Active Objectives</h3>
                  <span className="ml-auto text-[10px] font-mono text-mirror-subtext bg-mirror-text/5 px-2 py-0.5 rounded-full">{activeTasks.length}</span>
                </div>
                <div className="grid gap-3">
                  {activeTasks.map(task => (
                    <div key={task.id} className="group relative flex items-start gap-4 p-5 glass-matte rounded-2xl border border-mirror-border hover:border-mirror-accent/50 hover:shadow-lg hover:shadow-mirror-accent/5 transition-all duration-300">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-mirror-accent/0 group-hover:bg-mirror-accent/50 rounded-l-2xl transition-all duration-300" />
                      <button onClick={() => toggleTask(task)} className="mt-0.5 text-mirror-subtext hover:text-mirror-accent transition-colors">
                        <Circle className="w-5 h-5" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm text-mirror-text font-medium leading-relaxed">{task.text}</span>
                        <div className="flex items-center gap-3 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-mirror-subtext flex items-center gap-1.5 bg-mirror-text/5 px-2 py-1 rounded-md">
                            <Calendar className="w-3 h-3" /> {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="text-mirror-subtext/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="space-y-4 pt-8">
                <div className="flex items-center gap-2 px-2 pb-2 border-b border-mirror-border/30">
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-mirror-subtext">Completed</h3>
                  <span className="ml-auto text-[10px] font-mono text-mirror-subtext bg-mirror-text/5 px-2 py-0.5 rounded-full">{completedTasks.length}</span>
                </div>
                <div className="grid gap-2">
                  {completedTasks.map(task => (
                    <div key={task.id} className="group flex items-center gap-4 p-4 bg-mirror-text/[0.02] rounded-xl border border-transparent hover:border-mirror-border/30 transition-all">
                      <button onClick={() => toggleTask(task)} className="text-green-500/70 hover:text-green-500 transition-colors">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <span className="flex-1 text-sm text-mirror-subtext/60 line-through decoration-mirror-subtext/30 group-hover:text-mirror-subtext transition-colors">{task.text}</span>
                      <button onClick={() => deleteTask(task.id)} className="text-mirror-subtext/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
