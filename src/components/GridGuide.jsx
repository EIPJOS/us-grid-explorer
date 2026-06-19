import { useMemo, useState } from "react";
import { ArrowUpRight, ExternalLink, MessageCircle, Send, Sparkles, X, Zap } from "lucide-react";

const WELCOME = {
  role: "assistant",
  text: "Ask me how the grid works, what a selected facility means, or which view can answer your question. I use the project's sourced context and will say when the data cannot support a claim."
};

export default function GridGuide({
  activeView,
  selectedFeature,
  counts,
  layers,
  onApplyAction
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestions = useMemo(() => guideSuggestions(activeView, selectedFeature), [activeView, selectedFeature]);

  async function askGuide(value = question) {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: "user", text: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/grid-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          history: nextMessages.slice(-6),
          context: { activeView, counts, layers, selectedFeature: compactFeature(selectedFeature) }
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new GuideError(payload.error || `Grid Guide returned ${response.status}`, payload.code);
      setMessages((current) => [...current, {
        role: "assistant",
        text: payload.answer,
        citations: payload.citations,
        action: payload.action,
        followUps: payload.followUps,
        model: payload.model
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "error",
        text: error.code === "missing_openai_api_key"
          ? "Grid Guide is built but not connected yet. Add OPENAI_API_KEY in Vercel Project Settings > Environment Variables."
          : error.message
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`grid-guide ${open ? "open" : ""}`}>
      {!open && (
        <button className="guide-launch" onClick={() => setOpen(true)}>
          <span><Sparkles size={17} /></span>
          <b>Ask Grid Guide</b>
        </button>
      )}

      {open && (
        <section className="guide-panel">
          <header>
            <div><span><Zap size={17} /></span><div><strong>Grid Guide</strong><small>Sourced infrastructure assistant</small></div></div>
            <button onClick={() => setOpen(false)} aria-label="Close Grid Guide"><X size={17} /></button>
          </header>

          <div className="guide-context">
            <span>Viewing: <b>{formatLabel(activeView)}</b></span>
            {selectedFeature && <span>Selected: <b>{selectedFeature.name}</b></span>}
          </div>

          <div className="guide-messages">
            {messages.map((message, index) => (
              <article key={index} className={`guide-message ${message.role}`}>
                <p>{message.text}</p>
                {message.citations?.length > 0 && (
                  <div className="guide-citations">
                    {message.citations.map((citation) => <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer"><ExternalLink size={11} />{citation.label}</a>)}
                  </div>
                )}
                {message.action?.type && message.action.type !== "none" && (
                  <button className="guide-action" onClick={() => onApplyAction(message.action)}>Apply: {actionLabel(message.action)}<ArrowUpRight size={13} /></button>
                )}
                {message.followUps?.length > 0 && (
                  <div className="guide-followups">{message.followUps.map((followUp) => <button key={followUp} onClick={() => askGuide(followUp)}>{followUp}</button>)}</div>
                )}
              </article>
            ))}
            {loading && <article className="guide-message assistant loading"><i></i><i></i><i></i></article>}
          </div>

          {messages.length === 1 && (
            <div className="guide-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => askGuide(suggestion)}>{suggestion}</button>)}</div>
          )}

          <form onSubmit={(event) => { event.preventDefault(); askGuide(); }}>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about the grid..." maxLength={600} rows={2} />
            <button type="submit" disabled={loading || !question.trim()} aria-label="Send question"><Send size={16} /></button>
          </form>
          <footer><MessageCircle size={11} />Answers use current view context and approved sources.</footer>
        </section>
      )}
    </div>
  );
}

function guideSuggestions(activeView, selectedFeature) {
  if (selectedFeature) return [
    `What does ${selectedFeature.name} tell me?`,
    "Which source supports these details?",
    "What nearby grid layer should I inspect?"
  ];
  if (activeView === "signals") return ["Why does hourly demand change?", "What is a balancing authority?", "Which grid regions are shown here?"];
  if (activeView === "analysis") return ["How should I compare two states?", "Why use finalized 2024 data here?", "What does fuel mix measure?"];
  if (activeView === "learn") return ["Which lesson should I start with?", "Explain transmission voltage simply", "Why are data-center loads important?"];
  return ["What am I looking at?", "How does power reach a city?", "Show me the transmission layer"];
}

function actionLabel(action) {
  if (action.type === "show_layer") return `show ${formatLabel(action.target)}`;
  if (action.type === "select_view") return `open ${formatLabel(action.target)}`;
  return "suggestion";
}

function formatLabel(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactFeature(feature) {
  if (!feature) return null;
  const properties = {};
  for (const key of [
    "plantCode", "utilityName", "city", "county", "state", "primaryFuel",
    "operatingCapacityMw", "proposedCapacityMw", "balancingAuthorityName",
    "operator", "status", "voltage", "voltageClass", "owner", "maxVoltage",
    "minVoltage", "lines", "addressType", "postalCode", "score"
  ]) {
    const value = feature.properties?.[key];
    if (["string", "number", "boolean"].includes(typeof value)) properties[key] = value;
  }
  return {
    id: feature.id,
    type: feature.type,
    name: feature.name,
    sourceRef: feature.sourceRef,
    properties
  };
}

class GuideError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
