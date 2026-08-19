import { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, Image, FileText } from 'lucide-react';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ACCEPTED_EXT = '.pdf,.jpg,.jpeg,.png,.docx';
const MAX_FILE_MB = 15;

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-teal-400" />;
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />;
  return <File className="w-4 h-4 text-indigo-400" />;
}

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  error?: string | null;
}

export function FileUpload({ files, onChange, error }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_MB * 1024 * 1024) return false;
      return true;
    });
    // De-dupe by name
    const existing = new Set(files.map((f) => f.name));
    const newFiles = valid.filter((f) => !existing.has(f.name));
    onChange([...files, ...newFiles]);
  }, [files, onChange]);

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`upload-zone rounded-xl p-6 text-center cursor-pointer transition-all ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        aria-label="Upload files — click or drag and drop"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT}
          onChange={onInputChange}
          className="hidden"
          aria-hidden="true"
          id="file-upload-input"
        />
        <motion.div
          animate={dragOver ? { scale: 1.08 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${dragOver ? 'bg-indigo-500/30' : 'bg-indigo-500/10'}`}>
            <Upload className={`w-6 h-6 ${dragOver ? 'text-indigo-300' : 'text-indigo-400'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">
              {dragOver ? 'Drop files here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, DOCX — max {MAX_FILE_MB}MB each</p>
          </div>
        </motion.div>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 glass-card px-3 py-2.5 rounded-lg"
              >
                {fileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
