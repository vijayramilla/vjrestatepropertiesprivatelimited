export default function MapLoadingSkeleton() {
  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] w-full flex-col items-center justify-center overflow-hidden bg-gray-900 md:h-[calc(100vh-4rem)]">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(circle at 30% 40%, #1a3a1a 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, #1a2a3a 0%, transparent 50%),
            #0a1a0a
          `,
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-green-500/30 border-t-green-500" />
        <div className="text-center">
          <p className="text-lg font-bold text-white">VJR Land Map</p>
          <p className="mt-1 text-center font-mono text-xs tracking-widest text-green-400">
            LOADING BANGALORE...
          </p>
        </div>
      </div>
    </div>
  );
}
