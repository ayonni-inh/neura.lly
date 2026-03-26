import React from 'react';
import { Task } from '../types';
import { 
  Plus, Trash2, CheckCircle2, Circle, 
  Calendar, AlertCircle, Clock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TasksViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, setTasks }) => {
  const [newTask, setNewTask] = React.useState('');

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: crypto.randomUUID(),
      text: newTask.trim(),
      completed: false,
      createdAt: new Date(),
      priority: 'medium'
    };
    setTasks(prev => [...prev, task]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-2 tracking-tighter">Strategic Ledger</h1>
          <p className="text-mirror-subtext">Neural task management and cognitive goals.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-4 glass-gloss rounded-3xl text-center min-w-[120px]">
            <span className="block text-2xl font-bold text-mirror-accent">
              {tasks.filter(t => t.completed).length}/{tasks.length}
            </span>
            <span className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Efficiency</span>
          </div>
        </div>
      </div>

      <div className="glass-matte rounded-[2.5rem] p-8 border border-mirror-border shadow-[0_12px_40px_rgba(0,0,0,0.3)] mb-8">
        <div className="flex gap-3 mb-8">
          <input 
            type="text" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Define a new cognitive objective..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-mirror-text placeholder:text-mirror-subtext/30 focus:outline-none focus:border-mirror-accent focus:ring-1 focus:ring-mirror-accent transition-all font-medium"
          />
          <button 
            onClick={addTask}
            className="px-8 rounded-2xl bg-mirror-accent text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(59,130,246,0.3)]"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <Clock className="w-12 h-12 text-mirror-subtext/20 mx-auto mb-4" />
                <p className="text-mirror-subtext text-sm">No strategic objectives defined.</p>
              </motion.div>
            ) : (
              tasks.slice().reverse().map(task => (
                <motion.div 
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all ${task.completed ? 'bg-white/5 border-white/5 opacity-60' : 'bg-white/5 border-white/10 hover:border-mirror-accent/30'}`}
                >
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`transition-colors ${task.completed ? 'text-mirror-accent' : 'text-mirror-subtext hover:text-mirror-accent'}`}
                  >
                    {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${task.completed ? 'line-through text-mirror-subtext' : 'text-mirror-text'}`}>
                      {task.text}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-mirror-subtext/60 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        task.priority === 'high' ? 'bg-red-500/10 text-red-400' : 
                        task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' : 
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-mirror-subtext hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
