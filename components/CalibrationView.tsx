import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Message, Role } from '../types';
import { streamResponse, extractDirectives } from '../services/geminiService';
import { 
  Brain, Sparkles, Send, Sliders, Trash2, Plus, 
  Cpu, Activity, Wand2, ArrowUpCircle, Check, HelpCircle, Save, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface CalibrationViewProps {
  profile: UserProfile;
  onUpdate: (updatedProfile: UserProfile) => void;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({ profile, onUpdate }) => {
  // Local state for guidelines/directives
  const [directives, setDirectives] = useState<string[]>(profile.customDirectives || []);
  const [newDirective, setNewDirective] = useState('');
  
  // Cognitive Alignment state
  const [alignment, setAlignment] = useState({
    analytical: profile.cognitiveAlignment?.analytical ?? 88,
    creative: profile.cognitiveAlignment?.creative ?? 72,
    strategic: profile.cognitiveAlignment?.strategic ?? 94,
    empathic: profile.cognitiveAlignment?.empathic ?? 65,
  });

  // Local active chat state for calibration
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: `Welcome to the Neural Calibration Lab, **${profile.name || 'User'}**. I am your metacognitive alignment assistant.

Feel free to instruct me on how you'd like me to learn, interact, and deliver solutions to you. For example, you can tell me:
* *"I prefer extremely concise, bulleted responses whenever asking technical questions."*
* *"In corporate discussions, adopt a high-level strategic and analytical posture."*
* *"Always supply modular, documented TypeScript examples when coding."*

I will analyze your instructions. Once you are satisfied with our alignment dialogue, click **"Synthesize Directives"** below, and I will automatically distill our talk into explicit rules in your memory cores!`,
      timestamp: new Date(),
      origin: 'ai'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  // Adjust local alignment values on profile updates
  useEffect(() => {
    if (profile.cognitiveAlignment) {
      setAlignment({
        analytical: profile.cognitiveAlignment.analytical ?? 88,
        creative: profile.cognitiveAlignment.creative ?? 72,
        strategic: profile.cognitiveAlignment.strategic ?? 94,
        empathic: profile.cognitiveAlignment.empathic ?? 65,
      });
    }
    if (profile.customDirectives) {
      setDirectives(profile.customDirectives);
    }
  }, [profile]);

  // Handle manual additions
  const handleAddDirective = () => {
    if (!newDirective.trim()) return;
    if (directives.length >= 10) {
      toast.error("Maximum limit of 10 directives reached. Remove some to add more.");
      return;
    }
    const updated = [...directives, newDirective.trim()];
    setDirectives(updated);
    setNewDirective('');
    toast.success("Directive queued! Remember to 'Commit to Neural Core' to save.");
  };

  const handleRemoveDirective = (index: number) => {
    const updated = directives.filter((_, i) => i !== index);
    setDirectives(updated);
    toast.info("Directive removed from queue.");
  };

  // Chat message submission
  const handleSendPromptMessage = async () => {
    if (!inputMessage.trim() || isThinking) return;

    const userText = inputMessage;
    setInputMessage('');

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: userText,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newUserMsg]);
    setIsThinking(true);

    const calibrationSystemPrompt = `You are the Cognitive Alignment Engine of neur.ally. The user is currently in a dedicated Training & Calibration session to teach you how to behave, talk, formulate output, and integrate into their workflow.
YOUR GOALS:
1. Reflect on the exact tone, style, and instructions they are telling you.
2. Formulate helpful feedback and confirm that you understand their request.
3. Suggest 1 or 2 concrete rule statements that could be saved as Directives based on what they just said.
4. Keep the conversation extremely professional, friendly, and metacognitive. Do not exceed 3 paragraphs.`;

    try {
      const activeBotMsgId = (Date.now() + 1).toString();
      setChatMessages(prev => [...prev, {
        id: activeBotMsgId,
        role: Role.MODEL,
        text: '',
        timestamp: new Date(),
        isStreaming: true,
        origin: 'ai'
      }]);

      let fullResponseText = '';
      
      const sessionHistory = chatMessages.slice(-15);

      // We call the streamResponse but wrap the prompt safely
      await streamResponse(
        sessionHistory,
        `[Neural Calibration Engine Context: Analyze my request and address how it optimizes your learning parameters] Message: "${userText}"`,
        null,
        (text) => {
          fullResponseText = text;
          setChatMessages(prev => prev.map(m => 
            m.id === activeBotMsgId ? { ...m, text } : m
          ));
        },
        undefined,
        false, // high intelligence model
        {
          ...profile,
          // Set custom system prompt context to calibrate
          bio: calibrationSystemPrompt
        }
      );

      setChatMessages(prev => prev.map(m => 
        m.id === activeBotMsgId ? { ...m, isStreaming: false } : m
      ));
    } catch (err: any) {
      console.error("Calibration stream error", err);
      toast.error("Calibration communication transient failure.");
    } finally {
      setIsThinking(false);
    }
  };

  // AI Cognitive Directives Distiller
  const handleSynthesizeDirectives = async () => {
    if (chatMessages.length <= 1) {
      toast.error("Please chat with the agent first so there is conversational context to synthesize!");
      return;
    }

    setIsExtracting(true);
    toast.loading("Analyzing session transcript & synthesizing directives...", { id: 'synthesis' });

    try {
      // Build transcript
      const transcript = chatMessages
        .map(m => `${m.role === Role.USER ? 'User' : 'Agent'}: ${m.text}`)
        .join('\n\n');

      const extracted = await extractDirectives(transcript);
      
      if (extracted && extracted.length > 0) {
        // Merge without duplicates
        const unique = Array.from(new Set([...directives, ...extracted])).slice(0, 8);
        setDirectives(unique);
        toast.success(`Synthesized ${extracted.length} behavioral directives dynamically!`, { id: 'synthesis' });
      } else {
        toast.error("Unable to extract distinct behavioral rules. Try being more specific in chat.", { id: 'synthesis' });
      }
    } catch (e) {
      console.error("Synthesizer error", e);
      toast.error("Synthesis error.", { id: 'synthesis' });
    } finally {
      setIsExtracting(false);
    }
  };

  // Save changes to Firestore User Profile!
  const handleCommitToNeuralCore = async () => {
    setIsSaving(true);
    try {
      const updatedProfile: UserProfile = {
        ...profile,
        customDirectives: directives,
        cognitiveAlignment: alignment
      };

      await onUpdate(updatedProfile);
      toast.success("Neural Core successfully re-calibrated. Changes committed to Firestore!");
    } catch (e) {
      console.error("Commit failed", e);
      toast.error("Failure committing profiles to cloud database.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2 tracking-tighter flex items-center gap-3">
            <Cpu className="w-9 h-9 text-mirror-accent animate-pulse" /> Neural Calibration Lab
          </h1>
          <p className="text-mirror-subtext">Calibrate cognitive priorities, teach guidelines, and configure persistent AI learning modules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCommitToNeuralCore}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-mirror-accent hover:bg-mirror-accent/80 active:scale-95 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-mirror-accent/30"
          >
            {isSaving ? (
              <span className="flex items-center gap-2"><Activity className="w-4 h-4 animate-spin" /> Committing...</span>
            ) : (
              <><Save className="w-4 h-4" /> Commit to Neural Core</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Learning and Sliders Configuration (4 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Cognitive Core Prioritizer */}
          <div className="glass-matte rounded-[2rem] p-6 border border-mirror-border shadow-xl">
            <h2 className="text-sm font-bold text-mirror-text mb-4 uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-4 h-4 text-mirror-accent" /> Cognitive Weights
            </h2>
            <p className="text-[11px] text-mirror-subtext mb-6">
              Establish the default distribution of cognitive patterns across the network. These values adjust dynamically.
            </p>

            <div className="space-y-4">
              {[
                { key: 'analytical', label: 'Analytical Logic', desc: 'First-principles, type-safety, correctness' },
                { key: 'creative', label: 'Creative Lateralism', desc: 'Ideation, visual flair, design novelty' },
                { key: 'strategic', label: 'Strategic Leverage', desc: 'Long-term planning, core architecture' },
                { key: 'empathic', label: 'Empathic Calibration', desc: 'Supportive tone, user-adaptive context' }
              ].map(stat => (
                <div key={stat.key} className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-mirror-text uppercase tracking-tight">{stat.label}</span>
                    <span className="text-xs font-mono font-bold text-mirror-accent">{alignment[stat.key as keyof typeof alignment]}%</span>
                  </div>
                  <p className="text-[9px] text-mirror-subtext/60 mb-2">{stat.desc}</p>
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    value={alignment[stat.key as keyof typeof alignment]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setAlignment(prev => ({
                        ...prev,
                        [stat.key]: val
                      }));
                    }}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-mirror-accent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines Ledger / Custom Directives */}
          <div className="glass-matte rounded-[2rem] p-6 border border-mirror-border shadow-xl">
            <h2 className="text-sm font-bold text-mirror-text mb-2 uppercase tracking-widest flex items-center gap-2">
              <Brain className="w-4 h-4 text-mirror-accent" /> Active Directives Ledger
            </h2>
            <p className="text-[11px] text-mirror-subtext mb-4 leading-relaxed">
              These guidelines are loaded directly into the AI's standard system instruction matrix.
            </p>

            {/* List current */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar mb-4">
              {directives.length === 0 ? (
                <div className="py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <HelpCircle className="w-8 h-8 text-mirror-subtext/20 mx-auto mb-2" />
                  <p className="text-[10px] text-mirror-subtext">No saved directives. Talk to the Agent or add manually below!</p>
                </div>
              ) : (
                directives.map((dir, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-mirror-accent/30 transition-all group"
                  >
                    <div className="p-1 rounded-md bg-mirror-accent/15 mt-0.5">
                      <Check className="w-3 h-3 text-mirror-accent" />
                    </div>
                    <p className="flex-1 text-[11px] leading-relaxed text-mirror-text font-medium">{dir}</p>
                    <button 
                      onClick={() => handleRemoveDirective(index)}
                      className="text-mirror-subtext/40 hover:text-red-400 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete guideline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add manual inline */}
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newDirective}
                onChange={(e) => setNewDirective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDirective()}
                placeholder="Ex: Always use compact interfaces..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-mirror-text placeholder:text-mirror-subtext/30 focus:outline-none focus:border-mirror-accent transition-all font-medium"
              />
              <button 
                onClick={handleAddDirective}
                className="px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-mirror-text transition-all"
                title="Add directive"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Conversation / Calibration Terminal (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[70vh] glass-matte rounded-[2.5rem] border border-mirror-border shadow-2xl overflow-hidden relative">
          
          {/* Header of chat */}
          <div className="px-6 py-4 border-b border-mirror-border bg-white/5 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-mirror-text uppercase tracking-widest">Cognitive Calibration Link</h3>
                <p className="text-[9px] text-mirror-subtext">Direct instruction tunnel to neural weights</p>
              </div>
            </div>
            <button
              onClick={handleSynthesizeDirectives}
              disabled={isExtracting || chatMessages.length <= 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mirror-accent/10 border border-mirror-accent/20 text-[10px] font-bold text-mirror-accent hover:bg-mirror-accent hover:text-white transition-all uppercase tracking-wider disabled:opacity-40 disabled:hover:bg-mirror-accent/10 disabled:hover:text-mirror-accent"
            >
              <Wand2 className="w-3.5 h-3.5" /> Synthesize Directives
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
            {chatMessages.map((msg, i) => {
              const isAi = msg.role === Role.MODEL;
              return (
                <div 
                  key={msg.id || i}
                  className={`flex ${isAi ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[85%] rounded-[1.5rem] p-4 text-xs leading-relaxed ${isAi ? 'bg-white/5 text-mirror-text border border-white/5 rounded-tl-sm' : 'bg-mirror-accent text-white shadow-lg shadow-mirror-accent/10 rounded-tr-sm'}`}>
                    <div className="whitespace-pre-wrap font-medium">
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-white/5 text-mirror-text border border-white/5 rounded-[1.5rem] rounded-tl-sm p-4 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-mirror-accent animate-spin" />
                  <span className="font-semibold text-mirror-subtext animate-pulse">Syncing mental matrix...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat input footer */}
          <div className="p-4 border-t border-mirror-border bg-white/5 shrink-0 z-10">
            <div className="flex gap-2.5">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendPromptMessage()}
                placeholder="Instruct the agent on style, format, constraints..."
                disabled={isThinking}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-mirror-text placeholder:text-mirror-subtext/30 focus:outline-none focus:border-mirror-accent transition-all font-medium disabled:opacity-50"
              />
              <button 
                onClick={handleSendPromptMessage}
                disabled={!inputMessage.trim() || isThinking}
                className="p-3.5 rounded-2xl bg-mirror-text text-mirror-bg hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-40 shadow-lg"
              >
                <Send className="w-4 h-4 font-bold" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
