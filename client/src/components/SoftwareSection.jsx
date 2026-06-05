function SoftwareSection({ title, tone, items, headerLabel, emptyMessage = "", showWhenEmpty = false }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!showWhenEmpty && safeItems.length === 0) return null;

  return (
    <section className={`software-card software-card-${tone}`}>
      {headerLabel && <div className="software-card-header">{headerLabel}</div>}
      <div>
        <h4>{title}</h4>
        <p>{safeItems.length > 0 ? safeItems.join(", ") : emptyMessage}</p>
      </div>
    </section>
  );
}

export default SoftwareSection;
