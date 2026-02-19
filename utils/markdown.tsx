
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  isError?: boolean;
}

/**
 * Enhanced MarkdownRenderer
 * Supports: Headers (#, ##, ###), Code blocks (```), Bold (**), Italic (* or _), 
 * Links ([text](url)), Unordered Lists (- or *), and Horizontal Rules (---).
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isError }) => {
  if (!content) return null;

  // Split by code blocks first
  const sections = content.split(/(```[\s\S]*?```)/g);

  // Styling based on state
  const textClass = isError ? "text-red-100" : "text-mirror-text";
  const subtextClass = isError ? "text-red-200/80" : "text-mirror-subtext";
  const boldClass = isError ? "text-red-50 font-bold" : "text-mirror-text font-bold";
  const accentClass = isError ? "text-red-400" : "text-mirror-accent";
  const codeBlockClass = isError ? "bg-black/30 border-red-500/20 text-red-200 shadow-inner" : "bg-mirror-bg/80 border-mirror-border shadow-inner glass-gloss";

  const renderInline = (text: string) => {
    // Regex for: **bold**, *italic*, _italic_, [link](url)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_|\[.*?\]\(.*?\))/g);
    
    return parts.map((part, i) => {
      // Bold: **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className={boldClass}>{part.slice(2, -2)}</strong>;
      }
      
      // Italic: *text* or _text_
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={i} className={`${accentClass} italic font-medium`}>{part.slice(1, -1)}</em>;
      }
      
      // Link: [label](url)
      if (part.startsWith('[') && part.includes('](')) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          return (
            <a 
              key={i} 
              href={match[2]} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`${accentClass} hover:underline decoration-${isError ? 'red' : 'mirror'}-accent/30 underline-offset-2 transition-all`}
            >
              {match[1]}
            </a>
          );
        }
      }
      
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`space-y-4 leading-relaxed font-sans selection:bg-${isError ? 'red' : 'mirror'}-accent/30 ${textClass}`}>
      {sections.map((section, sectionIdx) => {
        if (section.startsWith('```')) {
          const match = section.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : section.slice(3, -3);
          
          return (
            <div key={sectionIdx} className={`${codeBlockClass} border rounded-xl p-4 overflow-x-auto my-4 font-mono text-sm`}>
              {lang && (
                <div className={`flex justify-between items-center mb-3 border-b ${isError ? 'border-red-500/30' : 'border-mirror-border/30'} pb-2`}>
                  <span className={`text-[10px] ${accentClass} font-bold uppercase tracking-widest`}>{lang}</span>
                  {!isError && (
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                    </div>
                  )}
                </div>
              )}
              <pre className="opacity-90"><code>{code.trim()}</code></pre>
            </div>
          );
        }

        return (
          <div key={sectionIdx} className="space-y-2">
            {section.split('\n').map((line, lineIdx) => {
              const trimmed = line.trim();
              if (trimmed === '') return <div key={lineIdx} className="h-1" />;
              
              // Headers
              if (line.startsWith('### ')) {
                return <h3 key={lineIdx} className={`text-base font-bold mt-6 mb-2 tracking-wide border-l-2 pl-3 uppercase ${isError ? 'border-red-500 text-red-100' : 'border-mirror-accent text-mirror-text'}`}>{renderInline(line.replace('### ', ''))}</h3>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={lineIdx} className={`text-xl font-bold mt-8 mb-4 tracking-tight ${isError ? 'text-red-200' : 'mirror-gradient-text'}`}>{renderInline(line.replace('## ', ''))}</h2>;
              }
              if (line.startsWith('# ')) {
                return <h1 key={lineIdx} className={`text-2xl font-black mt-10 mb-6 tracking-tighter uppercase ${isError ? 'text-red-300' : 'text-mirror-text'}`}>{renderInline(line.replace('# ', ''))}</h1>;
              }

              // Horizontal Rule
              if (trimmed === '---') {
                return <hr key={lineIdx} className={`my-8 opacity-40 shadow-glow ${isError ? 'border-red-500' : 'border-mirror-border'}`} />;
              }

              // Unordered Lists
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const listContent = trimmed.slice(2);
                return (
                  <div key={lineIdx} className="flex gap-3 ml-2 my-1">
                    <span className={`${accentClass} font-bold mt-1`}>•</span>
                    <span className={`flex-1 ${subtextClass}`}>{renderInline(listContent)}</span>
                  </div>
                );
              }

              // Normal Paragraph
              return (
                <p key={lineIdx} className={`mb-2 ${subtextClass}`}>
                  {renderInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
