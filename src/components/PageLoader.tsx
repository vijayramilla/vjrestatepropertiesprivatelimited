export default function PageLoader() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-16 bg-white border-b border-gray-100 flex items-center px-8">
        <div className="w-32 h-6 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="h-8 bg-gray-100 rounded w-1/3 animate-pulse mb-4" />
        <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse mb-8" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
