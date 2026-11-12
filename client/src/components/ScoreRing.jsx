export default function ScoreRing({ value, label, size = 'lg' }) {
  return (
    <div className={`ring ring--${size}`} style={{ '--value': value }} role="img" aria-label={`${label}: ${value} out of 100`}>
      <div className="ring__inner">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
