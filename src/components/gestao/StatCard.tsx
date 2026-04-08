import "./StatCard.css";

type StatCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: string;
  positive?: boolean;
};

export default function StatCard({
  title,
  value,
  detail,
  icon,
  positive = false,
}: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card__top">
        <h2>{title}</h2>
        <img src={icon} alt="" aria-hidden="true" />
      </div>

      <div className="stat-card__content">
        <strong>{value}</strong>
        <p className={positive ? "is-positive" : ""}>{detail}</p>
      </div>
    </article>
  );
}