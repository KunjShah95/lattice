/**
 * The page arriving as a sheet being ruled, not a spinner.
 * The blocks match the homepage's two-column opening so the swap
 * into real type does not jump the header.
 */
export default function Loading() {
  return (
    <div
      className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading this page</span>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12">
        <div className="min-w-0">
          <span className="skeleton block h-2.5 w-28" style={{ "--i": 0 } as React.CSSProperties} />
          <div className="mt-5 space-y-3">
            <span className="skeleton block h-9 w-[92%] rounded-md" style={{ "--i": 1 } as React.CSSProperties} />
            <span className="skeleton block h-9 w-[68%] rounded-md" style={{ "--i": 2 } as React.CSSProperties} />
          </div>
          <div className="mt-6 space-y-2">
            <span className="skeleton block h-3 w-full" style={{ "--i": 3 } as React.CSSProperties} />
            <span className="skeleton block h-3 w-[94%]" style={{ "--i": 4 } as React.CSSProperties} />
            <span className="skeleton block h-3 w-[72%]" style={{ "--i": 5 } as React.CSSProperties} />
          </div>
          <span className="skeleton mt-8 block h-11 w-40 rounded-lg" style={{ "--i": 6 } as React.CSSProperties} />
        </div>
        <div className="crop crop-static rounded-xl p-1.5 shadow-ink [--crop-inset:-7px]" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <span
                className="skeleton h-8 w-[3px] rounded-full"
                style={{ "--i": i } as React.CSSProperties}
              />
              <span
                className="skeleton h-3 w-6"
                style={{ "--i": i } as React.CSSProperties}
              />
              <span
                className="skeleton h-3"
                style={{ width: `${42 + (i % 3) * 14}%`, "--i": i } as React.CSSProperties}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
