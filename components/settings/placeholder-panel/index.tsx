import styles from "./placeholder-panel.module.scss";

interface PlaceholderPanelProps {
  title: string;
  body: string;
}

/**
 * Coming-soon panel for settings sections that aren't wired yet
 * (Preferences, Notifications, Danger zone). Lives at the same
 * visual weight as the real Profile + Payout panels so the
 * sidebar nav doesn't dead-end on a blank page; the body copy
 * just signals "this lives here, just not built yet" so a future
 * contributor knows where to land the feature.
 */
export function PlaceholderPanel({ title, body }: PlaceholderPanelProps) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
      </header>
      <p className={styles.body}>{body}</p>
    </section>
  );
}

export default PlaceholderPanel;
