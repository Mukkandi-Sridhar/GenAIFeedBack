export function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-16 rounded-xl ${className}`} />;
}

export function SkeletonText({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-4 rounded ${className}`} />;
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-3 rounded w-full" style={{ opacity: 1 - i * 0.08 }} />
        </td>
      ))}
    </tr>
  );
}

export function RosterSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} className="h-20" />
      ))}
    </div>
  );
}
