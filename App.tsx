
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, Role, ProcessingState, Attachment, AppTheme, ChatSession, Task, ImageGenerationConfig, SavedImage } from './types';
import { streamResponse, generateImage, editImage, generateVideo, generateSpeech } from './services/geminiService';
import { db } from './services/db';
import { MessageBubble } from './components/MessageBubble';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { LogsView } from './components/LogsView';
import { TasksView } from './components/TasksView';
import { Onboarding } from './components/Onboarding';
import { 
  Send, X, Trash2, User,
  ChevronLeft, ChevronRight, ChevronDown, FileText, 
  Sun, Moon, RefreshCw, Sparkles, MessageSquare, Plus, 
  CheckCircle2, ListTodo, Printer, Cpu,
  ImagePlus, Fingerprint, Sliders, Upload, CreditCard, LayoutGrid, Download, Ban, Activity, LogOut, Zap, Brain, AlertCircle, Check, Film
} from 'lucide-react';

const SESSIONS_KEY = 'neurally_sessions';
const TASKS_KEY = 'neurally_tasks';
const GALLERY_KEY = 'neurally_gallery';
const THEME_KEY = 'neurally_theme';
const AUTH_KEY = 'neurally_auth';
const LAST_SESSION_KEY = 'neurally_last_session_id';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

import { motion, AnimatePresence } from 'motion/react';

