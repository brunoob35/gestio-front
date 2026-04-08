import "./ActivityPanel.css";

type ActivityItem = {
  title: string;
  time: string;
};

type ActivityPanelProps = {
  title: string;
  items: ActivityItem[];
};

export default function ActivityPanel({ title, items }: ActivityPanelProps) {
  return (
    <section className="activity-panel">
      <h2>{title}</h2>

      <div className="activity-panel__list">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="activity-panel__item">
            <strong>{item.title}</strong>
            <span>{item.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}