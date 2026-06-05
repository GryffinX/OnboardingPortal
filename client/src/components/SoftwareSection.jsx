function SoftwareSection({ title, tone, items, headerLabel }) {
  if (!items || items.length === 0) return null;
  return (
    <section className={`software-card software-card-${tone}`}>
      {headerLabel && <div className="software-card-header">{headerLabel}</div>}
      <div>
        <h4>{title}</h4>
        <p>{items.join(", ")}</p>
      </div>
    </section>
  );
}

export default SoftwareSection;
