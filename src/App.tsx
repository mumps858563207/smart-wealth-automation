import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  FileText, 
  Share2, 
  BarChart3, 
  Settings, 
  Plus, 
  Search,
  Zap,
  ExternalLink,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  Menu,
  X,
  Image as ImageIcon,
  Copy,
  Download,
  Link2,
  Image as ImageIcon2,
  Trash2,
  Check,
  Globe,
  Lock,
  User,
  Database
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { geminiService } from './services/geminiService';
import { wordpressService, WordPressConfig } from './services/wordpressService';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

type View = 'dashboard' | 'niche' | 'content' | 'promotion' | 'analytics' | 'affiliate' | 'media' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [wpConfig, setWpConfig] = useState<WordPressConfig | null>(wordpressService.getConfig());
  const [affiliateId, setAffiliateId] = useState<string>(localStorage.getItem('affiliateId') || 'mumps-20');
  const [isAutoPilotActive, setIsAutoPilotActive] = useState(false);
  const [autoPilotLog, setAutoPilotLog] = useState<string[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>(JSON.parse(localStorage.getItem('recent_posts') || '[]'));
  const [contentQueue, setContentQueue] = useState<any[]>(JSON.parse(localStorage.getItem('content_queue') || '[]'));
  const [isAutoPilotRunning, setIsAutoPilotRunning] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [nextCheckTime, setNextCheckTime] = useState<Date | null>(null);
  const [isPublishDirectly, setIsPublishDirectly] = useState(localStorage.getItem('publish_directly') === 'true');
  const [checkInterval, setCheckInterval] = useState<number>(Number(localStorage.getItem('check_interval')) || 1);

  const runAutoPilot = React.useCallback(async (isManual = false) => {
    // Use a functional update or ref check to avoid stale closures without triggering re-renders in dependencies
    // But since we want to access the latest contentQueue, we keep it in dependencies for now
    // and fix the useEffect to not loop.
    
    setIsAutoPilotRunning(true);
    setLastChecked(new Date());
    setNextCheckTime(new Date(Date.now() + checkInterval * 60 * 1000));
    
    try {
      const log = (msg: string) => setAutoPilotLog(prev => [`[${new Date().toLocaleTimeString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' })}] ${msg}`, ...prev].slice(0, 15));
      
      // 0. 檢查 WordPress 設定
      const config = wordpressService.getConfig();
      if (!config || !config.url) {
        if (isManual) {
          log("⚠️ 警告: WordPress 尚未設定，自動化發佈將跳過。");
          log("💡 請前往「系統設定」完成 WordPress 配置。");
        }
        setIsAutoPilotActive(false);
        setIsAutoPilotRunning(false);
        return;
      }

      // 1. 發現熱門主題
      let selectedTopic = "";
      if (contentQueue.length > 0) {
        const queueItem = contentQueue[0];
        const scheduledTime = typeof queueItem === 'string' ? null : new Date(queueItem.scheduledTime);
        
        // If it's a scheduled item and the time hasn't come yet, skip unless manually triggered
        if (scheduledTime && scheduledTime > new Date() && !isManual) {
          setIsAutoPilotRunning(false);
          return;
        }

        selectedTopic = typeof queueItem === 'string' ? queueItem : queueItem.topic;
        log(`📋 從「發佈排程」中提取主題: ${selectedTopic}`);
        setContentQueue(prev => {
          const updated = prev.slice(1);
          localStorage.setItem('content_queue', JSON.stringify(updated));
          return updated;
        });
      } else {
        if (!isManual) {
          setIsAutoPilotRunning(false);
          return; 
        }
        
        log("🔍 正在分析市場趨勢並尋找熱門主題...");
        const topics = await geminiService.discoverTrendingTopics("AI 與數位自動化營利");
        selectedTopic = topics[Math.floor(Math.random() * topics.length)];
        log(`🎯 鎖定高價值主題: ${selectedTopic}`);
      }

      // 2. 生成內容 (Monetized)
      log(`✍️ 正在為 ${selectedTopic} 生成 SEO 優化且含聯盟連結的內容...`);
      const content = await geminiService.generateMonetizedContent(selectedTopic, "部落格文章", affiliateId);
      
      // 3. 發佈到 WordPress
      log("📤 正在同步發佈至 WordPress 並嵌入營利連結...");
      const title = content.split('\n')[0].replace(/^#\s*/, '').trim() || selectedTopic;
      const postResult = await wordpressService.postToWordPress(title, content, isPublishDirectly ? 'publish' : 'draft');
      log(`✅ 成功發佈營利${isPublishDirectly ? '文章' : '草稿'}: ${title}`);

      // Save to recent activity
      const newPost = {
        id: postResult.id,
        title,
        link: postResult.link,
        date: new Date().toISOString(),
        type: 'auto'
      };
      setRecentPosts(prev => {
        const updated = [newPost, ...prev].slice(0, 10);
        localStorage.setItem('recent_posts', JSON.stringify(updated));
        return updated;
      });

      // 4. 生成並上傳精選圖片 (Optimization)
      try {
        log("🎨 正在生成文章精選圖片...");
        let base64Image = "";
        try {
          const imagePrompt = await geminiService.getFeaturedImagePrompt(title, content);
          base64Image = await geminiService.generateImage(imagePrompt);
        } catch (promptErr) {
          log("⚠️ 複雜提示詞生成失敗，嘗試使用標題直接生成...");
          base64Image = await geminiService.generateImage(title);
        }
        
        log("🖼️ 正在上傳圖片至 WordPress 媒體庫...");
        const mediaResult = await wordpressService.uploadMedia(base64Image, `featured-${postResult.id}.png`);
        
        log("🔗 正在將圖片設為文章精選圖片...");
        await wordpressService.updatePost(postResult.id, { featured_media: mediaResult.id });
        log("✨ 精選圖片設置完成！");
      } catch (imgErr: any) {
        log(`⚠️ 圖片生成或上傳失敗: ${imgErr.message}`);
      }

      log(`🔗 預覽連結: ${postResult.link}`);
    } catch (error: any) {
      console.error("AutoPilot Error:", error);
      setAutoPilotLog(prev => [`[錯誤] ${error.message}`, ...prev]);
    } finally {
      setIsAutoPilotRunning(false);
    }
  }, [isAutoPilotRunning, contentQueue, affiliateId, isPublishDirectly]);

  // Auto-Pilot Logic
  const autoPilotRef = React.useRef(runAutoPilot);
  const isRunningRef = React.useRef(isAutoPilotRunning);
  
  useEffect(() => {
    autoPilotRef.current = runAutoPilot;
  }, [runAutoPilot]);

  useEffect(() => {
    isRunningRef.current = isAutoPilotRunning;
  }, [isAutoPilotRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPilotActive) {
      const tick = () => {
        if (!isRunningRef.current) {
          autoPilotRef.current(false);
        }
      };
      
      tick();
      interval = setInterval(tick, checkInterval * 60 * 1000); 
    } else {
      setNextCheckTime(null);
    }
    return () => clearInterval(interval);
  }, [isAutoPilotActive, checkInterval]);

  // Auto-fill with user provided data if empty (for demo/convenience)
  useEffect(() => {
    if (!wpConfig) {
      const initialConfig = {
        url: 'https://mumpsaiweb.zeabur.app',
        username: 'mumps',
        applicationPassword: 'VDDJ AuFe j85V rAXk lELc ojvo'
      };
      wordpressService.saveConfig(initialConfig);
      setWpConfig(initialConfig);
    }
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-[#F5F5F4] text-[#1A1A1A] font-sans selection:bg-emerald-100 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-black/5 transition-all duration-300 flex flex-col lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="text-white w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-lg">智慧財富</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-zinc-400 hover:text-black">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="總覽" 
            active={activeView === 'dashboard'} 
            onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<TrendingUp size={20} />} 
            label="利基分析" 
            active={activeView === 'niche'} 
            onClick={() => { setActiveView('niche'); setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<FileText size={20} />} 
            label="內容創作" 
            active={activeView === 'content'} 
            onClick={() => { setActiveView('content'); setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Share2 size={20} />} 
            label="自動推廣" 
            active={activeView === 'promotion'} 
            onClick={() => { setActiveView('promotion'); setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<BarChart3 size={20} />} 
            label="成效追蹤" 
            active={activeView === 'analytics'} 
            onClick={() => { setActiveView('analytics'); setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Link2 size={20} />} 
            label="聯盟管理" 
            active={activeView === 'affiliate'} 
            onClick={() => { setActiveView('affiliate'); setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<ImageIcon2 size={20} />} 
            label="媒體庫" 
            active={activeView === 'media'} 
            onClick={() => { setActiveView('media'); setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="系統設定" 
            active={activeView === 'settings'} 
            onClick={() => { setActiveView('settings'); setIsSidebarOpen(false); }}
          />
        </nav>
      </aside>

      {/* WordPress Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">WordPress 設定</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">網站 URL</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                    placeholder="https://your-site.com"
                    value={wpConfig?.url || ''}
                    onChange={(e) => setWpConfig(prev => ({ ...prev!, url: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">使用者名稱</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                    placeholder="admin"
                    value={wpConfig?.username || ''}
                    onChange={(e) => setWpConfig(prev => ({ ...prev!, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">應用程式密碼</label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={wpConfig?.applicationPassword || ''}
                    onChange={(e) => setWpConfig(prev => ({ ...prev!, applicationPassword: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">聯盟行銷 ID (Amazon/Affiliate)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                    placeholder="your-id-20"
                    value={affiliateId}
                    onChange={(e) => {
                      setAffiliateId(e.target.value);
                      localStorage.setItem('affiliateId', e.target.value);
                    }}
                  />
                </div>
                <button 
                  onClick={() => {
                    if (wpConfig) {
                      wordpressService.saveConfig(wpConfig);
                      setIsSettingsOpen(false);
                    }
                  }}
                  className="w-full bg-black text-white py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all mt-4"
                >
                  儲存設定
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2 text-zinc-500 hover:bg-black/5 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-[10px] lg:text-sm font-medium uppercase tracking-widest opacity-50 truncate max-w-[120px] lg:max-w-none">
              {activeView === 'dashboard' && 'Dashboard Overview'}
              {activeView === 'niche' && 'Niche Market Analysis'}
              {activeView === 'content' && 'Content Generation Hub'}
              {activeView === 'promotion' && 'Automated Promotion'}
              {activeView === 'analytics' && 'Performance Analytics'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200 overflow-hidden">
                  <img src={`https://picsum.photos/seed/user${i}/32/32`} alt="user" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
            <button className="bg-black text-white px-3 lg:px-4 py-2 rounded-full text-xs lg:text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2">
              <Plus size={14} />
              <span className="hidden sm:inline">新建方案</span>
              <span className="sm:hidden">新建</span>
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && <DashboardView key="dashboard" recentPosts={recentPosts} onClearRecent={() => { localStorage.removeItem('recent_posts'); setRecentPosts([]); }} queueCount={contentQueue.length} />}
            {activeView === 'niche' && <NicheView key="niche" onAddToQueue={(topic) => setContentQueue(prev => {
              const newItem = {
                id: Math.random().toString(36).substr(2, 9),
                topic,
                scheduledTime: new Date(Date.now() + (prev.length + 1) * 2 * 60 * 60 * 1000).toISOString(),
                platforms: ['WordPress', 'Facebook', 'X']
              };
              const updated = [...prev, newItem];
              localStorage.setItem('content_queue', JSON.stringify(updated));
              return updated;
            })} />}
            {activeView === 'content' && (
              <ContentView 
                key="content" 
                onPostSuccess={(post) => setRecentPosts(prev => [post, ...prev].slice(0, 10))} 
                defaultPublishDirectly={isPublishDirectly}
              />
            )}
            {activeView === 'promotion' && (
              <PromotionView 
                key="promotion" 
                isActive={isAutoPilotActive} 
                onToggle={setIsAutoPilotActive} 
                logs={autoPilotLog} 
                onClearLogs={() => setAutoPilotLog([])} 
                affiliateId={affiliateId} 
                queueCount={contentQueue.length} 
                contentQueue={contentQueue}
                onClearQueue={() => { setContentQueue([]); localStorage.removeItem('content_queue'); }} 
                onRunNow={() => runAutoPilot(true)} 
                isRunning={isAutoPilotRunning} 
                lastChecked={lastChecked}
                nextCheckTime={nextCheckTime}
                checkInterval={checkInterval}
                onUpdateCheckInterval={(val) => {
                  setCheckInterval(val);
                  localStorage.setItem('check_interval', val.toString());
                }}
                onUpdateQueue={(newQueue) => {
                  setContentQueue(newQueue);
                  localStorage.setItem('content_queue', JSON.stringify(newQueue));
                }}
              />
            )}
            {activeView === 'analytics' && <AnalyticsView key="analytics" />}
            {activeView === 'affiliate' && <AffiliateView key="affiliate" affiliateId={affiliateId} setAffiliateId={setAffiliateId} />}
            {activeView === 'media' && <MediaView key="media" />}
            {activeView === 'settings' && (
              <SettingsView 
                key="settings" 
                wpConfig={wpConfig} 
                setWpConfig={setWpConfig} 
                isPublishDirectly={isPublishDirectly}
                setIsPublishDirectly={(val) => { setIsPublishDirectly(val); localStorage.setItem('publish_directly', val.toString()); }}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
        active ? "bg-black text-white shadow-lg shadow-black/10" : "text-zinc-500 hover:bg-black/5 hover:text-black"
      )}
    >
      <span className={cn("transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")}>
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function DashboardView({ recentPosts, onClearRecent, queueCount }: { recentPosts: any[], onClearRecent: () => void, queueCount: number }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: '本月預估收益', value: '$12,450', change: '+12.5%', icon: <TrendingUp className="text-emerald-500" /> },
    { label: '活躍內容數', value: '142', change: '+8', icon: <FileText className="text-blue-500" /> },
    { label: '總曝光量', value: '892.4K', change: '+24%', icon: <Share2 className="text-purple-500" /> },
    { label: '平均轉換率', value: '3.2%', change: '+0.4%', icon: <CheckCircle2 className="text-orange-500" /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 lg:space-y-8"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 lg:p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-zinc-50 rounded-lg">{stat.icon}</div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{stat.change}</span>
            </div>
            <p className="text-zinc-500 text-xs lg:text-sm font-medium">{stat.label}</p>
            <h3 className="text-xl lg:text-2xl font-bold mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h3 className="text-lg font-bold">收益趨勢</h3>
              <p className="text-sm text-zinc-500">過去 30 天的自動化收益表現</p>
            </div>
            <select className="bg-zinc-50 border-none text-xs font-medium rounded-lg px-3 py-2 outline-none w-full sm:w-auto">
              <option>最近 30 天</option>
              <option>最近 90 天</option>
            </select>
          </div>
          <div className="h-[250px] lg:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-black text-white p-6 lg:p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg lg:text-xl font-bold mb-2">系統狀態</h3>
            <p className="text-zinc-400 text-xs lg:text-sm mb-6">所有自動化流程運行正常</p>
            
            <div className="space-y-4">
              <StatusItem label="內容採集器" status="online" />
              <StatusItem label="AI 生成引擎" status="online" />
              <StatusItem label="社群發佈器" status="online" />
              <StatusItem label="SEO 優化器" status="online" />
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs">排程隊列</span>
                <span className="text-emerald-400 font-bold text-sm">{queueCount} 個主題</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 relative z-10">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">目前系統時間 (台北)</p>
              <p className="text-base lg:text-lg font-mono">
                {currentTime.toLocaleTimeString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' })}
              </p>
            </div>
          </div>

          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        {recentPosts.length > 0 && (
          <div className="lg:col-span-3 bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">最近發佈活動</h3>
              <button 
                onClick={onClearRecent}
                className="text-[10px] font-bold text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                清除紀錄
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPosts.map((post, i) => (
                <div key={i} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                        post.type === 'auto' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {post.type === 'auto' ? '自動駕駛' : '手動發佈'}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-medium">
                        {new Date(post.date).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm line-clamp-2 mb-4">{post.title}</h4>
                  </div>
                  <a 
                    href={post.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-zinc-900 hover:underline flex items-center gap-1 mt-auto"
                  >
                    查看文章 <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatusItem({ label, status }: { label: string, status: 'online' | 'offline' }) {
  return (
    <div className="flex items-center justify-between text-xs lg:text-sm">
      <span className="text-zinc-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full animate-pulse", status === 'online' ? "bg-emerald-400" : "bg-red-400")} />
        <span className="font-medium uppercase text-[9px] lg:text-[10px] tracking-wider">{status}</span>
      </div>
    </div>
  );
}

function NicheView({ onAddToQueue }: { onAddToQueue: (topic: string) => void }) {
  const [topic, setTopic] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [addedIdeas, setAddedIdeas] = useState<Set<number>>(new Set());

  const handleAnalyze = async () => {
    if (!topic) return;
    setLoading(true);
    setAddedIdeas(new Set());
    try {
      const result = await geminiService.analyzeNiche(topic);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIdea = (idea: string, index: number) => {
    onAddToQueue(idea);
    setAddedIdeas(prev => new Set(prev).add(index));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="space-y-6 lg:space-y-8"
    >
      <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
        <h3 className="text-lg lg:text-xl font-bold mb-4">利基市場探索</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="輸入感興趣的領域..." 
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none focus:ring-2 ring-black/5 transition-all text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
            分析趨勢
          </button>
        </div>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8">
          <div className="bg-white p-5 lg:p-6 rounded-2xl border border-black/5 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">市場趨勢</p>
            <p className="text-base lg:text-lg font-bold">{analysis.trend}</p>
          </div>
          <div className="bg-white p-5 lg:p-6 rounded-2xl border border-black/5 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">競爭程度</p>
            <p className="text-base lg:text-lg font-bold">{analysis.competition}</p>
          </div>
          <div className="bg-white p-5 lg:p-6 rounded-2xl border border-black/5 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">潛在收益</p>
            <p className="text-base lg:text-lg font-bold text-emerald-600">{analysis.potentialRevenue}</p>
          </div>

          <div className="sm:col-span-3 bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h4 className="font-bold mb-4 flex items-center gap-2 text-sm lg:text-base">
              <Plus className="text-emerald-500" size={18} />
              建議內容方向
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              {analysis.contentIdeas.map((idea: string, i: number) => (
                <div key={i} className="p-4 bg-zinc-50 rounded-xl flex items-center justify-between group hover:bg-zinc-100 transition-colors">
                  <span className="text-xs lg:text-sm font-medium flex-1 mr-4">{idea}</span>
                  <button 
                    onClick={() => handleAddIdea(idea, i)}
                    disabled={addedIdeas.has(i)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1",
                      addedIdeas.has(i) 
                        ? "bg-emerald-100 text-emerald-600 cursor-default" 
                        : "bg-black text-white hover:bg-zinc-800"
                    )}
                  >
                    {addedIdeas.has(i) ? (
                      <><CheckCircle2 size={12} /> 已加入隊列</>
                    ) : (
                      <><Plus size={12} /> 加入排程</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ContentView({ onPostSuccess, defaultPublishDirectly }: { onPostSuccess: (post: any) => void, defaultPublishDirectly: boolean }) {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('部落格文章');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [postResult, setPostResult] = useState<{ url: string } | null>(null);
  const [publishDirectly, setPublishDirectly] = useState(defaultPublishDirectly);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setPostResult(null);
    setFeaturedImage(null);
    try {
      const result = await geminiService.generateContent(topic, type);
      setContent(result || '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!content) return;
    setGeneratingImage(true);
    try {
      const lines = content.split('\n');
      const title = lines[0].replace(/^#\s*/, '') || topic;
      const prompt = await geminiService.getFeaturedImagePrompt(title, content);
      const base64 = await geminiService.generateImage(prompt || title);
      setFeaturedImage(base64);
    } catch (error: any) {
      alert('圖片生成失敗: ' + error.message);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handlePostToWP = async () => {
    if (!content) return;
    setPosting(true);
    try {
      const lines = content.split('\n');
      const title = lines[0].replace(/^#\s*/, '') || topic;
      const result = await wordpressService.postToWordPress(title, content, publishDirectly ? 'publish' : 'draft');
      
      if (featuredImage) {
        try {
          const media = await wordpressService.uploadMedia(featuredImage, `featured-${result.id}.png`);
          await wordpressService.updatePost(result.id, { featured_media: media.id });
        } catch (imgErr) {
          console.error('Failed to upload featured image:', imgErr);
        }
      }

      // Save to recent activity
      const newPost = {
        id: result.id,
        title,
        link: result.link,
        date: new Date().toISOString(),
        type: 'manual'
      };
      onPostSuccess(newPost);

      setPostResult({ url: result.link });
    } catch (error: any) {
      alert('發佈失敗: ' + error.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="space-y-6 lg:space-y-8"
    >
      <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">利基主題</label>
            <input 
              type="text" 
              placeholder="例如：2024 最佳 AI 寫作工具" 
              className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">內容類型</label>
            <select 
              className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>部落格文章</option>
              <option>社群媒體貼文</option>
              <option>產品評測報告</option>
              <option>電子報內容</option>
              <option>短影片腳本</option>
              <option>產品開箱影片腳本</option>
              <option>市場趨勢分析圖表數據</option>
              <option>投資組合建議</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 bg-black text-white py-3 lg:py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
            生成智慧內容
          </button>
          {content && (
            <button 
              onClick={handleGenerateImage}
              disabled={generatingImage}
              className="flex-1 bg-zinc-100 text-black py-3 lg:py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {generatingImage ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
              生成精選圖片
            </button>
          )}
        </div>
      </div>

      {content && (
        <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h4 className="font-bold text-sm lg:text-base">生成結果</h4>
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-xl border border-black/5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">直接發佈</span>
                <button 
                  onClick={() => setPublishDirectly(!publishDirectly)}
                  className={cn(
                    "w-8 h-4 rounded-full transition-colors relative",
                    publishDirectly ? "bg-emerald-500" : "bg-zinc-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                    publishDirectly ? "right-0.5" : "left-0.5"
                  )} />
                </button>
              </div>
              <button 
                onClick={handlePostToWP}
                disabled={posting}
                className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs lg:text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {posting ? <Loader2 className="animate-spin" size={14} /> : <ExternalLink size={14} />}
                {publishDirectly ? '立即發佈至 WP' : '發佈草稿至 WP'}
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(content);
                  alert('已複製到剪貼簿');
                }}
                className="flex-1 sm:flex-none p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 flex justify-center"
                title="複製內容"
              >
                <Copy size={18} />
              </button>
              <button 
                onClick={() => {
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${topic || 'content'}.txt`;
                  a.click();
                }}
                className="flex-1 sm:flex-none p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 flex justify-center"
                title="下載內容"
              >
                <Download size={18} />
              </button>
              <button className="flex-1 sm:flex-none p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 flex justify-center">
                <Share2 size={18} />
              </button>
            </div>
          </div>

          {featuredImage && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-black/5 shadow-sm">
              <img 
                src={`data:image/png;base64,${featuredImage}`} 
                alt="Featured" 
                className="w-full aspect-video object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-3 bg-zinc-50 text-[10px] text-zinc-400 text-center font-medium">
                AI 生成的文章精選圖片
              </div>
            </div>
          )}

          {postResult && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <span className="text-sm font-medium text-emerald-800">已成功發佈至 WordPress 草稿！</span>
              </div>
              <a 
                href={postResult.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                查看文章 <ExternalLink size={12} />
              </a>
            </div>
          )}

          <div className="prose prose-zinc prose-sm lg:prose-base max-w-none overflow-x-auto">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function PromotionView({ 
  isActive, 
  onToggle, 
  logs, 
  onClearLogs, 
  affiliateId, 
  queueCount, 
  contentQueue,
  onClearQueue, 
  onRunNow, 
  isRunning,
  lastChecked,
  nextCheckTime,
  checkInterval,
  onUpdateCheckInterval,
  onUpdateQueue
}: { 
  isActive: boolean, 
  onToggle: (val: boolean) => void, 
  logs: string[], 
  onClearLogs: () => void, 
  affiliateId: string, 
  queueCount: number, 
  contentQueue: any[],
  onClearQueue: () => void, 
  onRunNow: () => void, 
  isRunning: boolean,
  lastChecked: Date | null,
  nextCheckTime: Date | null,
  checkInterval: number,
  onUpdateCheckInterval: (val: number) => void,
  onUpdateQueue: (newQueue: any[]) => void
}) {
  const wpConfig = wordpressService.getConfig();
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [managingPlatform, setManagingPlatform] = useState<any>(null);
  
  // Map content queue to schedule items
  const scheduleItems = contentQueue.map((item, index) => {
    const topic = typeof item === 'string' ? item : item.topic;
    const time = typeof item === 'string' ? (index === 0 ? '即將發佈' : `${new Date(Date.now() + (index + 1) * 2 * 60 * 60 * 1000).getHours()}:00`) : (index === 0 ? '即將發佈' : new Date(item.scheduledTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }));
    const platform = typeof item === 'string' ? 'WordPress, Facebook, X' : item.platforms.join(', ');
    
    return {
      id: typeof item === 'string' ? `q-${index}` : item.id,
      title: topic,
      time: time,
      rawTime: typeof item === 'string' ? new Date(Date.now() + (index + 1) * 2 * 60 * 60 * 1000).toISOString() : item.scheduledTime,
      platform: platform,
      isQueueItem: true,
      originalIndex: index,
      rawItem: item
    };
  });

  const platforms = [
    { id: 'fb', name: 'Facebook', icon: <Share2 size={18} />, status: '已連接', color: 'bg-blue-500', account: 'Smart Wealth Official' },
    { id: 'ig', name: 'Instagram', icon: <Share2 size={18} />, status: '已連接', color: 'bg-pink-500', account: '@smart_wealth' },
    { id: 'x', name: 'X (Twitter)', icon: <Share2 size={18} />, status: '已連接', color: 'bg-zinc-900', account: 'SmartWealthAI' },
    { id: 'wp', name: 'WordPress', icon: <ExternalLink size={18} />, status: wpConfig ? '已連接' : '待設定', color: 'bg-blue-400', account: wpConfig?.url || '未設定' },
    { id: 'mc', name: 'Mailchimp', icon: <Share2 size={18} />, status: '已連接', color: 'bg-yellow-400', account: 'Newsletter List' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="space-y-6 lg:space-y-8 pb-20 lg:pb-0"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight">自動推廣與營利</h2>
          <p className="text-zinc-500 text-sm mt-1">管理您的自動化發佈管道與營利模式</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className={cn(
            "px-4 py-2 rounded-full border flex items-center justify-center gap-2 transition-colors",
            isActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-zinc-50 border-zinc-200 text-zinc-500"
          )}>
            <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-300")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{isActive ? '自動駕駛中' : '自動駕駛關閉'}</span>
          </div>
          <button 
            onClick={() => onToggle(!isActive)}
            className={cn(
              "px-6 py-2 rounded-full font-bold text-sm transition-all shadow-lg",
              isActive ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
            )}
          >
            {isActive ? '停止自動化' : '啟動自動化營利'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Auto-Pilot Console */}
          <div className="bg-zinc-900 rounded-3xl p-5 lg:p-8 shadow-2xl border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-white font-bold text-sm lg:text-base">自動化運行終端</h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={onClearLogs}
                  className="text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
                >
                  Clear
                </button>
                <div className="text-[9px] lg:text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Live Console</div>
              </div>
            </div>
            <div className="bg-black/50 rounded-2xl p-4 font-mono text-[10px] lg:text-xs text-emerald-400 h-64 lg:h-80 overflow-y-auto space-y-2 relative z-10 scrollbar-hide">
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} className="flex gap-3 border-l border-emerald-500/20 pl-3">
                  <span className="opacity-30 shrink-0 text-[9px]">{logs.length - i}</span>
                  <span className="leading-relaxed break-all">{log}</span>
                </div>
              )) : (
                <div className="text-zinc-600 italic flex items-center justify-center h-full text-xs">
                  等待啟動指令...
                </div>
              )}
            </div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
          </div>

          <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-black font-bold text-sm lg:text-base">自動化運行狀態</h3>
              </div>
              <button 
                onClick={onRunNow}
                disabled={isRunning}
                className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isRunning ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
                立即執行
              </button>
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-300")} />
                    <div>
                      <p className="text-xs font-bold">自動駕駛模式</p>
                      <p className="text-[10px] text-zinc-400">
                        {isActive ? '正在背景運行中' : '已停止'}
                        {isActive && lastChecked && ` • 最後檢查: ${lastChecked.toLocaleTimeString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' })}`}
                        {isActive && nextCheckTime && ` • 下次檢查: ${nextCheckTime.toLocaleTimeString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' })}`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onToggle(!isActive)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    )}
                  >
                    {isActive ? '停止運行' : '啟動運行'}
                  </button>
                </div>
            </div>
          </div>

          <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h3 className="text-base lg:text-lg font-bold mb-6">發佈排程</h3>
            <div className="space-y-3 lg:space-y-4">
              {scheduleItems.length > 0 ? scheduleItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-xl flex flex-col items-center justify-center border border-black/5">
                      <Clock size={14} className="text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs lg:text-sm truncate">{item.title}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">{item.time} • {item.platform}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingSchedule(item)}
                    className="flex-shrink-0 p-2 hover:bg-zinc-200 rounded-lg transition-colors ml-2"
                  >
                    <Settings size={14} className="text-zinc-400" />
                  </button>
                </div>
              )) : (
                <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <Clock className="mx-auto text-zinc-300 mb-2" size={24} />
                  <p className="text-xs text-zinc-400">目前沒有排程中的主題</p>
                  <p className="text-[10px] text-zinc-300 mt-1">請在「利基分析」中加入主題到隊列</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base lg:text-lg font-bold">營利設定</h3>
              <Zap size={16} className="text-emerald-500" />
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">聯盟行銷 ID</p>
                <p className="text-sm font-mono font-bold text-zinc-800">{affiliateId || '未設定'}</p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">檢查排程頻率</p>
                <select 
                  value={checkInterval}
                  onChange={(e) => onUpdateCheckInterval(Number(e.target.value))}
                  className="w-full bg-white border border-black/5 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-black/5 transition-all"
                >
                  <option value={1}>每 1 分鐘</option>
                  <option value={10}>每 10 分鐘</option>
                  <option value={30}>每 30 分鐘</option>
                  <option value={60}>每 1 小時</option>
                  <option value={180}>每 3 小時</option>
                  <option value={360}>每 6 小時</option>
                  <option value={720}>每 12 小時</option>
                  <option value={1440}>每 24 小時</option>
                </select>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">排程隊列</p>
                  {queueCount > 0 && (
                    <button 
                      onClick={onClearQueue}
                      className="text-[9px] font-bold text-emerald-400 hover:text-emerald-600 transition-colors"
                    >
                      清空
                    </button>
                  )}
                </div>
                <p className="text-sm font-bold text-emerald-800">{queueCount} 個主題等待發佈</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">WordPress 優化</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <p className="text-[11px] font-bold text-blue-800">自動生成 AI 精選圖片</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <p className="text-[11px] font-bold text-blue-800">SEO 結構化內容優化</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-600 text-white p-6 lg:p-8 rounded-3xl shadow-xl shadow-emerald-100">
            <h3 className="text-lg font-bold mb-4">自動化收益</h3>
            <div className="space-y-4">
              <div>
                <p className="text-emerald-100 text-[10px] uppercase tracking-widest mb-1">今日預估收益</p>
                <p className="text-3xl font-bold">$428.50</p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-100">聯盟行銷點擊</span>
                  <span className="font-bold">1,240</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-100">廣告展示次數</span>
                  <span className="font-bold">45.2k</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
            <h3 className="text-base lg:text-lg font-bold mb-6">平台連接</h3>
            <div className="space-y-4">
              {platforms.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", p.color)}>
                      {p.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs lg:text-sm">{p.name}</h4>
                      <p className="text-[10px] text-zinc-400">{p.status}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setManagingPlatform(p)}
                    className="text-[10px] font-bold text-zinc-400 hover:text-black transition-colors"
                  >
                    管理
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Edit Modal */}
      <AnimatePresence>
        {editingSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h3 className="font-bold">編輯發佈排程</h3>
                <button onClick={() => setEditingSchedule(null)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">文章標題</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                    value={editingSchedule.title}
                    onChange={(e) => setEditingSchedule({...editingSchedule, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">發佈時間</label>
                    <input 
                      type="datetime-local" 
                      className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                      value={new Date(new Date(editingSchedule.rawTime).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        setEditingSchedule({...editingSchedule, rawTime: newDate.toISOString()});
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">發佈平台</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                      value={editingSchedule.platform}
                      onChange={(e) => setEditingSchedule({...editingSchedule, platform: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-zinc-50 flex gap-3">
                <button 
                  onClick={() => {
                    if (editingSchedule.isQueueItem) {
                      const newQueue = [...contentQueue];
                      newQueue.splice(editingSchedule.originalIndex, 1);
                      onUpdateQueue(newQueue);
                    }
                    setEditingSchedule(null);
                  }}
                  className="flex-1 py-3 text-red-600 font-bold text-sm hover:bg-red-50 rounded-2xl transition-colors"
                >
                  刪除排程
                </button>
                <button 
                  onClick={() => {
                    if (editingSchedule.isQueueItem) {
                      const newQueue = [...contentQueue];
                      const updatedItem = typeof editingSchedule.rawItem === 'string' ? {
                        id: Math.random().toString(36).substr(2, 9),
                        topic: editingSchedule.title,
                        scheduledTime: editingSchedule.rawTime || new Date().toISOString(),
                        platforms: editingSchedule.platform.split(',').map((p: string) => p.trim())
                      } : {
                        ...editingSchedule.rawItem,
                        topic: editingSchedule.title,
                        scheduledTime: editingSchedule.rawTime,
                        platforms: editingSchedule.platform.split(',').map((p: string) => p.trim())
                      };
                      newQueue[editingSchedule.originalIndex] = updatedItem;
                      onUpdateQueue(newQueue);
                    }
                    setEditingSchedule(null);
                  }}
                  className="flex-1 py-3 bg-black text-white font-bold text-sm rounded-2xl hover:bg-zinc-800 transition-all"
                >
                  儲存變更
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Platform Management Modal */}
      <AnimatePresence>
        {managingPlatform && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", managingPlatform.color)}>
                    {managingPlatform.icon}
                  </div>
                  <h3 className="font-bold">{managingPlatform.name} 設定</h3>
                </div>
                <button onClick={() => setManagingPlatform(null)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">連線狀態：正常</p>
                      <p className="text-[10px] text-emerald-600">已授權存取權限</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">連接帳號</label>
                    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                      <span className="text-sm font-bold">{managingPlatform.account}</span>
                      <button className="text-[10px] font-bold text-blue-600 hover:underline">更換帳號</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">自動同步設定</label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                        <span className="text-xs">自動發佈新文章</span>
                        <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                        <span className="text-xs">同步互動數據</span>
                        <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-zinc-50 flex gap-3">
                <button 
                  onClick={() => setManagingPlatform(null)}
                  className="flex-1 py-3 text-zinc-600 font-bold text-sm hover:bg-zinc-100 rounded-2xl transition-colors"
                >
                  中斷連線
                </button>
                <button 
                  onClick={() => setManagingPlatform(null)}
                  className="flex-1 py-3 bg-black text-white font-bold text-sm rounded-2xl hover:bg-zinc-800 transition-all"
                >
                  儲存設定
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AnalyticsView() {
  const trafficData = [
    { name: '搜尋引擎', value: 45, color: '#10b981' },
    { name: '社群媒體', value: 30, color: '#3b82f6' },
    { name: '直接流量', value: 15, color: '#f59e0b' },
    { name: '電子郵件', value: 10, color: '#8b5cf6' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="space-y-6 lg:space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
          <h3 className="text-base lg:text-lg font-bold mb-8">流量來源分佈</h3>
          <div className="h-[250px] lg:h-[300px] w-full flex flex-col sm:flex-row items-center">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {trafficData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-3 mt-4 sm:mt-0 sm:pl-8">
              {trafficData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-medium text-zinc-500">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
          <h3 className="text-base lg:text-lg font-bold mb-8">平台互動趨勢</h3>
          <div className="h-[250px] lg:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="clicks" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm lg:col-span-2">
          <h3 className="text-base lg:text-lg font-bold mb-6">熱門內容排行</h3>
          <div className="space-y-5 lg:space-y-6">
            {[
              { title: 'AI 寫作完全指南', views: '45.2K', conversion: '4.2%', revenue: '$1,240' },
              { title: '2024 數位遊牧城市推薦', views: '32.1K', conversion: '3.8%', revenue: '$890' },
              { title: '智慧家居自動化方案', views: '28.5K', conversion: '5.1%', revenue: '$1,560' },
              { title: '加密貨幣冷錢包評測', views: '22.4K', conversion: '2.9%', revenue: '$640' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                  <span className="text-[10px] font-bold text-zinc-300">0{i+1}</span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs lg:text-sm truncate">{item.title}</h4>
                    <p className="text-[10px] text-zinc-400">{item.views} 瀏覽 • {item.conversion} 轉換</p>
                  </div>
                </div>
                <span className="font-bold text-emerald-600 text-xs lg:text-sm flex-shrink-0">{item.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AffiliateView({ affiliateId, setAffiliateId }: { affiliateId: string, setAffiliateId: (val: string) => void }) {
  const [networks, setNetworks] = useState<any[]>(() => {
    const saved = localStorage.getItem('affiliate_networks');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Amazon Associates', status: '已連接', trackingId: affiliateId, color: 'bg-orange-500' },
      { id: '2', name: 'Rakuten Advertising', status: '未連接', trackingId: '-', color: 'bg-red-600' },
      { id: '3', name: 'CJ Affiliate', status: '未連接', trackingId: '-', color: 'bg-emerald-600' },
      { id: '4', name: 'ShareASale', status: '未連接', trackingId: '-', color: 'bg-blue-600' },
    ];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newNetwork, setNewNetwork] = useState({ name: '', trackingId: '', color: 'bg-zinc-600' });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Sync Amazon ID if it changes globally
    setNetworks(prev => prev.map(n => n.name === 'Amazon Associates' ? { ...n, trackingId: affiliateId, status: affiliateId ? '已連接' : '未連接' } : n));
  }, [affiliateId]);

  const handleUpdate = () => {
    localStorage.setItem('affiliate_networks', JSON.stringify(networks));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddNetwork = () => {
    if (!newNetwork.name) return;
    const updated = [
      ...networks,
      { ...newNetwork, id: Math.random().toString(36).substr(2, 9), status: newNetwork.trackingId ? '已連接' : '未連接' }
    ];
    setNetworks(updated);
    localStorage.setItem('affiliate_networks', JSON.stringify(updated));
    setIsAdding(false);
    setNewNetwork({ name: '', trackingId: '', color: 'bg-zinc-600' });
  };

  const colors = [
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Red', value: 'bg-red-600' },
    { name: 'Emerald', value: 'bg-emerald-600' },
    { name: 'Blue', value: 'bg-blue-600' },
    { name: 'Purple', value: 'bg-purple-600' },
    { name: 'Pink', value: 'bg-pink-600' },
    { name: 'Zinc', value: 'bg-zinc-600' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 lg:space-y-8"
    >
      <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold mb-2">聯盟行銷管理</h2>
            <p className="text-zinc-500 text-sm">管理您的聯盟行銷帳號與追蹤 ID</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all"
          >
            <Plus size={14} /> 新增平台
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {networks.map((net) => (
            <div key={net.id} className="p-6 bg-zinc-50 rounded-2xl border border-black/5 flex items-center justify-between group relative">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold", net.color)}>
                  {net.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-sm lg:text-base">{net.name}</h3>
                  <p className={cn("text-[10px] uppercase tracking-widest font-bold", net.status === '已連接' ? "text-emerald-500" : "text-zinc-400")}>
                    {net.status}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">追蹤 ID</p>
                <p className="text-sm font-mono font-bold">{net.trackingId}</p>
              </div>
              <button 
                onClick={() => {
                  const updated = networks.filter(n => n.id !== net.id);
                  setNetworks(updated);
                  localStorage.setItem('affiliate_networks', JSON.stringify(updated));
                }}
                className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-6">新增聯盟平台</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">平台名稱</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                  placeholder="例如: ClickBank"
                  value={newNetwork.name}
                  onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">追蹤 ID</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                  placeholder="您的聯盟 ID"
                  value={newNetwork.trackingId}
                  onChange={(e) => setNewNetwork({ ...newNetwork, trackingId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">標誌顏色</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button 
                      key={c.value}
                      onClick={() => setNewNetwork({ ...newNetwork, color: c.value })}
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all",
                        c.value,
                        newNetwork.color === c.value ? "ring-2 ring-offset-2 ring-black" : "opacity-60 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-sm bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all"
              >
                取消
              </button>
              <button 
                onClick={handleAddNetwork}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-sm bg-black text-white hover:bg-zinc-800 transition-all"
              >
                確認新增
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
        <h3 className="text-lg font-bold mb-6">快速設定</h3>
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">主要聯盟 ID (Amazon)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                value={affiliateId}
                onChange={(e) => {
                  setAffiliateId(e.target.value);
                  localStorage.setItem('affiliateId', e.target.value);
                }}
              />
              <button 
                onClick={handleUpdate}
                className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center gap-2"
              >
                {showSuccess ? <Check size={16} /> : null}
                {showSuccess ? '已更新' : '更新'}
              </button>
            </div>
            {showSuccess && (
              <p className="text-[10px] text-emerald-500 font-bold mt-2 animate-pulse">設定已成功儲存至本地瀏覽器</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MediaView() {
  const [media, setMedia] = useState<any[]>([]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 lg:space-y-8"
    >
      <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold">媒體庫</h2>
            <p className="text-zinc-500 text-sm">管理 AI 生成的圖片與素材</p>
          </div>
          <button className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <Plus size={14} /> 上傳素材
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1,2,3,4,5,6,7,8,9,10].map((i) => (
            <div key={i} className="group relative aspect-square bg-zinc-100 rounded-2xl overflow-hidden border border-black/5">
              <img 
                src={`https://picsum.photos/seed/media-${i}/400/400`} 
                alt="Media" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button className="p-2 bg-white rounded-lg text-black hover:bg-zinc-100 transition-colors">
                  <ExternalLink size={16} />
                </button>
                <button className="p-2 bg-white rounded-lg text-red-500 hover:bg-zinc-100 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function SettingsView({ wpConfig, setWpConfig, isPublishDirectly, setIsPublishDirectly }: { wpConfig: WordPressConfig | null, setWpConfig: (val: WordPressConfig) => void, isPublishDirectly: boolean, setIsPublishDirectly: (val: boolean) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 lg:space-y-8"
    >
      <div className="bg-white p-5 lg:p-8 rounded-3xl border border-black/5 shadow-sm">
        <h2 className="text-xl lg:text-2xl font-bold mb-2">系統設定</h2>
        <p className="text-zinc-500 text-sm mb-8">配置您的 WordPress 連接與系統偏好</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <Globe size={14} /> WordPress 連接
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">網站網址</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                    placeholder="https://your-site.com"
                    value={wpConfig?.url || ''}
                    onChange={(e) => setWpConfig({ ...wpConfig!, url: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">使用者名稱</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                      placeholder="admin"
                      value={wpConfig?.username || ''}
                      onChange={(e) => setWpConfig({ ...wpConfig!, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">應用程式密碼</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-3 bg-zinc-50 border-none rounded-2xl outline-none text-sm"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={wpConfig?.applicationPassword || ''}
                      onChange={(e) => setWpConfig({ ...wpConfig!, applicationPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <Settings size={14} /> 發佈偏好
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold">自動駕駛直接發佈</p>
                    <p className="text-xs text-zinc-500">開啟後自動駕駛產生的內容將直接公開發佈</p>
                  </div>
                  <button 
                    onClick={() => setIsPublishDirectly(!isPublishDirectly)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      isPublishDirectly ? "bg-emerald-500" : "bg-zinc-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                      isPublishDirectly ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-zinc-900 text-white rounded-3xl">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Database size={16} className="text-emerald-400" /> 系統狀態
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">API 版本</span>
                  <span className="font-mono">v2.4.0</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">資料庫連線</span>
                  <span className="text-emerald-400">正常</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">儲存空間</span>
                  <span>1.2GB / 10GB</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border border-black/5 rounded-3xl">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <User size={16} className="text-blue-500" /> 帳戶資訊
              </h4>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-full" />
                <div>
                  <p className="text-sm font-bold">Mumps AI</p>
                  <p className="text-[10px] text-zinc-400">Premium Plan</p>
                </div>
              </div>
              <button className="w-full py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">
                登出帳號
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const mockChartData = [
  { name: 'Mon', views: 400, clicks: 240, revenue: 120 },
  { name: 'Tue', views: 300, clicks: 139, revenue: 98 },
  { name: 'Wed', views: 200, clicks: 980, revenue: 390 },
  { name: 'Thu', views: 278, clicks: 390, revenue: 190 },
  { name: 'Fri', views: 189, clicks: 480, revenue: 210 },
  { name: 'Sat', views: 239, clicks: 380, revenue: 250 },
  { name: 'Sun', views: 349, clicks: 430, revenue: 210 },
];
