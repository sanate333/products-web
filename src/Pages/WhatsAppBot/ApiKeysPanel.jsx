import React, { useState, useEffect } from 'react';

const ApiKeysPanel = () => {
  const [keys, setKeys] = useState({
    gemini: '',
    claude: '',
    openai: '',
  });

  const [keyStatus, setKeyStatus] = useState({
    gemini: false,
    claude: false,
    openai: false,
  });

  const [masked, setMasked] = useState({
    gemini: '',
    claude: '',
    openai: '',
  });

  const [loading, setLoading] = useState({
    gemini: false,
    claude: false,
    openai: false,
  });

  const [usage, setUsage] = useState({
    today: 47,
    limit: 250,
    lastSevenDays: [28, 35, 42, 38, 45, 50, 47],
  });

  const [syncStatus, setSyncStatus] = useState('synced');
  const [currentPlan, setCurrentPlan] = useState('free');
  const [showWarning, setShowWarning] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');

  useEffect(() => {
    // Load from localStorage
    const savedGemini = localStorage.getItem('wa_gemini_key') || '';
    const savedClaude = localStorage.getItem('wa_claude_key') || '';
    const savedOpenAI = localStorage.getItem('wa_openai_key') || '';
    const savedBackend = localStorage.getItem('wa_backend_url') || '';

    setKeys({
      gemini: savedGemini,
      claude: savedClaude,
      openai: savedOpenAI,
    });

    setBackendUrl(savedBackend);
    updateMaskedKeys(savedGemini, savedClaude, savedOpenAI);
    checkKeyStatus();
    fetchUsageData(savedBackend);

    // Sync key status from backend
    if (savedBackend) {
      fetch(`${savedBackend}/ai-config`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setKeyStatus({
              gemini: !!data.hasGeminiKey,
              claude: !!data.hasClaudeKey,
              openai: !!data.hasOpenaiKey,
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  // Warning when quota is running low
  useEffect(() => {
    if (usage.today >= usage.limit * 0.8) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [usage.today, usage.limit]);

  const updateMaskedKeys = (gemini, claude, openai) => {
    setMasked({
      gemini: gemini ? `••••${gemini.slice(-4)}` : '',
      claude: claude ? `••••${claude.slice(-4)}` : '',
      openai: openai ? `••••${openai.slice(-4)}` : '',
    });
  };

  const checkKeyStatus = () => {
    const g = localStorage.getItem('wa_gemini_key') || '';
    const c = localStorage.getItem('wa_claude_key') || '';
    const o = localStorage.getItem('wa_openai_key') || '';
    setKeyStatus({
      gemini: g.startsWith('AIza'),
      claude: c.startsWith('sk-ant-'),
      openai: o.startsWith('sk-'),
    });
  };

  const fetchUsageData = async (backend) => {
    if (!backend) return;

    try {
      setSyncStatus('syncing');
      const response = await fetch(`${backend}/ai-usage`);
      if (response.ok) {
        const data = await response.json();
        setUsage({
          today: data.today || 47,
          limit: data.limit || 250,
          lastSevenDays: data.lastSevenDays || [28, 35, 42, 38, 45, 50, 47],
        });
        setSyncStatus('synced');
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
      setSyncStatus('error');
    }
  };

  const handleKeyChange = (provider, value) => {
    const newKeys = { ...keys, [provider]: value };
    setKeys(newKeys);
  };

  const handleSaveKey = async (provider) => {
    if (!backendUrl) {
      alert('Backend URL no configurado');
      return;
    }

    setLoading({ ...loading, [provider]: true });

    try {
      // Save to localStorage
      localStorage.setItem(`wa_${provider}_key`, keys[provider]);
      updateMaskedKeys(keys.gemini, keys.claude, keys.openai);

      // Build config payload matching backend format
      const payload = {
        enabled: true,
        geminiKey: keys.gemini || localStorage.getItem('wa_gemini_key') || '',
        claudeKey: keys.claude || localStorage.getItem('wa_claude_key') || '',
        openaiKey: keys.openai || localStorage.getItem('wa_openai_key') || '',
      };

      // Send to backend /ai-config endpoint
      const response = await fetch(`${backendUrl}/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setKeyStatus({
          gemini: !!data.hasGeminiKey,
          claude: !!data.hasClaudeKey,
          openai: !!data.hasOpenaiKey,
        });
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error('Error saving key:', error);
      setSyncStatus('error');
    } finally {
      setLoading({ ...loading, [provider]: false });
    }
  };

  const handlePlanToggle = () => {
    setCurrentPlan(currentPlan === 'free' ? 'paid' : 'free');
  };

  const progressPercentage = (usage.today / usage.limit) * 100;
  const maxBarHeight = 40;

  const containerStyle = {
    width: '100%',
    maxWidth: '430px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#ffffff',
  };

  const headerStyle = {
    marginBottom: '28px',
    paddingTop: '12px',
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '4px',
    letterSpacing: '-0.5px',
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#8b92a9',
    fontWeight: '400',
  };

  const warningBannerStyle = {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderLeft: '4px solid #ffc107',
    padding: '12px 14px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: showWarning ? 'block' : 'none',
  };

  const warningTextStyle = {
    fontSize: '13px',
    color: '#ffc107',
    fontWeight: '500',
    margin: '0 0 8px 0',
  };

  const warningButtonStyle = {
    backgroundColor: '#ffc107',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const sectionCardStyle = {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid rgba(0, 212, 170, 0.1)',
  };

  const keyItemStyle = {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  };

  const keyItemLastStyle = {
    marginBottom: '0',
    paddingBottom: '0',
    borderBottom: 'none',
  };

  const labelContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#00d4aa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const labelWithBadgeStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const badgeStyle = {
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    color: '#00d4aa',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
  };

  const statusIndicatorStyle = (isActive) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#00d4aa' : '#ff4444',
    display: 'inline-block',
  });

  const inputContainerStyle = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  };

  const inputStyle = {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(0, 212, 170, 0.2)',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#ffffff',
    fontFamily: 'Menlo, Monaco, monospace',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  const inputFocusStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(0, 212, 170, 0.5)',
    boxShadow: '0 0 0 3px rgba(0, 212, 170, 0.1)',
  };

  const saveButtonStyle = {
    backgroundColor: '#00d4aa',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '60px',
  };

  const saveButtonHoverStyle = {
    backgroundColor: '#00e6bc',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 212, 170, 0.3)',
  };

  const saveButtonLoadingStyle = {
    opacity: 0.6,
    cursor: 'not-allowed',
  };

  const usageChartStyle = {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '60px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  };

  const barStyle = (index) => {
    const maxValue = Math.max(...usage.lastSevenDays);
    const height = (usage.lastSevenDays[index] / maxValue) * maxBarHeight;
    return {
      width: '8px',
      height: `${height}px`,
      backgroundColor: '#00d4aa',
      borderRadius: '4px 4px 0 0',
      transition: 'all 0.3s ease',
      opacity: index === 6 ? 1 : 0.6,
    };
  };

  const usageContentStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  };

  const circleContainerStyle = {
    position: 'relative',
    width: '80px',
    height: '80px',
    flexShrink: 0,
  };

  const circleSvgStyle = {
    width: '100%',
    height: '100%',
    transform: 'rotate(-90deg)',
  };

  const usageTextContainerStyle = {
    flex: 1,
  };

  const usageNumberStyle = {
    fontSize: '20px',
    fontWeight: '700',
    color: '#00d4aa',
    marginBottom: '4px',
  };

  const usageLabelStyle = {
    fontSize: '13px',
    color: '#8b92a9',
    marginBottom: '12px',
  };

  const syncIndicatorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: syncStatus === 'synced' ? '#00d4aa' : syncStatus === 'syncing' ? '#ffc107' : '#ff4444',
    fontWeight: '500',
  };

  const syncDotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: syncStatus === 'synced' ? '#00d4aa' : syncStatus === 'syncing' ? '#ffc107' : '#ff4444',
    animation: syncStatus === 'syncing' ? 'pulse 1.5s infinite' : 'none',
  };

  const planSectionStyle = {
    ...sectionCardStyle,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '14px',
    paddingBottom: '14px',
  };

  const planInfoStyle = {
    flex: 1,
  };

  const planLabelStyle = {
    fontSize: '13px',
    color: '#8b92a9',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const planNameStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: currentPlan === 'free' ? '#00d4aa' : '#ffc107',
  };

  const toggleStyle = {
    position: 'relative',
    width: '50px',
    height: '28px',
    backgroundColor: currentPlan === 'free' ? 'rgba(0, 212, 170, 0.2)' : 'rgba(255, 193, 7, 0.2)',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: `1px solid ${currentPlan === 'free' ? 'rgba(0, 212, 170, 0.4)' : 'rgba(255, 193, 7, 0.4)'}`,
  };

  const toggleButtonStyle = {
    position: 'absolute',
    top: '2px',
    left: currentPlan === 'free' ? '2px' : '26px',
    width: '24px',
    height: '24px',
    backgroundColor: currentPlan === 'free' ? '#00d4aa' : '#ffc107',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      <div style={headerStyle}>
        <div style={titleStyle}>Configuración API</div>
        <div style={subtitleStyle}>Gestiona tus claves de IA</div>
      </div>

      {showWarning && (
        <div style={warningBannerStyle}>
          <div style={warningTextStyle}>⚠️ Límite de cuota cercano</div>
          <p style={{ fontSize: '12px', color: '#8b92a9', margin: '4px 0' }}>
            Has utilizado el 75% de tu límite diario gratuito. Considera actualizar tu plan.
          </p>
          <button
            style={warningButtonStyle}
            onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            Actualizar Plan
          </button>
        </div>
      )}

      {/* API Keys Section */}
      <div style={sectionCardStyle}>
        <div style={{ marginBottom: '4px' }}>
          <div style={{ fontSize: '12px', color: '#8b92a9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Claves API
          </div>
        </div>

        {/* Gemini Key */}
        <div style={keyItemStyle}>
          <div style={labelContainerStyle}>
            <div style={labelWithBadgeStyle}>
              <span style={labelStyle}>Gemini</span>
              <span style={badgeStyle}>Free</span>
            </div>
            <div style={statusIndicatorStyle(keyStatus.gemini)} />
          </div>
          <div style={inputContainerStyle}>
            <input
              type="password"
              placeholder="Ingresa tu clave API"
              value={keys.gemini}
              onChange={(e) => handleKeyChange('gemini', e.target.value)}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => (e.target.style.boxShadow = 'none')}
            />
            <button
              onClick={() => handleSaveKey('gemini')}
              disabled={loading.gemini}
              style={{
                ...saveButtonStyle,
                ...(loading.gemini ? saveButtonLoadingStyle : {}),
              }}
              onMouseEnter={(e) => !loading.gemini && Object.assign(e.target.style, saveButtonHoverStyle)}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#00d4aa';
                e.target.style.transform = 'none';
                e.target.style.boxShadow = 'none';
              }}
            >
              {loading.gemini ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Claude Key */}
        <div style={keyItemStyle}>
          <div style={labelContainerStyle}>
            <span style={labelStyle}>Claude</span>
            <div style={statusIndicatorStyle(keyStatus.claude)} />
          </div>
          <div style={inputContainerStyle}>
            <input
              type="password"
              placeholder="Ingresa tu clave API"
              value={keys.claude}
              onChange={(e) => handleKeyChange('claude', e.target.value)}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => (e.target.style.boxShadow = 'none')}
            />
            <button
              onClick={() => handleSaveKey('claude')}
              disabled={loading.claude}
              style={{
                ...saveButtonStyle,
                ...(loading.claude ? saveButtonLoadingStyle : {}),
              }}
              onMouseEnter={(e) => !loading.claude && Object.assign(e.target.style, saveButtonHoverStyle)}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#00d4aa';
                e.target.style.transform = 'none';
                e.target.style.boxShadow = 'none';
              }}
            >
              {loading.claude ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* OpenAI Key */}
        <div style={keyItemLastStyle}>
          <div style={labelContainerStyle}>
            <span style={labelStyle}>OpenAI</span>
            <div style={statusIndicatorStyle(keyStatus.openai)} />
          </div>
          <div style={inputContainerStyle}>
            <input
              type="password"
              placeholder="Ingresa tu clave API"
              value={keys.openai}
              onChange={(e) => handleKeyChange('openai', e.target.value)}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => (e.target.style.boxShadow = 'none')}
            />
            <button
              onClick={() => handleSaveKey('openai')}
              disabled={loading.openai}
              style={{
                ...saveButtonStyle,
                ...(loading.openai ? saveButtonLoadingStyle : {}),
              }}
              onMouseEnter={(e) => !loading.openai && Object.assign(e.target.style, saveButtonHoverStyle)}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#00d4aa';
                e.target.style.transform = 'none';
                e.target.style.boxShadow = 'none';
              }}
            >
              {loading.openai ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Usage Today Section */}
      <div style={sectionCardStyle}>
        <div style={{ fontSize: '12px', color: '#8b92a9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
          Uso Hoy
        </div>

        {/* Bar Chart */}
        <div style={usageChartStyle}>
          {usage.lastSevenDays.map((value, index) => (
            <div key={index} style={barStyle(index)} />
          ))}
        </div>

        {/* Usage Ring + Number */}
        <div style={usageContentStyle}>
          <div style={circleContainerStyle}>
            <svg viewBox="0 0 36 36" style={circleSvgStyle}>
              {/* Background circle */}
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" />
              {/* Progress circle */}
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#00d4aa"
                strokeWidth="2"
                strokeDasharray={`${(progressPercentage / 100) * 97.38} 97.38`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            </svg>
          </div>
          <div style={usageTextContainerStyle}>
            <div style={usageNumberStyle}>{usage.today} / {usage.limit}</div>
            <div style={usageLabelStyle}>mensajes hoy</div>
            <div style={syncIndicatorStyle}>
              <div style={syncDotStyle} />
              <span>
                {syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Error de sincronización'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Section */}
      <div style={planSectionStyle}>
        <div style={planInfoStyle}>
          <div style={planLabelStyle}>Plan Actual</div>
          <div style={planNameStyle}>{currentPlan === 'free' ? 'Gratuito' : 'Premium'}</div>
        </div>
        <div
          style={toggleStyle}
          onClick={handlePlanToggle}
          onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.target.style.opacity = '1')}
        >
          <div style={toggleButtonStyle} />
        </div>
      </div>
    </div>
  );
};

export default ApiKeysPanel;
