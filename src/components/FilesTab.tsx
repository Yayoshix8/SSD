import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { STAGE_LABELS, PipelineStage, SupplierFile } from '../types';
import {
  Upload, FileText, Download, Paperclip, Clock, User,
  Image, FileSpreadsheet, File as FileIcon, Loader2, ChevronDown, ChevronUp,
  AlertCircle,
} from 'lucide-react';

const STAGE_ORDER_DISPLAY: PipelineStage[] = [
  'new_supplier_identified',
  'scouting_event_prep',
  'b2b_evaluation',
  'parking_lot',
  'preliminary_evaluation',
  'rfq',
  'investigation_record',
  'blacklisted',
];

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image size={14} className="text-blue-500" />;
  if (mime.includes('pdf'))       return <FileText size={14} className="text-red-500" />;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return <FileSpreadsheet size={14} className="text-emerald-600" />;
  return <FileIcon size={14} className="text-slate-500" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  supplierId: string;
  currentStage: PipelineStage;
}

export default function FilesTab({ supplierId, currentStage }: Props) {
  const { uploadSupplierFile, getSupplierFiles, selectedSupplier, currentRole } = useApp();
  const [files, setFiles] = useState<SupplierFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>(currentStage);
  const [actorName, setActorName] = useState('');
  const [error, setError] = useState('');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set([currentStage]));
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    setLoading(true);
    const loaded = await getSupplierFiles(supplierId);
    setFiles(loaded);
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, [supplierId]);

  // Use enriched files from context as primary source (faster)
  const contextFiles = selectedSupplier?.files ?? [];
  const displayFiles = contextFiles.length > 0 ? contextFiles : files;

  const handleUpload = async (file: File) => {
    if (!actorName.trim()) { setError('Enter your name before uploading'); return; }
    setError('');
    setUploading(true);
    const result = await uploadSupplierFile(supplierId, uploadStage, file, null, actorName);
    setUploading(false);
    if (!result) {
      setError('Upload failed. Check the file type and try again.');
    } else {
      await loadFiles();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  };

  // Group files by stage
  const byStage = new Map<string, SupplierFile[]>();
  for (const f of displayFiles) {
    if (!byStage.has(f.stage)) byStage.set(f.stage, []);
    byStage.get(f.stage)!.push(f);
  }

  const stagesWithFiles = STAGE_ORDER_DISPLAY.filter(s => byStage.has(s));
  const miscStages = [...byStage.keys()].filter(s => !STAGE_ORDER_DISPLAY.includes(s as PipelineStage));

  return (
    <div className="p-4 space-y-4">
      {/* Upload panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Upload size={12} /> Upload Document</p>

        <div className="grid grid-cols-2 gap-2">
          {/* Stage selector */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Stage</label>
            <select
              value={uploadStage}
              onChange={e => setUploadStage(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-700"
            >
              {STAGE_ORDER_DISPLAY.map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
              <option value="general">General / Other</option>
            </select>
          </div>
          {/* Your name */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Your Name <span className="text-red-400">*</span></label>
            <div className="relative">
              <User size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={actorName}
                onChange={e => { setActorName(e.target.value); setError(''); }}
                placeholder="Full name"
                className="w-full border border-slate-200 rounded-lg pl-7 pr-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-300 hover:bg-slate-100'} ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 size={16} className="animate-spin text-blue-600" /> Uploading...
            </div>
          ) : (
            <>
              <Paperclip size={22} className={`mx-auto mb-1.5 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
              <p className="text-xs font-medium text-slate-700">Drop file or click to browse</p>
              <p className="text-xs text-slate-400 mt-0.5">PDF, Word, Excel, images — max 50MB</p>
            </>
          )}
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.zip,.txt"
          />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={11} /> {error}
          </div>
        )}
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading files...
        </div>
      ) : displayFiles.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Paperclip size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No files uploaded yet</p>
          <p className="text-xs mt-0.5">Upload the first document for this supplier above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...stagesWithFiles, ...miscStages].map(stage => {
            const stageFiles = byStage.get(stage) ?? [];
            const expanded = expandedStages.has(stage);
            const label = STAGE_LABELS[stage as PipelineStage] ?? stage.replace(/_/g, ' ');
            return (
              <div key={stage} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleStage(stage)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                    <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-1.5 py-0.5">{stageFiles.length}</span>
                  </div>
                  {expanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                </button>
                {expanded && (
                  <div className="divide-y divide-slate-50">
                    {stageFiles.map(f => (
                      <FileRow key={f.id} file={f} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FileRow({ file }: { file: SupplierFile }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (file.url) {
      window.open(file.url, '_blank');
      return;
    }
    // Fetch fresh signed URL
    setDownloading(true);
    const { data } = await supabase.storage
      .from('supplier-files')
      .createSignedUrl(file.storage_path, 3600);
    setDownloading(false);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
      <div className="flex-shrink-0">{fileIcon(file.mime_type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-900 truncate">{file.file_name}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
          <span className="flex items-center gap-0.5"><User size={9} />{file.uploaded_by}</span>
          <span>·</span>
          <span>{formatBytes(file.file_size)}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5"><Clock size={9} />{new Date(file.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
        title="Download"
      >
        {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      </button>
    </div>
  );
}
