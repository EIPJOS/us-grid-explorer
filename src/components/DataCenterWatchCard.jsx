import { ExternalLink, MapPin } from "lucide-react";
import { DATA_CENTER_SOURCE_CATEGORIES } from "../data/dataCenterSources.js";

export default function DataCenterWatchCard({ item }) {
  const location = [item.city, item.county ? `${item.county} County` : "", item.state].filter(Boolean).join(", ");
  const detailChips = [
    item.isoRto,
    item.agency,
    item.estimatedPowerDemandMw ? `${item.estimatedPowerDemandMw.toLocaleString()} MW est. demand` : "",
    item.capacityMw ? `${item.capacityMw.toLocaleString()} MW capacity signal` : ""
  ].filter(Boolean);

  return (
    <article className="watch-card">
      <div className="watch-card-top">
        <span className={`source-type ${item.sourceType}`}>{DATA_CENTER_SOURCE_CATEGORIES[item.sourceType] ?? item.sourceType}</span>
        <strong>{item.importanceScore}</strong>
      </div>
      <h2>{item.title}</h2>
      <div className="watch-meta">
        <span>{item.sourceName}</span>
        {item.publishedDate && <time dateTime={item.publishedDate}>{formatDate(item.publishedDate)}</time>}
        {location && <span><MapPin size={13} />{location}</span>}
      </div>
      <p>{item.summary}</p>
      {item.whyItMatters && (
        <div className="watch-takeaway">
          <strong>Why it matters</strong>
          <p>{item.whyItMatters}</p>
        </div>
      )}
      {item.corroboratingSources?.length > 0 && (
        <div className="watch-corroboration">
          <strong>Primary documents</strong>
          {item.corroboratingSources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
              {source.label}<ExternalLink size={11} />
            </a>
          ))}
        </div>
      )}
      {detailChips.length > 0 && (
        <div className="watch-details">
          {detailChips.map((chip) => <span key={chip}>{chip}</span>)}
        </div>
      )}
      <div className="watch-tags">
        {item.tags.map((tag) => <span key={tag}>{formatTag(tag)}</span>)}
      </div>
      <footer>
        <small>Updated {formatDate(item.updatedAt)}</small>
        <a href={item.url} target="_blank" rel="noreferrer">
          Read original <ExternalLink size={13} />
        </a>
      </footer>
    </article>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatTag(tag) {
  return tag.replaceAll("_", " ");
}
