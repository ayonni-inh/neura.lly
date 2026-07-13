import React from 'react';
import { UserProfile, VoiceSettings, VoiceName, ImageGenerationConfig } from '../types';
import { 
  User, Mail, Shield, Zap, 
  Settings, Camera, Save, RefreshCw,
  Volume2, Sliders, Play, Cpu, Brain, Sparkles, Lock, BarChart3,
  Key, Plus, Trash2, Eye, EyeOff, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentType, ApiKey } from '../types';
import { UsageDashboard } from './UsageDashboard';
import { SafeImage } from './SafeImage';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onUpgrade?: () => void;
  voiceSettings: VoiceSettings;
  setVoiceSettings: React.Dispatch<React.SetStateAction<VoiceSettings>>;
  imageConfig: ImageGenerationConfig;
  setImageConfig: React.Dispatch<React.SetStateAction<ImageGenerationConfig>>;
  onTestVoice: (text: string, id: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  profile, onUpdate, onUpgrade, 
  voiceSettings, setVoiceSettings, 
  imageConfig, setImageConfig,
  onTestVoice
}) => {
  const [editing, setEditing] = React.useState(false);
  const [formData, setFormData] = React.useState(profile);
  
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>(() => {
    try {
      const saved = localStorage.getItem('neurAlly_api_keys');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showNewKeyForm, setShowNewKeyForm] = React.useState(false);
  const [newKeyData, setNewKeyData] = React.useState({ name: '', key: '', service: 'Google Cloud' });
  const [visibleKeys, setVisibleKeys] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    localStorage.setItem('neurAlly_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  const handleAddKey = () => {
    if (!newKeyData.name || !newKeyData.key) return;
    
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyData.name,
      key: newKeyData.key,
      service: newKeyData.service,
      isActive: apiKeys.length === 0, // First key is active by default
      createdAt: new Date()
    };
    
    setApiKeys([...apiKeys, newKey]);
    setNewKeyData({ name: '', key: '', service: 'Google Cloud' });
    setShowNewKeyForm(false);
  };

  const handleRemoveKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  const handleSetActiveKey = (id: string) => {
    setApiKeys(apiKeys.map(k => ({
      ...k,
      isActive: k.id === id
    })));
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    onUpdate(formData);
    setEditing(false);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 tracking-tighter bg-gradient-to-r from-mirror-text to-mirror-accent bg-clip-text text-transparent">Neural Profile</h1>
          <p className="text-mirror-subtext">Manage your cognitive identity and system preferences.</p>
        </div>
        <div className="hidden md:block text-right">
          <div className="text-[10px] font-bold text-mirror-accent uppercase tracking-[0.2em] mb-1">System Status</div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Neural Link Stable
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-matte rounded-[2.5rem] p-8 border border-mirror-border shadow-[0_12px_40px_rgba(0,0,0,0.3)] flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mirror-accent/50 to-transparent" />
            
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-mirror-accent to-mirror-accent/30 p-1 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <div className="w-full h-full rounded-full bg-mirror-bg flex items-center justify-center overflow-hidden relative">
                  {profile.avatar ? (
                    <SafeImage src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-mirror-accent" />
                  )}
                  <div className="absolute inset-0 bg-mirror-accent/10 mix-blend-overlay" />
                </div>
              </div>
              <button className="absolute bottom-0 right-0 p-2.5 rounded-full bg-mirror-text text-mirror-bg shadow-xl hover:scale-110 transition-all border border-white/10">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <h2 className="text-2xl font-bold text-mirror-text tracking-tight">{profile.name}</h2>
            <p className="text-xs text-mirror-subtext font-mono mt-1 opacity-70">{profile.email}</p>
            
            <div className="mt-8 w-full grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-mirror-accent/30 transition-colors">
                <span className="block text-xl font-bold text-mirror-accent uppercase tracking-tighter">{profile.plan || 'Free'}</span>
                <span className="text-[9px] font-bold text-mirror-subtext uppercase tracking-widest opacity-50">Tier Status</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-mirror-accent/30 transition-colors">
                <span className="block text-xl font-bold text-mirror-accent">{profile.syncIndex || 98}%</span>
                <span className="text-[9px] font-bold text-mirror-subtext uppercase tracking-widest opacity-50">Sync Index</span>
              </div>
            </div>

            <div className="mt-8 w-full pt-8 border-t border-white/5 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-mirror-accent" />
                    <span>Neural Signature</span>
                  </div>
                  <span className="text-[8px] font-mono opacity-50">#NX-90210</span>
                </div>
                <div className="h-20 w-full rounded-2xl bg-white/5 border border-white/5 overflow-hidden relative group/sig">
                  <motion.svg 
                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full" 
                    viewBox="0 0 200 80"
                  >
                    <motion.path 
                      animate={{ d: [
                        "M0 40 Q 25 10, 50 40 T 100 40 T 150 40 T 200 40",
                        "M0 40 Q 25 70, 50 40 T 100 40 T 150 40 T 200 40",
                        "M0 40 Q 25 10, 50 40 T 100 40 T 150 40 T 200 40"
                      ]}}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="0.5"
                      className="text-mirror-accent"
                    />
                    <motion.path 
                      animate={{ d: [
                        "M0 45 Q 25 15, 50 45 T 100 45 T 150 45 T 200 45",
                        "M0 45 Q 25 75, 50 45 T 100 45 T 150 45 T 200 45",
                        "M0 45 Q 25 15, 50 45 T 100 45 T 150 45 T 200 45"
                      ]}}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="0.5"
                      className="text-mirror-accent/50"
                    />
                  </motion.svg>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/sig:opacity-100 transition-opacity bg-mirror-bg/60 backdrop-blur-[2px]">
                    <button 
                      onClick={() => {
                        const newSync = (profile.syncIndex || 98) + (Math.random() > 0.5 ? 0.1 : -0.1);
                        onUpdate({
                          ...profile,
                          syncIndex: parseFloat(newSync.toFixed(1))
                        });
                      }}
                      className="px-3 py-1.5 rounded-full bg-mirror-accent text-[9px] font-bold uppercase tracking-widest text-white shadow-lg shadow-mirror-accent/20 hover:scale-105 transition-transform"
                    >
                      Recalibrate Link
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 text-mirror-accent" />
                    <span>Neural Resonance</span>
                  </div>
                  <span className="text-mirror-accent">{profile.syncIndex ? (profile.syncIndex - 3.8).toFixed(1) : '94.2'}%</span>
                </div>
                <div className="grid grid-cols-8 gap-1 h-8 items-end px-1">
                  {[40, 60, 45, 80, 55, 90, 75, 85].map((h, i) => (
                    <motion.div 
                      key={i} 
                      animate={{ 
                        height: [`${h * 0.8}%`, `${h * 1.2}%`, `${h * 0.8}%`]
                      }}
                      transition={{ 
                        duration: 2 + Math.random() * 2, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: i * 0.1
                      }}
                      className="bg-mirror-accent/30 rounded-t-sm transition-all hover:bg-mirror-accent" 
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">
                  <span>Cognitive Load</span>
                  <span className="text-mirror-accent">Low</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-mirror-accent/50 w-[24%] relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 w-full pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-mirror-accent" /> Cognitive Alignment
                </h3>
                {editing && (
                  <button 
                    onClick={() => {
                      setFormData({
                        ...formData,
                        cognitiveAlignment: {
                          analytical: 50 + Math.floor(Math.random() * 40),
                          creative: 50 + Math.floor(Math.random() * 40),
                          strategic: 50 + Math.floor(Math.random() * 40),
                          empathic: 50 + Math.floor(Math.random() * 40)
                        }
                      });
                    }}
                    className="text-[8px] font-bold uppercase tracking-widest text-mirror-accent hover:opacity-70 transition-opacity"
                  >
                    Randomize
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'analytical', label: 'Analytical', value: formData.cognitiveAlignment?.analytical || 88 },
                  { key: 'creative', label: 'Creative', value: formData.cognitiveAlignment?.creative || 72 },
                  { key: 'strategic', label: 'Strategic', value: formData.cognitiveAlignment?.strategic || 94 },
                  { key: 'empathic', label: 'Empathic', value: formData.cognitiveAlignment?.empathic || 65 }
                ].map(stat => (
                  <div key={stat.key} className="p-3 rounded-2xl bg-white/5 border border-white/5 group/stat">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-bold text-mirror-subtext uppercase tracking-tight">{stat.label}</span>
                      <span className="text-[9px] font-mono text-mirror-accent">{stat.value}%</span>
                    </div>
                    {editing ? (
                      <input 
                        type="range"
                        min="1"
                        max="100"
                        value={stat.value}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          const current = formData.cognitiveAlignment || {
                            analytical: 88,
                            creative: 72,
                            strategic: 94,
                            empathic: 65
                          };
                          setFormData({
                            ...formData,
                            cognitiveAlignment: {
                              ...current,
                              [stat.key]: val
                            }
                          });
                        }}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-mirror-accent"
                      />
                    ) : (
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-mirror-accent/30 transition-all duration-1000" style={{ width: `${stat.value}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-mirror-subtext font-mono opacity-50 px-1">
              <span>ID: {profile.email?.split('@')[0].toUpperCase() || 'ANON'}-NX</span>
              <span>LOC: EDGE-WEST-2</span>
              <span>UPTIME: 99.98%</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="glass-matte rounded-[2.5rem] p-8 border border-mirror-border shadow-2xl h-full relative overflow-hidden space-y-8 flex flex-col">
            
            <div className="pb-6 border-b border-white/5 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-mirror-accent" /> Protocol Authorization
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-mirror-accent bg-mirror-accent/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    v{profile.protocolVersion || '2.4'}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    Unlocked
                  </span>
                </div>
              </div>
              
              <div className="relative pt-6 pb-2 px-1">
                <div className="absolute top-0 left-1 right-1 h-0.5 bg-white/5 rounded-full" />
                <div 
                  className="absolute top-0 left-1 h-0.5 bg-gradient-to-r from-mirror-accent to-mirror-accent/30 rounded-full transition-all duration-1000"
                  style={{ width: `${(profile.protocolStage || 1) * 20}%` }}
                />
                
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { l: 1, name: 'Init', desc: 'Initialization' },
                    { l: 2, name: 'Sync', desc: 'Neural Sync' },
                    { l: 3, name: 'Map', desc: 'Cognitive Map' },
                    { l: 4, name: 'Synth', desc: 'Synthesis' },
                    { l: 5, name: 'Core', desc: 'Neural Core' }
                  ].map(stage => {
                    const isActive = (profile.protocolStage || 1) >= stage.l;
                    return (
                      <div key={stage.l} className="flex flex-col items-center">
                        <div 
                          className={`w-3 h-3 rounded-full border-2 mb-2 transition-all ${
                            isActive ? 'bg-mirror-accent border-mirror-bg shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-transparent border-white/10'
                          }`}
                        />
                        <span className={`text-[8px] font-bold uppercase tracking-tighter transition-colors ${isActive ? 'text-mirror-text' : 'text-mirror-subtext opacity-30'}`}>
                          {stage.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-mirror-accent/5 border border-mirror-accent/10 flex items-start gap-4">
                <div className="p-2 rounded-xl bg-mirror-accent/20">
                  <Zap className="w-5 h-5 text-mirror-accent" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-mirror-text mb-1">Protocol Level {profile.protocolStage || 1}: {
                    (profile.protocolStage || 1) === 1 ? 'Initialization Phase' :
                    (profile.protocolStage || 1) === 2 ? 'Neural Link Established' :
                    (profile.protocolStage || 1) === 3 ? 'Cognitive Mapping Active' :
                    (profile.protocolStage || 1) === 4 ? 'Multi-Agent Synthesis Complete' :
                    'Full Neural Identity Established'
                  }</h5>
                  <p className="text-[10px] text-mirror-subtext leading-relaxed">
                    All systems operating under Multi-Agent Protocol v2.4. Neural latency optimized for edge-case ideation and strategic foresight.
                  </p>
                  { (profile.protocolStage || 1) < 5 && (
                    <button 
                      onClick={() => {
                        onUpdate({
                          ...profile,
                          protocolStage: (profile.protocolStage || 1) + 1
                        });
                      }}
                      className="mt-3 px-4 py-1.5 rounded-xl bg-mirror-accent/10 border border-mirror-accent/20 text-[10px] font-bold text-mirror-accent hover:bg-mirror-accent hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"
                    >
                      <Sparkles className="w-3 h-3" /> Ascend Protocol
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-mirror-accent/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 shrink-0">
              <h3 className="text-xl font-bold text-mirror-text flex items-center gap-3">
                <Settings className="w-6 h-6 text-mirror-accent" /> Identity Matrix
              </h3>
              <button 
                onClick={() => editing ? handleSave() : setEditing(true)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${editing ? 'bg-mirror-accent text-white shadow-lg shadow-mirror-accent/20 scale-105' : 'bg-white/5 text-mirror-text hover:bg-white/10 border border-white/5'}`}
              >
                {editing ? <><Save className="w-3.5 h-3.5" /> Commit Changes</> : <><RefreshCw className="w-3.5 h-3.5" /> Reconfigure</>}
              </button>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Neural Handle</label>
                  <input 
                    type="text" 
                    disabled={!editing}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-mirror-text focus:outline-none focus:border-mirror-accent transition-all disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Communication Node</label>
                  <input 
                    type="email" 
                    disabled={!editing}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-mirror-text focus:outline-none focus:border-mirror-accent transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Cognitive Bio</label>
                <textarea 
                  disabled={!editing}
                  rows={4}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-mirror-text focus:outline-none focus:border-mirror-accent transition-all disabled:opacity-50 resize-none"
                  placeholder="Describe your neural architecture..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Strategic Goals</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.goals.map((goal, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-mirror-accent/10 border border-mirror-accent/20 text-[11px] text-mirror-text">
                        {goal}
                        {editing && (
                          <button 
                            onClick={() => setFormData({...formData, goals: formData.goals.filter((_, idx) => idx !== i)})}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {editing && (
                      <button 
                        onClick={() => {
                          const goal = prompt("Enter new strategic goal:");
                          if (goal) setFormData({...formData, goals: [...formData.goals, goal]});
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-mirror-subtext hover:bg-white/10 transition-all"
                      >
                        + Add Goal
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">System Constraints</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.constraints.map((constraint, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-mirror-subtext">
                        {constraint}
                        {editing && (
                          <button 
                            onClick={() => setFormData({...formData, constraints: formData.constraints.filter((_, idx) => idx !== i)})}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {editing && (
                      <button 
                        onClick={() => {
                          const constraint = prompt("Enter new system constraint:");
                          if (constraint) setFormData({...formData, constraints: [...formData.constraints, constraint]});
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-mirror-subtext hover:bg-white/10 transition-all"
                      >
                        + Add Constraint
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest mb-4">Preference Matrix</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Tone Protocol</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['professional', 'casual', 'concise', 'detailed'].map(t => (
                        <button
                          key={t}
                          disabled={!editing}
                          onClick={() => setFormData({...formData, preferences: {...formData.preferences, tone: t as any}})}
                          className={`px-4 py-2.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest border transition-all ${formData.preferences.tone === t ? 'bg-mirror-accent text-white border-mirror-accent' : 'bg-white/5 text-mirror-subtext border-white/5 hover:bg-white/10'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Core Expertise</label>
                    <input 
                      type="text" 
                      disabled={!editing}
                      value={formData.preferences.expertise}
                      onChange={(e) => setFormData({...formData, preferences: {...formData.preferences, expertise: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-mirror-text focus:outline-none focus:border-mirror-accent transition-all disabled:opacity-50"
                      placeholder="e.g. Software Engineering, Data Science"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Neural Interests</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.preferences.interests.map((interest, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-mirror-subtext">
                        {interest}
                        {editing && (
                          <button 
                            onClick={() => setFormData({
                              ...formData, 
                              preferences: {
                                ...formData.preferences, 
                                interests: formData.preferences.interests.filter((_, idx) => idx !== i)
                              }
                            })}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {editing && (
                      <button 
                        onClick={() => {
                          const interest = prompt("Enter new interest:");
                          if (interest) setFormData({
                            ...formData, 
                            preferences: {
                              ...formData.preferences, 
                              interests: [...formData.preferences.interests, interest]
                            }
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-mirror-subtext hover:bg-white/10 transition-all"
                      >
                        + Add Interest
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-mirror-accent" /> Neural Agent Matrix
                  </h4>
                  <span className="text-[9px] font-bold text-mirror-accent bg-mirror-accent/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">Multi-Agent Protocol v2.4</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { 
                      id: 'Executor', 
                      label: 'Executor', 
                      icon: <Cpu className="w-5 h-5" />, 
                      desc: 'High-speed task processing & automation', 
                      minPlan: 'free',
                      color: 'text-blue-400'
                    },
                    { 
                      id: 'Strategic', 
                      label: 'Strategic', 
                      icon: <Brain className="w-5 h-5" />, 
                      desc: 'Deep logic, reasoning & long-term planning', 
                      minPlan: 'pro',
                      color: 'text-purple-400'
                    },
                    { 
                      id: 'Creative', 
                      label: 'Creative', 
                      icon: <Sparkles className="w-5 h-5" />, 
                      desc: 'Abstract artistic synthesis & ideation', 
                      minPlan: 'pro',
                      color: 'text-pink-400'
                    }
                  ].map(agent => {
                    const isLocked = agent.minPlan !== 'free' && profile.plan === 'free';
                    const isSelected = formData.selectedAgent === agent.id;
                    return (
                      <motion.button
                        key={agent.id}
                        whileHover={!isLocked ? { scale: 1.02, translateY: -2 } : {}}
                        whileTap={!isLocked ? { scale: 0.98 } : {}}
                        disabled={isLocked || !editing}
                        onClick={() => setFormData({...formData, selectedAgent: agent.id as AgentType})}
                        className={`p-5 rounded-3xl border transition-all flex flex-col items-start text-left gap-3 relative overflow-hidden group ${
                          isSelected 
                            ? 'bg-mirror-accent/10 border-mirror-accent/50 shadow-xl shadow-mirror-accent/5' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        } ${isLocked ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${!editing && !isSelected ? 'opacity-50' : ''}`}
                      >
                        <div className={`p-3 rounded-2xl transition-all ${isSelected ? 'bg-mirror-accent text-white' : 'bg-white/5 text-mirror-subtext group-hover:text-mirror-text'}`}>
                          {agent.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-mirror-text tracking-tight">{agent.label}</p>
                          <p className="text-[10px] text-mirror-subtext mt-1 leading-relaxed opacity-70">{agent.desc}</p>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="w-2 h-2 rounded-full bg-mirror-accent animate-pulse" />
                          </div>
                        )}

                        {isLocked && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                            <Lock className="w-5 h-5 text-mirror-accent mb-2" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white">Upgrade to Pro</span>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-mirror-accent" /> Audio Matrix
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <span className="text-xs font-medium text-mirror-text block">Voice Feedback</span>
                      <span className="text-[10px] text-mirror-subtext">Enable neural speech synthesis</span>
                    </div>
                    <button 
                      onClick={() => setVoiceSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`w-10 h-5 rounded-full relative transition-all ${voiceSettings.enabled ? 'bg-mirror-accent' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${voiceSettings.enabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <span className="text-xs font-medium text-mirror-text block">Auto-Play</span>
                      <span className="text-[10px] text-mirror-subtext">Read responses automatically</span>
                    </div>
                    <button 
                      onClick={() => setVoiceSettings(prev => ({ ...prev, autoPlay: !prev.autoPlay }))}
                      className={`w-10 h-5 rounded-full relative transition-all ${voiceSettings.autoPlay ? 'bg-mirror-accent' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${voiceSettings.autoPlay ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Voice Persona</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as VoiceName[]).map(v => (
                          <button 
                            key={v}
                            onClick={() => setVoiceSettings(prev => ({ ...prev, voiceName: v }))}
                            className={`p-2 rounded-xl text-[10px] font-bold transition-all border ${voiceSettings.voiceName === v ? 'bg-mirror-accent text-white border-mirror-accent' : 'bg-white/5 text-mirror-subtext border-white/5 hover:bg-white/10'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Speaking Style</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'Normal', label: 'Normal' },
                          { id: 'cheerful', label: 'Cheerful' },
                          { id: 'serious', label: 'Serious' },
                          { id: 'whispering', label: 'Whispering' },
                          { id: 'excited', label: 'Excited' },
                          { id: 'calm', label: 'Calm' }
                        ].map(s => (
                          <button 
                            key={s.id}
                            onClick={() => setVoiceSettings(prev => ({ ...prev, style: s.id }))}
                            className={`p-2 rounded-xl text-[10px] font-bold transition-all border ${voiceSettings.style === s.id ? 'bg-mirror-accent text-white border-mirror-accent' : 'bg-white/5 text-mirror-subtext border-white/5 hover:bg-white/10'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Pitch</label>
                          <span className="text-[10px] font-mono text-mirror-accent">{(voiceSettings.pitch || 1.0).toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.1"
                          value={voiceSettings.pitch}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-mirror-accent"
                        />
                        <div className="flex justify-between text-[8px] text-mirror-subtext font-bold uppercase tracking-tighter">
                          <span>Deep</span>
                          <span>High</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest">Speed</label>
                          <span className="text-[10px] font-mono text-mirror-accent">{(voiceSettings.speed || 1.0).toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.1"
                          value={voiceSettings.speed}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-mirror-accent"
                        />
                        <div className="flex justify-between text-[8px] text-mirror-subtext font-bold uppercase tracking-tighter">
                          <span>Slow</span>
                          <span>Fast</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onTestVoice(`Neural link established. Voice persona ${voiceSettings.voiceName} operational at ${voiceSettings.speed}x speed.`, "test-voice")}
                      className="w-full py-3 mt-2 rounded-xl bg-white/5 border border-white/10 text-mirror-text text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Play className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      Test Voice Configuration
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-mirror-accent" /> Visualization Matrix
                </h4>
                <div className="grid grid-cols-1 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="space-y-2">
                    <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider block">Aesthetic Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['None', 'Photorealistic', 'Cyberpunk', 'Watercolor', '3D Render', 'Sketch'].map(style => (
                        <button
                          key={style}
                          onClick={() => setImageConfig({...imageConfig, style})}
                          className={`px-2 py-2 rounded-xl text-[10px] font-medium transition-all text-center border ${imageConfig.style === style ? 'bg-mirror-accent border-mirror-accent text-white shadow-md' : 'bg-white/5 border-transparent text-mirror-subtext hover:bg-white/10'}`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider block">Aspect Ratio</label>
                      <div className="flex bg-black/20 p-1 rounded-xl">
                        {['1:1', '16:9', '9:16'].map(ratio => (
                          <button
                            key={ratio}
                            onClick={() => setImageConfig({...imageConfig, aspectRatio: ratio as any})}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${imageConfig.aspectRatio === ratio ? 'bg-mirror-accent text-white shadow-md' : 'text-mirror-subtext hover:text-mirror-text hover:bg-white/5'}`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-mirror-subtext uppercase font-bold tracking-wider block">Resolution</label>
                      <div className="flex bg-black/20 p-1 rounded-xl">
                        {['1K', '2K', '4K'].map(res => (
                          <button
                            key={res}
                            onClick={() => setImageConfig({...imageConfig, imageSize: res as any})}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${imageConfig.imageSize === res ? 'bg-mirror-accent text-white shadow-md' : 'text-mirror-subtext hover:text-mirror-text hover:bg-white/5'}`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-4 h-4 text-mirror-accent" /> API Key Management
                  </h4>
                  <button 
                    onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mirror-accent/10 text-mirror-accent text-[10px] font-bold uppercase tracking-widest hover:bg-mirror-accent hover:text-white transition-all"
                  >
                    {showNewKeyForm ? 'Cancel' : <><Plus className="w-3 h-3" /> Add Key</>}
                  </button>
                </div>

                <AnimatePresence>
                  {showNewKeyForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Key Name</label>
                            <input 
                              type="text" 
                              value={newKeyData.name}
                              onChange={(e) => setNewKeyData({...newKeyData, name: e.target.value})}
                              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-mirror-text focus:outline-none focus:border-mirror-accent transition-all"
                              placeholder="e.g. Production Key"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Service</label>
                            <select 
                              value={newKeyData.service}
                              onChange={(e) => setNewKeyData({...newKeyData, service: e.target.value})}
                              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-mirror-text focus:outline-none focus:border-mirror-accent transition-all appearance-none"
                            >
                              <option value="Google Cloud">Google Cloud</option>
                              <option value="OpenAI">OpenAI</option>
                              <option value="Anthropic">Anthropic</option>
                              <option value="Custom">Custom Service</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">API Key</label>
                          <input 
                            type="password" 
                            value={newKeyData.key}
                            onChange={(e) => setNewKeyData({...newKeyData, key: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-mirror-text focus:outline-none focus:border-mirror-accent transition-all font-mono"
                            placeholder="AIzaSy..."
                          />
                        </div>
                        <button 
                          onClick={handleAddKey}
                          disabled={!newKeyData.name || !newKeyData.key}
                          className="w-full py-2.5 rounded-xl bg-mirror-accent text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-mirror-accent/20 transition-all"
                        >
                          Save Key
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  {apiKeys.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                      <Key className="w-6 h-6 text-mirror-subtext/50 mb-2" />
                      <p className="text-xs text-mirror-subtext">No API keys configured.</p>
                      <p className="text-[10px] text-mirror-subtext/50 mt-1">Add a key to enable external service integrations.</p>
                    </div>
                  ) : (
                    apiKeys.map(key => (
                      <div 
                        key={key.id} 
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${key.isActive ? 'bg-mirror-accent/5 border-mirror-accent/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                      >
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleSetActiveKey(key.id)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${key.isActive ? 'bg-mirror-accent border-mirror-accent text-white' : 'border-white/20 text-transparent hover:border-mirror-accent/50'}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-mirror-text">{key.name}</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/10 text-mirror-subtext">
                                {key.service}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono text-mirror-subtext/70">
                                {visibleKeys[key.id] ? key.key : '••••••••••••••••••••••••'}
                              </span>
                              <button 
                                onClick={() => toggleKeyVisibility(key.id)}
                                className="text-mirror-subtext hover:text-mirror-text transition-colors"
                              >
                                {visibleKeys[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveKey(key.id)}
                          className="p-2 rounded-xl text-mirror-subtext hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest mb-4">Plan & Usage</h4>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs text-mirror-subtext uppercase tracking-widest mb-1">Current Plan</p>
                      <p className="text-2xl font-bold text-mirror-text capitalize">{profile.plan || 'Free'}</p>
                    </div>
                    {profile.plan !== 'max' && (
                      <button onClick={onUpgrade} className="px-4 py-2 bg-mirror-accent/10 text-mirror-accent rounded-xl text-xs font-bold hover:bg-mirror-accent hover:text-white transition-colors">
                        Upgrade
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-mirror-subtext">Prompts</span>
                        <span className="text-mirror-text">{profile.usage?.prompts || 0} / {profile.plan === 'max' ? '∞' : profile.plan === 'pro' ? 100 : 20}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-mirror-accent" style={{ width: `${Math.min(100, ((profile.usage?.prompts || 0) / (profile.plan === 'max' ? Infinity : profile.plan === 'pro' ? 100 : 20)) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-mirror-subtext">Images</span>
                        <span className="text-mirror-text">{profile.usage?.imageGenerations || 0} / {profile.plan === 'max' ? '∞' : profile.plan === 'pro' ? 50 : 5}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-mirror-accent" style={{ width: `${Math.min(100, ((profile.usage?.imageGenerations || 0) / (profile.plan === 'max' ? Infinity : profile.plan === 'pro' ? 50 : 5)) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-mirror-subtext">Videos</span>
                        <span className="text-mirror-text">{profile.usage?.videoGenerations || 0} / {profile.plan === 'max' ? '∞' : profile.plan === 'pro' ? 10 : 1}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-mirror-accent" style={{ width: `${Math.min(100, ((profile.usage?.videoGenerations || 0) / (profile.plan === 'max' ? Infinity : profile.plan === 'pro' ? 10 : 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-mirror-accent/10 text-mirror-accent">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Usage Analytics</h2>
              <p className="text-sm text-mirror-subtext">Detailed breakdown of your system interactions.</p>
            </div>
          </div>
          <UsageDashboard />
        </div>
      </div>
    </div>
  );
};
