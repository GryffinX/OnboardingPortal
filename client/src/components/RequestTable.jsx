import { getStageMeta } from "../utils";

function RequestTable({
  title,
  subtitle,
  actorLabel,
  actorValue,
  actorOptions,
  onActorChange,
  searchTerm,
  onSearchChange,
  requests,
  selectedRequestId,
  onSelectRequest,
}) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
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

      <div className="dashboard-toolbar">
        <input
          className="dashboard-search"
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by request ID, employee, department, or status"
        />
      </div>

      <div className="request-table">
        <div className="request-row request-row-header">
          <span>Request Details</span>
          <span>Department</span>
          <span>Submitted</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {requests.length === 0 ? (
          <div className="request-empty">
            No requests match this dashboard view yet.
          </div>
        ) : (
          requests.map((request) => {
            const stageMeta = getStageMeta(request.stage);

            return (
              <div
                key={request.id}
                className={`request-row ${selectedRequestId === request.id ? "request-row-active" : ""}`}
              >
                <div>
                  <strong>{request.formData.name}</strong>
                  <small>{request.requestCode}</small>
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
    </section>
  );
}

export default RequestTable;
