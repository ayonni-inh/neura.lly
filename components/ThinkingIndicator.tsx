
import React from 'react';
import { Zap, Brain, Radio, ImageIcon, Search, Wand2 } from 'lucide-react';

interface ThinkingIndicatorProps {
  state: 'thinking' | 'streaming' | 'generating_image' | 'editing_image' | 'idle';
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ state }) => {
  if (state === 'idle') return null;

  const config = {
    thinking: {
      icon: <Brain className="w-4 h-4 text-purple-400 animate-pulse" />,
      text: 'Architecting Solution...'
    },
    streaming: {
      icon: <Radio className="w-4 h-4 text-blue-400 animate-pulse" />,
      text: 'Transmitting Insight...'
    },
    generating_image: {
      icon: <ImageIcon className="w-4 h-4 text-green-400 animate-bounce" />,
      text: 'Synthesizing Visualization...'
    },
    editing_image: {
      icon: <Wand2 className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />,
      text: 'Executing Image Transformation...'
    }
  };

  const current = config[state as keyof typeof config] || config.thinking;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-mirror-panel border border-mirror-border rounded-full w-fit shadow-lg shadow-black/20">
      {current.icon}
      <span className="text-[10px] font-mono text-mirror-subtext uppercase tracking-wider">
        {current.text}
      </span>
    </div>
  );
};