const LandingPage: React.FC<{ onLogin: (alias: string, remember: boolean, avatar: string | null) => void, isLoading: boolean }> = ({ onLogin, isLoading }) => {
  const [hasKey, setHasKey] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const has = await window.aistudio.hasSelectedApiKey();
          setHasKey(has);
        } catch (e) {
          console.error("Failed to check API key status", e);
        }
      } else {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGoogleLogin = async () => {
    if (window.aistudio && !hasKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
        onLogin('Google User', true, avatar);
      } catch (error) {
        console.error("Key selection failed:", error);
      }
    } else {
      onLogin('Google User', true, avatar);
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (window.aistudio && !hasKey) {
      window.aistudio.openSelectKey().then(() => {
        setHasKey(true);
        onLogin(email.split('@')[0] || 'User', rememberMe, avatar);
      }).catch(console.error);
    } else {
      onLogin(email.split('@')[0] || 'User', rememberMe, avatar);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4 relative overflow-hidden bg-mirror-bg transition-colors duration-500">
      {/* Ambient Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-mirror-accent rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.05, 0.08, 0.05],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="glass-matte rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-3xl border border-white/10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />
          
          <div className="relative z-10">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="text-4xl font-bold tracking-tight mb-2">
                neur<span className="text-mirror-accent">.ally</span>
              </div>
              <p className="text-[10px] text-mirror-subtext uppercase tracking-[0.3em] font-medium opacity-70">
                Cognitive Extension Interface
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center mb-8"
            >
              <div 
                className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden relative group shadow-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-white/30 group-hover:text-white/60 transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-5 h-5 text-white" />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {!showEmailForm ? (
                <motion.div 
                  key="options"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl border border-white/10 bg-white text-black font-semibold text-sm transition-all hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-1 bg-white/10" />
                    <span className="text-[10px] text-mirror-subtext uppercase tracking-widest font-bold opacity-40">or</span>
                    <div className="h-[1px] flex-1 bg-white/10" />
                  </div>

                  <button 
                    onClick={() => setShowEmailForm(true)}
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 text-white font-semibold text-sm transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <div className="w-5 h-5 flex items-center justify-center opacity-70">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </div>
                    Sign in with Email
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  key="email-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleEmailLogin} 
                  className="space-y-4"
                >
                  <div className="text-left mb-6">
                    <button 
                      type="button" 
                      onClick={() => setShowEmailForm(false)}
                      className="text-xs text-mirror-subtext hover:text-white flex items-center gap-2 transition-colors group"
                    >
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                      Back to options
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="relative group">
                      <input 
                        type="email" 
                        placeholder="Email Address" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-14 px-5 rounded-2xl border border-white/10 outline-none bg-black/40 text-white text-sm placeholder:text-white/30 focus:border-mirror-accent/50 focus:bg-black/60 transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <input 
                        type="password" 
                        placeholder="Password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-14 px-5 rounded-2xl border border-white/10 outline-none bg-black/40 text-white text-sm placeholder:text-white/30 focus:border-mirror-accent/50 focus:bg-black/60 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div 
                      className="flex items-center gap-2 cursor-pointer group select-none" 
                      onClick={() => setRememberMe(!rememberMe)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-mirror-accent border-mirror-accent' : 'border-white/30 bg-white/5 group-hover:border-white/50'}`}>
                        {rememberMe && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[10px] text-mirror-subtext group-hover:text-white transition-colors">Remember me</span>
                    </div>

                    <button type="button" className="text-[10px] text-mirror-accent hover:underline opacity-80">
                      Forgot password?
                    </button>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl border-none cursor-pointer bg-mirror-accent text-white font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-mirror-accent/20 mt-4"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      (!hasKey && window.aistudio) ? 'Connect & Sign In' : 'Sign In'
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-10 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] text-mirror-subtext/40 font-medium">
                <Fingerprint className="w-3 h-3" />
                <span>Secure Neural Link • End-to-End Encrypted</span>
              </div>
              
              {(!hasKey && window.aistudio) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full text-[10px] text-yellow-400/70 border border-yellow-400/10 rounded-xl p-3 bg-yellow-400/5 leading-relaxed"
                >
                  <div className="flex gap-2">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <p>Billing-enabled Google Cloud Project required for neural access.</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === 'true' || sessionStorage.getItem(AUTH_KEY) === 'true';
    } catch (e) { return false; }
  });
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [userAlias, setUserAlias] = useState(() => {
    try {
      return localStorage.getItem('neurAlly_alias') || sessionStorage.getItem('neurAlly_alias') || 'Sentinel';
    } catch (e) { return 'Sentinel'; }
  });
  const [userAvatar, setUserAvatar] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('neurAlly_avatar') || sessionStorage.getItem('neurAlly_avatar') || undefined;
    } catch (e) { return undefined; }
  });
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) }));
    } catch (e) { return []; }
  });

  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) as AppTheme;
      return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
    } catch (e) { return 'dark'; }
  });

  const [view, setView] = useState<'chat' | 'gallery' | 'logs' | 'tasks'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [generationMode, setGenerationMode] = useState<'chat' | 'image' | 'video'>('chat');
  const [isFastMode, setIsFastMode] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<SavedImage | null>(null);
  
  // Image Generation Config State
  const [imageConfig, setImageConfig] = useState<ImageGenerationConfig>({
    style: 'None',
    aspectRatio: '1:1',
    imageSize: '1K',
    numberOfImages: 1
  });
  const [showImageSettings, setShowImageSettings] = useState(false);

  // ...

  const handleSpeech = async (text: string, messageId: string) => {
    try {
      const audioUrl = await generateSpeech(text);
      updateSessionMessages(currentSessionId!, msgs => msgs.map(m => 
        m.id === messageId ? { ...m, generatedAudioUrl: audioUrl } : m
      ));
    } catch (e) {
      console.error("Speech generation failed", e);
    }
  };
  
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem('neurAlly_onboarding_complete') !== 'true';
    } catch (e) { return true; }
  });

  const handleOnboardingComplete = () => {
    try {
      localStorage.setItem('neurAlly_onboarding_complete', 'true');
    } catch (e) { console.error("Failed to save onboarding state", e); }
    setShowOnboarding(false);
  };
  
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const imageGenInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Show button if we are more than 300px from the bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      setShowScrollBottom(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [view]); // Re-attach when view changes

  const currentSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId) || null
  , [sessions, currentSessionId]);

  const messages = useMemo(() => currentSession?.messages || [], [currentSession]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (view === 'chat' && !showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, processingState, view]);

  // Load data from DB
  useEffect(() => {
    const loadData = async () => {
      try {
        let [loadedSessions, loadedImages] = await Promise.all([
          db.getSessions(),
          db.getImages()
        ]);

        // Migration from LocalStorage if DB is empty
        if (loadedSessions.length === 0) {
            const localSessions = localStorage.getItem(SESSIONS_KEY);
            if (localSessions) {
                try {
                    const parsed = JSON.parse(localSessions);
                    const migrated = parsed.map((s: any) => ({
                        ...s,
                        messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
                        updatedAt: new Date(s.updatedAt)
                    }));
                    for (const s of migrated) {
                        await db.saveSession(s);
                    }
                    loadedSessions = migrated;
                } catch (e) { console.error("Migration failed for sessions", e); }
            }
        }

        if (loadedImages.length === 0) {
            const localImages = localStorage.getItem(GALLERY_KEY);
            if (localImages) {
                try {
                    const parsed = JSON.parse(localImages);
                    const migrated = parsed.map((i: any) => ({ ...i, timestamp: new Date(i.timestamp) }));
                    for (const i of migrated) {
                        await db.saveImage(i);
                    }
                    loadedImages = migrated;
                } catch (e) { console.error("Migration failed for images", e); }
            }
        }
        
        setSessions(loadedSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        setSavedImages(loadedImages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        
        // Restore last session ID after sessions are loaded
        const lastId = localStorage.getItem(LAST_SESSION_KEY);
        if (lastId && loadedSessions.some(s => s.id === lastId)) {
          setCurrentSessionId(lastId);
        } else if (loadedSessions.length > 0) {
          setCurrentSessionId(loadedSessions[loadedSessions.length - 1].id);
        }
      } catch (e) {
        console.error("Failed to load data from DB", e);
        db.addLog({
          timestamp: new Date(),
          level: 'error',
          message: 'Failed to load initial data from IndexedDB',
          details: e
        });
      }
    };
    loadData();
  }, []);

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
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleLogin = async (alias: string, remember: boolean, avatar: string | null) => {
    setIsAuthChecking(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setUserAlias(alias);
      if (avatar) setUserAvatar(avatar);
      
      if (remember) {
        localStorage.setItem(AUTH_KEY, 'true');
        localStorage.setItem('neurAlly_alias', alias);
        if (avatar) localStorage.setItem('neurAlly_avatar', avatar);
      } else {
        sessionStorage.setItem(AUTH_KEY, 'true');
        sessionStorage.setItem('neurAlly_alias', alias);
        if (avatar) sessionStorage.setItem('neurAlly_avatar', avatar);
      }
      setIsAuthChecking(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(LAST_SESSION_KEY);
    localStorage.removeItem('neurAlly_alias');
    localStorage.removeItem('neurAlly_avatar');
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem('neurAlly_alias');
    sessionStorage.removeItem('neurAlly_avatar');
    setUserAvatar(undefined);
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
    db.saveSession(newSession);
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
    db.deleteSession(id).catch(e => console.error("Failed to delete session", e));
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
    db.saveImage(newImage).catch(e => console.error("Failed to save image", e));
    db.addLog({
      timestamp: new Date(),
      level: 'info',
      message: 'Image saved to gallery',
      details: { prompt }
    });
  };

  const handleDeleteImage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm("Delete this visual asset?")) {
      setSavedImages(prev => prev.filter(img => img.id !== id));
      if (zoomedImage?.id === id) setZoomedImage(null);
      db.deleteImage(id).catch(e => console.error("Failed to delete image", e));
    }
  };

  const handleClearGallery = async () => {
    if (window.confirm("WARNING: This will permanently delete ALL saved visual assets. This action cannot be undone. Proceed?")) {
      setSavedImages([]);
      const images = await db.getImages();
      for (const img of images) {
        await db.deleteImage(img.id);
      }
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

  const handleSend = async (customText?: string, mode: 'chat' | 'image' | 'video' = generationMode, customAttachment?: Attachment | null) => {
    const textToSubmit = customText !== undefined ? customText : inputValue.trim();
    const activeAttachment = customAttachment !== undefined ? customAttachment : attachment;
    if ((!textToSubmit && !activeAttachment) || processingState !== ProcessingState.IDLE) return;
    
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
      db.saveSession(newSession);
      activeId = id;
      setCurrentSessionId(id);
    }

    setInputValue('');
    setAttachment(null);
    setProcessingState(ProcessingState.THINKING);
    setShowImageSettings(false);
    
    const newUserMsg: Message = { 
      id: Date.now().toString(), role: Role.USER, text: textToSubmit, timestamp: new Date(), attachment: activeAttachment || undefined 
    };
    
    updateSessionMessages(activeId, (msgs) => [...msgs, newUserMsg]);

    abortControllerRef.current = new AbortController();

    try {
      const botMsgId = (Date.now() + 1).toString();
      updateSessionMessages(activeId, (msgs) => [...msgs, { id: botMsgId, role: Role.MODEL, text: '', timestamp: new Date(), isStreaming: true }]);
      
      if (mode === 'image') {
        setProcessingState(ProcessingState.IMAGEN);
        
        // Check if we are editing an image or generating a new one
        if (activeAttachment && activeAttachment.mimeType.startsWith('image/')) {
           // Image Editing Mode
           setProcessingState(ProcessingState.EDITING_IMAGE);
           const editedImageUrl = await editImage(textToSubmit, activeAttachment);
           
           updateSessionMessages(activeId, msgs => msgs.map(m => 
            m.id === botMsgId ? { 
              ...m, 
              text: `I've edited the image as requested: "${textToSubmit}"`, 
              generatedImageUrls: [editedImageUrl], 
              isStreaming: false 
            } : m
          ));
        } else {
           // Standard Image Generation
           const generatedImages = await generateImage(textToSubmit, imageConfig, activeAttachment);
           
           updateSessionMessages(activeId, msgs => msgs.map(m => 
             m.id === botMsgId ? { 
               ...m, 
               text: `I've visualized your concept: "${textToSubmit}"`, 
               generatedImageUrls: generatedImages, 
               isStreaming: false 
             } : m
           ));
        }
      } else if (generationMode === 'video' || textToSubmit.toLowerCase().startsWith('/animate')) {
        // Video Generation Mode
        setProcessingState(ProcessingState.GENERATING_VIDEO);
        const prompt = textToSubmit.replace('/animate', '').trim() || "Animate this";
        const videoUrl = await generateVideo(prompt, activeAttachment);
        
        updateSessionMessages(activeId, msgs => msgs.map(m => 
          m.id === botMsgId ? { 
            ...m, 
            text: `I've generated a video for you: "${prompt}"`, 
            generatedVideoUrl: videoUrl, 
            isStreaming: false 
          } : m
        ));
        setGenerationMode('chat');

      } else {
        setProcessingState(ProcessingState.THINKING);
        
        // Stream text response
        let accumulatedText = '';
        
        await streamResponse(
          messages, // History excluding current user msg (handled in service)
          textToSubmit,
          activeAttachment || null,
          (text, sources) => {
             setProcessingState(ProcessingState.STREAMING);
             accumulatedText = text;
             updateSessionMessages(activeId!, msgs => msgs.map(m => 
               m.id === botMsgId ? { ...m, text: text, sources: sources } : m
             ));
          },
          abortControllerRef.current.signal,
          isFastMode
        );

        updateSessionMessages(activeId, msgs => msgs.map(m => 
          m.id === botMsgId ? { ...m, isStreaming: false } : m
        ));
      }
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

        db.addLog({
          timestamp: new Date(),
          level: 'error',
          message: errorMsg,
          details: { detailedError, originalError: e.message }
        });
        
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
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setProcessingState(ProcessingState.IDLE);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (processingState !== ProcessingState.IDLE || !currentSessionId) return;
    
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;
    
    const msgIndex = session.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    
    // Find the user message that preceded this model message
    let userMsgIndex = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (session.messages[i].role === Role.USER) {
        userMsgIndex = i;
        break;
      }
    }
    
    if (userMsgIndex === -1) return;
    
    const userMsg = session.messages[userMsgIndex];
    
    // Remove all messages from userMsgIndex onwards
    updateSessionMessages(currentSessionId, (msgs) => msgs.slice(0, userMsgIndex));
    
    // Resend
    handleSend(userMsg.text, 'chat', userMsg.attachment);
  };

  const updateSessionMessages = (sessionId: string, updater: (msgs: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const newMsgs = updater(s.messages);
        const updatedSession = { ...s, messages: newMsgs, updatedAt: new Date(), title: s.messages.length === 0 && newMsgs.length > 0 ? newMsgs[0].text.slice(0, 30) : s.title };
        db.saveSession(updatedSession).catch(e => console.error("Failed to save session", e));
        return updatedSession;
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
          {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
          {/* Mobile Sidebar Backdrop */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-300"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <aside className={`glass-matte transition-all duration-500 z-40 flex flex-col fixed md:relative inset-y-0 left-0 h-full border-r border-mirror-border md:border-none shadow-2xl md:shadow-none ${isSidebarOpen ? 'translate-x-0 w-64 md:w-52 opacity-100' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'}`}>
            <div className={`p-6 flex flex-col h-full overflow-hidden w-full`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold tracking-tight text-mirror-text">
                    neur<span className="text-mirror-accent font-black">A</span>lly
                  </h2>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-full hover:bg-white/10 text-mirror-subtext transition-colors md:hidden">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button 
                onClick={createNewSession}
                className="mb-6 w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-mirror-text text-mirror-bg font-bold text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> New Session
              </button>

              <nav className="space-y-1 mb-8">
                <button onClick={() => { setView('chat'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${view === 'chat' ? 'bg-mirror-accent text-white' : 'text-mirror-subtext hover-surface'}`}>
                  <MessageSquare className="w-3.5 h-3.5" /> Cognitive Stream
                </button>
                <button onClick={() => { setView('gallery'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${view === 'gallery' ? 'bg-mirror-accent text-white' : 'text-mirror-subtext hover-surface'}`}>
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-3.5 h-3.5" /> Visual Assets
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${view === 'gallery' ? 'bg-white/20 text-white' : 'bg-mirror-accent/10 text-mirror-accent'}`}>
                    {savedImages.length}
                  </span>
                </button>
                <button onClick={() => { setView('tasks'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${view === 'tasks' ? 'bg-mirror-accent text-white' : 'text-mirror-subtext hover-surface'}`}>
                  <div className="flex items-center gap-3">
                    <ListTodo className="w-3.5 h-3.5" /> Strategic Ledger
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${view === 'tasks' ? 'bg-white/20 text-white' : 'bg-mirror-accent/10 text-mirror-accent'}`}>
                    {tasks.length}
                  </span>
                </button>
                <button onClick={() => { setView('logs'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${view === 'logs' ? 'bg-mirror-accent text-white' : 'text-mirror-subtext hover-surface'}`}>
                  <Activity className="w-3.5 h-3.5" /> System Logs
                </button>
              </nav>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                <label className="text-[9px] font-bold text-mirror-subtext/40 uppercase tracking-widest px-2">Memory Nodes</label>
                <div className="space-y-0.5">
                  {sessions.slice().reverse().map(s => (
                    <div 
                      key={s.id}
                      onClick={() => { setView('chat'); setCurrentSessionId(s.id); setIsSidebarOpen(false); }}
                      className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${currentSessionId === s.id && view === 'chat' ? 'bg-mirror-text/10 text-mirror-text' : 'text-mirror-subtext hover-surface'}`}
                    >
                      <span className="truncate text-[10px] font-medium max-w-[140px]">{s.title}</span>
                      <button 
                        onClick={(e) => deleteSession(s.id, e)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-mirror-subtext hover:text-red-400 transition-all"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-mirror-border flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl text-mirror-subtext hover:bg-white/5 hover:text-mirror-text flex-1 flex justify-center transition-all" title="Toggle Theme">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <button onClick={handleLogout} className="p-2.5 rounded-xl text-mirror-subtext hover:bg-red-500/10 hover:text-red-400 flex-1 flex justify-center transition-all" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0 relative h-full">
            <header className="absolute top-0 left-0 right-0 h-16 md:h-20 z-30 flex items-center px-4 md:px-8 bg-gradient-to-b from-mirror-bg/95 via-mirror-bg/80 to-transparent backdrop-blur-[2px]">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 md:p-3 rounded-full glass-gloss text-mirror-text shadow-lg hover:scale-110 transition-transform active:scale-95">
                {isSidebarOpen ? <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
              <div className="ml-4 md:ml-6 flex flex-col">
                <h2 className="text-sm font-bold tracking-tight text-mirror-text truncate max-w-[200px] md:max-w-none">
                   {view === 'chat' ? (currentSession?.title || 'Synthesis') : view === 'gallery' ? 'Visual Assets' : view === 'tasks' ? 'Strategic Ledger' : 'System Logs'}
                </h2>
                <span className="text-[9px] uppercase tracking-widest text-mirror-subtext font-mono hidden md:inline-block">neurAlly Neural Active</span>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto z-10 px-4 md:px-20 py-20 md:py-24 custom-scrollbar scroll-smooth" ref={mainContainerRef}>
              <div className="max-w-6xl mx-auto h-full">
                {view === 'chat' ? (
                  <>
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-1000">
                        <div className="relative mb-8 group">
                          <div className="absolute inset-0 bg-mirror-accent/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                          <Sparkles className="w-16 h-16 text-mirror-accent/50 relative z-10" />
                        </div>
                        
                        <h1 className="text-5xl font-bold mb-4 tracking-tighter bg-gradient-to-br from-white via-mirror-text to-mirror-subtext bg-clip-text text-transparent">
                          Hi <span className="text-mirror-accent">{userAlias}</span>
                        </h1>
                        <p className="text-xl text-mirror-subtext font-medium mb-12 max-w-lg leading-relaxed">
                          I am synced and ready to act as your cognitive mirror. <br/> Where shall we direct our focus?
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                          {[
                            { icon: <ListTodo className="w-5 h-5" />, label: "Strategic Planning", prompt: "Help me draft a strategic roadmap for..." },
                            { icon: <ImagePlus className="w-5 h-5" />, label: "Visual Synthesis", prompt: "Generate a visualization of..." },
                            { icon: <Cpu className="w-5 h-5" />, label: "Technical Analysis", prompt: "Analyze the technical architecture of..." },
                            { icon: <Brain className="w-5 h-5" />, label: "Creative Ideation", prompt: "Brainstorm innovative concepts for..." }
                          ].map((item, i) => (
                            <button
                              key={i}
                              onClick={() => setInputValue(item.prompt)}
                              className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-mirror-accent/30 hover:shadow-lg hover:shadow-mirror-accent/5 transition-all text-left"
                            >
                              <div className="p-3 rounded-xl bg-black/20 text-mirror-accent group-hover:scale-110 transition-transform">
                                {item.icon}
                              </div>
                              <div>
                                <span className="block text-sm font-bold text-mirror-text group-hover:text-white transition-colors">{item.label}</span>
                                <span className="text-xs text-mirror-subtext group-hover:text-mirror-subtext/80">Initialize sequence &rarr;</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-4xl mx-auto flex flex-col gap-8">
                        {messages.map((msg, idx) => (
                          <MessageBubble 
                            key={msg.id} 
                            message={msg} 
                            userAvatar={userAvatar}
                            onActionClick={(text) => addTask(text)}
                            onToggleBookmark={(id) => updateSessionMessages(currentSessionId!, msgs => msgs.map(m => m.id === id ? { ...m, isBookmarked: !m.isBookmarked } : m))}
                            onSaveImage={(url) => handleSaveImage(url, msg.text)}
                            onFeedback={(id, type) => updateSessionMessages(currentSessionId!, msgs => msgs.map(m => m.id === id ? { ...m, feedback: type } : m))}
                            onRegenerate={handleRegenerate}
                            onStop={processingState !== ProcessingState.IDLE && msg.role === Role.USER && idx === messages.length - 2 ? handleStopGeneration : undefined}
                            onSpeech={handleSpeech}
                          />
                        ))}
                        <ThinkingIndicator state={processingState} />
                        <div ref={messagesEndRef} className="h-10" />
                      </div>
                    )}
                  </>
                ) : view === 'gallery' ? (
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
                          <div key={img.id} className="relative group rounded-2xl overflow-hidden glass-matte border border-mirror-border aspect-square cursor-pointer" onClick={() => setZoomedImage(img)}>
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
                ) : view === 'tasks' ? (
                  <TasksView />
                ) : (
                  <LogsView />
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

            {/* Scroll to Bottom Button */}
            {showScrollBottom && view === 'chat' && (
              <button
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="absolute bottom-32 right-8 z-30 p-3 rounded-full bg-mirror-accent text-white shadow-lg hover:scale-110 transition-all animate-in fade-in zoom-in duration-300 hover:shadow-mirror-accent/50 hover:shadow-2xl"
                title="Scroll to Bottom"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}

            {view === 'chat' && (
              <div className="px-4 pb-10 pt-2 bg-gradient-to-t from-mirror-bg via-mirror-bg/90 to-transparent z-20">
                <div className="max-w-3xl mx-auto">
                   {/* Image Settings Panel */}
                  {showImageSettings && (
                    <div className="absolute bottom-full left-0 right-0 mb-4 mx-4 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300 z-50">
                      <div className="max-w-md mx-auto glass-dock rounded-3xl p-6 border border-mirror-border shadow-2xl backdrop-blur-xl bg-black/80">
                         <div className="flex items-center justify-between mb-6">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-mirror-text flex items-center gap-2">
                             <Sliders className="w-4 h-4 text-mirror-accent" /> Visualization Matrix
                           </h3>
                           <button onClick={() => setShowImageSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                         </div>
                         
                         <div className="space-y-6">
                           {/* Style Selection */}
                           <div className="space-y-3">
                             <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider block">Aesthetic Style</label>
                             <div className="grid grid-cols-3 gap-2">
                               {['None', 'Photorealistic', 'Cyberpunk', 'Watercolor', '3D Render', 'Sketch'].map(style => (
                                 <button
                                   key={style}
                                   onClick={() => setImageConfig({...imageConfig, style})}
                                   className={`px-3 py-2.5 rounded-xl text-[10px] font-medium transition-all text-center border ${imageConfig.style === style ? 'bg-mirror-accent border-mirror-accent text-white shadow-lg shadow-mirror-accent/20' : 'bg-mirror-text/5 border-transparent text-mirror-subtext hover:bg-mirror-text/10 hover:border-mirror-border'}`}
                                 >
                                   {style}
                                 </button>
                               ))}
                             </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                             {/* Aspect Ratio */}
                             <div className="space-y-2">
                               <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider block">Ratio</label>
                               <select 
                                 value={imageConfig.aspectRatio}
                                 onChange={(e) => setImageConfig({...imageConfig, aspectRatio: e.target.value as any})}
                                 className="w-full bg-mirror-text/5 border border-mirror-border rounded-xl px-3 py-2.5 text-xs text-mirror-text focus:outline-none focus:border-mirror-accent focus:ring-1 focus:ring-mirror-accent transition-all appearance-none cursor-pointer"
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
                               <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider block">Quantity</label>
                               <div className="flex items-center gap-1 bg-mirror-text/5 rounded-xl p-1 border border-mirror-border">
                                 {[1, 2, 3, 4].map(num => (
                                   <button
                                     key={num}
                                     onClick={() => setImageConfig({...imageConfig, numberOfImages: num})}
                                     className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${imageConfig.numberOfImages === num ? 'bg-mirror-accent text-white shadow-md' : 'text-mirror-subtext hover:text-mirror-text hover:bg-white/5'}`}
                                   >
                                     {num}
                                   </button>
                                 ))}
                               </div>
                             </div>
                           </div>
                           
                           {/* Resolution - Only available for Pro */}
                           <div className="space-y-2">
                             <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider block">Resolution (Pro)</label>
                             <div className="flex items-center gap-1 bg-mirror-text/5 rounded-xl p-1 border border-mirror-border">
                               {['1K', '2K', '4K'].map(res => (
                                 <button
                                   key={res}
                                   onClick={() => setImageConfig({...imageConfig, imageSize: res as any})}
                                   className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${imageConfig.imageSize === res ? 'bg-mirror-accent text-white shadow-md' : 'text-mirror-subtext hover:text-mirror-text hover:bg-white/5'}`}
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

                  <div className="relative glass-dock rounded-[2.5rem] p-3 shadow-2xl border border-white/5">
                    {attachment && (
                      <div className="mx-2 mb-3 p-3 rounded-2xl bg-mirror-text/5 flex items-center gap-4 border border-mirror-border/50 backdrop-blur-md">
                        <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {attachment.mimeType.startsWith('image/') ? <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="w-full h-full object-cover" /> : <FileText className="w-6 h-6 text-mirror-accent" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-[10px] font-bold text-mirror-subtext uppercase tracking-widest truncate mb-1">
                              {generationMode !== 'chat' ? "Visual Reference Active" : "Attachment Ready"}
                          </span>
                          <div className="flex gap-2">
                             {attachment.mimeType.startsWith('image/') && (
                               <>
                                 <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Edit Capable</span>
                                 <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">Animate Capable</span>
                               </>
                             )}
                          </div>
                        </div>
                        <button onClick={() => { setAttachment(null); setGenerationMode('chat'); }} className="p-2 hover:bg-red-500/10 rounded-full group transition-colors">
                          <X className="w-4 h-4 text-mirror-subtext group-hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-end gap-2 pl-2">
                      <button 
                        onClick={() => setIsFastMode(!isFastMode)}
                        className={`p-3 transition-all rounded-2xl ${isFastMode ? 'text-yellow-400 bg-yellow-400/10' : 'text-mirror-subtext hover:text-mirror-text hover:bg-white/5'}`}
                        title={isFastMode ? "Fast Mode Active (Flash Lite)" : "Deep Reasoning Mode (Pro)"}
                      >
                         <Zap className={`w-5 h-5 ${isFastMode ? 'fill-current' : ''}`} />
                      </button>



                      <button 
                        onClick={() => {
                          const newMode = generationMode === 'image' ? 'chat' : 'image';
                          setGenerationMode(newMode);
                          setShowImageSettings(newMode === 'image');
                          if (newMode === 'chat') setAttachment(null);
                        }}
                        className={`p-3 transition-all rounded-2xl ${generationMode === 'image' ? 'text-mirror-accent bg-mirror-accent/10' : 'text-mirror-subtext hover:text-mirror-text hover:bg-white/5'}`}
                        title={generationMode === 'image' ? "Exit Image Mode" : "Enter Image Mode"}
                      >
                         <ImagePlus className="w-5 h-5" />
                      </button>

                      <button 
                        onClick={() => {
                          const newMode = generationMode === 'video' ? 'chat' : 'video';
                          setGenerationMode(newMode);
                          if (newMode === 'chat') setAttachment(null);
                        }}
                        className={`p-3 transition-all rounded-2xl ${generationMode === 'video' ? 'text-pink-400 bg-pink-500/10' : 'text-mirror-subtext hover:text-mirror-text hover:bg-white/5'}`}
                        title={generationMode === 'video' ? "Exit Video Mode" : "Enter Video Mode"}
                      >
                         <Film className="w-5 h-5" />
                      </button>

                      {(generationMode === 'image' || generationMode === 'video') && (
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
                              setGenerationMode('image');
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />

                      <textarea 
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(undefined, generationMode); }}}
                        placeholder={generationMode === 'image' ? "Describe visual to generate..." : generationMode === 'video' ? "Describe video to generate..." : "Synchronize thought..."}
                        className="flex-1 bg-transparent border-none outline-none text-mirror-text py-4 min-h-[56px] resize-none text-sm placeholder:text-mirror-subtext/50 font-medium"
                        rows={1}
                      />
                      <button 
                        onClick={() => handleSend(undefined, generationMode)}
                        disabled={!inputValue.trim() && !attachment}
                        className={`p-3 rounded-full hover:scale-105 active:scale-95 disabled:opacity-20 transition-all shadow-xl ${generationMode === 'image' ? 'bg-mirror-accent text-white' : generationMode === 'video' ? 'bg-pink-500 text-white' : 'bg-mirror-text text-mirror-bg'}`}
                      >
                        {processingState !== ProcessingState.IDLE ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
