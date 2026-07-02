import { runDailyFeedBatch } from "./generate-daily-feed-batch.mjs";

const timeZone = process.env.FEED_BATCH_TIMEZONE || "America/New_York";
const targetHour = Number(process.env.FEED_BATCH_HOUR || 6);
const now = new Date();

if (!shouldRunNow(now, timeZone, targetHour) && !process.argv.includes("--force")) {
  const stamp = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    month: "short",
    day: "numeric"
  }).format(now);
  console.log(`Skipping daily feed batch: ${stamp} in ${timeZone} is not ${targetHour}:00.`);
  process.exit(0);
}

const result = await runDailyFeedBatch({ now });
console.log(`Generated ${result.selectedCount} daily briefing draft(s).`);
for (const error of result.errors) console.warn(`${error.source_id}: ${error.message}`);

function shouldRunNow(date, timeZone, targetHour) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false
  });
  return Number(formatter.format(date)) === targetHour;
}
