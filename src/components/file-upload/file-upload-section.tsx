'use client';

import { useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { UploadedFile } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { FileText, ImageIcon, Loader2, Paperclip, X } from 'lucide-react';

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.pdf';

type Props = {
  files: UploadedFile[];
  storagePath: string;
  onFileAdded: (file: UploadedFile) => Promise<void>;
  onFileDeleted: (file: UploadedFile) => Promise<void>;
  disabled?: boolean;
};

export function FileUploadSection({ files, storagePath, onFileAdded, onFileDeleted, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      alert('Formato não permitido. Use JPG, JPEG, PNG ou PDF.');
      return;
    }

    setUploading(true);
    try {
      const filename = `${Date.now()}_${file.name}`;
      const filePath = `${storagePath}/${filename}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await onFileAdded({ url, name: file.name, path: filePath });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(file: UploadedFile) {
    setDeletingPath(file.path);
    try {
      try {
        await deleteObject(ref(storage, file.path));
      } catch {
        // File may already be deleted from storage; continue with Firestore cleanup
      }
      await onFileDeleted(file);
    } finally {
      setDeletingPath(null);
    }
  }

  const isPdf = (name: string) => name.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-3">
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li key={file.path} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              {isPdf(file.name) ? (
                <FileText className="h-4 w-4 shrink-0 text-red-500" />
              ) : (
                <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
              )}
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate hover:underline"
              >
                {file.name}
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deletingPath === file.path || disabled}
                onClick={() => void handleDelete(file)}
              >
                {deletingPath === file.path ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
          disabled={uploading || disabled}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Paperclip className="mr-2 h-4 w-4" />
              Adicionar arquivo
            </>
          )}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">Formatos aceitos: JPG, JPEG, PNG e PDF</p>
      </div>
    </div>
  );
}
