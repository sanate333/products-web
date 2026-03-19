import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faGlobe, faPlus, faTimes, faCopy, faCheck, faEye, faTrash, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import './OasisChat.css';

const SUPABASE_FN = 'https://lvmeswlvszsmvgaasazs.supabase.co/functions/v1/social-api';

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
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'; } }, [input]);

  // Load conversations from Supabase on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(SUPABASE_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_conversations', user_id: 'default' }) });
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !currentConversationId) {
          const first = data.conversations[0];
          setCurrentConversationId(first.id);
          await loadConversationMessages(first.id);
        }
      }
    } catch (err) { console.error('Error loading conversations:', err); }
    setLoadingHistory(false);
  };

  const loadConversationMessages = async (convId) => {
    try {
      const res = await fetch(SUPABASE_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_conversation', conversation_id: convId }) });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map(m => ({
          id: m.id || Math.random().toString(36).substr(2, 9),
          role: m.role,
          content: m.content,
          sources: m.sources || [],
          files: m.files || [],
          timestamp: m.created_at || new Date().toISOString()
        })));
      }
    } catch (err) { console.error('Error loading messages:', err); }
  };

  const resizeImage = (file) => new Promise((resolve) => { const r = new FileReader(); r.onload = (e) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); let w = img.width, h = img.height; if (w > 800) { h = (h*800)/w; w = 800; } c.width = w; c.height = h; c.getContext('2d').drawImage(img,0,0,w,h); resolve(c.toDataURL(file.type)); }; img.src = e.target.result; }; r.readAsDataURL(file); });

  const handleFileUpload = async (e) => { for (const f of Array.from(e.target.files)) { if (f.type.startsWith('image/')) { const d = await resizeImage(f); setUploadedFiles(p => [...p, { id: Math.random().toString(36).substr(2,9), name: f.name, type: f.type, data: d, isImage: true }]); } else { const r = new FileReader(); r.onload = (ev) => { setUploadedFiles(p => [...p, { id: Math.random().toString(36).substr(2,9), name: f.name, type: f.type, data: ev.target.result, isImage: false }]); }; r.readAsDataURL(f); } } if (fileInputRef.current) fileInputRef.current.value = ''; };
  const removeFile = (id) => setUploadedFiles(p => p.filter(f => f.id !== id));

  const newChat = () => {
    const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    setCurrentConversationId(id);
    setMessages([]);
    setInput('');
    setUploadedFiles([]);
    setPreviewHtml(null);
    setShowPreview(false);
    if (isMobile) setShowChatSidebar(false);
  };

  const selectConversation = async (convId) => {
    setCurrentConversationId(convId);
    setInput('');
    setUploadedFiles([]);
    setPreviewHtml(null);
    setShowPreview(false);
    await loadConversationMessages(convId);
    if (isMobile) setShowChatSidebar(false);
  };

  const deleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await fetch(SUPABASE_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_conversation', conversation_id: convId }) });
      setConversations(p => p.filter(c => c.id !== convId));
      if (currentConversationId === convId) { setCurrentConversationId(null); setMessages([]); }
    } catch (err) { console.error('Error deleting conversation:', err); }
  };

  // Detect HTML in message content for preview
  const extractHtml = (content) => {
    const htmlMatch = content.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) return htmlMatch[1].trim();
    if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
      const start = content.indexOf('<!DOCTYPE html>') !== -1 ? content.indexOf('<!DOCTYPE html>') : content.indexOf('<html');
      const end = content.lastIndexOf('</html>');
      if (end > start) return content.substring(start, end + 7);
    }
    return null;
  };

  const openPreview = (html) => {
    setPreviewHtml(html);
    setShowPreview(true);
    setTimeout(() => {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        doc.open();
        doc.write(html);
        doc.close();
      }
    }, 100);
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;
    const convId = currentConversationId || ('conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    if (!currentConversationId) setCurrentConversationId(convId);

    const userMsg = { id: Math.random().toString(36).substr(2,9), role: 'user', content: input, files: uploadedFiles, timestamp: new Date().toISOString() };
    setMessages(p => [...p, userMsg]); setInput(''); setUploadedFiles([]); setLoading(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(SUPABASE_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat_v2', message: input || 'Process attached files', history,
          files: uploadedFiles.map(f => ({ name: f.name, type: f.type, data: f.data })),
          web_search: webSearch, mode, conversation_id: convId, user_id: 'default'
        })
      });
      const data = await res.json();
      const aiMsg = { id: Math.random().toString(36).substr(2,9), role: 'assistant', content: data.reply || 'Sin respuesta', sources: data.sources || [], timestamp: new Date().toISOString() };
      setMessages(p => [...p, aiMsg]);

      // Refresh conversations list
      const listRes = await fetch(SUPABASE_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_conversations', user_id: 'default' }) });
      const listData = await listRes.json();
      if (listData.conversations) setConversations(listData.conversations);

      // Auto-detect HTML for preview
      const html = extractHtml(data.reply || '');
      if (html) { setPreviewHtml(html); }

    } catch (err) { setMessages(p => [...p, { id: Math.random().toString(36).substr(2,9), role: 'assistant', content: 'Error: ' + err.message, timestamp: new Date().toISOString() }]); } finally { setLoading(false); }
  }, [input, uploadedFiles, messages, webSearch, mode, currentConversationId]);

  const renderMarkdown = (text) => {
    let h = text;
    h = h.replace(/```(\w+)?\n([\s\S]*?)```/g, (m,l,c) => '<pre class="code-block"><code>' + c.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</code></pre>');
    h = h.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    h = h.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    h = h.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    h = h.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/^[*-] (.*?)$/gm, '<li>$1</li>');
    h = h.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
    h = h.replace(/\n\n/g, '</p><p>');
    return '<p>' + h + '</p>';
  };

  const copyToClipboard = (t, id) => { navigator.clipboard.writeText(t); setCopiadoId(id); setTimeout(() => setCopiadoId(null), 2000); };
  const truncName = (n, max=20) => n.length > max ? n.slice(0,max-3)+'...' : n;
  const fmtTime = (ts) => { const d = new Date(ts), dm = Math.floor((new Date()-d)/60000); if (dm<1) return 'ahora'; if (dm<60) return dm+'m'; if (dm<1440) return Math.floor(dm/60)+'h'; return d.toLocaleDateString(); };

  return (
    <div className="oasis-chat-page">
      <Header />
      <HeaderDash />
      <div className="oasis-chat-container">
        {/* Chat History Sidebar */}
        <div className={'oasis-sidebar' + (isMobile && !showChatSidebar ? ' oasis-sidebar-hidden' : '')}>
          <button className='new-chat-btn' onClick={newChat}><FontAwesomeIcon icon={faPlus} style={{marginRight:8}}/> Nuevo Chat</button>
          <div className='conversations-list' style={{flex:1,overflowY:'auto',padding:16}}>
            <h3 className='conversation-title'>Historial</h3>
            {loadingHistory ? <p className='empty-state'>Cargando...</p> :
              conversations.length === 0 ? <p className='empty-state'>Sin conversaciones</p> :
              conversations.map(conv => (
                <button key={conv.id} className={'conversation-item' + (currentConversationId === conv.id ? ' conversation-item-active' : '')} onClick={() => selectConversation(conv.id)}>
                  <span className='conv-text'>{conv.title || 'Nueva conversacion'}</span>
                  <div className='conv-meta'>
                    <span className='conv-time'>{fmtTime(conv.updated_at || conv.created_at)}</span>
                    <button className='conv-delete-btn' onClick={(e) => deleteConversation(e, conv.id)} title='Eliminar'><FontAwesomeIcon icon={faTrash}/></button>
                  </div>
                </button>
              ))
            }
          </div>
        </div>
        {isMobile && showChatSidebar && <div className='oasis-overlay' onClick={() => setShowChatSidebar(false)}/>}

        {/* Main Chat Area */}
        <div className='chat-area' style={{flex:1,display:'flex',flexDirection:'column',backgroundColor:'#fff',overflow:'hidden'}}>
          <div className='chat-header'>
            {isMobile && <button className='mobile-menu-btn' onClick={() => setShowChatSidebar(!showChatSidebar)}><FontAwesomeIcon icon={showChatSidebar ? faChevronLeft : faPlus}/></button>}
            <div className='tabs-container'>
              <button className={'tab'+(mode==='chat'?' tab-active':'')} onClick={()=>setMode('chat')}>Chat</button>
              <button className={'tab'+(mode==='code'?' tab-active':'')} onClick={()=>setMode('code')}>Codigo</button>
            </div>
            <div className='header-right'>
              <button className={'icon-btn'+(webSearch?' icon-btn-active':'')} onClick={()=>setWebSearch(!webSearch)} title='Busqueda Web'><FontAwesomeIcon icon={faGlobe}/></button>
              {previewHtml && <button className={'icon-btn'+(showPreview?' icon-btn-active':'')} onClick={()=>{setShowPreview(!showPreview); if(!showPreview) setTimeout(()=>{if(iframeRef.current){const doc=iframeRef.current.contentDocument;doc.open();doc.write(previewHtml);doc.close();}},100);}} title='Preview HTML'><FontAwesomeIcon icon={faEye}/></button>}
            </div>
          </div>

          <div style={{display:'flex',flex:1,overflow:'hidden'}}>
            {/* Messages */}
            <div className='messages-container' style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
              {messages.length===0?(
                <div className='empty-chat' style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:12}}>
                  <h1 className='welcome-title'>Chat IA</h1>
                  <p className='welcome-subtitle'>Powered by Claude Sonnet 4.6 + GPT-4o + Gemini 2.0</p>
                  <p className='welcome-text'>{mode==='chat'?'Escribe algo para comenzar. Activa la busqueda web para consultar internet en tiempo real.':'Comparte tu codigo y te ayudo a mejorarlo, debuggearlo o crearlo desde cero.'}</p>
                </div>
              ):messages.map(msg=>(
                <div key={msg.id} className={'message-row '+(msg.role==='user'?'user-message':'assistant-message')}>
                  <div className={msg.role==='user'?'user-bubble':'assistant-bubble'}>
                    <div className='message-content' dangerouslySetInnerHTML={{__html:renderMarkdown(msg.content)}}/>
                    {msg.files&&msg.files.length>0&&<div className='file-preview-container'>{msg.files.map((f,i)=><div key={f.id||i} className='file-preview'>{f.isImage||f.type?.startsWith('image/')?<img src={f.data} alt={f.name} className='preview-image'/>:<div className='file-preview-text'>{truncName(f.name||'archivo')}</div>}</div>)}</div>}
                    {msg.sources&&msg.sources.length>0&&<div className='sources-container'><h4 className='sources-title'>Fuentes</h4>{msg.sources.map((s,i)=><a key={i} href={s.url} target='_blank' rel='noopener' className='source-link'>{s.title}</a>)}</div>}
                    {msg.role==='assistant'&&(
                      <div className='message-actions'>
                        <button className={'copy-btn'+(copiedId===msg.id?' copy-btn-active':'')} onClick={()=>copyToClipboard(msg.content,msg.id)}><FontAwesomeIcon icon={copiedId===msg.id?faCheck:faCopy} style={{marginRight:4}}/>{copiedId===msg.id?'Copiado':'Copiar'}</button>
                        {extractHtml(msg.content) && <button className='preview-btn' onClick={()=>openPreview(extractHtml(msg.content))}><FontAwesomeIcon icon={faEye} style={{marginRight:4}}/>Preview</button>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading&&<div className='message-row assistant-message'><div className='assistant-bubble'><div className='typing-indicator'><span className='typing-dot'/><span className='typing-dot'/><span className='typing-dot'/></div></div></div>}
              <div ref={messagesEndRef}/>
            </div>

            {/* HTML Preview Panel */}
            {showPreview && previewHtml && (
              <div className='preview-panel'>
                <div className='preview-panel-header'>
                  <span>Preview</span>
                  <button className='preview-close-btn' onClick={()=>setShowPreview(false)}><FontAwesomeIcon icon={faTimes}/></button>
                </div>
                <iframe ref={iframeRef} className='preview-iframe' title='HTML Preview' sandbox='allow-scripts allow-same-origin'/>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className='input-area'>
            {uploadedFiles.length>0&&<div className='uploaded-files-container'>{uploadedFiles.map(f=><div key={f.id} className='uploaded-file'>{f.isImage?<img src={f.data} alt={f.name} className='uploaded-image'/>:<div className='uploaded-file-name'>{truncName(f.name)}</div>}<button className='remove-file-btn' onClick={()=>removeFile(f.id)}><FontAwesomeIcon icon={faTimes}/></button></div>)}</div>}
            <div className='input-wrapper'>
              <textarea ref={textareaRef} className='textarea' placeholder={mode==='chat'?'Mensaje a Chat IA... (Shift+Enter para nueva linea)':'Escribe o pega tu codigo aqui...'} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} disabled={loading}/>
              <div className='input-actions'>
                <button className='attach-btn' onClick={()=>fileInputRef.current?.click()} disabled={loading} title='Adjuntar archivo o imagen'><FontAwesomeIcon icon={faPaperclip}/></button>
                <input ref={fileInputRef} type='file' multiple onChange={handleFileUpload} style={{display:'none'}} accept='image/*,.pdf,.doc,.docx,.txt,.json,.csv,.js,.jsx,.py,.html,.css'/>
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
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faGlobe, faPlus, faTimes, faCopy, faCheck, faEye, faTrash, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import './OasisChat.css';

const SUPABASE_FN = 'https://lvmeswlvszsmvgaasazs.supabase.co/functions/v1/social-api';

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
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'; } }, [input]);

  // Load conversations from Supabase on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(SUPABASE_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_conversations', user_id: 'default' }) });
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !currentConversationId) {
          const first = data.conversations[0];
          setCurrentConversationId(first.id);
          await loadConversationMessages(first.id);
        }
      }
    } catch (err) { console.error('Error loading conversations:', err); }
    setLoadingHistory(false);
  };

  const loadConversationMessages = async (convId) => {
    try {
      const res = await fetch(SUPABASE_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_conversation', conversation_id: convId }) });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map(m => ({
          id: m.id || Math.random().toString(36).substr(2, 9),
          role: m.role,
          content: m.content,
          sources: m.sources || [],
          files: m.files || [],
          timestamp: m.created_at || new Date().toISOString()
        })));
      }
    } catch (err) { console.error('Error loading messages:', err); }
  };

  const resizeImage = (file) => new Promise((resolve) => { const r = new FileReader(); r.onload = (e) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); let w = img.width, h = img.height; if (w > 800) { h = (h*800)/w; w = 800; } c.width = w; c.height = h; c.getContext('2d').drawImage(img,0,0,w,h); resolve(c.toDataURL(file.type)); }; img.src = e.target.result; }; r.readAsDataURL(file); });

  const handleFileUpload = async (e) => { for (const f of Array.from(e.target.files)) { if (f.type.startsWith('image/')) { const d = await resizeImage(f); setUploadedFiles(p => [...p, { id: Math.random().toString(36).substr(2,9), name: f.name, type: f.type, data: d, isImage: true }]); } else { const r = new FileReader(); r.onload = (ev) => { setUploadedFiles(p => [...p, { id: Math.random().toString(36).substr(2,9), name: f.name, type: f.type, data: ev.target.result, isImage: false }]); }; r.readAsDataURL(f); } } if (fileInputRef.current) fileInputRef.current.value = ''; };
  const removeFile = (id) => setUploadedFiles(p => p.filter(f => f.id !== id));

  const newChat = () => {
    const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    setCurrentConversationId(id);
    setMessages([]);
    setInput('');
    setUploadedFiles([]);
    setPreviewHtml(null);
    setShowPreview(false);
    if (isMobile) setShowChatSidebar(false);
  };

  const selectConversation = async (convId) => {
    setCurrentConversationId(convId);
    setInput('');
    setUploadedFiles([]);
    setPreviewHtml(null);
    setShowPreview(false);
    await loadConversationMessages(convId);
    if (isMobile) setShowChatSidebar(false);
  };

  const deleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await fetch(SUPABASE_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_conversation', conversation_id: convId }) });
      setConversations(p => p.filter(c => c.id !== convId));
      if (currentConversationId === convId) { setCurrentConversationId(null); setMessages([]); }
    } catch (err) { console.error('Error deleting conversation:', err); }
  };

  // Detect HTML in message content for preview
  const extractHtml = (content) => {
    const htmlMatch = content.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) return htmlMatch[1].trim();
    if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
      const start = content.indexOf('<!DOCTYPE html>') !== -1 ? content.indexOf('<!DOCTYPE html>') : content.indexOf('<html');
      const end = content.lastIndexOf('</html>');
      if (end > start) return content.substring(start, end + 7);
    }
    return null;
  };

  const openPreview = (html) => {
    setPreviewHtml(html);
    setShowPreview(true);
    setTimeout(() => {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        doc.open();
        doc.write(html);
        doc.close();
      }
    }, 100);
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;
    const convId = currentConversationId || ('conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    if (!currentConversationId) setCurrentConversationId(convId);

    const userMsg = { id: Math.random().toString(36).substr(2,9), role: 'user', content: input, files: uploadedFiles, timestamp: new Date().toISOString() };
    setMessages(p => [...p, userMsg]); setInput(''); setUploadedFiles([]); setLoading(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(SUPABASE_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat_v2', message: input || 'Process attached files', history,
          files: uploadedFiles.map(f => ({ name: f.name, type: f.type, data: f.data })),
          web_search: webSearch, mode, conversation_id: convId, user_id: 'default'
        })
      });
      const data = await res.json();
      const aiMsg = { id: Math.random().toString(36).substr(2,9), role: 'assistant', content: data.reply || 'Sin respuesta', sources: data.sources || [], timestamp: new Date().toISOString() };
      setMessages(p => [...p, aiMsg]);

      // Refresh conversations list
      const listRes = await fetch(SUPABASE_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_conversations', user_id: 'default' }) });
      const listData = await listRes.json();
      if (listData.conversations) setConversations(listData.conversations);

      // Auto-detect HTML for preview
      const html = extractHtml(data.reply || '');
      if (html) { setPreviewHtml(html); }

    } catch (err) { setMessages(p => [...p, { id: Math.random().toString(36).substr(2,9), role: 'assistant', content: 'Error: ' + err.message, timestamp: new Date().toISOString() }]); } finally { setLoading(false); }
  }, [input, uploadedFiles, messages, webSearch, mode, currentConversationId]);

  const renderMarkdown = (text) => {
    let h = text;
    h = h.replace(/```(\w+)?\n([\s\S]*?)```/g, (m,l,c) => '<pre class="code-block"><code>' + c.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</code></pre>');
    h = h.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    h = h.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    h = h.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    h = h.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/^[*-] (.*?)$/gm, '<li>$1</li>');
    h = h.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
    h = h.replace(/\n\n/g, '</p><p>');
    return '<p>' + h + '</p>';
  };

  const copyToClipboard = (t, id) => { navigator.clipboard.writeText(t); setCopiadoId(id); setTimeout(() => setCopiadoId(null), 2000); };
  const truncName = (n, max=20) => n.length > max ? n.slice(0,max-3)+'...' : n;
  const fmtTime = (ts) => { const d = new Date(ts), dm = Math.floor((new Date()-d)/60000); if (dm<1) return 'ahora'; if (dm<60) return dm+'m'; if (dm<1440) return Math.floor(dm/60)+'h'; return d.toLocaleDateString(); };

  return (
    <div className="oasis-chat-page">
      <Header />
      <HeaderDash />
      <div className="oasis-chat-container">
        {/* Chat History Sidebar */}
        <div className={'oasis-sidebar' + (isMobile && !showChatSidebar ? ' oasis-sidebar-hidden' : '')}>
          <button className='new-chat-btn' onClick={newChat}><FontAwesomeIcon icon={faPlus} style={{marginRight:8}}/> Nuevo Chat</button>
          <div className='conversations-list' style={{flex:1,overflowY:'auto',padding:16}}>
            <h3 className='conversation-title'>Historial</h3>
            {loadingHistory ? <p className='empty-state'>Cargando...</p> :
              conversations.length === 0 ? <p className='empty-state'>Sin conversaciones</p> :
              conversations.map(conv => (
                <button key={conv.id} className={'conversation-item' + (currentConversationId === conv.id ? ' conversation-item-active' : '')} onClick={() => selectConversation(conv.id)}>
                  <span className='conv-text'>{conv.title || 'Nueva conversacion'}</span>
                  <div className='conv-meta'>
                    <span className='conv-time'>{fmtTime(conv.updated_at || conv.created_at)}</span>
                    <button className='conv-delete-btn' onClick={(e) => deleteConversation(e, conv.id)} title='Eliminar'><FontAwesomeIcon icon={faTrash}/></button>
                  </div>
                </button>
              ))
            }
          </div>
        </div>
        {isMobile && showChatSidebar && <div className='oasis-overlay' onClick={() => setShowChatSidebar(false)}/>}

        {/* Main Chat Area */}
        <div className='chat-area' style={{flex:1,display:'flex',flexDirection:'column',backgroundColor:'#fff',overflow:'hidden'}}>
          <div className='chat-header'>
            {isMobile && <button className='mobile-menu-btn' onClick={() => setShowChatSidebar(!showChatSidebar)}><FontAwesomeIcon icon={showChatSidebar ? faChevronLeft : faPlus}/></button>}
            <div className='tabs-container'>
              <button className={'tab'+(mode==='chat'?' tab-active':'')} onClick={()=>setMode('chat')}>Chat</button>
              <button className={'tab'+(mode==='code'?' tab-active':'')} onClick={()=>setMode('code')}>Codigo</button>
            </div>
            <div className='header-right'>
              <button className={'icon-btn'+(webSearch?' icon-btn-active':'')} onClick={()=>setWebSearch(!webSearch)} title='Busqueda Web'><FontAwesomeIcon icon={faGlobe}/></button>
              {previewHtml && <button className={'icon-btn'+(showPreview?' icon-btn-active':'')} onClick={()=>{setShowPreview(!showPreview); if(!showPreview) setTimeout(()=>{if(iframeRef.current){const doc=iframeRef.current.contentDocument;doc.open();doc.write(previewHtml);doc.close();}},100);}} title='Preview HTML'><FontAwesomeIcon icon={faEye}/></button>}
            </div>
          </div>

          <div style={{display:'flex',flex:1,overflow:'hidden'}}>
            {/* Messages */}
            <div className='messages-container' style={{flex:1,overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
              {messages.length===0?(
                <div className='empty-chat' style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:12}}>
                  <h1 className='welcome-title'>Chat IA</h1>
                  <p className='welcome-subtitle'>Powered by Claude Sonnet 4.6 + GPT-4o + Gemini 2.0</p>
                  <p className='welcome-text'>{mode==='chat'?'Escribe algo para comenzar. Activa la busqueda web para consultar internet en tiempo real.':'Comparte tu codigo y te ayudo a mejorarlo, debuggearlo o crearlo desde cero.'}</p>
                </div>
              ):messages.map(msg=>(
                <div key={msg.id} className={'message-row '+(msg.role==='user'?'user-message':'assistant-message')}>
                  <div className={msg.role==='user'?'user-bubble':'assistant-bubble'}>
                    <div className='message-content' dangerouslySetInnerHTML={{__html:renderMarkdown(msg.content)}}/>
                    {msg.files&&msg.files.length>0&&<div className='file-preview-container'>{msg.files.map((f,i)=><div key={f.id||i} className='file-preview'>{f.isImage||f.type?.startsWith('image/')?<img src={f.data} alt={f.name} className='preview-image'/>:<div className='file-preview-text'>{truncName(f.name||'archivo')}</div>}</div>)}</div>}
                    {msg.sources&&msg.sources.length>0&&<div className='sources-container'><h4 className='sources-title'>Fuentes</h4>{msg.sources.map((s,i)=><a key={i} href={s.url} target='_blank' rel='noopener' className='source-link'>{s.title}</a>)}</div>}
                    {msg.role==='assistant'&&(
                      <div className='message-actions'>
                        <button className={'copy-btn'+(copiedId===msg.id?' copy-btn-active':'')} onClick={()=>copyToClipboard(msg.content,msg.id)}><FontAwesomeIcon icon={copiedId===msg.id?faCheck:faCopy} style={{marginRight:4}}/>{copiedId===msg.id?'Copiado':'Copiar'}</button>
                        {extractHtml(msg.content) && <button className='preview-btn' onClick={()=>openPreview(extractHtml(msg.content))}><FontAwesomeIcon icon={faEye} style={{marginRight:4}}/>Preview</button>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading&&<div className='message-row assistant-message'><div className='assistant-bubble'><div className='typing-indicator'><span className='typing-dot'/><span className='typing-dot'/><span className='typing-dot'/></div></div></div>}
              <div ref={messagesEndRef}/>
            </div>

            {/* HTML Preview Panel */}
            {showPreview && previewHtml && (
              <div className='preview-panel'>
                <div className='preview-panel-header'>
                  <span>Preview</span>
                  <button className='preview-close-btn' onClick={()=>setShowPreview(false)}><FontAwesomeIcon icon={faTimes}/></button>
                </div>
                <iframe ref={iframeRef} className='preview-iframe' title='HTML Preview' sandbox='allow-scripts allow-same-origin'/>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className='input-area'>
            {uploadedFiles.length>0&&<div className='uploaded-files-container'>{uploadedFiles.map(f=><div key={f.id} className='uploaded-file'>{f.isImage?<img src={f.data} alt={f.name} className='uploaded-image'/>:<div className='uploaded-file-name'>{truncName(f.name)}</div>}<button className='remove-file-btn' onClick={()=>removeFile(f.id)}><FontAwesomeIcon icon={faTimes}/></button></div>)}</div>}
            <div className='input-wrapper'>
              <textarea ref={textareaRef} className='textarea' placeholder={mode==='chat'?'Mensaje a Chat IA... (Shift+Enter para nueva linea)':'Escribe o pega tu codigo aqui...'} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} disabled={loading}/>
              <div className='input-actions'>
                <button className='attach-btn' onClick={()=>fileInputRef.current?.click()} disabled={loading} title='Adjuntar archivo o imagen'><FontAwesomeIcon icon={faPaperclip}/></button>
                <input ref={fileInputRef} type='file' multiple onChange={handleFileUpload} style={{display:'none'}} accept='image/*,.pdf,.doc,.docx,.txt,.json,.csv,.js,.jsx,.py,.html,.css'/>
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
