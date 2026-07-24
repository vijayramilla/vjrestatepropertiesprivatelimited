import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import NorthDial from '@/components/vastu/NorthDial';
import { analyzeFloorPlan, type ApiResponse } from '@/lib/vastuAnalysis';

const severityIcon: Record<string, any> = {
  none: CheckCircle,
  minor: AlertTriangle,
  major: AlertTriangle,
  critical: XCircle,
};
const severityColor: Record<string, string> = {
  none: 'text-emerald-600',
  minor: 'text-amber-600',
  major: 'text-orange-600',
  critical: 'text-red-600',
};

export default function FileUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [northDegrees, setNorthDegrees] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles(prev => [...prev, ...Array.from(fileList)]);
    setResult(null);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
  }, []);

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (updated.length === 0) setResult(null);
  };

  const handleAnalyze = async () => {
    if (!files[0]) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await analyzeFloorPlan(files[0], northDegrees);
      setResult(res);
      console.log('[Vastu] Extraction:', res.extraction);
      console.log('[Vastu] Analysis:', res.analysis);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-600';

  const scoreBg = (s: number) =>
    s >= 80 ? 'bg-emerald-100' : s >= 60 ? 'bg-amber-100' : 'bg-red-100';

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl shadow-xl border border-amber-200 bg-white overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-serif">Upload Floor Plan</h2>
              <p className="text-sm text-gray-500">Upload your home's floor plan for Vastu analysis</p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="flex gap-3 mb-6">
              <div className="flex-1 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-xl font-bold text-gray-900">{files.length}</div>
                <div className="text-xs text-gray-500">Files Uploaded</div>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-xl font-bold text-gray-900">{formatSize(files.reduce((t, f) => t + f.size, 0))}</div>
                <div className="text-xs text-gray-500">Total Size</div>
              </div>
              <button
                onClick={() => { setFiles([]); setResult(null); }}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-amber-500 bg-amber-50'
                : 'border-amber-200 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50/50'
            }`}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              type="file"
              ref={inputRef}
              onChange={e => handleFileSelect(e.target.files)}
              multiple
              className="hidden"
              accept="image/*,.pdf"
            />
            <div className={`w-16 h-16 mx-auto mb-6 p-4 rounded-full ${isDragOver ? 'bg-amber-500' : 'bg-amber-300'} transition-colors`}>
              <Upload className="w-full h-full text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isDragOver ? 'Drop your files here!' : 'Upload your floor plan'}
            </h3>
            <p className="text-gray-500 mb-6">
              {isDragOver ? 'Release to upload' : 'Drag & drop your floor plan here, or click to browse'}
            </p>
            <button
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all font-semibold shadow-lg"
            >
              Choose Files
            </button>
            <p className="mt-4 text-xs text-gray-400">Supports JPG, PNG, PDF • Max 10MB per file</p>
          </div>

          {files.length > 0 && (
            <div className="mt-8">
              <h4 className="font-semibold text-gray-900 mb-4">Uploaded Files ({files.length})</h4>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50/30">
                    <Image className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{f.name}</p>
                      <p className="text-sm text-gray-500">{formatSize(f.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {!result && !analyzing && (
                <div className="mt-6 flex flex-col items-center gap-6 p-6 rounded-xl bg-amber-50/50 border border-amber-200">
                  <p className="text-sm font-medium text-gray-700">Set the north direction of your floor plan</p>
                  <NorthDial value={northDegrees} onChange={setNorthDegrees} />
                  <button
                    onClick={handleAnalyze}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg"
                  >
                    Analyze My Home Now
                  </button>
                </div>
              )}

              {analyzing && (
                <div className="mt-6 flex flex-col items-center gap-4 py-10">
                  <Loader2 className="w-10 h-10 text-[#EA580C] animate-spin" />
                  <p className="text-sm text-gray-500">Analyzing your floor plan...</p>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                  <button onClick={handleAnalyze} className="ml-3 underline font-medium">Retry</button>
                </div>
              )}

              {result && (
                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className={`text-3xl font-bold ${scoreColor(result.analysis.overallScore)}`}>
                      {result.analysis.overallScore}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Overall Vastu Score</p>
                      <p className="text-xs text-gray-500 capitalize">Confidence: {(result.analysis.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <h4 className="text-sm font-semibold text-gray-900">Room Analysis</h4>
                    {result.analysis.roomVerdicts.map((room, i) => {
                      const Icon = severityIcon[room.severity] || AlertTriangle;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white">
                          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${severityColor[room.severity]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">{room.roomLabel}</span>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                room.verdict === 'good' ? 'bg-emerald-100 text-emerald-700' :
                                room.verdict === 'acceptable' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>{room.severity !== 'none' ? room.severity : 'good'}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Zone: {room.zone} | Type: {room.roomType}
                            </p>
                            {room.reason && (
                              <p className="text-xs text-gray-400 mt-1">{room.reason}</p>
                            )}
                            {room.remedy && (
                              <p className="text-xs text-[#EA580C] mt-1">{room.remedy}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
                    <CheckCircle className={`w-5 h-5 shrink-0 ${result.analysis.brahmasthan.status === 'open' ? 'text-emerald-600' : 'text-red-600'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Brahmasthan: {result.analysis.brahmasthan.status}</p>
                      <p className="text-xs text-gray-500">{result.analysis.brahmasthan.notes}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
                    <CheckCircle className={`w-5 h-5 shrink-0 ${result.analysis.entrance.verdict === 'auspicious' ? 'text-emerald-600' : result.analysis.entrance.verdict === 'neutral' ? 'text-amber-600' : 'text-red-600'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Entrance ({result.analysis.entrance.zone}): {result.analysis.entrance.verdict}</p>
                      <p className="text-xs text-gray-500">{result.analysis.entrance.notes}</p>
                    </div>
                  </div>

                  {result.analysis.topRecommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Top Recommendations</h4>
                      <ul className="space-y-1">
                        {result.analysis.topRecommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-[#EA580C] mt-0.5">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
