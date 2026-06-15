import { avatarUrlOf, initialsOf } from '../lib/media';

export function Avatar({
  name,
  url,
  size = 38,
  ring = true,
}: {
  name: string;
  url?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const resolved = avatarUrlOf(url);
  const fontSize = Math.max(11, Math.round(size * 0.34));

  return (
    <span className={`avatar-ring ${ring ? '' : 'plain'}`}>
      <span className="avatar" style={{ width: size, height: size, fontSize }}>
        {resolved ? <img src={resolved} alt={name} /> : initialsOf(name)}
      </span>
    </span>
  );
}
