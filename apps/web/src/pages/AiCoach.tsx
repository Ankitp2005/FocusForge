import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MockupLayout } from '@/components/MockupLayout';
import { env } from '@/lib/env';
import { ChevronLeft, Mic, MicOff, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  isLoading?: boolean;
}

export const AiCoach = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "COACH > I have access to your tasks and habits. Ask me anything — prioritize your day, break down a task, or just tell me what's on your mind. I'm here to help you ship.",
    },
  ]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          sendMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('SPEECH INPUT NOT SUPPORTED ON THIS BROWSER');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition', err);
      }
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isPending) return;

    setIsPending(true);

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text };
    const coachMsgId = `coach-${Date.now()}`;
    const coachMsg: Message = { id: coachMsgId, role: 'assistant', content: '', isLoading: true, toolsUsed: [] };

    setMessages((prev) => [...prev, userMsg, coachMsg]);

    try {
      const token = await getToken();
      const response = await fetch(`${env.VITE_API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: text, conversationId }),
      });

      if (!response.ok) throw new Error('Failed to fetch from coach');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('No reader available');

      let done = false;
      let accumulatedText = '';
      let tools: string[] = [];

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          const lines = chunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') {
                  accumulatedText += data.content;
                  setMessages((prev) => prev.map((m) => m.id === coachMsgId ? { ...m, content: accumulatedText, isLoading: false } : m));
                } else if (data.type === 'tool_call') {
                  tools = [...new Set([...tools, data.tool])];
                  setMessages((prev) => prev.map((m) => m.id === coachMsgId ? { ...m, toolsUsed: tools } : m));
                } else if (data.type === 'done') {
                  if (data.conversationId) setConversationId(data.conversationId);
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (e) {
                // Ignore partial JSON chunks
              }
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => m.id === coachMsgId
        ? { ...m, content: `ERROR > ${err.message || 'Failed to reach AI Coach. Retry.'}`, isLoading: false }
        : m
      ));
    } finally {
      setIsPending(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input;
    setInput('');
    sendMessage(text);
  };

  useEffect(() => {
    const initialPrompt = searchParams.get('prompt');
    if (initialPrompt) {
      setSearchParams({}, { replace: true });
      sendMessage(initialPrompt);
    }
  }, [searchParams]);

  // Full-width chat input form passed to floatingButton layout prop
  const chatInput = (
    <form onSubmit={handleSend} className="flex gap-2 w-full bg-white p-2 border-[2.5px] border-black rounded-[18px] shadow-[4px_4px_0px_#000] items-center">
      <button
        type="button"
        onClick={toggleListening}
        className={`w-10 h-10 border-[2px] border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#000] transition-colors cursor-pointer shrink-0 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
          isListening 
            ? 'bg-[#FF4B55] text-white animate-pulse' 
            : 'bg-[#FAF7F2] text-black hover:bg-[#FFD600] transition-colors'
        }`}
        title={isListening ? 'Stop Voice Input' : 'Use Voice Input'}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isPending}
        className="flex-1 bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2.5 text-xs font-body font-bold focus:outline-none focus:border-[#FFD600] placeholder-black/30"
        placeholder={isListening ? "LISTENING... SPEAK NOW" : "ASK THE COACH..."}
      />
      <button
        type="submit"
        disabled={isPending || !input.trim()}
        className="px-4 py-2.5 bg-[#FFD600] border-[2px] border-black rounded-xl text-xs font-label font-black shadow-[2px_2px_0px_#000] hover:bg-black hover:text-[#FFD600] cursor-pointer shrink-0 disabled:opacity-30 transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none uppercase tracking-wider"
      >
        {isPending ? '...' : 'SEND'}
      </button>
    </form>
  );

  return (
    <MockupLayout activeTab="coach" floatingButton={chatInput}>
      <div className="flex flex-col gap-4 font-body">
        
        {/* Back Link - brutalist pill button */}
        <button 
          onClick={() => navigate('/today')}
          className="self-start flex items-center gap-1.5 text-[10px] font-label font-black uppercase tracking-widest border-[2.5px] border-black bg-white px-3 py-1.5 rounded-full shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to Focus Cockpit</span>
        </button>

        {/* Chat message dialog list */}
        <div className="flex flex-col gap-3 pb-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`border-[2.5px] border-black rounded-[20px] shadow-[3px_3px_0px_#000] ${
                  isUser 
                    ? 'bg-[#0A0A0A] text-white self-end max-w-[85%] p-3.5' 
                    : 'bg-white self-start max-w-[88%] p-3.5'
                } ${msg.isLoading ? 'opacity-60 animate-pulse' : ''}`}
              >
                <span className={`font-label font-black text-[9px] uppercase tracking-widest block mb-1.5 select-none ${
                  isUser ? 'text-white/50' : 'text-[#FF4B55]'
                }`}>
                  {isUser ? 'YOU' : 'AI COACH ⚡'}
                </span>
                <p className={`text-xs leading-relaxed whitespace-pre-wrap font-bold ${
                  isUser ? 'text-white' : 'text-black'
                }`}>
                  {msg.content}
                  {msg.isLoading && <span className="animate-pulse font-mono text-[#FFD600]">▌</span>}
                </p>
                
                {/* Tool Calls inside the bubble */}
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-black/10 flex flex-wrap gap-1.5 select-none">
                    {msg.toolsUsed.map((tool, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const lowerTool = tool.toLowerCase();
                          if (lowerTool.includes('list') || lowerTool.includes('get')) {
                            navigate('/goals');
                          } else {
                            navigate('/today');
                          }
                        }}
                        className="font-label text-[8px] text-black bg-[#FFD600] border-[1.5px] border-black px-2 py-0.5 uppercase rounded tracking-wider cursor-pointer hover:bg-black hover:text-[#FFD600] shadow-[1px_1px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] font-black transition-colors"
                      >
                        ⚙ {tool}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

      </div>
    </MockupLayout>
  );
};
