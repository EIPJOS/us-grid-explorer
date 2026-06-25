import { DATA_CENTER_SOURCE_CATEGORIES } from "../data/dataCenterSources.js";

export default function DataCenterSourceLibrary({ sources }) {
  return (
    <section className="source-library">
      <div className="watch-section-heading">
        <div>
          <p className="eyebrow">Source Library</p>
          <h2>Feeds to connect next</h2>
        </div>
        <span>{sources.length} sources tracked</span>
      </div>
      <div className="source-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Category</th>
              <th>Notes</th>
              <th>Suggested keywords</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.name}>
                <td><a href={source.baseUrl} target="_blank" rel="noreferrer">{source.name}</a></td>
                <td><span className={`source-type ${source.category}`}>{DATA_CENTER_SOURCE_CATEGORIES[source.category] ?? source.category}</span></td>
                <td>{source.notes}</td>
                <td>
                  <div className="source-keywords">
                    {source.suggestedKeywords.slice(0, 6).map((keyword) => <span key={keyword}>{keyword}</span>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
