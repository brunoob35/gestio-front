import "./AlertCard.css";

type AlertCardProps = {
  icon: string;
  text: string;
  tag: string;
};

export default function AlertCard({ icon, text, tag }: AlertCardProps) {
  return (
    <article className="alert-card">
      <div className="alert-card__content">
        <img src={icon} alt="" aria-hidden="true" />
        <span>{text}</span>
      </div>

      <span className="alert-card__tag">{tag}</span>
    </article>
  );
}