
import React, { useState, useEffect, useRef } from 'react';
import { PostSize, DesignStyle, GeneratedPost, SocialPlatform, LogEntry, FileAttachment } from './types.ts';
import { geminiService } from './services/geminiService.ts';
import { 
  PlusIcon, PhotoIcon, DocumentTextIcon, ArrowDownTrayIcon, 
  TrashIcon, SparklesIcon, RectangleGroupIcon, BeakerIcon, 
  ShareIcon, LinkIcon, CheckIcon, Squares2X2Icon, XMarkIcon, 
  PaperClipIcon, CheckCircleIcon, ClipboardDocumentIcon 
} from '@heroicons/react/24/outline';

/**
 * PostCard Component - Hoisted above App to ensure it's defined before render
 */
const PostCard: React.FC<{ post: GeneratedPost; connectedPlatforms: SocialPlatform[]; onDelete: (id: string) => void }> = ({ post, connectedPlatforms, onDelete }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleShare = (platform: string) => {
    const text = `${post.caption}\n\n${post.hashtags.join(' ')}`;
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    } else if (['linkedin', 'facebook', 'insta'].includes(platform)) {
      navigator.clipboard.writeText(text);
      alert(`Content copied! Share it on your ${platform} feed.`);
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
    link.download = `design-${post.id}.png`;
    link.click();
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col lg:flex-row mb-12">
      <div className="w-full lg:w-[45%] bg-slate-50 p-6 flex flex-col items-center justify-center relative border-r border-slate-100 group">
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={downloadAsset} className="p-2 bg-white rounded-lg shadow-sm hover:text-indigo-600"><ArrowDownTrayIcon className="w-5 h-5" /></button>
          <button onClick={() => onDelete(post.id)} className="p-2 bg-white rounded-lg shadow-sm hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
        </div>
        <div className="w-full max-w-sm aspect-square bg-white shadow-xl rounded-2xl overflow-hidden border-8 border-white" style={{ aspectRatio: post.size.replace(':', '/') }}>
          <img src={post.imageUrl} className="w-full h-full object-cover" alt="AI Creation" />
        </div>
        <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.size} Format</div>
      </div>
      <div className="w-full lg:w-[55%] p-8 space-y-6">
        <div className="flex justify-between items-start">
          <h3 className="text-2xl font-bold text-slate-900">{post.topic}</h3>
          <span className="text-[10px] font-medium text-slate-400">{new Date(post.timestamp).toLocaleDateString()}</span>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative group">
          <p className="text-slate-700 leading-relaxed italic">"{post.caption}"</p>
          <button onClick={copyToClipboard} className="absolute top-4 right-4 text-slate-300 hover:text-indigo-500 transition-colors">
            {copyStatus === 'copied' ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {post.hashtags.map(tag => <span key={tag} className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg">#{tag.replace('#', '')}</span>)}
        </div>
        <div className="pt-6 border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Publish Now</p>
          <div className="flex flex-wrap gap-2">
            {connectedPlatforms.filter(p => p.connected).map(p => (
              <button key={p.id} onClick={() => handleShare(p.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold text-white ${p.color}`}>
                <span>{p.icon}</span> {p.name}
              </button>
            ))}
            {!connectedPlatforms.some(p => p.connected) && <p className="text-[10px] text-slate-400 font-medium">No accounts linked in sidebar</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main App Component
 */
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
    { id: 'insta', name: 'Instagram', connected: false, color: 'bg-gradient-to-tr from-orange-400 via-red-500 to-purple-600', icon: '📸' },
    { id: 'whatsapp', name: 'WhatsApp', connected: false, color: 'bg-emerald-500', icon: '💬' },
    { id: 'linkedin', name: 'LinkedIn', connected: false, color: 'bg-blue-700', icon: '💼' },
    { id: 'facebook', name: 'Facebook', connected: false, color: 'bg-indigo-600', icon: '👥' },
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const contextFilesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('social_posts');
      if (saved) setPosts(JSON.parse(saved));
    } catch (e) { console.error("Storage load failed"); }
  }, []);

  useEffect(() => {
    localStorage.setItem('social_posts', JSON.stringify(posts));
  }, [posts]);

  const addLog = (message: string, status: 'pending' | 'success' | 'error' = 'pending') => {
    setActivityLog(prev => [...prev, {
      id: Math.random().toString(36),
      message,
      status,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const handleCreatePost = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError(null);
    setActivityLog([]);
    const allAttachments = referenceImage ? [referenceImage, ...contextAttachments] : contextAttachments;

    try {
      addLog("Initializing Creative Engine...");
      const resData = await geminiService.researchTopic(topic, instructions, allAttachments);
      addLog("Analyzing design trends...", 'success');
      
      addLog("Crafting high-engagement copy...");
      const { caption, hashtags } = await geminiService.generateCaptions(topic, resData.info, instructions);
      addLog("Copy finalized.", 'success');

      addLog(`Generating ${selectedSize} visual...`);
      const imageUrl = await geminiService.generateImage(topic, selectedStyles, selectedSize, instructions, allAttachments);
      addLog("Visual render complete.", 'success');

      const newPost: GeneratedPost = {
        id: Math.random().toString(36).substr(2, 9),
        topic,
        caption,
        hashtags,
        imageUrl,
        size: selectedSize,
        styles: [...selectedStyles],
        sources: resData.sources,
        templateSuggestions: [],
        timestamp: Date.now(),
      };

      setPosts(prev => [newPost, ...prev]);
      setIsGenerating(false);
      setTopic(''); setInstructions(''); setReferenceImage(null); setContextAttachments([]);
    } catch (err: any) {
      setError("Failed to generate asset. Please try again.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50">
      <aside className="w-full md:w-[420px] bg-white border-r border-slate-200 p-8 flex flex-col overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-600 p-2 rounded-xl"><SparklesIcon className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-extrabold text-slate-900">SocialSnap <span className="text-indigo-600">AI</span></h1>
        </div>

        <div className="space-y-8 flex-grow">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reference</label>
              <div onClick={() => refImageInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center cursor-pointer hover:border-indigo-200 transition-all overflow-hidden bg-slate-50">
                {referenceImage ? <img src={`data:${referenceImage.mimeType};base64,${referenceImage.data}`} className="w-full h-full object-cover" /> : <PhotoIcon className="w-6 h-6 text-slate-300" />}
              </div>
              <input type="file" ref={refImageInputRef} hidden onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const r = new FileReader();
                  r.onload = () => {
                    const result = r.result as string;
                    setReferenceImage({ 
                      id: 'ref', 
                      name: file.name, 
                      data: result.split(',')[1], 
                      mimeType: file.type, 
                      type: 'image' 
                    });
                  };
                  r.readAsDataURL(file);
                }
              }} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Context</label>
              <div onClick={() => contextFilesInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-200 bg-slate-50">
                <DocumentTextIcon className="w-6 h-6 text-slate-300" />
                <span className="text-[8px] font-bold text-slate-400 mt-1">{contextAttachments.length} Files</span>
              </div>
              <input type="file" ref={contextFilesInputRef} hidden multiple onChange={(e) => {
                 const files = e.target.files;
                 if (files) {
                   // Correctly handle multiple file uploads and fix type errors by explicit typing
                   Array.from(files).forEach((f: File) => {
                     const r = new FileReader();
                     r.onload = () => {
                       const result = r.result as string;
                       setContextAttachments(prev => [...prev, { 
                         id: Math.random().toString(), 
                         name: f.name, 
                         data: result.split(',')[1], 
                         mimeType: f.type, 
                         type: 'document' 
                       }]);
                     };
                     r.readAsDataURL(f);
                   });
                 }
              }} />
            </div>
          </div>

          <div className="space-y-4">
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic: e.g. Black Friday Sale" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm" />
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Extra Instructions..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 text-sm resize-none" />
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dimensions</p>
            <div className="grid grid-cols-2 gap-2">
              {[PostSize.INSTAGRAM, PostSize.A4_PORTRAIT, PostSize.STORY, PostSize.A4_LANDSCAPE].map(s => (
                <button key={s} onClick={() => setSelectedSize(s)} className={`px-4 py-3 rounded-xl border text-[10px] font-bold transition-all ${selectedSize === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-100'}`}>
                  {s === PostSize.INSTAGRAM ? 'Instagram (1:1)' : s === PostSize.A4_PORTRAIT ? 'A4 Poster (3:4)' : s === PostSize.STORY ? 'Story (9:16)' : 'A4 Land (4:3)'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Publish To</p>
            <div className="grid grid-cols-2 gap-2">
              {connectedPlatforms.map(p => (
                <button key={p.id} onClick={() => setConnectedPlatforms(prev => prev.map(x => x.id === p.id ? {...x, connected: !x.connected} : x))} className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-[10px] font-bold transition-all ${p.connected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}>
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button disabled={isGenerating || !topic} onClick={handleCreatePost} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all mt-8 disabled:opacity-50">
          {isGenerating ? "Processing..." : "Generate Creative"}
        </button>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <header className="mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900">Project Studio</h2>
          <p className="text-slate-400 mt-2">Design, optimize, and share your social assets.</p>
        </header>

        <div className="max-w-4xl">
          {isGenerating && (
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl mb-12 border border-indigo-50 animate-pulse">
              <h3 className="text-xl font-bold mb-6 text-indigo-600">AI Engine Running...</h3>
              <div className="space-y-4">
                {activityLog.map(log => (
                  <div key={log.id} className="flex gap-4 items-center">
                    <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-indigo-500 animate-ping'}`} />
                    <span className="text-sm font-medium text-slate-600">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {posts.map(post => <PostCard key={post.id} post={post} connectedPlatforms={connectedPlatforms} onDelete={id => setPosts(prev => prev.filter(x => x.id !== id))} />)}
          
          {!isGenerating && posts.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[3rem]">
              <SparklesIcon className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">Start your creative journey in the sidebar</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
