
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, Role, ProcessingState, Attachment, AppTheme, ChatSession, Task, ImageGenerationConfig, SavedImage } from './types';
import { streamResponse, generateImage } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { 
  Send, X, Trash2, 
  ChevronLeft, ChevronRight, FileText, 
  Sun, Moon, RefreshCw, Sparkles, MessageSquare, Plus, 
  CheckCircle2, ListTodo, Printer, Cpu,
  ImagePlus, Fingerprint, Settings2, Sliders, Upload, CreditCard, LayoutGrid, Download, Ban
} from 'lucide-react';

const SESSIONS_KEY = 'neurally_sessions';
const TASKS_KEY = 'neurally_tasks';
const GALLERY_KEY = 'neurally_gallery';
const THEME_KEY = 'neurally_theme';
const AUTH_KEY = 'neurally_auth';
const LAST_SESSION_KEY = 'neurally_last_session_id';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const LandingPage: React.FC<{ onLogin: (alias: string) => void, isLoading: boolean }> = ({ onLogin, isLoading }) => {
  const [alias, setAlias] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        // Fallback for environments where aistudio is not injected (e.g. local dev)
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (window.aistudio && !hasKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
        // Per documentation, assume success and proceed immediately to avoid race conditions
        onLogin(alias || 'Sentinel');
      } catch (error) {
        console.error("Key selection failed:", error);
      }
    } else {
      onLogin(alias || 'Sentinel');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4 relative overflow-hidden bg-mirror-bg transition-colors duration-500">
      <div className="relative z-10 max-w-[440px] w-full animate-in fade-in zoom-in-95 duration-700">
        <div className="glass-matte rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl border border-white/5">
           <div className="flex flex-col items-center">
              <h1 className="text-4xl font-bold text-mirror-text mb-1 tracking-tighter">
                neur<span className="text-mirror-accent font-black">A</span>lly
              </h1>
              <p className="text-mirror-subtext text-[11px] mb-10 uppercase tracking-[0.3em] font-mono opacity-60">Neural Extension</p>
              
              <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Fingerprint className="w-3 h-3 text-mirror-accent" />
                    Neural Alias <span className="opacity-40 font-normal italic">(Optional)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Cpu className="h-4 w-4 text-mirror-subtext/40 group-focus-within:text-mirror-accent transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      placeholder="e.g. Architect"
                      className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-mirror-text placeholder:text-mirror-subtext/20 focus:outline-none focus:ring-2 focus:ring-mirror-accent/20 focus:border-mirror-accent/50 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-5 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 group relative overflow-hidden ${(!hasKey && window.aistudio) ? 'bg-mirror-accent text-white' : 'bg-mirror-text text-mirror-bg'}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      (!hasKey && window.aistudio) ? (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Connect Billing Project</span>
                        </>
                      ) : (
                        <span>Initialize Connection</span>
                      )
                    )}
                  </button>
                </div>
              </form>
              
              <div className="mt-10 pt-6 border-t border-white/5 w-full text-center space-y-3">
                 {(!hasKey && window.aistudio) && (
                   <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                      <p className="text-[10px] text-yellow-200/80 leading-relaxed">
                        <strong>Action Required:</strong> High-fidelity visualization requires a billing-enabled Google Cloud Project.
                      </p>
                      <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-mirror-accent hover:underline mt-1 block"
                      >
                        View Billing Documentation
                      </a>
                   </div>
                 )}
                <p className="text-[10px] text-mirror-subtext/40 leading-relaxed max-w-[280px] mx-auto">
                  neurAlly is a localized cognitive extension. All synchronization is encrypted within your session.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [userAlias, setUserAlias] = useState(() => {
    return localStorage.getItem('neurAlly_alias') || 'Sentinel';
  });
  
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((s: any) => ({
        ...s,
        messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        updatedAt: new Date(s.updatedAt)
      }));
    } catch (e) { return []; }
  });
  
  const [savedImages, setSavedImages] = useState<SavedImage[]>(() => {
    const saved = localStorage.getItem(GALLERY_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((i: any) => ({ ...i, timestamp: new Date(i.timestamp) }));
    } catch (e) { return []; }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    // Try to restore the last active session ID
    const lastId = localStorage.getItem(LAST_SESSION_KEY);
    if (lastId && sessions.some(s => s.id === lastId)) {
      return lastId;
    }
    return sessions.length > 0 ? sessions[sessions.length - 1].id : null;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(TASKS_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) }));
    } catch (e) { return []; }
  });

  const [theme, setTheme] = useState<AppTheme>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as AppTheme;
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
  });

  const [view, setView] = useState<'chat' | 'gallery'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isImageGenMode, setIsImageGenMode] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<SavedImage | null>(null);
  
  // Image Generation Config State
  const [imageConfig, setImageConfig] = useState<ImageGenerationConfig>({
    style: 'None',
    aspectRatio: '1:1',
    imageSize: '1K',
    numberOfImages: 1
  });
  const [showImageSettings, setShowImageSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const imageGenInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId) || null
  , [sessions, currentSessionId]);

  const messages = useMemo(() => currentSession?.messages || [], [currentSession]);

  // Persist sessions with error handling for quota
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Local Storage Quota Exceeded for Sessions", e);
      // In a real production app, we might trim old messages here.
    }
  }, [sessions]);

  // Persist current session selection
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(LAST_SESSION_KEY, currentSessionId);
    } else {
      localStorage.removeItem(LAST_SESSION_KEY);
    }
  }, [currentSessionId]);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(savedImages));
    } catch (e) {
      console.error("Storage Quota Exceeded for Gallery", e);
      alert("Local storage is full. Some visual assets may not be saved. Please delete old assets.");
    }
  }, [savedImages]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleLogin = async (alias: string) => {
    setIsAuthChecking(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setUserAlias(alias);
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem('neurAlly_alias', alias);
      setIsAuthChecking(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(LAST_SESSION_KEY);
  };

  const createNewSession = () => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      title: 'Cognitive Node ' + (sessions.length + 1),
      messages: [],
      updatedAt: new Date()
    };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(id);
    setView('chat');
    setInputValue('');
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Purge this memory node?")) return;
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
        // If we deleted the current session, find the next best one or null
        const remaining = sessions.filter(s => s.id !== id);
        setCurrentSessionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  };

  const handleSaveImage = (url: string, prompt: string) => {
    if (savedImages.some(img => img.url === url)) return;
    const newImage: SavedImage = {
      id: Date.now().toString(),
      url,
      prompt,
      timestamp: new Date()
    };
    setSavedImages(prev => [newImage, ...prev]);
  };

  const handleDeleteImage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm("Delete this visual asset?")) {
      setSavedImages(prev => prev.filter(img => img.id !== id));
      if (zoomedImage?.id === id) setZoomedImage(null);
    }
  };

  const handleClearGallery = () => {
    if (window.confirm("WARNING: This will permanently delete ALL saved visual assets. This action cannot be undone. Proceed?")) {
      setSavedImages([]);
    }
  };

  const handleDownloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSend = async (customText?: string, forceImage: boolean = false) => {
    const textToSubmit = customText !== undefined ? customText : inputValue.trim();
    if ((!textToSubmit && !attachment) || processingState !== ProcessingState.IDLE) return;
    
    let activeId = currentSessionId;
    if (!activeId) {
      const id = Date.now().toString();
      const newSession: ChatSession = {
        id,
        title: textToSubmit.slice(0, 30) + '...',
        messages: [],
        updatedAt: new Date()
      };
      setSessions(prev => [...prev, newSession]);
      activeId = id;
      setCurrentSessionId(id);
    }

    setInputValue('');
    setAttachment(null);
    setProcessingState(ProcessingState.THINKING);
    setShowImageSettings(false);
    
    const newUserMsg: Message = { 
      id: Date.now().toString(), role: Role.USER, text: textToSubmit, timestamp: new Date(), attachment: attachment || undefined 
    };
    
    updateSessionMessages(activeId, (msgs) => [...msgs, newUserMsg]);

    abortControllerRef.current = new AbortController();

    try {
      const botMsgId = (Date.now() + 1).toString();
      updateSessionMessages(activeId, (msgs) => [...msgs, { id: botMsgId, role: Role.MODEL, text: '', timestamp: new Date(), isStreaming: true }]);
      
      const isGenerateRequest = (forceImage || isImageGenMode || /\b(visualize|generate|draw|render|create)\b\s+(an\s+)?image/i.test(textToSubmit));
      
      if (isGenerateRequest) {
        setProcessingState(ProcessingState.IMAGEN);
        const generatedImageUrls = await generateImage(
          textToSubmit || "Strategic visualization", 
          imageConfig, 
          attachment?.mimeType.startsWith('image/') ? attachment : null
        );
        updateSessionMessages(activeId, (msgs) => msgs.map(m => m.id === botMsgId ? { ...m, generatedImageUrls } : m));
      }
      
      setProcessingState(ProcessingState.STREAMING);
      await streamResponse(
        messages, textToSubmit, attachment, 
        (text, sources) => {
          updateSessionMessages(activeId!, (msgs) => msgs.map(m => m.id === botMsgId ? { ...m, text, sources: sources || m.sources } : m));
        },
        abortControllerRef.current.signal
      );
      
      updateSessionMessages(activeId, (msgs) => msgs.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));
    } catch (e: any) {
      console.error(e);
      if (e.name !== 'AbortError') {
        let errorMsg = e.message || "Core transmission interrupted.";
        let detailedError = "";
        
        // Error Parsing Logic
        if (typeof errorMsg === 'string') {
          if (errorMsg.includes("403") || errorMsg.includes("PERMISSION_DENIED")) {
            errorMsg = "Authorization Failure (403)";
            detailedError = "Access denied. Ensure your Google Cloud Project has billing enabled and the API key is valid.";
          } else if (errorMsg.includes("400") || errorMsg.includes("INVALID_ARGUMENT")) {
            errorMsg = "Invalid Request (400)";
            detailedError = "The parameters provided were invalid. Try simplifying the prompt.";
          } else if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
            errorMsg = "Neural Overload (429)";
            detailedError = "Rate limit exceeded. Please wait a moment before retrying.";
          } else if (errorMsg.includes("SAFETY") || errorMsg.includes("blocked")) {
            errorMsg = "Safety Protocol Engaged";
            detailedError = "Content generation was blocked by safety filters. Please refine your prompt.";
          }
        }
        
        const formattedText = detailedError 
          ? `### ⚠️ ${errorMsg}\n${detailedError}\n\n\`\`\`\n${e.message.slice(0, 150)}${e.message.length > 150 ? '...' : ''}\n\`\`\`` 
          : `### ⚠️ Error Detected\n${errorMsg}`;

        updateSessionMessages(activeId, (msgs) => [...msgs, { 
          id: Date.now().toString(), 
          role: Role.MODEL, 
          text: formattedText, 
          timestamp: new Date(), 
          isError: true 
        }]);
      }
    } finally {
      setProcessingState(ProcessingState.IDLE);
      setIsImageGenMode(false);
      abortControllerRef.current = null;
    }
  };

  const updateSessionMessages = (sessionId: string, updater: (msgs: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const newMsgs = updater(s.messages);
        return { ...s, messages: newMsgs, updatedAt: new Date(), title: s.messages.length === 0 && newMsgs.length > 0 ? newMsgs[0].text.slice(0, 30) : s.title };
      }
      return s;
    }));
  };

  const addTask = (text: string) => {
    const newTask: Task = { id: Date.now().toString(), text, completed: false, priority: 'medium', createdAt: new Date() };
    setTasks(prev => [newTask, ...prev]);
  };

  return (
    <div className="flex h-screen bg-mirror-bg text-mirror-text font-sans overflow-hidden transition-colors duration-500">
      {!isAuthenticated ? (
        <LandingPage onLogin={handleLogin} isLoading={isAuthChecking} />
      ) : (
        <>
          <aside className={`glass-matte transition-all duration-500 z-40 relative flex flex-col ${isSidebarOpen ? 'w-52' : 'w-0 overflow-hidden opacity-0'}`}>
            <div className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold tracking-tight text-mirror-text">
                    neur<span className="text-mirror-accent font-black">A</span>lly
                  </h2>
                </div>
              </div>

              <button 
                onClick={createNewSession}
                className="mb-6 w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-mirror-text text-mirror-bg font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" /> New Session
              </button>

              <nav className="space-y-1 mb-8">
                <button onClick={() => setView('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-medium transition-all ${view === 'chat' ? 'bg-mirror-accent text-white' : 'text-mirror-subtext hover-surface'}`}>
                  <MessageSquare className="w-4 h-4" /> Cognitive Stream
                </button>
                <button onClick={() => setView('gallery')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-medium transition-all ${view === 'gallery' ? 'bg-mirror-accent text-white' : 'text-mirror-subtext hover-surface'}`}>
                  <LayoutGrid className="w-4 h-4" /> Visual Assets ({savedImages.length})
                </button>
              </nav>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                <label className="text-[10px] font-bold text-mirror-subtext/40 uppercase tracking-widest px-3">Memory Nodes</label>
                <div className="space-y-1">
                  {sessions.slice().reverse().map(s => (
                    <button 
                      key={s.id}
                      onClick={() => { setView('chat'); setCurrentSessionId(s.id); }}
                      className={`group w-full flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all ${currentSessionId === s.id && view === 'chat' ? 'bg-white/10 text-white' : 'text-mirror-subtext hover-surface'}`}
                    >
                      <span className="truncate text-[11px] font-medium max-w-[100px]">{s.title}</span>
                      <Trash2 onClick={(e) => deleteSession(s.id, e)} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-red-400" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-mirror-border flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 rounded-xl glass-gloss flex-1 flex justify-center hover:scale-105 transition-all" title="Toggle Theme">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <button onClick={handleLogout} className="p-3 rounded-xl glass-gloss flex-1 flex justify-center hover:scale-105 transition-all text-red-400/60 hover:text-red-400" title="Sign Out">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0 relative">
            <header className="absolute top-0 left-0 right-0 h-20 z-30 flex items-center px-8 bg-gradient-to-b from-mirror-bg/80 to-transparent">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 rounded-full glass-gloss text-mirror-text shadow-lg hover:scale-110 transition-transform">
                {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <div className="ml-6 flex flex-col">
                <h2 className="text-sm font-bold tracking-tight text-mirror-text">
                   {view === 'chat' ? (currentSession?.title || 'Synthesis') : 'Visual Assets'}
                </h2>
                <span className="text-[9px] uppercase tracking-widest text-mirror-subtext font-mono">neurAlly Neural Active</span>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto z-10 px-4 md:px-20 py-24 no-scrollbar" ref={mainContainerRef}>
              <div className="max-w-6xl mx-auto">
                {view === 'chat' ? (
                  <>
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-in fade-in duration-1000">
                        <Sparkles className="w-16 h-16 text-mirror-accent/30 mb-8" />
                        <h1 className="text-4xl font-bold mb-4 tracking-tighter">
                          Hi <span className="text-mirror-accent">{userAlias}</span>,
                        </h1>
                        <p className="text-xl text-mirror-text font-medium mb-2 max-w-lg">
                          I am synced and ready to act as your cognitive mirror.
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-4xl mx-auto flex flex-col gap-8">
                        {messages.map(msg => (
                          <MessageBubble 
                            key={msg.id} 
                            message={msg} 
                            onActionClick={(text) => addTask(text)}
                            onToggleBookmark={(id) => updateSessionMessages(currentSessionId!, msgs => msgs.map(m => m.id === id ? { ...m, isBookmarked: !m.isBookmarked } : m))}
                            onSaveImage={(url) => handleSaveImage(url, msg.text)}
                          />
                        ))}
                        <ThinkingIndicator state={processingState} />
                        <div ref={messagesEndRef} className="h-10" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                     <div className="flex items-center justify-between mb-8">
                      <div>
                        <h1 className="text-4xl font-bold mb-2 tracking-tighter">Visual Assets</h1>
                        <p className="text-mirror-subtext">Gallery of synthesized visual outputs.</p>
                      </div>
                      <div className="flex items-center gap-3">
                         {savedImages.length > 0 && (
                            <button 
                              onClick={handleClearGallery}
                              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all"
                            >
                              <Ban className="w-3 h-3" /> Clear All
                            </button>
                         )}
                        <div className="p-4 glass-gloss rounded-3xl text-center min-w-[120px]">
                          <span className="block text-2xl font-bold text-mirror-accent">{savedImages.length}</span>
                          <span className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Saved</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {savedImages.length === 0 ? (
                         <div className="col-span-full py-20 text-center glass-matte rounded-[2.5rem] border border-dashed border-mirror-border">
                            <ImagePlus className="w-12 h-12 text-mirror-subtext/20 mx-auto mb-4" />
                            <p className="text-mirror-subtext text-sm">No visual assets archived. <br/> Generate and save images to populate this gallery.</p>
                         </div>
                      ) : (
                        savedImages.map(img => (
                          <div key={img.id} className="relative group rounded-2xl overflow-hidden glass-matte border border-white/5 aspect-square cursor-pointer" onClick={() => setZoomedImage(img)}>
                             <img src={img.url} alt="Saved Asset" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                <p className="text-[10px] text-white/90 line-clamp-2 font-medium mb-2">{img.prompt}</p>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] text-white/50 font-mono">{new Date(img.timestamp).toLocaleDateString()}</span>
                                  <div className="flex items-center gap-1">
                                     <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadImage(img.url, `neurAlly-${img.id}.png`);
                                      }} 
                                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-all text-white"
                                      title="Download"
                                     >
                                       <Download className="w-4 h-4" />
                                     </button>
                                     <button 
                                      onClick={(e) => handleDeleteImage(img.id, e)} 
                                      className="p-2 bg-white/10 hover:bg-red-500/20 hover:text-red-400 rounded-lg backdrop-blur-md transition-all"
                                      title="Delete"
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </button>
                                  </div>
                                </div>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </main>

            {/* Zoom Modal for Gallery */}
            {zoomedImage && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-10 cursor-zoom-out animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
                 <div className="relative max-w-full max-h-full flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                   <div className="relative">
                      <img src={zoomedImage.url} className="max-w-[90vw] max-h-[80vh] object-contain rounded-3xl shadow-2xl border border-white/10" alt="Zoomed" />
                      <X className="absolute -top-12 -right-4 md:top-4 md:right-4 w-10 h-10 text-white/50 hover:text-white cursor-pointer transition-colors" onClick={() => setZoomedImage(null)} />
                   </div>
                   
                   <div className="w-full max-w-2xl glass-dock rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-mirror-text font-medium truncate">{zoomedImage.prompt}</p>
                        <p className="text-[10px] text-mirror-subtext mt-1">{new Date(zoomedImage.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                          onClick={() => handleDownloadImage(zoomedImage.url, `neurAlly-asset-${zoomedImage.id}.png`)}
                          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white"
                          title="Download"
                         >
                           <Download className="w-5 h-5" />
                         </button>
                         <button 
                          onClick={() => handleDeleteImage(zoomedImage.id)}
                          className="p-3 bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 rounded-xl transition-all"
                          title="Delete"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                      </div>
                   </div>
                 </div>
              </div>
            )}

            {view === 'chat' && (
              <div className="px-4 pb-10 pt-2 bg-gradient-to-t from-mirror-bg via-mirror-bg/90 to-transparent z-20">
                <div className="max-w-3xl mx-auto">
                  {/* Image Settings Panel */}
                  {showImageSettings && (
                    <div className="absolute bottom-full left-0 right-0 mb-4 mx-4 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">
                      <div className="max-w-md mx-auto glass-dock rounded-3xl p-5 border border-mirror-border shadow-2xl">
                         <div className="flex items-center justify-between mb-4">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-mirror-text flex items-center gap-2">
                             <Sliders className="w-4 h-4 text-mirror-accent" /> Visualization Matrix
                           </h3>
                           <button onClick={() => setShowImageSettings(false)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
                         </div>
                         
                         <div className="space-y-4">
                           {/* Style Selection */}
                           <div className="space-y-2">
                             <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider">Aesthetic Style</label>
                             <div className="grid grid-cols-2 gap-2">
                               {['None', 'Photorealistic', 'Cyberpunk', 'Watercolor', '3D Render', 'Sketch'].map(style => (
                                 <button
                                   key={style}
                                   onClick={() => setImageConfig({...imageConfig, style})}
                                   className={`px-3 py-2 rounded-xl text-[10px] font-medium transition-all text-left ${imageConfig.style === style ? 'bg-mirror-accent text-white shadow-lg' : 'bg-white/5 text-mirror-subtext hover:bg-white/10'}`}
                                 >
                                   {style}
                                 </button>
                               ))}
                             </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                             {/* Aspect Ratio */}
                             <div className="space-y-2">
                               <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider">Ratio</label>
                               <select 
                                 value={imageConfig.aspectRatio}
                                 onChange={(e) => setImageConfig({...imageConfig, aspectRatio: e.target.value as any})}
                                 className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-mirror-text focus:outline-none focus:border-mirror-accent"
                               >
                                 <option value="1:1">1:1 (Square)</option>
                                 <option value="16:9">16:9 (Landscape)</option>
                                 <option value="9:16">9:16 (Portrait)</option>
                                 <option value="4:3">4:3 (Standard)</option>
                                 <option value="3:4">3:4 (Tall)</option>
                               </select>
                             </div>

                             {/* Count */}
                             <div className="space-y-2">
                               <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider">Quantity</label>
                               <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
                                 {[1, 2, 3, 4].map(num => (
                                   <button
                                     key={num}
                                     onClick={() => setImageConfig({...imageConfig, numberOfImages: num})}
                                     className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${imageConfig.numberOfImages === num ? 'bg-mirror-accent text-white shadow-md' : 'text-mirror-subtext hover:text-white'}`}
                                   >
                                     {num}
                                   </button>
                                 ))}
                               </div>
                             </div>
                           </div>
                           
                           {/* Resolution - Only available for Pro */}
                           <div className="space-y-2">
                             <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider">Resolution</label>
                             <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
                               {['1K', '2K', '4K'].map(res => (
                                 <button
                                   key={res}
                                   onClick={() => setImageConfig({...imageConfig, imageSize: res as any})}
                                   className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${imageConfig.imageSize === res ? 'bg-mirror-accent text-white shadow-md' : 'text-mirror-subtext hover:text-white'}`}
                                 >
                                   {res}
                                 </button>
                               ))}
                             </div>
                           </div>

                         </div>
                      </div>
                    </div>
                  )}

                  <div className="relative glass-dock rounded-[2.5rem] p-3 shadow-2xl">
                    {attachment && (
                      <div className="mx-2 mb-3 p-3 rounded-2xl bg-white/5 flex items-center gap-4 border border-white/10">
                        <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center overflow-hidden">
                          {attachment.mimeType.startsWith('image/') ? <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="w-full h-full object-cover" /> : <FileText className="w-6 h-6 text-mirror-accent" />}
                        </div>
                        <span className="flex-1 text-[11px] font-bold text-mirror-subtext uppercase tracking-widest truncate">
                            {isImageGenMode ? "Visual Reference Active" : "Node Attachment Active"}
                        </span>
                        <X onClick={() => { setAttachment(null); setIsImageGenMode(false); }} className="w-4 h-4 cursor-pointer hover:text-red-400" />
                      </div>
                    )}
                    <div className="flex items-end gap-2 pl-2">
                      <button 
                        onClick={() => setShowImageSettings(!showImageSettings)}
                        className={`p-3 transition-all ${showImageSettings || isImageGenMode ? 'text-mirror-accent' : 'text-mirror-subtext hover:text-mirror-text'}`}
                        title="Visualization Settings"
                      >
                         <Settings2 className="w-5 h-5" />
                      </button>

                      <button 
                        onClick={() => {
                          const newMode = !isImageGenMode;
                          setIsImageGenMode(newMode);
                          setShowImageSettings(newMode);
                          if (!newMode) setAttachment(null);
                        }}
                        className={`p-3 transition-all ${isImageGenMode ? 'text-mirror-accent bg-mirror-accent/10 rounded-xl' : 'text-mirror-subtext hover:text-mirror-text'}`}
                        title={isImageGenMode ? "Exit Visualization Mode" : "Enter Visualization Mode"}
                      >
                         <ImagePlus className="w-5 h-5" />
                      </button>

                      {isImageGenMode && (
                        <button 
                          onClick={() => imageGenInputRef.current?.click()} 
                          className="p-3 text-mirror-subtext hover:text-mirror-text transition-all" 
                          title="Upload Reference Image"
                        >
                          <Upload className="w-5 h-5" />
                        </button>
                      )}
                      
                      <input type="file" ref={imageGenInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                              setAttachment({ mimeType: file.type, data: (reader.result as string).split(',')[1] });
                              setIsImageGenMode(true);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />

                      <textarea 
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(undefined, isImageGenMode); }}}
                        placeholder={isImageGenMode ? "Describe visual to generate..." : "Synchronize thought..."}
                        className="flex-1 bg-transparent border-none outline-none text-mirror-text py-4 min-h-[56px] resize-none text-sm placeholder:text-mirror-subtext/50 font-medium"
                        rows={1}
                      />
                      <button 
                        onClick={() => handleSend(undefined, isImageGenMode)}
                        disabled={!inputValue.trim() && !attachment}
                        className="p-3 bg-mirror-text text-mirror-bg rounded-full hover:scale-105 active:scale-95 disabled:opacity-20 transition-all shadow-xl"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
