import { Path, Buildings, Handshake } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

/**
 * Source-of-listing badge for property cards.
 * - Partner-listed rows carry their partner_type in listed_by
 *   (Owner | Builder | Agent — stamped server-side from the verified
 *   partner record at partner.property.create).
 * - Everything else (admin-created, granted-access, legacy rows)
 *   is VJR Estates own inventory → "Listed by VJR Estate".
 */
const BY_TYPE: { match: string; label: string; Icon: Icon }[] = [
  { match: 'Owner', label: 'Listed by Owner', Icon: Path },
  { match: 'Builder', label: 'Listed by Builder', Icon: Buildings },
  { match: 'Agent', label: 'Listed by Agent', Icon: Handshake },
];

const VJR = { label: 'Listed by VJR Estate', Icon: Path };

export default function ListedByBadge({ listedBy, size = 9 }: { listedBy?: string | null; size?: number }) {
  const entry = BY_TYPE.find((t) => listedBy === t.match) ?? VJR;
  return (
    <span className="inline-flex items-center gap-[3px] text-[8px] font-bold uppercase tracking-[0.06em] text-black">
      <entry.Icon size={size} weight="fill" className="text-black" aria-hidden="true" />
      {entry.label}
    </span>
  );
}
