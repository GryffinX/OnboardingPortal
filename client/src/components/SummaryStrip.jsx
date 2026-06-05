import { workflowStages } from "../constants";

function SummaryStrip({ requests }) {
  const managerPending = requests.filter(
    (request) => request.stage === workflowStages.manager,
  ).length;
  const hodPending = requests.filter(
    (request) => request.stage === workflowStages.hod,
  ).length;
  const hrReview = requests.filter(
    (request) => request.stage === workflowStages.hr,
  ).length;

  return (
    <section className="summary-strip">
      <div className="summary-card">
        <span>Line Manager Queue</span>
        <strong>{managerPending}</strong>
      </div>
      <div className="summary-card">
        <span>HOD Queue</span>
        <strong>{hodPending}</strong>
      </div>
      <div className="summary-card">
        <span>HR Review Queue</span>
        <strong>{hrReview}</strong>
      </div>
    </section>
  );
}

export default SummaryStrip;
