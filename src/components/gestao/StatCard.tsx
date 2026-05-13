import "./StatCard.css";

type StatCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: string;
  tone?: "blue" | "green" | "red" | "yellow";
  detailTone?: "positive" | "negative" | "neutral";
  secondaryDetail?: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
};

export default function StatCard({
  title,
  value,
  detail,
  icon,
  tone = "blue",
  detailTone = "neutral",
  secondaryDetail,
  actionLabel,
  actionIcon,
  onAction,
}: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <h2>{title}</h2>
        <span className={`stat-card__icon-badge stat-card__icon-badge--${tone}`}>
          <img src={icon} alt="" aria-hidden="true" />
        </span>
      </div>

      <div className="stat-card__content">
        <strong>{value}</strong>
        <p className={`stat-card__detail ${detailTone !== "neutral" ? `is-${detailTone}` : ""}`}>{detail}</p>
        {secondaryDetail ? <span className="stat-card__secondary-detail">{secondaryDetail}</span> : null}
      </div>

      {actionLabel && onAction ? (
        <button type="button" className={`stat-card__action stat-card__action--${tone}`} onClick={onAction}>
          {actionIcon ? <img src={actionIcon} alt="" aria-hidden="true" /> : null}
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
