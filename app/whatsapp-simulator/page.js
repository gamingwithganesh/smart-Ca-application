'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Phone, FileText, Download, CheckCheck, Sparkles } from 'lucide-react';

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

    if (!activePhoneNumber) {
      alert('Please select a client or enter a phone number!');
      return;
    }

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatLog((prev) => [...prev, userMsg]);
    if (!textToSend) setMessage('');
    setLoading(true);
    setIsTyping(true);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/smart-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          From: activePhoneNumber,
          Body: text.trim(),
          fromNumber: activePhoneNumber,
          message: text.trim()
        })
      });

      const data = await res.json();
      const replyText = data.responseText || data.reply || data.body || (data.message && !data.success ? `⚠️ ${data.message}` : 'No response message');

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: replyText,
        mediaUrl: data.mediaUrl || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatLog((prev) => [...prev, botMsg]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `❌ Error connecting to AI Webhook engine: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const formatText = (content) => {
    if (!content) return '';
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(https?:\/\/[^\s]+)/g);
      return (
        <div key={lIdx} className="min-h-[1.2em]">
          {parts.map((part, pIdx) => {
            if (part.match(/^https?:\/\//)) {
              return (
                <a
                  key={pIdx}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline font-bold break-all hover:text-emerald-900"
                >
                  {part}
                </a>
              );
            }
            const boldParts = part.split(/(\*[^*]+\*)/g);
            return (
              <span key={pIdx}>
                {boldParts.map((bp, bpIdx) => {
                  if (bp.startsWith('*') && bp.endsWith('*')) {
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
    <div className="space-y-6 animate-in fade-in duration-300 pb-8">
      {/* Header Banner */}
      <div className="liquid-glass-accent p-5 sm:p-7 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">WhatsApp AI Simulator</h1>
            <p className="text-xs text-slate-600 font-medium">Test client queries & automated AWS Bedrock document dispatch live</p>
          </div>
        </div>
        <div className="bg-slate-900 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
          <Sparkles size={14} />
          <span>Bedrock AI Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="liquid-glass p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <User size={16} className="text-emerald-700" />
              <span>Select Test Client</span>
            </h3>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${!useCustomPhone ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setUseCustomPhone(false)}
              >
                Registered Client
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${useCustomPhone ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setUseCustomPhone(true)}
              >
                Custom Phone
              </button>
            </div>

            {!useCustomPhone ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Select Client:</label>
                {clients.length > 0 ? (
                  <select
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium bg-white outline-none focus:border-slate-900"
                    value={selectedClient?._id || ''}
                    onChange={(e) => setSelectedClient(clients.find(c => c._id === e.target.value))}
                  >
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.whatsappNumber})</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs bg-slate-100 text-slate-700 p-2.5 rounded-xl border border-slate-200 font-medium">
                    No clients found. Add a client from the Clients tab or test custom phone!
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">WhatsApp Phone:</label>
                <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white">
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

          <div className="liquid-glass p-5 rounded-2xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Quick Action Queries</h4>
            <div className="flex flex-wrap gap-1.5">
              {['Hi', 'ITR 2024-25', '27-28', 'GSTR1 March', 'Show my documents', 'Contact CA'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  className="bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-300 text-slate-800 text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right WhatsApp Simulator Chat Box */}
        <div className="lg:col-span-8 flex flex-col h-[580px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Chat Top Header */}
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                CA
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">
                  {useCustomPhone ? (customPhone || 'Unknown Client') : (selectedClient?.name || 'Smart CA Assistant')}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online • AI Ready
                </div>
              </div>
            </div>
            <button
              onClick={() => setChatLog([])}
              className="text-xs text-slate-400 hover:text-white transition px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              Clear
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
            {chatLog.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs shadow-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-none'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{formatText(msg.text)}</div>

                  {msg.mediaUrl && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                      <FileText size={16} className="text-emerald-700" />
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 font-bold underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Download Attached Document</span>
                        <Download size={12} />
                      </a>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                      msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {msg.sender === 'user' && <CheckCheck size={12} />}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2 bg-white rounded-xl border border-slate-200 w-fit">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[10px] font-semibold text-slate-500 ml-1">AI searching vault & preparing reply...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Message Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Type client message (e.g. 'ITR 2024-25')..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition font-medium"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="btn-primary p-2.5 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
