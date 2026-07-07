import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { trackEvent } from "../lib/analytics.js";

/**
 * Weekly-digest email capture. Posts to /api/subscribe, which stores the
 * address with the email provider. Deliberately compact so it can sit inside
 * the Feeds header without dominating the page.
 */
export default function DigestSignup({ compact = false }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [botField, setBotField] = useState(""); // honeypot

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, company: botField })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Something went wrong. Please try again.");
      trackEvent("Digest Subscribed");
      setStatus("success");
      setMessage(payload.message || "You're in. Watch for the next weekly briefing.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className={`digest-signup is-success${compact ? " compact" : ""}`}>
        <div className="digest-signup-done">
          <span className="digest-check"><Check size={16} /></span>
          <div>
            <strong>Subscribed</strong>
            <p>{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`digest-signup${compact ? " compact" : ""}`}>
      <div className="digest-copy">
        <p className="eyebrow"><Mail size={13} /> Weekly briefing</p>
        <h3>Get the week's grid &amp; data-center intelligence</h3>
        <p>One email every week — the developments that move U.S. power demand, siting, and utility planning. Free, no spam, unsubscribe anytime.</p>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <label className="digest-hp" aria-hidden="true">
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={botField}
            onChange={(event) => setBotField(event.target.value)}
          />
        </label>
        <div className="digest-field">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-label="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={status === "loading"}
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? <><Loader2 size={15} className="spin" /> Joining</> : "Subscribe"}
          </button>
        </div>
        {status === "error" && <p className="digest-error" role="alert">{message}</p>}
      </form>
    </div>
  );
}
