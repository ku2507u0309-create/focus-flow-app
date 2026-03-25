import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  formatDateStr,
  getJournalEntry,
  saveJournalEntry,
  todayStr,
} from "../../utils/localStorage";
import {
  isAssistantEnabled,
  sendAssistantPrompt,
} from "../../utils/assistant";
import { useAgentStore } from "../../lib/agentStore";

const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:8000/api";

interface JournalProps {
  userId: string;
}

export default function JournalPanel({ userId }: JournalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);

  const token = localStorage.getItem("authToken");
  const dateStr = formatDateStr(selectedDate);
  const isToday = dateStr === todayStr();

  // Load entry when date changes
  useEffect(() => {
    const entry = getJournalEntry(userId, dateStr);
    setContent(entry);
    setDirty(false);
  }, [userId, dateStr]);

  const handleSave = () => {
    saveJournalEntry(userId, dateStr, content);
    setDirty(false);
    toast.success("Journal saved");

    const { speak } = useAgentStore.getState();

    // Track activity via Python backend API
    if (token) {
      fetch(`${API_URL}/track-action?kind=journal&payload=${encodeURIComponent(content.slice(0, 200))}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // ignore tracking failures
      });
    }

    if (isAssistantEnabled()) {
      speak("Reading your journal entry...", "general", 3000);
      void sendAssistantPrompt(
        userId,
        `I just wrote a journal entry for ${dateStr}: ${content.slice(0, 200)}. Please give me a short summary and one suggestion to improve tomorrow. Respond directly with the summary and suggestion as if consoling me or giving me feedback. Keep it under 150 words.`,
      )
        .then((msg) => {
           // Provide consolation based on LLM output
           speak(msg.text.slice(0, 300) + (msg.text.length > 300 ? "..." : ""), "consolation", 8000);
        })
        .catch(() => {
           speak("Your entry is safe! I'm glad you're tracking your days.", "consolation", 4000);
        });
    } else {
      speak("Your entry is safely locked away in your journal.", "consolation", 4000);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const dateLabel = isToday
    ? "Today"
    : selectedDate.toLocaleDateString("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="glass-card-strong p-5">
        <p className="section-overline mb-1">Daily reflection</p>
        <h2 className="section-title mb-4">Journal</h2>

        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => changeDate(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{dateLabel}</p>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => changeDate(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <motion.div
        key={dateStr}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">
            {isToday
              ? "How was your day? What did you accomplish?"
              : `Entry for ${selectedDate.toLocaleDateString("en", { month: "short", day: "numeric" })}`}
          </p>
          <span className="text-xs text-muted-foreground">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>

        <Textarea
          data-ocid="journal.textarea"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          placeholder={
            isToday
              ? "Start writing... What happened today? What are you grateful for? What will you do better tomorrow?"
              : "No entry for this date."
          }
          rows={14}
          className="bg-muted/20 border-border/40 text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <input
            data-ocid="journal.date_input"
            type="date"
            value={dateStr}
            onChange={(e) => {
              const d = new Date(`${e.target.value}T00:00:00`);
              if (!Number.isNaN(d.getTime())) setSelectedDate(d);
            }}
            className="text-xs text-muted-foreground bg-transparent border border-border/30 rounded-lg px-2 py-1 focus:outline-none focus:border-primary/50"
          />

          <Button
            data-ocid="journal.save_button"
            onClick={handleSave}
            className={`gap-2 h-9 ${dirty ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted/30 text-muted-foreground"}`}
          >
            <Save className="w-3.5 h-3.5" />
            {dirty ? "Save" : "Saved"}
          </Button>
        </div>
      </motion.div>

      <p className="text-xs text-center text-muted-foreground">
        Entries are saved locally on this device.
      </p>
    </div>
  );
}
