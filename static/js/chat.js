document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const quickReplies = document.querySelectorAll('.reply-btn');

    const formatTime = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatAIResponse = (text) => {
        // Simple markdown-like formatting
        return text
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*)/gm, '• $1');
    };

    const showTypingIndicator = () => {
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'message-wrapper bot';
        indicator.innerHTML = `
            <div class="message typing">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        chatBox.appendChild(indicator);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const removeTypingIndicator = () => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    };

    const addMessage = (text, isUser = false, confidence = null) => {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${isUser ? 'user' : 'bot'}`;
        
        let content = `<div class="message">${isUser ? text : formatAIResponse(text)}</div>`;
        
        let infoContent = `<span>${formatTime()}</span>`;
        if (!isUser && confidence !== null) {
            infoContent += `
                <span class="confidence-badge">
                    <i data-lucide="zap" style="width: 10px; height: 10px; margin-right: 4px;"></i>
                    ${(confidence * 100).toFixed(0)}% Match
                </span>
            `;
        }
        
        content += `<div class="message-info">${infoContent}</div>`;

        if (!isUser) {
            content += `
                <div class="feedback-btns">
                    <button class="feedback-btn" onclick="sendFeedback('${text.replace(/'/g, "\\'")}', true)" title="Helpful">
                        <i data-lucide="thumbs-up" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="feedback-btn" onclick="sendFeedback('${text.replace(/'/g, "\\'")}', false)" title="Not helpful">
                        <i data-lucide="thumbs-down" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            `;
        }
        
        wrapper.innerHTML = content;
        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
        
        if (window.lucide) {
            lucide.createIcons();
        }
    };

    const handleSend = async (msg = null) => {
        const message = msg || userInput.value.trim();
        if (!message) return;

        addMessage(message, true);
        userInput.value = '';
        
        showTypingIndicator();

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await res.json();
            removeTypingIndicator();
            addMessage(data.answer, false, data.confidence);
        } catch (err) {
            removeTypingIndicator();
            addMessage("I'm sorry, I'm having trouble connecting to the server. Please try again later.", false);
        }
    };

    // Enhanced Voice Input with Permission Handling
    const VoiceRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceStatus = document.getElementById('voice-status');
    let isListening = false;
    let recognition = null;

    const updateVoiceUI = (state, message = "") => {
        voiceBtn.classList.remove('listening', 'denied', 'unsupported');
        voiceStatus.classList.remove('active', 'warning');
        
        if (state === 'listening') {
            voiceBtn.classList.add('listening');
            voiceStatus.classList.add('active');
            voiceStatus.innerHTML = `<span class="dot" style="background: white; width: 8px; height: 8px;"></span> Listening...`;
            voiceBtn.innerHTML = '<i data-lucide="mic-off" style="width: 1.25rem; height: 1.25rem;"></i>';
        } else if (state === 'denied') {
            voiceBtn.classList.add('denied');
            voiceStatus.classList.add('active', 'warning');
            voiceStatus.innerHTML = `<i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i> Mic Access Denied`;
            voiceBtn.innerHTML = '<i data-lucide="mic-off" style="width: 1.25rem; height: 1.25rem;"></i>';
            voiceBtn.title = message || "Microphone access is blocked. Please enable it in browser settings.";
        } else if (state === 'unsupported') {
            voiceBtn.classList.add('unsupported');
            voiceBtn.title = message || "Voice input not supported in this browser or over insecure connection.";
            voiceBtn.innerHTML = '<i data-lucide="mic" style="width: 1.25rem; height: 1.25rem;"></i>';
        } else {
            voiceBtn.innerHTML = '<i data-lucide="mic" style="width: 1.25rem; height: 1.25rem;"></i>';
            voiceBtn.title = "Voice Input";
        }
        if (window.lucide) lucide.createIcons();
    };

    // Check for Secure Origin (Required for MediaDevices/SpeechRecognition)
    const isSecureOrigin = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (VoiceRecognition && isSecureOrigin) {
        recognition = new VoiceRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            updateVoiceUI('listening');
        };

        recognition.onend = () => {
            isListening = false;
            updateVoiceUI('idle');
        };

        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            userInput.value = transcript;
            handleSend();
        };

        recognition.onerror = (e) => {
            console.error('Speech recognition error:', e.error);
            isListening = false;
            
            if (e.error === 'not-allowed') {
                updateVoiceUI('denied', "Microphone permission was denied. Please check your browser settings and try again.");
                addMessage("I can't hear you because microphone access is blocked. Please enable it in your browser settings to use voice input.", false);
            } else if (e.error === 'no-speech') {
                updateVoiceUI('idle');
                addMessage("I didn't catch that. Could you please try speaking again?", false);
            } else if (e.error === 'network') {
                addMessage("Voice input failed due to a network error. Please check your connection.", false);
                updateVoiceUI('idle');
            } else {
                updateVoiceUI('idle');
            }
        };

        voiceBtn.onclick = () => {
            if (voiceBtn.classList.contains('denied')) {
                // If previously denied, trying again might trigger the browser's permission prompt if they haven't "Always Blocked"
                updateVoiceUI('idle');
            }

            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (err) {
                    console.error("Start error:", err);
                    if (err.name === 'NotAllowedError') {
                        updateVoiceUI('denied');
                    }
                }
            }
        };
    } else {
        const reason = !isSecureOrigin ? "Secure connection (HTTPS) required for voice." : "Browser not supported.";
        updateVoiceUI('unsupported', reason);
        voiceBtn.onclick = () => {
            addMessage(`Voice input is unavailable: ${reason}`, false);
        };
    }

    window.sendFeedback = async (query, isPos) => {
        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, is_positive: isPos })
            });
            // Optional: Show a subtle toast instead of alert
            const btn = event.currentTarget;
            btn.style.color = isPos ? 'var(--success)' : 'var(--danger)';
            btn.disabled = true;
        } catch (err) {
            console.error("Feedback failed", err);
        }
    };

    sendBtn.onclick = () => handleSend();
    userInput.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
    quickReplies.forEach(btn => {
        btn.onclick = () => handleSend(btn.textContent);
    });
});
