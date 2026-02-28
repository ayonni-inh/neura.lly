import React, { useEffect, useState } from 'react';
import { LogEntry } from '../types';
import { db } from '../services/db';
import { Trash2, RefreshCw, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await db.getLogs();
      setLogs(data.reverse()); // Show newest first
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (window.confirm("Clear all system logs?")) {
      await db.clearLogs();
      setLogs([]);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 tracking-tighter">System Logs</h1>
          <p className="text-mirror-subtext">Diagnostic and operational records.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass-gloss text-mirror-subtext hover:text-mirror-text hover:bg-white/5 transition-all text-[10px] font-bold uppercase tracking-widest border border-white/5 hover:border-white/10"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all text-[10px] font-bold uppercase tracking-widest"
            title="Clear All Logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl glass-matte border border-mirror-border flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-mirror-border bg-mirror-panel/50 text-[10px] font-bold uppercase tracking-widest text-mirror-subtext">
          <div className="w-24">Timestamp</div>
          <div className="w-20">Level</div>
          <div className="flex-1">Message</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-mirror-subtext/40">
              <Info className="w-8 h-8 mb-2 opacity-50" />
              <p>No logs recorded</p>
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                <div className="w-24 shrink-0 text-mirror-subtext/60 text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                <div className={`w-20 shrink-0 font-bold uppercase text-[10px] flex items-center gap-1.5 
                  ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {log.level === 'error' ? <AlertCircle className="w-3 h-3" /> : 
                   log.level === 'warn' ? <AlertTriangle className="w-3 h-3" /> : 
                   <Info className="w-3 h-3" />}
                  {log.level}
                </div>
                <div className="flex-1 break-words text-mirror-text/80">
                  {log.message}
                  {log.details && (
                    <pre className="mt-2 p-2 bg-black/20 rounded border border-white/5 text-[10px] overflow-x-auto text-mirror-subtext">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
