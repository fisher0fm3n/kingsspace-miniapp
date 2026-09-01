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
      <div className="flex items-center justify-between px-4 py-3">
        <Box w={40} h={40} radius={20} />
        <Box w={42} h={42} radius={21} />
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4">
        {[0, 1].map((i) => (
          <div key={i} className="shrink-0" style={{ width: 300 }}>
            <Box w={300} h={168} />
            <div className="mt-3 flex gap-3">
              <Box w={44} h={44} radius={22} />
              <div className="flex-1">
                <Box w="70%" h={16} radius={999} />
                <div className="mt-2">
                  <Box w="50%" h={12} radius={999} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="mt-6">
          <div className="mb-3 px-4">
            <Box w={170} h={22} radius={999} />
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shrink-0" style={{ width: 260 }}>
                <Box w={260} h={146} />
                <div className="mt-3 flex gap-3">
                  <Box w={36} h={36} radius={18} />
                  <div className="flex-1">
                    <Box w="90%" h={14} radius={999} />
                    <div className="mt-2">
                      <Box w="60%" h={12} radius={999} />
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
