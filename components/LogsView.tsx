'use client';

import React from 'react';
import { 
  Activity, Terminal, Cpu, 
  ShieldCheck, Database, Globe 
} from 'lucide-react';
import { motion } from 'motion/react';

export const LogsView: React.FC = () => {
  const logs = [
    { id: 1, type: 'system', message: 'Neural link established with Gemini 3 Pro', time: '10:42:01' },
    { id: 2, type: 'security', message: 'Biometric verification successful', time: '10:42:05' },
    { id: 3, type: 'database', message: 'Local memory nodes synchronized', time: '10:42:12' },
    { id: 4, type: 'process', message: 'Strategic ledger updated with new objectives', time: '10:45:30' },
    { id: 5, type: 'network', message: 'Secure tunnel established via europe-west2', time: '10:46:15' },
    { id: 6, type: 'system', message: 'Cognitive mirroring active and stable', time: '10:48:00' },
  ];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2 tracking-tighter">System Logs</h1>
        <p className="text-mirror-subtext">Real-time monitoring of neural processes and system events.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-matte p-6 rounded-3xl border border-mirror-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-mirror-accent/20 text-mirror-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">CPU Load</span>
          </div>
          <div className="text-2xl font-bold text-mirror-text">12.4%</div>
          <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-mirror-accent w-[12.4%]" />
          </div>
        </div>
        <div className="glass-matte p-6 rounded-3xl border border-mirror-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Security</span>
          </div>
          <div className="text-2xl font-bold text-mirror-text">Optimal</div>
          <div className="flex items-center gap-1 mt-4">
             {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-1 flex-1 bg-emerald-400 rounded-full" />)}
          </div>
        </div>
        <div className="glass-matte p-6 rounded-3xl border border-mirror-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Latency</span>
          </div>
          <div className="text-2xl font-bold text-mirror-text">24ms</div>
          <div className="flex items-end gap-0.5 h-4 mt-4">
             {[4,7,3,8,5,9,6,8,4,7].map((h, i) => <div key={i} className="flex-1 bg-blue-400/40 rounded-t-sm" style={{height: `${h*10}%`}} />)}
          </div>
        </div>
      </div>

      <div className="glass-matte rounded-[2.5rem] border border-mirror-border shadow-2xl overflow-hidden">
        <div className="bg-white/5 px-8 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-mirror-accent" />
            <span className="text-[10px] font-bold text-mirror-text uppercase tracking-widest">Neural Terminal</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
          </div>
        </div>
        <div className="p-8 space-y-4 font-mono text-xs">
          {logs.map(log => (
            <div key={log.id} className="flex gap-4 group">
              <span className="text-mirror-subtext/40 shrink-0">[{log.time}]</span>
              <span className={`shrink-0 font-bold uppercase tracking-wider ${
                log.type === 'security' ? 'text-emerald-400' : 
                log.type === 'database' ? 'text-blue-400' : 
                log.type === 'network' ? 'text-purple-400' : 
                'text-mirror-accent'
              }`}>
                {log.type}
              </span>
              <span className="text-mirror-text group-hover:text-mirror-accent transition-colors">
                {log.message}
              </span>
            </div>
          ))}
          <div className="flex gap-4 animate-pulse">
            <span className="text-mirror-subtext/40">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
            <span className="text-mirror-accent font-bold uppercase tracking-wider">system</span>
            <span className="text-mirror-text flex items-center gap-1">
              Listening for cognitive input<span className="w-1 h-4 bg-mirror-accent animate-blink" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
