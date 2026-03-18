import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faGlobe, faPlus, faTimes, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import './OasisChat.css';

const OasisChat = () => {
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [copiedId, setCopiadoId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'; } }, [input]);
  useEffect(() => { const s = localStorage.getItem('oasisConversations'); if (s) { const p = JSON.parse(s); setConversations(p); if (p.length > 0) { setCurrentConversationId(p[0].id); setMessages(p[0].messages); } } }, []);
  useEffect(() => { if (conversations.length > 0) localStorage.setItem('oasisConversations', JSON.stringify(conversations)); }, [conversations]);

  const resizeImage = (file) => new Promise((resolve) => { const r = new FileReader(); r.onload = (e) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); let w = img.width, h = img.height; if (w > 800) { h = (h*800)/w; w = 800; } c.width = w; c.height = h; c.getContext('2d').drawImage(img,0,0,w,h); resolve(c.toDataURL(file.type)); }; img.src = e.target.result; }; r.readAsDataURL(file); });

  const handleFileUpload = async (e) => { for (const f of Array.from(e.target.files)) { if (f.type.startsWith('image/')) { const d = await resizeImage(f); setUploadedFiles(p => [...p, { id: Math.random().toString(36).substr(2,9), name: f.name, type: f.type, data: d, isImage: true }]); } else { const r = new FileReader(); r.onload = (ev) => { setUploadedFiles(p => [...p, { id: Math.random().toString(36).substr(2,9), name: f.name, type: f.type, data: ev.target.result, isImage: false }]); }; r.readAsDataURL(f); } } if (fileInputRef.current) fileInputRef.current.value = ''; };
  const removeFile = (id) => setUploadedFiles(p => p.filter(f => f.id !== id));
  const newChat = () => { const id = Math.random().toString(36).substr(2,9); setConversations(p => [{ id, messages: [], timestamp: new Date().toISOString() }, ...p]); setCurrentConversationId(id); setMessages([]); setInput(''); setUploadedFiles([]); if (isMobile) setShowSidebar(false); };
  const loadConversation = (cid) => { const c = conversations.find(x => x.id === cid); if (c) { setCurrentConversationId(cid); setMessages(c.messages); setInput(''); setUploadedFiles([]); if (isMobile) setShowSidebar(false); } };

  const sendMessage = useCallback(async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;
    const userMsg = { id: Math.random().toString(36).substr(2,9), role: 'user', content: input, files: uploadedFiles, timestamp: new Date().toISOString() };
    setMessages(p => [...p, userMsg]); setInput(''); setUploadedFiles([]); setLoading(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('https://lvmeswlvszsmvgaasazs.supabase.co/functions/v1/social-api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat_v2', message: input || 'Process attached files', history, files: uploadedFiles.map(f => ({ name: f.name, type: f.type, data: f.data })), web_search: webSearch, mode }) });
      const data = await res.json();
      const aiMsg = { id: Math.random().toString(36).substr(2,9), role: 'assistant', content: data.reply || 'Sin respuesta', sources: data.sources || [], timestamp: new Date().toISOString() };
      setMessages(p => [...p, aiMsg]);
      if (currentConversationId) setConversations(p => p.map(c => c.id === currentConversationId ? { ...c, messages: [...c.messages, userMsg, aiMsg] } : c));
    } catch (err) { setMessages(p => [...p, { id: Math.random().toString(36).substr(2,9), role: 'assistant', content: 'Error: ' + err.message, timestamp: new Date().toISOString() }]); } finally { setLoading(false); }
  }, [input, uploadedFiles, messages, webSearch, mode, currentConversationId]);

  const renderMarkdown = (text) => { let h = text; h = h.replace(/```(\w+)?\n([\s\S]*?)```/g, (m,l,c) => '<pre class="code-block"><code>' + c.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</code></pre>'); h = h.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>'); h = h.replace(/^### (.*?)$/gm, '<h3>$1</h3>'); h = h.replace(/^## (.*?)$/gm, '<h2>$1</h2>'); h = h.replace(/^# (.*?)$/gm, '<h1>$1</h1>'); h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>'); h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'); h = h.replace(/^[*-] (.*?)$/gm, '<li>$1</li>'); h = h.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>'); h = h.replace(/\n\n/g, '</p><p>'); return '<p>' + h + '</p>'; };
  const copyToClipboard = (t, id) => { navigator.clipboard.writeText(t); setCopiadoId(id); setTimeout(() => setCopiadoId(null), 2000); };
  const truncName = (n, max=20) => n.length > max ? n.slice(0,max-3)+'...' : n;
  const fmtTime = (ts) => { const d = new Date(ts), dm = Math.floor((new Date()-d)/60000); if (dm<1) return 'ahora'; if (dm<60) return dm+'m'; if (dm<1440) return Math.floor(dm/60)+'h'; return d.toLocaleDateString(); };

  return (
    <div style={{width:'100%',minHeight:'calc(100vh - 180px)',display:'flex',flexDirection:'column',backgroundColor:'#fff'}}>
      {/* Header provided by dashboard */}
      {/* HeaderDash provided by dashboard */}
      <div style={{display:'flex',flex:1,overflow:'hidden',position:'relative'}}>
        <div className='sidebar' style={{width:280,backgroundColor:'#2D2D2D',color:'#fff',display:'flex',flexDirection:'column',borderRight:'1px solid #e5e7eb',transition:'transform 0.3s',zIndex:100,transform:isMobile&&!showSidebar?'translateX(-100%)':'translateX(0)'}}>
          <button className='new-chat-btn' onClick={newChat}><FontAwesomeIcon icon={faPlus} style={{marginRight:8}}/> Nuevo Chat</button>
          <div className='conversations-list' style={{flex:1,overflowY:'auto',padding:16}}>
            <h3 className='conversation-title'>Historial</h3>
            {conversations.length===0?<p className='empty-state'>Sin conversaciones</p>:conversations.map(conv=>(<button key={conv.id} className={'conversation-item'+(currentConversationId===conv.id?' conversation-item-active':'')} onClick={()=>loadConversation(conv.id)}><span className='conv-text'>{conv.messages[0]?.content?.slice(0,30)||'Nueva conversacion'}</span><span className='conv-time'>{fmtTime(conv.timestamp)}</span></button>))}
          </div>
        </div>
        {isMobile&&showSidebar&&<div className='overlay' onClick={()=>setShowSidebar(false)}/>}
        <div className='chat-area' style={{flex:1,display:'flex',flexDirection:'column',backgroundColor:'#fff'}}>
          <div className='chat-header'>
            {isMobile&&<button className='mobile-menu-btn' onClick={()=>setShowSidebar(!showSidebar)}>Menu</button>}
            <div className='tabs-container'>
              <button className={'tab'+(mode==='chat'?' tab-active':'')} onClick={()=>setMode('chat')}>Chat</button>
              <button className={'tab'+(mode==='code'?' tab-active':'')} onClick={()=>setMode('code')}>Codigo</button>
            </div>
            <div className='header-right'><button className={'icon-btn'+(webSearch?' icon-btn-active':'')} onClick={()=>setWebSearch(!webSearch)} title='Busqueda Web'><FontAwesomeIcon icon={faGlobe}/></button></div>
          </div>
          <div className='messages-container' style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
            {messages.length===0?(<div className='empty-chat' style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:12}}><h1 className='welcome-title'>Chat IA</h1><p className='welcome-subtitle'>Powered by Claude Sonnet 4.6</p><p className='welcome-text'>{mode==='chat'?'Escribe algo para comenzar':'Comparte tu codigo y te ayudo'}</p></div>):messages.map(msg=>(<div key={msg.id} className={'message-row '+(msg.role==='user'?'user-message':'assistant-message')}><div className={msg.role==='user'?'user-bubble':'assistant-bubble'}><div className='message-content' dangerouslySetInnerHTML={{__html:renderMarkdown(msg.content)}}/>{msg.files&&msg.files.length>0&&<div className='file-preview-container'>{msg.files.map(f=><div key={f.id} className='file-preview'>{f.isImage?<img src={f.data} alt={f.name} className='preview-image'/>:<div className='file-preview-text'>{truncName(f.name)}</div>}</div>)}</div>}{msg.sources&&msg.sources.length>0&&<div className='sources-container'><h4 className='sources-title'>Fuentes</h4>{msg.sources.map((s,i)=><a key={i} href={s.url} target='_blank' rel='noopener' className='source-link'>{s.title}</a>)}</div>}{msg.role==='assistant'&&<button className={'copy-btn'+(copiedId===msg.id?' copy-btn-active':'')} onClick={()=>copyToClipboard(msg.content,msg.id)}><FontAwesomeIcon icon={copiedId===msg.id?faCheck:faCopiar} style={{marginRight:4}}/>{copiedId===msg.id?'Copiado':'Copiar'}</button>}</div></div>))}
            {loading&&<div className='message-row assistant-message'><div className='assistant-bubble'><div className='typing-indicator'><span className='typing-dot'/><span className='typing-dot'/><span className='typing-dot'/></div></div></div>}
            <div ref={messagesEndRef}/>
          </div>
          <div className='input-area'>
            {uploadedFiles.length>0&&<div className='uploaded-files-container'>{uploadedFiles.map(f=><div key={f.id} className='uploaded-file'>{f.isImage?<img src={f.data} alt={f.name} className='uploaded-image'/>:<div className='uploaded-file-name'>{truncName(f.name)}</div>}<button className='remove-file-btn' onClick={()=>removeFile(f.id)}><FontAwesomeIcon icon={faTimes}/></button></div>)}</div>}
            <div className='input-wrapper'>
              <textarea ref={textareaRef} className='textarea' placeholder='Mensaje a Chat IA...' value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} disabled={loading}/>
              <div className='input-actions'>
                <button className='attach-btn' onClick={()=>fileInputRef.current?.click()} disabled={loading} title='Adjuntar'><FontAwesomeIcon icon={faPaperclip}/></button>
                <input ref={fileInputRef} type='file' multiple onChange={handleFileUpload} style={{display:'none'}} accept='image/*,.pdf,.doc,.docx,.txt,.json,.csv'/>
                <button className={'send-btn'+(loading?' send-btn-disabled':'')} onClick={sendMessage} disabled={loading||(!input.trim()&&uploadedFiles.length===0)}>Enviar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OasisChat;
