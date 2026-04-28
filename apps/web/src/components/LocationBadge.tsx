export function LocationBadge({
  index,
  title,
  subtitle,
  note,
  meta,
}: {
  index: number;
  title: string;
  subtitle?: string | null;
  note?: string | null;
  meta?: string | null;
}) {
  return (
    <article className="location-badge">
      <div className="location-badge-index">{String(index).padStart(2, '0')}</div>
      <div className="location-badge-body">
        <p className="location-badge-title">{title}</p>
        {subtitle ? <p className="location-badge-subtitle">{subtitle}</p> : null}
        {note ? <p className="location-badge-note">{note}</p> : null}
      </div>
      {meta ? <div className="location-badge-meta">{meta}</div> : null}
    </article>
  );
}
