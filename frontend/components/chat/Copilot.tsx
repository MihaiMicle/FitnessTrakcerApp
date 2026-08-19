"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

interface CopilotProps {
  selectedDate: string;
  onUpdateSuccess: () => void;
  onAddMeal: (payload: any) => Promise<any>;
}

export default function Copilot({ selectedDate, onUpdateSuccess, onAddMeal }: CopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/copilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ message: userMsg.text }),
      });

      const aiData = await res.json();
      
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "ai", message: `Backend Error: ${aiData.detail || "Check FastAPI terminal"}` }]);
        return;
      }

      let parsedData = aiData;
      if (typeof aiData === 'string') {
          try {
              parsedData = JSON.parse(aiData.replace(/```json/g, "").replace(/```/g, "").trim());
          } catch (e) {
              parsedData = { message: aiData, action: null };
          }
      }

      setMessages((prev) => [...prev, { role: "ai", ...parsedData }]);
    } catch (err) {
      toast.error("Copilot disconnected.");
      setMessages((prev) => [...prev, { role: "ai", message: "Network error: Could not reach the backend." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: any) => {
    toast.loading("Executing AI action...", { id: "action" });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      if (action.type === "UPDATE_GOALS" || action.type === "UPDATE_PROFILE") {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(action.payload),
        });
        
        if (!res.ok) throw new Error("Failed to update profile");
        
        toast.success(action.type === "UPDATE_GOALS" ? "Goals Updated!" : "Profile Updated!", { id: "action" });
        onUpdateSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error("Action failed", { id: "action" });
    }
  };

  const handleLogSuggestedMeal = async (meal: any) => {
    toast.loading(`Logging ${meal.title}...`, { id: "logMeal" });
    try {
      for (const food of meal.foods) {
        await onAddMeal({ 
          ...food, 
          meal_type: meal.meal_type || "lunch", 
          date: selectedDate 
        });
      }
      toast.success(`${meal.title} logged to diary!`, { id: "logMeal" });
    } catch (error) {
      toast.error("Failed to log meal", { id: "logMeal" });
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 rounded-full shadow-[0_0_20px_rgba(5,150,105,0.4)] flex items-center justify-center font-bold z-40 hover:bg-emerald-500 transition-all hover:scale-105"
      >
        ✨
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[90vw] sm:w-[500px] md:w-[600px] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 flex flex-col h-[70vh] sm:h-[600px] animate-in slide-in-from-bottom-5">
          <div className="p-4 border-b border-neutral-800 flex justify-between items-center font-mono text-sm text-emerald-400 font-bold bg-neutral-950 rounded-t-xl">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              FITNESS COPILOT
            </span>
            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white px-2">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {messages.length === 0 && (
              <p className="text-sm text-neutral-500 font-mono text-center mt-4">
                Ask me to estimate your body fat, adjust your bulking macros, or suggest a meal!
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}> 
                <div className={`p-3 rounded-xl text-sm max-w-[90%] shadow-sm leading-relaxed ${m.role === "user" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-200 border border-neutral-700"}`}>
                  <ReactMarkdown 
                    components={{
                      strong: ({node, ...props}) => <strong className="font-bold text-emerald-400" {...props}/>,
                      em: ({node, ...props}) => <em className="italic text-emerald-300" {...props}/>,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2" {...props}/>,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1 my-2" {...props}/>,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props}/>
                    }}
                  >
                    {m.text || m.message}
                  </ReactMarkdown>
                </div>
                
                {/* Actionable Profile/Goal UI */}
                {m.action && (
                  <div className="mt-2 bg-neutral-950 border border-emerald-500/30 p-3 rounded-lg w-full max-w-[90%] shadow-md">
                    <p className="text-[10px] font-mono text-emerald-500/80 mb-2 uppercase tracking-wider">Suggested Action: {m.action.type}</p>
                    <pre className="text-[10px] text-neutral-300 bg-black border border-neutral-800 p-2 rounded mb-3 overflow-x-auto custom-scrollbar">
                      {JSON.stringify(m.action.payload, null, 2)}
                    </pre>
                    <button 
                      onClick={() => handleAction(m.action)}
                      className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/50 rounded-lg text-xs font-bold text-emerald-400 hover:text-white transition-all active:scale-95"
                    >
                      Accept & Apply
                    </button>
                  </div>
                )}

                {/* Meal Suggestions Cards */}
                {m.suggested_meals && m.suggested_meals.length > 0 && (
                  <div className="mt-3 w-full max-w-[90%] space-y-3">
                    {m.suggested_meals.map((meal: any, idx: number) => (
                      <div key={idx} className="bg-neutral-950 border border-neutral-700 p-4 rounded-xl shadow-md">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-emerald-400 text-sm">{meal.title}</h4>
                          <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono uppercase">{meal.meal_type}</span>
                        </div>
                        
                        <ul className="text-xs text-neutral-300 mb-4 space-y-1.5 font-mono">
                          {meal.foods.map((food: any, fIdx: number) => (
                            <li key={fIdx} className="flex justify-between border-b border-neutral-800/50 pb-1">
                              <span>• {food.serving_size}{food.serving_unit} {food.food_name}</span>
                              <span className="text-neutral-500">{food.calories} kcal</span>
                            </li>
                          ))}
                        </ul>

                        <button 
                          onClick={() => handleLogSuggestedMeal(meal)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span>+</span> Log this Meal to Diary
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            ))}
            {loading && <div className="text-xs text-emerald-500/70 font-mono animate-pulse flex gap-1 items-center">
              <span>●</span><span>●</span><span>●</span>
            </div>}
          </div>

          <div className="p-4 border-t border-neutral-800 bg-neutral-950 rounded-b-xl">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="e.g. Give me 3 high-protein breakfast options..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
        </div>
      )}
    </>
  );
}