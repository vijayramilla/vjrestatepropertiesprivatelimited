export default function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
        <p className="mt-3 font-sans text-xs uppercase tracking-[0.12em] text-gray-500">Loading</p>
      </div>
    </div>
  );
}
