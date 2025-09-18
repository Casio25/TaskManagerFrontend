import { useI18n } from '../lib/i18n';

export default function HomePage() {
  const { dictionary } = useI18n();
  return (
    <div className="container">
      <h2>{dictionary.welcome.title}</h2>
      <p>{dictionary.welcome.description}</p>
    </div>
  );
}
