import React, { useState } from 'react';
import { ChevronRight, CheckCircle2, BrainCircuit, LayoutGrid, ListTodo, Activity, X } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to neurAlly",
      description: "I am your Cognitive Mirror—a strategic partner designed to extend your thinking, not just answer questions.",
      icon: <BrainCircuit className="w-12 h-12 text-mirror-accent" />,
      highlight: "Philosophy"
    },
    {
      title: "Cognitive Stream",
      description: "Engage in deep, continuous dialogue. I maintain context across our sessions to help you solve complex problems.",
      icon: <div className="p-3 bg-mirror-accent/10 rounded-xl"><BrainCircuit className="w-8 h-8 text-mirror-accent" /></div>,
      highlight: "Core Function"
    },
    {
      title: "Visual Assets",
      description: "Generate and manage high-fidelity visual concepts. Use the 'Visual Assets' gallery to curate your inspiration.",
      icon: <div className="p-3 bg-purple-500/10 rounded-xl"><LayoutGrid className="w-8 h-8 text-purple-400" /></div>,
      highlight: "Creativity"
    },
    {
      title: "Strategic Ledger",
      description: "Track commitments and action items. I help you prioritize what matters most.",
      icon: <div className="p-3 bg-green-500/10 rounded-xl"><ListTodo className="w-8 h-8 text-green-400" /></div>,
      highlight: "Execution"
    },
    {
      title: "System Transparency",
      description: "Review 'System Logs' to understand my operations. Trust is built on transparency.",
      icon: <div className="p-3 bg-blue-500/10 rounded-xl"><Activity className="w-8 h-8 text-blue-400" /></div>,
      highlight: "Trust"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="w-full max-w-md mx-4 relative">
        <div className="glass-dock rounded-[2rem] p-8 shadow-2xl border border-mirror-border relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-mirror-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Close Button */}
            <button 
                onClick={onComplete}
                className="absolute top-6 right-6 p-2 text-mirror-subtext hover:text-mirror-text transition-colors z-10"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-6 mt-4">
                <div className="mb-2 animate-in zoom-in-50 duration-500" key={`icon-${step}`}>
                    {steps[step].icon}
                </div>
                
                <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500" key={`text-${step}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-mirror-accent bg-mirror-accent/10 px-3 py-1 rounded-full">
                        {steps[step].highlight}
                    </span>
                    <h2 className="text-2xl font-bold text-mirror-text mt-4">
                        {steps[step].title}
                    </h2>
                    <p className="text-mirror-subtext text-sm leading-relaxed max-w-xs mx-auto">
                        {steps[step].description}
                    </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex gap-2 pt-4">
                    {steps.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-mirror-accent' : 'w-2 bg-mirror-border'}`} 
                        />
                    ))}
                </div>

                {/* Action Button */}
                <button 
                    onClick={handleNext}
                    className="w-full py-4 bg-mirror-text text-mirror-bg rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
                >
                    {step === steps.length - 1 ? (
                        <>Get Started <CheckCircle2 className="w-4 h-4" /></>
                    ) : (
                        <>Next <ChevronRight className="w-4 h-4" /></>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
