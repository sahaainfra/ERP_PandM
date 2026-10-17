import { useState, useRef, useEffect } from 'react';
import { Send, Search, Hash, Users, Plus, Paperclip, Smile, Phone, Video, MoreVertical } from 'lucide-react';
import { chatChannels, chatMessages as initialMessages } from '../data/mockData';
import { ChatMessage } from '../types';

export default function TeamChat() {
  const [selectedChannel, setSelectedChannel] = useState('1');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages.filter(m => m.channelId === '1'));
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages.filter(m => m.channelId === selectedChannel));
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId: selectedChannel,
      senderId: 'u1',
      senderName: 'Site Manager',
      senderAvatar: 'SM',
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text',
      readBy: ['u1'],
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const filteredChannels = chatChannels.filter(ch =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentChannel = chatChannels.find(ch => ch.id === selectedChannel);

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Channel List */}
      <div className="w-72 border-r border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                selectedChannel === channel.id ? 'bg-amber-50 border-l-2 border-l-amber-500' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                channel.type === 'direct' ? 'bg-blue-100 text-blue-700' :
                channel.type === 'project' ? 'bg-purple-100 text-purple-700' :
                channel.type === 'plant' ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {channel.type === 'direct' ? (
                  <span className="text-xs font-bold">{channel.name.split(' ').map(n => n[0]).join('')}</span>
                ) : (
                  <Hash size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">{channel.name}</p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{channel.lastMessageTime}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{channel.lastMessage}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Users size={10} /> {channel.members}
                  </span>
                  {channel.unread > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                      {channel.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
            <Plus size={14} /> New Conversation
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              currentChannel?.type === 'direct' ? 'bg-blue-100 text-blue-700' :
              currentChannel?.type === 'project' ? 'bg-purple-100 text-purple-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {currentChannel?.type === 'direct' ? (
                <span className="text-xs font-bold">{currentChannel?.name.split(' ').map(n => n[0]).join('')}</span>
              ) : (
                <Hash size={16} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{currentChannel?.name}</h3>
              <p className="text-xs text-gray-500">{currentChannel?.members} members • {currentChannel?.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg"><Phone size={16} className="text-gray-500" /></button>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><Video size={16} className="text-gray-500" /></button>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical size={16} className="text-gray-500" /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => {
            const isOwn = msg.senderId === 'u1';
            const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {showAvatar ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isOwn ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {msg.senderAvatar}
                  </div>
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {showAvatar && (
                    <span className={`text-xs font-medium mb-1 ${isOwn ? 'text-right text-amber-700' : 'text-gray-700'}`}>
                      {msg.senderName}
                    </span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-amber-500 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'text-right' : ''}`}>
                    {formatTime(msg.timestamp)}
                    {isOwn && msg.readBy.length > 1 && ' ✓✓'}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg"><Paperclip size={18} className="text-gray-500" /></button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2">
                <Smile size={18} className="text-gray-400" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="p-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            ⚠️ Demo mode — messages are not persisted. E2E encryption will be added in Part 11.
          </p>
        </div>
      </div>
    </div>
  );
}
