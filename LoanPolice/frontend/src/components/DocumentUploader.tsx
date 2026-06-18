import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Select } from './ui';

interface DocumentUploaderProps {
  loanId: number;
  onUploadSuccess: () => void;
  uploadFn: (loanId: number, docType: string, file: File) => Promise<any>;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  loanId,
  onUploadSuccess,
  uploadFn,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('KYC');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docTypeOptions = [
    { value: 'KYC', label: 'KYC Verification (Aadhaar/PAN/Passport)' },
    { value: 'IncomeProof', label: 'Proof of Income (Salary Slips/Tax Returns)' },
    { value: 'CollateralProof', label: 'Collateral Documentation' },
    { value: 'Other', label: 'Supporting Documents' }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedExtensions.includes(extension)) {
      setStatus('error');
      setMessage('Unsupported file format. Please upload PDF, JPG, or PNG.');
      return false;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setStatus('error');
      setMessage('File exceeds the maximum size limit of 10MB.');
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setStatus('idle');
        setMessage('');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setStatus('idle');
        setMessage('');
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('loading');
    try {
      await uploadFn(loanId, docType, file);
      setStatus('success');
      setFile(null);
      setMessage(`Successfully uploaded ${file.name}`);
      onUploadSuccess();
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'Failed to upload document. Please try again.');
    }
  };

  return (
    <form onSubmit={handleUploadSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-3">
          <Select
            label="Document Category"
            options={docTypeOptions}
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          />
        </div>
        <div>
          <Button
            type="submit"
            variant="accent"
            className="w-full h-[38px] cursor-pointer"
            disabled={!file || status === 'loading'}
          >
            {status === 'loading' ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
          dragActive 
            ? 'border-brand-emerald bg-emerald-50/10' 
            : 'border-brand-border bg-brand-slate/30'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleChange}
        />

        <div className="bg-white p-3 rounded-full border border-brand-border shadow-sm text-brand-navy mb-3">
          <Upload className="w-6 h-6" />
        </div>

        {file ? (
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center space-x-1.5 text-brand-navy font-semibold text-sm">
              <FileText className="w-4 h-4 text-brand-muted" />
              <span>{file.name}</span>
            </div>
            <p className="text-xs text-brand-muted">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-xs text-red-500 font-medium hover:underline cursor-pointer"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-brand-navy">
              Drag & drop files here, or{' '}
              <button
                type="button"
                onClick={onButtonClick}
                className="text-brand-emerald font-semibold hover:underline focus:outline-none cursor-pointer"
              >
                browse local files
              </button>
            </p>
            <p className="text-xs text-brand-muted mt-1">
              Supports PDF, PNG, JPG, or JPEG up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Status Alert Panels */}
      {status === 'success' && (
        <div className="flex items-center space-x-2 bg-emerald-50 text-brand-emerald border border-emerald-200 rounded-md p-3 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center space-x-2 bg-slate-100 text-brand-navy border border-brand-border rounded-md p-3 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-brand-muted" />
          <span>{message}</span>
        </div>
      )}
    </form>
  );
};
