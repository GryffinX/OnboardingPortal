import { getStageMeta, matchesSearch } from "../utils";

function RequestTable({
  title,
  subtitle,
  actorLabel,
  actorValue,
  actorOptions,
  onActorChange,
  filterValue,
  filterOptions,
  onFilterChange,
  searchTerm,
  onSearchChange,
  requests,
  selectedRequestId,
  onSelectRequest,
  showSearch = true,
}) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {filterOptions ? (
            <div className="table-filters">
              {filterOptions.map(opt => (
                <button 
                  key={opt.key}
                  className={`filter-tab ${filterValue === opt.key ? "filter-tab-active" : ""}`}
                  onClick={() => onFilterChange(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
          {actorOptions ? (
            <label className="dashboard-actor">
              <span>{actorLabel}</span>
              <select value={actorValue} onChange={(event) => onActorChange(event.target.value)}>
                {actorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      {showSearch ? (
        <div className="dashboard-toolbar">
          <input
            className="dashboard-search"
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by request ID, employee, department, or status"
          />
        </div>
      ) : null}

      <div className="request-table">
        <div className="request-row request-row-header">
          <span>Request Details</span>
          <span>Department</span>
          <span>Submitted</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        <div className="request-rows">
        {requests.length === 0 ? (
          <div className="request-empty">
            No requests match this dashboard view yet.
          </div>
        ) : (
          requests
            .filter((r) => matchesSearch(r, searchTerm || ""))
            .map((request) => {
            const stageMeta = getStageMeta(request.stage);

            return (
              <div
                key={request.id}
                className={`request-row ${selectedRequestId === request.id ? "request-row-active" : ""}`}
              >
                <div>
                  <strong>{request.formData.name}</strong>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {request.employeeCode || "N/A"} | {request.requestCode}
                  </div>
                </div>
                <span>{request.formData.department}</span>
                <span>{request.submittedAt}</span>
                <span className={`status-pill status-pill-${stageMeta.tone}`}>
                  {stageMeta.label}
                </span>
                <button
                  type="button"
                  className="table-action"
                  onClick={() => onSelectRequest(request.id)}
                >
                  View Request
                </button>
              </div>
            );
          })
        )}
        </div>
      </div>
    </section>
  );
}

export default RequestTable;
