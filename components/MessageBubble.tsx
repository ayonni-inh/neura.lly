
import React, { useState } from 'react';
import { Message, Role, Attachment } from '../types';
import { MarkdownRenderer } from '../utils/markdown';
import { 
  User, ExternalLink, Bookmark, 
  Sparkles, X, Copy, Check, RotateCcw, Download,
  FileText, Plus, Lightbulb, AlertTriangle
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onToggleBookmark?: (id: string) => void;
  onFeedback?: (id: string, type: 'positive' | 'negative' | null) => void;
  onActionClick?: (actionText: string) => void;
  onRerun?: (text: string, attachment?: Attachment) => void;
  onContinue?: (id: string) => void;
  onSaveImage?: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onToggleBookmark, 
  onActionClick,
  onRerun,
  onSaveImage
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [savedImageUrls, setSavedImageUrls] = useState<Set<string>>(new Set());
  
  const isUser = message.role === Role.USER;
  const isError = message.isError;
  const hasStrategicFooter = !isUser && message.text.includes('**Insight:**');
  
  // Normalize images into an array (handling legacy single image format)
  const images = message.generatedImageUrls || (message.generatedImageUrl ? [message.generatedImageUrl] : []);

  let mainContent = message.text;
  let footerData: { insight?: string; opportunity?: string; action?: string } = {};

  if (hasStrategicFooter) {
    const splitIndex = message.text.lastIndexOf('---');
    if (splitIndex !== -1) {
      mainContent = message.text.substring(0, splitIndex);
      const footerText = message.text.substring(splitIndex + 3);
      
      const insightMatch = footerText.match(/\*\*Insight:\*\* (.*?)(?=\n\*\*|\n---|$)/s);
      const opportunityMatch = footerText.match(/\*\*Opportunity:\*\* (.*?)(?=\n\*\*|\n---|$)/s);
      const actionMatch = footerText.match(/\*\*Action:\*\* (.*?)(?=\n\*\*|\n---|$)/s);
      
      footerData = {
        insight: insightMatch?.[1]?.trim(),
        opportunity: opportunityMatch?.[1]?.trim(),
        action: actionMatch?.[1]?.trim(),
      };
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  const handleDownloadImage = (imageUrl: string, timestamp: Date) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `neurAlly-visual-${timestamp.getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToGallery = (url: string) => {
    if (onSaveImage) {
      onSaveImage(url);
      setSavedImageUrls(prev => new Set(prev).add(url));
      // Revert icon after delay just for visual feedback, though state is persisted in parent
      setTimeout(() => {
        // Optional: clear status if we want to allow re-saving or just keep it checked
      }, 2000); 
    }
  };

  const handleCaptureAction = () => {
    if (footerData.action && onActionClick) {
      onActionClick(footerData.action);
      setIsCaptured(true);
      setTimeout(() => setIsCaptured(false), 3000);
    }
  };

  return (
    <div id={`msg-${message.id}`} className={`flex gap-4 w-full group ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-2 border shadow-lg ${isError ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'glass-gloss border-mirror-border'}`}>
          {isError ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-mirror-accent" />}
        </div>
      )}

      <div className={`max-w-[85%] lg:max-w-[75%] flex flex-col gap-2 relative`}>
        {/* Main Content Bubble */}
        <div className={`p-5 md:p-6 backdrop-blur-md shadow-xl transition-all duration-300 
          ${isUser 
            ? 'bg-gradient-to-br from-mirror-accent to-blue-600 text-white rounded-[24px] rounded-tr-md border border-white/10' 
            : isError 
              ? 'bg-red-500/5 border border-red-500/20 text-red-100 rounded-[24px] rounded-tl-md shadow-[0_0_30px_-10px_rgba(239,68,68,0.2)]'
              : 'glass-matte text-mirror-text rounded-[24px] rounded-tl-md'
          } 
          ${message.isBookmarked ? 'ring-2 ring-yellow-500/30' : ''}`}
        >
          
          {images.length > 0 && (
            <div className={`mb-4 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.map((imgUrl, idx) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group/img cursor-zoom-in" onClick={() => setZoomedImage(imgUrl)}>
                  <img src={imgUrl} alt={`Visual ${idx + 1}`} className="w-full h-auto object-cover transition-transform duration-700 group-hover/img:scale-105" />
                  
                  {/* Image-specific Quick Actions */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-all z-10">
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveToGallery(imgUrl);
                      }}
                      className={`p-2 backdrop-blur-md border border-white/20 rounded-xl text-white shadow-lg transition-all hover:scale-110 active:scale-95 ${savedImageUrls.has(imgUrl) ? 'bg-green-500/60' : 'bg-black/40 hover:bg-black/60'}`}
                      title={savedImageUrls.has(imgUrl) ? "Saved to Gallery" : "Save to Visual Assets"}
                    >
                      {savedImageUrls.has(imgUrl) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadImage(imgUrl, message.timestamp);
                      }}
                      className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 rounded-xl text-white shadow-lg transition-all hover:scale-110 active:scale-95"
                      title="Save Image to Device"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {zoomedImage && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-10 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
               <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
                 <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-3xl" alt="Zoomed" />
                 <X className="absolute top-4 right-4 w-8 h-8 text-white cursor-pointer hover:scale-110 transition-transform" onClick={() => setZoomedImage(null)} />
                 <div className="absolute bottom-4 right-4 flex gap-3">
                   <button 
                      onClick={() => handleSaveToGallery(zoomedImage)}
                      className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all"
                    >
                       <Plus className="w-4 h-4" /> {savedImageUrls.has(zoomedImage) ? 'Saved' : 'Save Asset'}
                   </button>
                   <button 
                    onClick={() => handleDownloadImage(zoomedImage, message.timestamp)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all"
                   >
                     <Download className="w-4 h-4" /> High-Res
                   </button>
                 </div>
               </div>
            </div>
          )}

          {message.attachment && (
            <div className="mb-4">
              {message.attachment.mimeType.startsWith('image/') ? (
                <div className="rounded-xl overflow-hidden shadow-lg border border-white/10 max-w-[200px]">
                  <img src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} alt="Ref" className="w-full h-auto" />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10 text-xs text-mirror-subtext font-mono">
                  <FileText className="w-4 h-4 text-mirror-accent" />
                  {message.attachment.mimeType.split('/')[1].toUpperCase()}
                </div>
              )}
            </div>
          )}
          
          <div className="prose prose-invert max-w-none">
             <MarkdownRenderer content={mainContent} isError={isError} />
          </div>

          {message.sources && message.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
              {message.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1 glass-gloss rounded-full text-[10px] text-mirror-subtext hover:text-white border border-mirror-border transition-all">
                  <ExternalLink className="w-3 h-3" /> <span className="truncate max-w-[120px]">{s.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Unified Bottom Action Bar */}
        <div className={`flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {isUser && onRerun && (
            <button 
              onClick={() => onRerun(message.text, message.attachment)} 
              title="Rerun Prompt"
              className="p-2 rounded-xl glass-gloss text-mirror-subtext hover:text-mirror-accent transition-all hover:scale-110 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          
          <button 
            onClick={handleCopy} 
            title="Copy Context"
            className={`p-2 rounded-xl glass-gloss flex items-center gap-2 transition-all hover:scale-110 active:scale-95 ${copied ? 'text-green-400 bg-green-500/10' : 'text-mirror-subtext hover:text-mirror-text'}`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied && <span className="text-[9px] font-bold uppercase tracking-widest">Copied</span>}
          </button>

          {onToggleBookmark && (
            <button 
              onClick={() => onToggleBookmark(message.id)} 
              title="Bookmark in Node"
              className={`p-2 rounded-xl glass-gloss flex items-center gap-2 transition-all hover:scale-110 active:scale-95 ${message.isBookmarked ? 'text-yellow-500 bg-yellow-500/10' : 'text-mirror-subtext hover:text-yellow-500'}`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${message.isBookmarked ? 'fill-current' : ''}`} />
              {message.isBookmarked && <span className="text-[9px] font-bold uppercase tracking-widest">Saved</span>}
            </button>
          )}

          {images.length > 0 && (
            <button 
              onClick={() => handleDownloadImage(images[0], message.timestamp)} 
              title="Download All Visuals"
              className="p-2 rounded-xl glass-gloss text-mirror-subtext hover:text-white transition-all hover:scale-110 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          
          <span className="text-[9px] font-mono text-mirror-subtext/40 px-2 uppercase tracking-tighter">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Strategic Ledger Footer */}
        {!isUser && hasStrategicFooter && (
          <div className="mt-2 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 duration-700">
             {footerData.insight && (
               <div className="glass-gloss p-3 rounded-2xl border-l-2 border-l-blue-500/50">
                  <div className="flex items-center gap-2 mb-1 text-blue-400 text-[8px] font-bold uppercase tracking-widest opacity-70"><Lightbulb className="w-3 h-3" /> Observation</div>
                  <p className="text-[11px] leading-relaxed text-mirror-text/70 italic">{footerData.insight}</p>
               </div>
             )}
             {footerData.action && (
               <button onClick={handleCaptureAction} className={`glass-gloss p-3 rounded-2xl border-l-2 transition-all text-left group/action ${isCaptured ? 'border-l-green-500 bg-green-500/5' : 'border-l-emerald-500 hover:bg-emerald-500/5'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest ${isCaptured ? 'text-green-400' : 'text-emerald-400'}`}>
                      {isCaptured ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 group-hover/action:rotate-90 transition-transform" />} {isCaptured ? 'Captured to Ledger' : 'Commit to Ledger'}
                    </div>
                  </div>
                  <p className="text-[11px] text-mirror-text font-medium">{footerData.action}</p>
               </button>
             )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center shrink-0 mt-2 shadow-lg border border-white/10">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};
