
import React, { useState, useEffect, useRef } from 'react';
import { PostSize, DesignStyle, GeneratedPost, AppState, LogEntry, FileAttachment, SocialPlatform } from './types';
import { geminiService } from './services/geminiService';
import { 
  PlusIcon, 
  PhotoIcon, 
  DocumentTextIcon, 
  GlobeAltIcon, 
  ArrowDownTrayIcon, 
  TrashIcon, 
  SparklesIcon, 
  MagnifyingGlassIcon, 
  CameraIcon, 
  ChatBubbleLeftEllipsisIcon, 
  RectangleGroupIcon, 
  ArrowTopRightOnSquareIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  PaperClipIcon, 
  XMarkIcon, 
  DocumentIcon, 
  ArrowUpTrayIcon, 
  BeakerIcon,
  ShareIcon,
  LinkIcon,
  CheckIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [referenceImage, setReferenceImage] = useState<FileAttachment | null>(null);
  const [contextAttachments, setContextAttachments] = useState<FileAttachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [selectedSize, setSelectedSize] = useState<PostSize>(PostSize.INSTAGRAM);
  const [selectedStyles, setSelectedStyles] = useState<DesignStyle[]>([DesignStyle.REALISTIC]);

  // Social Connectivity State
  const [connectedPlatforms, setConnectedPlatforms] = useState<SocialPlatform[]>([
    { id: 'insta', name: 'Instagram', connected: false, color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600', icon: '📸' },
    { id: 'whatsapp', name: 'WhatsApp', connected: false, color: 'bg-emerald-500', icon: '💬' },
    { id: 'linkedin', name: 'LinkedIn', connected: false, color: 'bg-blue-700', icon: '💼' },
    { id: 'facebook', name: 'Facebook', connected: false, color: 'bg-indigo-600', icon: '👥' },
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const contextFilesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [activityLog]);

  useEffect(() => {
    const saved = localStorage.getItem('social_posts');
    if (saved) { try { setPosts(JSON.parse(saved)); } catch (e) {} }
    const savedPlatforms = localStorage.getItem('connected_platforms');
    if (savedPlatforms) { try { setConnectedPlatforms(JSON.parse(savedPlatforms)); } catch (e) {} }
  }, []);

  useEffect(() => {
    localStorage.setItem('social_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('connected_platforms', JSON.stringify(connectedPlatforms));
  }, [connectedPlatforms]);

  const togglePlatform = (id: string) => {
    setConnectedPlatforms(prev => prev.map(p => 
      p.id === id ? { ...p, connected: !p.connected } : p
    ));
  };

  const addLog = (message: string, status: 'pending' | 'success' | 'error' = 'pending') => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setActivityLog(prev => [...prev, newEntry]);
  };

  const updateLastLog = (status: 'success' | 'error') => {
    setActivityLog(prev => {
      const logs = [...prev];
      if (logs.length > 0) logs[logs.length - 1].status = status;
      return logs;
    });
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setReferenceImage({
          id: 'ref-' + Math.random().toString(36).substr(2, 5),
          name: file.name,
          data: base64String,
          mimeType: file.type,
          type: 'image'
        });
      };
      reader.readAsDataURL(file);
    }
    if (refImageInputRef.current) refImageInputRef.current.value = '';
  };

  const handleContextUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        let type: FileAttachment['type'] = 'other';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type === 'application/pdf') type = 'pdf';
        else if (file.name.match(/\.(doc|docx|ppt|pptx|xls|xlsx)$/i)) type = 'document';
        setContextAttachments(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 5),
          name: file.name,
          data: base64String,
          mimeType: file.type,
          type
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (contextFilesInputRef.current) contextFilesInputRef.current.value = '';
  };

  const handleCreatePost = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError(null);
    setActivityLog([]);
    const allAttachments = referenceImage ? [referenceImage, ...contextAttachments] : contextAttachments;

    try {
      addLog("Initializing studio tools...");
      const correctedTopic = await geminiService.correctText(topic);
      const correctedInstructions = instructions.trim() ? await geminiService.correctText(instructions) : '';
      setTopic(correctedTopic);
      setInstructions(correctedInstructions);
      updateLastLog('success');

      addLog(`Researching trends with ${contextAttachments.length} source files...`);
      const researchData = await geminiService.researchTopic(correctedTopic, correctedInstructions, allAttachments);
      const templateSuggestions = await geminiService.suggestTemplates(correctedTopic, selectedStyles);
      updateLastLog('success');

      addLog("Crafting high-engagement copy...");
      const { caption, hashtags } = await geminiService.generateCaptions(correctedTopic, researchData.info, correctedInstructions);
      updateLastLog('success');

      addLog(referenceImage ? "Rendering with vision guide..." : "Rendering AI visual...");
      const imageUrl = await geminiService.generateImage(correctedTopic, selectedStyles, selectedSize, correctedInstructions, allAttachments);
      updateLastLog('success');

      const newPost: GeneratedPost = {
        id: Math.random().toString(36).substr(2, 9),
        topic: correctedTopic,
        instructions: correctedInstructions || undefined,
        caption,
        hashtags,
        imageUrl,
        size: selectedSize,
        styles: [...selectedStyles],
        sources: researchData.sources,
        templateSuggestions,
        timestamp: Date.now(),
      };

      setPosts(prev => [newPost, ...prev]);
      setIsGenerating(false);
      setActivityLog([]);
      setTopic(''); setInstructions(''); 
      setReferenceImage(null); setContextAttachments([]);
    } catch (err) {
      addLog("Pipeline failed.", 'error');
      setIsGenerating(false);
      setError("Asset generation failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row overflow-hidden h-screen">
      {/* Sidebar */}
      <aside className="w-full md:w-[480px] bg-white border-b md:border-r border-slate-200 p-6 flex flex-col h-full z-20 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 mb-8 shrink-0">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SocialSnap Studio</h1>
        </div>

        <div className="space-y-8 overflow-y-auto pr-2 flex-grow scrollbar-hide">
          {/* Top Row: Vision & Knowledge */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <BeakerIcon className="w-3.5 h-3.5" /> Vision Guide
              </label>
              {!referenceImage ? (
                <button onClick={() => refImageInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:border-indigo-300 transition-all p-4 text-center">
                  <ArrowUpTrayIcon className="w-6 h-6" />
                  <span className="text-[9px] font-bold">Base Image</span>
                </button>
              ) : (
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-emerald-100 shadow-lg group">
                  <img src={`data:${referenceImage.mimeType};base64,${referenceImage.data}`} className="w-full h-full object-cover" alt="Ref" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button onClick={() => setReferenceImage(null)} className="p-2 bg-white rounded-full text-red-500 shadow-xl"><TrashIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              )}
              <input type="file" ref={refImageInputRef} className="hidden" accept="image/*" onChange={handleRefImageUpload} />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <DocumentTextIcon className="w-3.5 h-3.5" /> Context Files
              </label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-hide pr-1">
                {contextAttachments.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <PaperClipIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-600 truncate">{file.name}</span>
                    </div>
                    <button onClick={() => setContextAttachments(prev => prev.filter(a => a.id !== file.id))} className="text-slate-300 hover:text-red-500"><XMarkIcon className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => contextFilesInputRef.current?.click()} className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-indigo-50 transition-all">
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Add context</span>
                </button>
                <input type="file" ref={contextFilesInputRef} className="hidden" multiple onChange={handleContextUpload} />
              </div>
            </div>
          </div>

          {/* Inputs Section */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Post Topic</label>
              <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Luxury watch showcase" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Instructions</label>
              <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Branding, tone, target audience..." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>
          </div>

          {/* Design Controls - Restored */}
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Squares2X2Icon className="w-3.5 h-3.5" /> Design Vibe
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(DesignStyle).map(style => (
                  <button 
                    key={style} 
                    onClick={() => setSelectedStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style])}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all ${selectedStyles.includes(style) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <RectangleGroupIcon className="w-3.5 h-3.5" /> Poster Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PostSize).map(([key, val]) => (
                  <button 
                    key={key} 
                    onClick={() => setSelectedSize(val as PostSize)}
                    className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedSize === val ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    {key.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Social Platform Connectivity */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <ShareIcon className="w-3.5 h-3.5" /> Brand Connectivity
            </label>
            <div className="grid grid-cols-2 gap-3">
              {connectedPlatforms.map(platform => (
                <button 
                  key={platform.id} 
                  onClick={() => togglePlatform(platform.id)}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${platform.connected ? `${platform.color} border-transparent text-white shadow-lg` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >
                  <span className="text-lg">{platform.icon}</span>
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase tracking-tighter leading-none">{platform.name}</p>
                    <p className="text-[8px] font-medium opacity-80">{platform.connected ? 'Active' : 'Offline'}</p>
                  </div>
                  {platform.connected && <CheckIcon className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-6 mt-auto shrink-0">
          <button 
            onClick={handleCreatePost} 
            disabled={isGenerating || !topic.trim()} 
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isGenerating ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Studio Rendering...</> : <><SparklesIcon className="w-5 h-5" /> Generate Multi-Modal Post</>}
          </button>
          {error && <p className="text-center text-[10px] font-bold text-red-500 mt-3">{error}</p>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto relative bg-slate-50/50">
        {isGenerating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-50/90 backdrop-blur-lg">
            <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-slate-100 bg-indigo-600 text-white">
                <h3 className="text-2xl font-black">AI Creative Engine</h3>
                <p className="text-indigo-100 text-sm">Synthesizing attachments and rendering visuals...</p>
              </div>
              <div className="p-8 overflow-y-auto space-y-4 bg-slate-50">
                {activityLog.map(log => (
                  <div key={log.id} className="flex gap-4 items-start">
                    {log.status === 'pending' ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" /> : <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />}
                    <p className={`text-sm ${log.status === 'success' ? 'text-slate-400 font-medium' : 'text-slate-800 font-black'}`}>{log.message}</p>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto pb-24">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Creation Feed</h2>
              <p className="text-slate-500 mt-1 font-medium">Your studio's generated assets and marketing copy.</p>
            </div>
            <div className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold text-slate-600 flex items-center gap-2">
              <RectangleGroupIcon className="w-4 h-4 text-indigo-500" />
              {posts.length} Designs
            </div>
          </header>

          <div className="space-y-16">
            {posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                connectedPlatforms={connectedPlatforms}
                onDelete={id => setPosts(prev => prev.filter(x => x.id !== id))} 
              />
            ))}
            {posts.length === 0 && !isGenerating && (
              <div className="py-48 flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-[4rem] bg-white/50">
                <PhotoIcon className="w-16 h-16 text-slate-200 mb-6" />
                <p className="text-slate-400 font-black text-xl">Empty Gallery</p>
                <p className="text-slate-300 text-sm font-bold">Use the studio sidebar to create your first design.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const PostCard: React.FC<{ post: GeneratedPost; connectedPlatforms: SocialPlatform[]; onDelete: (id: string) => void }> = ({ post, connectedPlatforms, onDelete }) => {
  const handleShare = (platform: string) => {
    const text = `${post.caption}\n\n${post.hashtags.join(' ')}`;
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'linkedin' || platform === 'facebook') {
      navigator.clipboard.writeText(text);
      alert(`Caption & hashtags copied! Proceed to ${platform} feed.`);
      window.open(platform === 'linkedin' ? 'https://www.linkedin.com/feed/' : 'https://www.facebook.com/', '_blank');
    } else if (platform === 'insta') {
      navigator.clipboard.writeText(text);
      alert("Caption copied! Download the asset to upload manually on Instagram.");
    }
  };

  return (
    <div className="bg-white rounded-[4rem] border border-slate-200 overflow-hidden shadow-sm group hover:-translate-y-1 transition-all duration-500 flex flex-col lg:flex-row">
      {/* Visual Part */}
      <div className="w-full lg:w-[45%] bg-slate-50 p-10 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-slate-200">
        <div className="absolute top-8 right-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => window.open(post.imageUrl, '_blank')} className="p-4 bg-white rounded-2xl shadow-xl hover:text-indigo-600"><ArrowDownTrayIcon className="w-6 h-6" /></button>
          <button onClick={() => onDelete(post.id)} className="p-4 bg-white rounded-2xl shadow-xl hover:text-red-500"><TrashIcon className="w-6 h-6" /></button>
        </div>
        <div className="max-w-md w-full shadow-3xl rounded-[3rem] overflow-hidden border-[16px] border-white bg-white" style={{ aspectRatio: post.size.replace(':', '/') }}>
          <img src={post.imageUrl} className="w-full h-full object-cover" alt="AI Creation" />
        </div>
      </div>

      {/* Copy & Actions Part */}
      <div className="w-full lg:w-[55%] p-12 space-y-8 flex flex-col justify-center bg-white">
        <div className="space-y-4">
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{post.topic}</h3>
          <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 relative">
            <span className="absolute -top-3 left-6 px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black uppercase text-slate-400">Marketing Copy</span>
            <p className="text-xl text-slate-700 leading-relaxed font-semibold italic">"{post.caption}"</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {post.hashtags.map(tag => <span key={tag} className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">{tag}</span>)}
        </div>

        {/* Action Hub */}
        <div className="pt-8 border-t border-slate-100 space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShareIcon className="w-4 h-4" /> Instant Brand Publishing
          </h4>
          <div className="flex flex-wrap gap-3">
            {connectedPlatforms.some(p => p.connected) ? (
              connectedPlatforms.filter(p => p.connected).map(platform => (
                <button 
                  key={platform.id} 
                  onClick={() => handleShare(platform.id)}
                  className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[11px] font-black text-white shadow-xl ${platform.color} hover:scale-105 transition-all`}
                >
                  <span className="text-base">{platform.icon}</span>
                  Share to {platform.name}
                </button>
              ))
            ) : (
              <div className="flex items-center gap-3 p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 w-full">
                <LinkIcon className="w-5 h-5 text-slate-300" />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Go to Sidebar to Connect Platforms</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
