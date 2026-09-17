export function Box({
  w,
  h,
  radius = 8,
  className = "",
}: {
  w: number | string;
  h: number | string;
  radius?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: w, height: h, borderRadius: radius }}
    />
  );
}

export function HomeSkeleton() {
  return (
    <div className="pt-3">
      <div className="flex items-center justify-between px-3 pb-3">
        <Box w={36} h={36} radius={18} />
        <Box w={40} h={40} radius={20} />
      </div>
      {/* Live TV strip */}
      <div className="px-3">
        <Box w={90} h={20} radius={999} />
      </div>
      <div className="no-scrollbar mt-2.5 flex gap-3.5 overflow-hidden px-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex w-[68px] shrink-0 flex-col items-center">
            <Box w={60} h={60} radius={30} />
            <div className="mt-1.5">
              <Box w={48} h={10} radius={999} />
            </div>
          </div>
        ))}
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="mt-7 px-3">
          <Box w={170} h={20} radius={999} />
          <div className="mt-2.5 grid grid-cols-2 gap-x-2.5 gap-y-[18px]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Box w="100%" h={96} />
                <div className="mt-2 flex gap-2">
                  <Box w={28} h={28} radius={14} />
                  <div className="flex-1">
                    <Box w="95%" h={12} radius={999} />
                    <div className="mt-1.5">
                      <Box w="60%" h={10} radius={999} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span
      className="spinner inline-block"
      style={{ width: size, height: size }}
    />
  );
}
