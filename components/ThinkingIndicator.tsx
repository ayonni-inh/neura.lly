
import React from 'react';
import { Zap, Brain, Radio, ImageIcon, Search, Wand2, Film } from 'lucide-react';

interface ThinkingIndicatorProps {
  state: 'thinking' | 'streaming' | 'generating_image' | 'editing_image' | 'generating_video' | 'idle';
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ state }) => {
  if (state === 'idle') return null;

  const config = {
    thinking: {
      icon: <Brain className="w-4 h-4 text-purple-400 animate-pulse" />,
      text: 'Architecting Solution',
      showDots: true
    },
    streaming: {
      icon: <Radio className="w-4 h-4 text-blue-400 animate-pulse" />,
      text: 'Transmitting Insight',
      showDots: true
    },
    generating_image: {
      icon: <ImageIcon className="w-4 h-4 text-green-400 animate-bounce" />,
      text: 'Synthesizing Visualization...',
      showDots: false
    },
    editing_image: {
      icon: <Wand2 className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />,
      text: 'Executing Image Transformation...',
      showDots: false
    },
    generating_video: {
      icon: <Film className="w-4 h-4 text-pink-400 animate-pulse" />,
      text: 'Rendering Cinematic Sequence...',
      showDots: false
    }
  };

  const current = config[state as keyof typeof config] || config.thinking;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-mirror-panel border border-mirror-border rounded-full w-fit shadow-lg shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {current.icon}
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono text-mirror-subtext uppercase tracking-wider">
          {current.text}
        </span>
        {current.showDots && (
          <div className="flex space-x-0.5 ml-1">
            <div className="w-1 h-1 bg-mirror-subtext rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 bg-mirror-subtext rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-mirror-subtext rounded-full animate-bounce"></div>
          </div>
        )}
      </div>
    </div>
  );
};
