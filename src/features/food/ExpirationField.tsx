export function ExpirationField({
  value,
  source,
  onChange,
}: {
  value: string;
  source?: string;
  onChange: (date: string) => void;
}) {
  return (
    <label>
      Expiration{' '}
      <span className="optional">
        {source ? (source === 'ai' ? 'AI estimate' : 'estimated') : 'optional'}
      </span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      {source && <small className="muted">Estimated reminder · check the package date.</small>}
    </label>
  );
}
