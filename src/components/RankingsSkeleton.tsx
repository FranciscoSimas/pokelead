export function RankingsSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: cards }).map((_, card) => (
        <div key={card} className="card rounded-card p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((s) => (
              <div key={s} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
