interface SkeletonListProps {
  rows?: number;
  label?: string;
}

export function SkeletonList({ rows = 3, label = 'Loading wishlists' }: SkeletonListProps) {
  return (
    <div className="skeleton-stack" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, idx) => (
        <div key={idx} className="skeleton-card" aria-hidden="true">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}
