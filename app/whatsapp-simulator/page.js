'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Phone, FileText, Download, RefreshCw, CheckCheck, Sparkles } from 'lucide-react';

export default function WhatsAppSimulator() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [customPhone, setCustomPhone] = useState('');
  const [useCustomPhone, setUseCustomPhone] = useState(false);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const clientList = await res.json();
        setClients(clientList);
        if (clientList.length > 0) {
          setSelectedClient(clientList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  useEffect(() => {
    if (selectedClient && !useCustomPhone) {
      setChatLog([
        {
          id: Date.now(),
          sender: 'bot',
          text: `👋 Simulated WhatsApp session initialized for *${selectedClient.name}* (${selectedClient.whatsappNumber}).\n\nType your query or click quick action buttons below!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [selectedClient, useCustomPhone]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isTyping]);

  const activePhoneNumber = useCustomPhone ? customPhone : (selectedClient?.whatsappNumber || '');

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || message;
    if (!text.trim()) return;
    if (!activePhoneNumber.trim()) {
      alert('Please select a client or enter a valid phone number to test!');
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: Date.now(), sender: 'user', text: text.trim(), time };

    setChatLog((prev) => [...prev, userMsg]);
    if (!textToSend) setMessage('');
    setLoading(true);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/smart-webhook/test-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fromNumber: activePhoneNumber, message: text.trim() })
      });
      const botResponse = await res.json();

      setTimeout(() => {
        setIsTyping(false);
        setChatLog((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: botResponse.responseText || 'No response received.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unregistered: botResponse.unregistered
          }
        ]);
        setLoading(false);
      }, 500);

    } catch (err) {
      setTimeout(() => {
        setIsTyping(false);
        setChatLog((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: '❌ Connection error to Next.js server.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setLoading(false);
      }, 400);
    }
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      const urlRegex = /(https?:\/\/[^\s]+|\/uploads\/[^\s]+|\/api\/[^\s]+)/gi;
      const parts = line.split(urlRegex);

      return (
        <div key={lineIdx} className="my-0.5">
          {parts.map((part, partIdx) => {
            if (part.match(/^(https?:\/\/[^\s]+|\/uploads\/[^\s]+|\/api\/[^\s]+)$/i)) {
              return (
                <a
                  key={partIdx}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3.5 py-2 rounded-xl font-bold my-1 shadow-sm transition-all"
                >
                  <FileText size={14} />
                  <span>Download Document</span>
                  <Download size={14} />
                </a>
              );
            }

            const boldParts = part.split(/(\*[^*]+\*)/g);
            return (
              <span key={partIdx}>
                {boldParts.map((bp, bpIdx) => {
                  if (bp.startsWith('*') && bp.endsWith('*') && bp.length > 2) {
                    return <strong key={bpIdx}>{bp.slice(1, -1)}</strong>;
                  }
                  return bp;
                })}
              </span>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Liquid Glass Header Banner */}
      <div className="liquid-glass-accent p-6 rounded-3xl flex justify-between items-center shadow-md flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600/10 text-emerald-700 rounded-2xl border border-emerald-500/20 shadow-xs">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">WhatsApp AI Assistant Simulator</h1>
            <p className="text-xs text-slate-600 font-medium">Next.js Webhook Engine & AWS Bedrock NLP Live Testing</p>
          </div>
        </div>
        <div className="bg-emerald-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
          <Sparkles size={14} />
          <span>Bedrock `nova-micro` Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar Liquid Glass */}
        <div className="lg:col-span-4 space-y-6">
          <div className="liquid-glass p-6 rounded-3xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <User size={16} className="text-emerald-700" />
              <span>Select Test Client</span>
            </h3>

            <div className="flex bg-white/60 p-1 rounded-2xl border border-white">
              <button
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${!useCustomPhone ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setUseCustomPhone(false)}
              >
                Registered Client
              </button>
              <button
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${useCustomPhone ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setUseCustomPhone(true)}
              >
                Custom Phone
              </button>
            </div>

            {!useCustomPhone ? (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Select Client:</label>
                {clients.length > 0 ? (
                  <select
                    className="w-full p-3 border border-slate-300/80 rounded-2xl text-xs font-medium bg-white/90 outline-none focus:border-emerald-600 shadow-xs"
                    value={selectedClient?._id || ''}
                    onChange={(e) => setSelectedClient(clients.find(c => c._id === e.target.value))}
                  >
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.whatsappNumber})</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs bg-amber-50/80 text-amber-800 p-3 rounded-2xl border border-amber-200 font-medium">
                    No clients found. Add a client from the Clients tab or test custom number!
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">WhatsApp Phone Number:</label>
                <div className="flex items-center gap-2 border border-slate-300/80 rounded-2xl px-3.5 py-2.5 bg-white/90 shadow-xs">
                  <Phone size={14} className="text-emerald-700" />
                  <input
                    type="text"
                    placeholder="+919876543210"
                    className="w-full text-xs outline-none font-medium text-slate-900"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="liquid-glass p-6 rounded-3xl space-y-3 shadow-sm">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Quick Action Test Chips</h4>
            <div className="flex flex-wrap gap-2">
              {['Hi', 'ITR 2024-25', '27-28', 'GSTR1 March', 'Show my documents', 'Contact CA'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  className="bg-emerald-100/80 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-300 text-xs font-bold px-3.5 py-1.5 rounded-full transition shadow-2xs"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Phone Mockup */}
        <div className="lg:col-span-8">
          <div className="bg-slate-950 p-3 rounded-3xl shadow-2xl">
            <div className="bg-[#efeae2] rounded-2xl h-[560px] flex flex-col overflow-hidden">
              {/* WhatsApp Header */}
              <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-800 rounded-full flex items-center justify-center font-bold text-sm">
                    {selectedClient?.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {useCustomPhone ? (customPhone || 'Simulated Phone') : (selectedClient?.name || 'Client')}
                    </div>
                    <div className="text-[10px] text-emerald-200">
                      {isTyping ? 'typing...' : 'CA Assistant Bot'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setChatLog([])}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                  title="Reset Chat Log"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatLog.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none'
                          : msg.unregistered
                          ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none'
                          : 'bg-white text-slate-900 rounded-tl-none'
                      }`}
                    >
                      {renderFormattedText(msg.text)}
                      <div className="text-[9px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                        <span>{msg.time}</span>
                        {msg.sender === 'user' && <CheckCheck size={12} className="text-sky-500" />}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-xl rounded-tl-none text-xs text-slate-400 animate-pulse">
                      CA Assistant is typing...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Footer */}
              <div className="bg-slate-100 p-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type document query (e.g. ITR 2024-25)..."
                  className="flex-1 bg-white px-4 py-2 rounded-full text-xs outline-none shadow-sm"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  disabled={loading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !message.trim()}
                  className="bg-[#075E54] hover:bg-[#128C7E] text-white p-2.5 rounded-full transition disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
