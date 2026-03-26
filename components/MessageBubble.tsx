
import React, { useState } from 'react';
import { Message, Role, Attachment } from '../types';
import { MarkdownRenderer } from '../utils/markdown';
import { 
  User, ExternalLink, Bookmark, 
  Sparkles, X, Copy, Check, RotateCcw, Download,
  FileText, Plus, Lightbulb, AlertTriangle,
  ThumbsUp, ThumbsDown, Volume2, Play, Pause, Repeat, RefreshCw,
  ChevronLeft, ChevronRight, Share2, Maximize2
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  userAvatar?: string;
  modelAvatar?: string;
  onToggleBookmark?: (id: string) => void;
  onFeedback?: (id: string, type: 'positive' | 'negative' | undefined) => void;
  onActionClick?: (actionText: string) => void;
  onRerun?: (text: string, attachments?: Attachment[]) => void;
  onRegenerate?: (id: string) => void;
  onContinue?: (id: string) => void;
  onSaveImage?: (url: string) => void;
  onSaveVideo?: (url: string) => void;
  onStop?: () => void;
  onSpeech?: (text: string, id: string) => void;
  autoPlay?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  userAvatar,
  modelAvatar,
  onToggleBookmark, 
  onFeedback,
  onActionClick,
  onRerun,
  onRegenerate,
  onSaveImage,
  onSaveVideo,
  onStop,
  onSpeech,
  autoPlay
}) => {
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const [zoomedAttachment, setZoomedAttachment] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [savedImageUrls, setSavedImageUrls] = useState<Set<string>>(new Set());
  const [savedVideoUrl, setSavedVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sharedImageUrl, setSharedImageUrl] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const isUser = message.role === Role.USER;

  React.useEffect(() => {
    if (autoPlay && message.generatedAudioUrl && !isUser && audioRef.current) {
      audioRef.current.play().catch(err => console.error("Auto-play failed:", err));
      setIsPlaying(true);
    }
  }, [message.generatedAudioUrl, autoPlay, isUser]);

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

  const shouldTruncate = !isUser && !isExpanded && mainContent.length > 500;
  const displayContent = shouldTruncate ? mainContent.slice(0, 500) + '...' : mainContent;

  const handlePlayAudio = () => {
    if (message.generatedAudioUrl) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    } else if (onSpeech) {
      onSpeech(message.text, message.id);
    }
  };
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

  const handleDownloadVideo = (videoUrl: string, timestamp: Date) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `neurAlly-video-${timestamp.getTime()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveVideoToGallery = (url: string) => {
    if (onSaveVideo) {
      onSaveVideo(url);
      setSavedVideoUrl(url);
    }
  };

  const handleShareImage = async (imageUrl: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'neurAlly Generated Image',
          text: 'Check out this AI-generated image from neurAlly',
          url: imageUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(imageUrl);
        setSharedImageUrl(imageUrl);
        setTimeout(() => setSharedImageUrl(null), 2000);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Copy to clipboard as fallback
        try {
          await navigator.clipboard.writeText(imageUrl);
          setSharedImageUrl(imageUrl);
          setTimeout(() => setSharedImageUrl(null), 2000);
        } catch (e) {
          console.error('Failed to share or copy image', e);
        }
      }
    }
  };

  const handleCopyImageUrl = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setSharedImageUrl(imageUrl);
      setTimeout(() => setSharedImageUrl(null), 2000);
    } catch (e) {
      console.error('Failed to copy URL', e);
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
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-2 border shadow-lg overflow-hidden ${isError ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'glass-gloss border-mirror-border'}`}>
          {modelAvatar ? (
            <img src={modelAvatar} alt="AI" className="w-full h-full object-cover" />
          ) : (
            isError ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-mirror-accent" />
          )}
        </div>
      )}

      <div className={`max-w-[85%] lg:max-w-[75%] flex flex-col gap-2 relative`} onClick={() => setShowActions(!showActions)}>
        {/* Main Content Bubble */}
        <div className={`p-4 md:p-6 backdrop-blur-md transition-all duration-300 
          ${isUser 
            ? 'bg-gradient-to-br from-mirror-accent to-blue-600 text-white rounded-2xl md:rounded-[24px] rounded-tr-sm md:rounded-tr-md border border-white/10 shadow-[0_8px_32px_rgba(59,130,246,0.3)]' 
            : isError 
              ? 'bg-red-500/5 border border-red-500/20 text-red-100 rounded-2xl md:rounded-[24px] rounded-tl-sm md:rounded-tl-md shadow-[0_0_30px_-10px_rgba(239,68,68,0.2)]'
              : 'glass-matte text-mirror-text rounded-2xl md:rounded-[24px] rounded-tl-sm md:rounded-tl-md shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
          } 
          ${message.isBookmarked ? 'ring-2 ring-yellow-500/30' : ''}
          cursor-pointer`}
        >
          
          {images.length > 0 && (
            <div className={`mb-4 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.map((imgUrl, idx) => (
                <div key={idx} className={`relative rounded-2xl overflow-hidden shadow-2xl border border-mirror-border group/img cursor-zoom-in ${images.length === 3 && idx === 0 ? 'col-span-2' : ''}`} onClick={() => setZoomedImageIndex(idx)}>
                  <img src={imgUrl} alt={`Visual ${idx + 1}`} className="w-full h-auto object-cover transition-transform duration-700 group-hover/img:scale-105" />
                  
                  <div className="absolute bottom-2 left-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg opacity-60 group-hover/img:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3 text-mirror-accent" />
                  </div>
                  
                  {/* Image-specific Quick Actions */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center gap-4">
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImageIndex(idx);
                      }}
                      className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 rounded-full text-white shadow-xl transition-all hover:scale-110 active:scale-95"
                      title="View Full Screen"
                    >
                      <Maximize2 className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadImage(imgUrl, message.timestamp);
                      }}
                      className="p-3 bg-mirror-accent/80 hover:bg-mirror-accent backdrop-blur-md border border-white/30 rounded-full text-white shadow-xl transition-all hover:scale-110 active:scale-95"
                      title="Download to Device"
                    >
                      <Download className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareImage(imgUrl);
                      }}
                      className={`p-3 backdrop-blur-md border border-white/30 rounded-full text-white shadow-xl transition-all hover:scale-110 active:scale-95 ${
                        sharedImageUrl === imgUrl ? 'bg-blue-500/80' : 'bg-blue-500/60 hover:bg-blue-500/80'
                      }`}
                      title="Share or Copy Image"
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-2 z-10 md:opacity-0 md:group-hover/img:opacity-100 transition-all">
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
                  </div>
                </div>
              ))}
            </div>
          )}

          {message.generatedVideoUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden shadow-2xl border border-mirror-border group relative">
              <video 
                src={message.generatedVideoUrl} 
                controls 
                className="w-full h-auto"
                poster={(message.attachments?.[0] || message.attachment)?.mimeType.startsWith('image/') ? `data:${(message.attachments?.[0] || message.attachment)!.mimeType};base64,${(message.attachments?.[0] || message.attachment)!.data}` : undefined}
              />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => handleSaveVideoToGallery(message.generatedVideoUrl!)}
                  className={`p-3 backdrop-blur-md border border-white/20 rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95 ${savedVideoUrl === message.generatedVideoUrl ? 'bg-green-500/60' : 'bg-black/40 hover:bg-black/60'}`}
                  title={savedVideoUrl === message.generatedVideoUrl ? "Saved to Gallery" : "Save to Visual Assets"}
                >
                  {savedVideoUrl === message.generatedVideoUrl ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => handleDownloadVideo(message.generatedVideoUrl!, message.timestamp)}
                  className="p-3 bg-mirror-accent/80 hover:bg-mirror-accent backdrop-blur-md border border-white/30 rounded-full text-white shadow-xl transition-all hover:scale-110 active:scale-95"
                  title="Download Video"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {zoomedImageIndex !== null && images[zoomedImageIndex] && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-10 cursor-zoom-out" onClick={() => setZoomedImageIndex(null)}>
               <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                 <img src={images[zoomedImageIndex]} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" alt="Zoomed" />
                 <X className="absolute -top-12 right-0 md:top-4 md:-right-12 w-8 h-8 text-white/70 hover:text-white cursor-pointer hover:scale-110 transition-transform" onClick={() => setZoomedImageIndex(null)} />
                 
                 {images.length > 1 && (
                   <>
                     <button 
                       onClick={(e) => { e.stopPropagation(); setZoomedImageIndex((zoomedImageIndex - 1 + images.length) % images.length); }}
                       className="absolute left-4 md:-left-16 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all"
                     >
                       <ChevronLeft className="w-6 h-6" />
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); setZoomedImageIndex((zoomedImageIndex + 1) % images.length); }}
                       className="absolute right-4 md:-right-16 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all"
                     >
                       <ChevronRight className="w-6 h-6" />
                     </button>
                     
                     <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                       {images.map((_, i) => (
                         <div key={i} className={`w-2 h-2 rounded-full ${i === zoomedImageIndex ? 'bg-white' : 'bg-white/30'}`} />
                       ))}
                     </div>
                   </>
                 )}

                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 flex-wrap justify-center max-w-[90%]">
                  <button 
                    onClick={() => handleSaveToGallery(images[zoomedImageIndex])}
                    className={`flex items-center gap-2 px-4 py-2.5 backdrop-blur-xl border rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                      savedImageUrls.has(images[zoomedImageIndex])
                        ? 'bg-green-500/40 border-green-400/50 text-white'
                        : 'bg-black/50 hover:bg-black/80 border-white/10 text-white'
                    }`}
                    title="Save to Visual Assets"
                  >
                    <Plus className="w-4 h-4" /> {savedImageUrls.has(images[zoomedImageIndex]) ? 'Saved' : 'Save'}
                  </button>
                  <button 
                    onClick={() => handleDownloadImage(images[zoomedImageIndex], message.timestamp)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-mirror-accent/80 hover:bg-mirror-accent backdrop-blur-xl border border-white/30 rounded-lg text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg"
                    title="Download to Device"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button 
                    onClick={() => handleShareImage(images[zoomedImageIndex])}
                    className={`flex items-center gap-2 px-4 py-2.5 backdrop-blur-xl border rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                      sharedImageUrl === images[zoomedImageIndex]
                        ? 'bg-blue-500/40 border-blue-400/50 text-white'
                        : 'bg-black/50 hover:bg-black/80 border-white/10 text-white'
                    }`}
                    title="Share or Copy Image URL"
                  >
                    <Share2 className="w-4 h-4" /> {sharedImageUrl === images[zoomedImageIndex] ? 'Copied' : 'Share'}
                  </button>
                </div>
               </div>
            </div>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {message.attachments.map((att, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden shadow-lg border border-mirror-border max-w-[200px]">
                  {att.mimeType.startsWith('image/') ? (
                    <img 
                      src={`data:${att.mimeType};base64,${att.data}`} 
                      alt={`Ref ${idx}`} 
                      className="w-full h-auto cursor-zoom-in hover:opacity-80 transition-opacity" 
                      onClick={(e) => { e.stopPropagation(); setZoomedAttachment(`data:${att.mimeType};base64,${att.data}`); }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-mirror-text/5 rounded-xl border border-mirror-border text-xs text-mirror-subtext font-mono">
                      <FileText className="w-4 h-4 text-mirror-accent" />
                      {att.mimeType.split('/')[1].toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {message.attachment && !message.attachments && (
            <div className="mb-4">
              {message.attachment.mimeType.startsWith('image/') ? (
                <div className="rounded-xl overflow-hidden shadow-lg border border-mirror-border max-w-[200px]">
                  <img 
                    src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                    alt="Ref" 
                    className="w-full h-auto cursor-zoom-in hover:opacity-80 transition-opacity" 
                    onClick={(e) => { e.stopPropagation(); setZoomedAttachment(`data:${message.attachment!.mimeType};base64,${message.attachment!.data}`); }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-mirror-text/5 rounded-xl border border-mirror-border text-xs text-mirror-subtext font-mono">
                  <FileText className="w-4 h-4 text-mirror-accent" />
                  {message.attachment.mimeType.split('/')[1].toUpperCase()}
                </div>
              )}
            </div>
          )}

          {zoomedAttachment && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-10 cursor-zoom-out" onClick={() => setZoomedAttachment(null)}>
               <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                 <img src={zoomedAttachment} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" alt="Zoomed Attachment" />
                 <X className="absolute -top-12 right-0 md:top-4 md:-right-12 w-8 h-8 text-white/70 hover:text-white cursor-pointer hover:scale-110 transition-transform" onClick={() => setZoomedAttachment(null)} />
               </div>
            </div>
          )}
          
          <div className="prose prose-invert max-w-none">
             <MarkdownRenderer content={displayContent} isError={isError} />
             {!isUser && mainContent.length > 500 && (
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                 className="mt-2 text-xs font-bold text-mirror-accent hover:text-white transition-colors uppercase tracking-wider"
               >
                 {isExpanded ? 'Read Less' : 'Read More'}
               </button>
             )}
          </div>

          {message.sources && message.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-mirror-border">
              {message.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1 glass-gloss rounded-full text-[10px] text-mirror-subtext hover:text-mirror-text border border-mirror-border transition-all">
                  <ExternalLink className="w-3 h-3" /> <span className="truncate max-w-[120px]">{s.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Unified Bottom Action Bar */}
        <div className={`flex items-center gap-1 px-2 transition-all duration-300 ${isUser ? 'justify-end' : 'justify-start'} ${showActions ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 -translate-y-2 h-0 overflow-hidden'}`} onClick={(e) => e.stopPropagation()}>
          {isUser && onStop && (
            <button 
              onClick={onStop} 
              title="Stop Generation"
              className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all hover:scale-110 active:scale-95"
            >
              <div className="w-3.5 h-3.5 bg-current rounded-sm" />
            </button>
          )}

          {onRerun && (
            <button 
              onClick={() => onRerun(message.text, message.attachments || (message.attachment ? [message.attachment] : []))} 
              title={isUser ? "Rerun Prompt" : "Use as Prompt"}
              className="p-2 rounded-xl glass-gloss text-mirror-subtext hover:text-mirror-accent transition-all hover:scale-110 active:scale-95"
            >
              <Repeat className="w-3.5 h-3.5" />
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
              className="p-2 rounded-xl glass-gloss text-mirror-subtext hover:text-mirror-text transition-all hover:scale-110 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {!isUser && onFeedback && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onFeedback(message.id, message.feedback === 'positive' ? undefined : 'positive')} 
                title="Helpful"
                className={`p-2 rounded-xl glass-gloss transition-all hover:scale-110 active:scale-95 ${message.feedback === 'positive' ? 'text-green-400 bg-green-500/10' : 'text-mirror-subtext hover:text-mirror-text'}`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${message.feedback === 'positive' ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={() => onFeedback(message.id, message.feedback === 'negative' ? undefined : 'negative')} 
                title="Not Helpful"
                className={`p-2 rounded-xl glass-gloss transition-all hover:scale-110 active:scale-95 ${message.feedback === 'negative' ? 'text-red-400 bg-red-500/10' : 'text-mirror-subtext hover:text-mirror-text'}`}
              >
                <ThumbsDown className={`w-3.5 h-3.5 ${message.feedback === 'negative' ? 'fill-current' : ''}`} />
              </button>
            </div>
          )}

          {!isUser && onSpeech && (
            <button 
              onClick={handlePlayAudio}
              title={message.generatedAudioUrl ? (isPlaying ? "Pause" : "Play") : "Read Aloud"}
              className={`p-2 rounded-xl glass-gloss transition-all hover:scale-110 active:scale-95 ${message.generatedAudioUrl ? 'text-purple-400 bg-purple-500/10' : 'text-mirror-subtext hover:text-mirror-text'}`}
            >
              {message.generatedAudioUrl ? (
                isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {message.generatedAudioUrl && (
            <audio 
              ref={audioRef}
              src={message.generatedAudioUrl}
              className="hidden"
            />
          )}

          {!isUser && onRegenerate && !message.isStreaming && (
            <button 
              onClick={() => onRegenerate(message.id)} 
              title="Regenerate Response"
              className="p-2 rounded-xl glass-gloss text-mirror-subtext hover:text-mirror-accent transition-all hover:scale-110 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
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
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center shrink-0 mt-2 shadow-lg border border-white/10 overflow-hidden">
          {userAvatar ? (
            <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
      )}
    </div>
  );
};
