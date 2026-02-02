
import React, { useState, useEffect, useRef } from 'react';
import { PostSize, DesignStyle, GeneratedPost, SocialPlatform, LogEntry, FileAttachment } from './types.ts';
import { geminiService } from './services/geminiService.ts';
import { 
  PlusIcon, 
  PhotoIcon, 
  DocumentTextIcon, 
  GlobeAltIcon, 
  ArrowDownTrayIcon, 
  TrashIcon, 
  SparklesIcon, 
  RectangleGroupIcon, 
  ArrowUpTrayIcon, 
  BeakerIcon,
  ShareIcon,
  LinkIcon,
  CheckIcon,
  Squares2X2Icon,
  XMarkIcon,
  PaperClipIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon
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
      addLog("Initializing Creative Engine...");
      const correctedTopic = await geminiService.correctText(topic);
      const correctedInstructions = instructions.trim() ? await geminiService.correctText(instructions) : '';
      setTopic(correctedTopic);
      setInstructions(correctedInstructions);
      updateLastLog('success');

      addLog(`Analyzing context and researching trends...`);
      const researchData = await geminiService.researchTopic(correctedTopic, correctedInstructions, allAttachments);
      const templateSuggestions = await geminiService.suggestTemplates(correctedTopic, selectedStyles);
      updateLastLog('success');

      addLog("Generating high-engagement captions...");
      const { caption, hashtags } = await geminiService.generateCaptions(correctedTopic, researchData.info, correctedInstructions);
      updateLastLog('success');

      addLog(`Rendering ${selectedSize === PostSize.INSTAGRAM ? 'Instagram' : 'A4 Poster'} Visual...`);
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
    } catch (err: any) {
      console.error(err);
      addLog("Pipeline failed: " + (err.message || "Unknown error"), 'error');
      setIsGenerating(false);
      setError("Asset generation failed. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row overflow-hidden h-screen">
      {/* Sidebar */}
      <aside className="w-full md:w-[480px] bg-white border-b md:border-r border-slate-200 p-6 flex flex-col h-full z-20 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">SocialSnap <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">A4 & Insta Ready</span>
          </div>
        </div>

        <div className="space-y-8 overflow-y-auto pr-2 flex-grow scrollbar-hide">
          {/* Top Row: Vision & Knowledge */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <BeakerIcon className="w-3.5 h-3.5" /> Reference Visual
              </label>
              {!referenceImage ? (
                <button onClick={() => refImageInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-indigo-50 hover:border-indigo-300 transition-all p-4 text-center">
                  <PhotoIcon className="w-6 h-6" />
                  <span className="text-[10px] font-bold">Upload Image</span>
                </button>
              ) : (
                <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-md group">
                  <img src={`data:${referenceImage.mimeType};base64,${referenceImage.data}`} className="w-full h-full object-cover" alt="Ref" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button onClick={() => setReferenceImage(null)} className="p-2 bg-white rounded-full text-red-500 shadow-xl hover:scale-110 transition-transform"><TrashIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              )}
              <input type="file" ref={refImageInputRef} className="hidden" accept="image/*" onChange={handleRefImageUpload} />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <DocumentTextIcon className="w-3.5 h-3.5" /> Knowledge Base
              </label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-hide pr-1">
                {contextAttachments.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <PaperClipIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold text-slate-600 truncate">{file.name}</span>
                    </div>
                    <button onClick={() => setContextAttachments(prev => prev.filter(a => a.id !== file.id))} className="text-slate-300 hover:text-red-500 transition-colors"><XMarkIcon className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => contextFilesInputRef.current?.click()} className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-indigo-50 hover:border-indigo-300 transition-all">
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Add Files</span>
                </button>
                <input type="file" ref={contextFilesInputRef} className="hidden" multiple onChange={handleContextUpload} />
              </div>
            </div>
          </div>

          {/* Inputs Section */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Project Goal / Topic</label>
              <input type="text" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-sm" placeholder="e.g. New Summer Collection Launch" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Specific Constraints</label>
              <textarea className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-28 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-all shadow-sm" placeholder="Mention branding, target audience, specific CTA, or preferred color schemes..." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>
          </div>

          {/* Design Controls */}
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Squares2X2Icon className="w-3.5 h-3.5" /> Design Vibe
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.values(DesignStyle).map(style => (
                  <button 
                    key={style} 
                    onClick={() => setSelectedStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style])}
                    className={`px-4 py-2 text-[10px] font-bold rounded-xl border transition-all ${selectedStyles.includes(style) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <RectangleGroupIcon className="w-3.5 h-3.5" /> Output Format (A4 / Social)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setSelectedSize(PostSize.INSTAGRAM)}
                  className={`p-4 rounded-2xl border text-[11px] font-black flex flex-col items-center gap-2 transition-all ${selectedSize === PostSize.INSTAGRAM ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                >
                  <div className="w-8 h-8 border-2 border-current rounded-md" />
                  Instagram (1:1)
                </button>
                <button 
                  onClick={() => setSelectedSize(PostSize.A4_PORTRAIT)}
                  className={`p-4 rounded-2xl border text-[11px] font-black flex flex-col items-center gap-2 transition-all ${selectedSize === PostSize.A4_PORTRAIT ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                >
                  <div className="w-8 h-10 border-2 border-current rounded-sm" />
                  A4 Poster (3:4)
                </button>
                <button 
                  onClick={() => setSelectedSize(PostSize.STORY)}
                  className={`p-4 rounded-2xl border text-[11px] font-black flex flex-col items-center gap-2 transition-all ${selectedSize === PostSize.STORY ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                >
                  <div className="w-6 h-10 border-2 border-current rounded-sm" />
                  Story (9:16)
                </button>
                <button 
                  onClick={() => setSelectedSize(PostSize.A4_LANDSCAPE)}
                  className={`p-4 rounded-2xl border text-[11px] font-black flex flex-col items-center gap-2 transition-all ${selectedSize === PostSize.A4_LANDSCAPE ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                >
                  <div className="w-10 h-8 border-2 border-current rounded-sm" />
                  A4 Landscape (4:3)
                </button>
              </div>
            </div>
          </div>

          {/* Connected Platforms */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <ShareIcon className="w-3.5 h-3.5" /> Publish Connections
            </label>
            <div className="grid grid-cols-2 gap-3">
              {connectedPlatforms.map(platform => (
                <button 
                  key={platform.id} 
                  onClick={() => togglePlatform(platform.id)}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${platform.connected ? `${platform.color} border-transparent text-white shadow-md` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >
                  <span className="text-xl">{platform.icon}</span>
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase leading-none">{platform.name}</p>
                    <p className="text-[8px] font-medium opacity-80 mt-1">{platform.connected ? 'Connected' : 'Disconnected'}</p>
                  </div>
                  {platform.connected && <CheckIcon className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 mt-auto shrink-0">
          <button 
            onClick={handleCreatePost} 
            disabled={isGenerating || !topic.trim()} 
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold rounded-2xl shadow-xl hover:shadow-indigo-200/50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isGenerating ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Rendering Design...</> : <><SparklesIcon className="w-5 h-5" /> Generate Multi-Modal Design</>}
          </button>
          {error && <p className="text-center text-[10px] font-bold text-red-500 mt-3 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto relative bg-slate-50/30">
        {isGenerating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-50/80 backdrop-blur-md">
            <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-10 border-b border-slate-100 bg-indigo-600 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  <SparklesIcon className="w-24 h-24" />
                </div>
                <h3 className="text-3xl font-extrabold tracking-tight">AI Designer At Work</h3>
                <p className="text-indigo-100 mt-2 text-sm font-medium">Fusing research with high-fidelity visuals...</p>
              </div>
              <div className="p-10 overflow-y-auto space-y-6 bg-white">
                {activityLog.map(log => (
                  <div key={log.id} className="flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {log.status === 'pending' ? <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" /> : <CheckCircleIcon className="w-6 h-6 text-emerald-500 shrink-0" />}
                    <div>
                      <p className={`text-base ${log.status === 'success' ? 'text-slate-400' : 'text-slate-900 font-bold'}`}>{log.message}</p>
                      <p className="text-[10px] text-slate-300 font-medium">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto pb-24">
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Studio Feed</h2>
              <p className="text-slate-500 mt-2 font-medium">History of your generated posters and social assets.</p>
            </div>
            <div className="px-6 py-3 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm text-sm font-bold text-slate-700 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              {posts.length} Active Designs
            </div>
          </header>

          <div className="space-y-20">
            {posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                connectedPlatforms={connectedPlatforms}
                onDelete={id => setPosts(prev => prev.filter(x => x.id !== id))} 
              />
            ))}
            {posts.length === 0 && !isGenerating && (
              <div className="py-48 flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-[3.5rem] bg-white/60">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-8">
                  <PhotoIcon className="w-12 h-12 text-slate-300" />
                </div>
                <p className="text-slate-500 font-extrabold text-2xl">Ready for Inspiration</p>
                <p className="text-slate-400 text-sm font-medium mt-2">Enter a topic and format in the sidebar to begin.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const PostCard: React.FC<{ post: GeneratedPost; connectedPlatforms: SocialPlatform[]; onDelete: (id: string) => void }> = ({ post, connectedPlatforms, onDelete }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

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

  const copyToClipboard = () => {
    const text = `${post.caption}\n\n${post.hashtags.join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const downloadAsset = () => {
    const link = document.createElement('a');
    link.href = post.imageUrl;
    link.download = `socialsnap-${post.topic.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.click();
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col lg:flex-row">
      {/* Visual Canvas */}
      <div className="w-full lg:w-[45%] bg-slate-50 p-8 md:p-12 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-slate-100 group">
        <div className="absolute top-8 right-8 flex gap-3 opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity">
          <button onClick={downloadAsset} className="p-4 bg-white rounded-2xl shadow-lg hover:text-indigo-600 hover:scale-105 transition-all" title="Download Image"><ArrowDownTrayIcon className="w-6 h-6" /></button>
          <button onClick={() => onDelete(post.id)} className="p-4 bg-white rounded-2xl shadow-lg hover:text-red-500 hover:scale-105 transition-all" title="Delete Design"><TrashIcon className="w-6 h-6" /></button>
        </div>
        
        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="w-full shadow-2xl rounded-[2.5rem] overflow-hidden border-[12px] border-white bg-white mb-6 transform hover:scale-[1.02] transition-transform duration-500" style={{ aspectRatio: post.size.replace(':', '/') }}>
            <img src={post.imageUrl} className="w-full h-full object-cover" alt="AI Creation" />
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-200/50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <RectangleGroupIcon className="w-3 h-3" />
            {post.size === PostSize.INSTAGRAM ? 'Instagram (1:1)' : post.size === PostSize.A4_PORTRAIT ? 'A4 Poster (3:4)' : post.size === PostSize.A4_LANDSCAPE ? 'A4 Landscape (4:3)' : 'Story (9:16)'}
          </div>
        </div>
      </div>

      {/* Narrative & Tools */}
      <div className="w-full lg:w-[55%] p-10 md:p-16 flex flex-col justify-center bg-white space-y-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{post.topic}</h3>
            <span className="text-[10px] font-medium text-slate-400">{new Date(post.timestamp).toLocaleDateString()}</span>
          </div>
          
          <div className="relative group">
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative pr-14">
              <span className="absolute -top-3 left-6 px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black uppercase text-indigo-500 tracking-widest shadow-sm">AI Generated Copy</span>
              <p className="text-xl text-slate-700 leading-relaxed font-semibold">"{post.caption}"</p>
              <button 
                onClick={copyToClipboard}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-indigo-600"
                title="Copy to clipboard"
              >
                {copyStatus === 'copied' ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {post.hashtags.map(tag => (
            <span key={tag} className="text-[11px] font-bold text-indigo-600 bg-indigo-50/50 px-4 py-2.5 rounded-xl border border-indigo-100/50 hover:bg-indigo-600 hover:text-white transition-colors cursor-default">
              {tag}
            </span>
          ))}
        </div>

        {/* Action Center */}
        <div className="pt-8 border-t border-slate-100 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShareIcon className="w-4 h-4" /> Global Publishing Hub
            </h4>
          </div>
          <div className="flex flex-wrap gap-3">
            {connectedPlatforms.some(p => p.connected) ? (
              connectedPlatforms.filter(p => p.connected).map(platform => (
                <button 
                  key={platform.id} 
                  onClick={() => handleShare(platform.id)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-extrabold text-white shadow-lg ${platform.color} hover:scale-105 transition-all active:scale-95`}
                >
                  <span className="text-lg">{platform.icon}</span>
                  Share to {platform.name}
                </button>
              ))
            ) : (
              <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 w-full group cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <LinkIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-600">No Platforms Connected</p>
                  <p className="text-[9px] text-slate-400 font-medium">Use the sidebar to link your social accounts for instant sharing.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
