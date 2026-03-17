import React, { useState, useRef, useEffect } from 'react';
import Header from '../Header/Header';
import HeaderDash from '../../Components/Admin/HeaderDash/HeaderDash';
import './OasisChat.css';

const SUPABASE_SOCIAL_URL = 'https://lvmeswlvszsmvgaasazs.supabase.co/functions/v1/social-api';

export default function OasisChat() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hola, soy Oasis IA. ¿En que puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('auto');
  const [aiEnabled, setAiEnabled] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load AI toggle state
  useEffect(() => {
    fetch(SUPABASE_SOCIAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_config' })
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.config) {
          setAiEnabled(!!data.config.ai_enabled);
          if (data.config.provider) setProvider(data.config.provider);
        }
      })
      .catch(() => {});
  }, []);

  const toggleAI = async (enabled) => {
    setAiEnabled(enabled);
    try {
      await fetch(SUPABASE_SOCIAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_config', ai_enabled: enabled })
      });
    } catch (e) { }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await fetch(SUPABASE_SOCIAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: userMsg,
          history: history,
          provider: provider
        })
      });

      const data = await res.json();
      const reply = data.reply || data.error || 'Sin respuesta';
      setMessages(prev => [...prev, { role: 'ai', text: reply, provider: data.usedProvider }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error de conexion: ' + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text) => {
    const parts = text.split(/(BACKTICK3[\s\S]*?BACKTICK3)/g);
    return parts.map((part, i) => {
      if (part.startsWith('BACKTICK3') && part.endsWith('BACKTICK3')) {
        const code = part.slice(3, -3).replace(/^\w+\n/, '');
        return 
{code}
;
      }
      return {part};
    });
  };

  return (
    

      
      
      

        

          

            
            

              
Oasis IA

              
Asistente inteligente para tu negocio

            

            

              Motor:
               setProvider(e.target.value)}>
                Auto
                Claude
                Gemini
              
            

            

              
                IA Auto-responder
                 toggleAI(e.target.checked)}
                />
              
            

          


          

            {messages.map((msg, i) => (
              

                {msg.role === 'ai' ? formatMessage(msg.text) : msg.text}
                {msg.provider && (
                  

                    via {msg.provider}
                  

                )}
              

            ))}
            {loading && (
              
Pensando...

            )}
            

          


          

             setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            
              ▶
            
          

        

      

    

  );
    }
