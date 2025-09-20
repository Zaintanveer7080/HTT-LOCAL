import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAttachments } from '@/hooks/useAttachments.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UploadCloud, File, FileText, Trash2, Eye, Loader2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const AttachmentsManager = ({ transactionType, transactionId, draftId, onUpload, isEditing }) => {
  const idToUse = isEditing ? transactionId : draftId;
  const { attachments, loading, uploadFiles, deleteAttachment, getPublicUrl, uploadProgress } = useAttachments(transactionType, idToUse);
  const [previewUrl, setPreviewUrl] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (!idToUse) return;
    uploadFiles(acceptedFiles).then(newAttachments => {
      if (onUpload) {
        onUpload(newAttachments);
      }
    });
  }, [uploadFiles, idToUse, onUpload]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: !idToUse,
  });

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.path} className="text-destructive text-sm">
      {file.path} - {file.size > 10 * 1024 * 1024 ? 'File is larger than 10MB' : errors[0].message}
    </li>
  ));

  const FileIcon = ({ mimeType, filePath }) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-10 h-10 text-blue-500" />;
    if (mimeType === 'application/pdf') return <FileText className="w-10 h-10 text-red-500" />;
    return <File className="w-10 h-10 text-gray-500" />;
  };

  const hasUploadsInProgress = Object.keys(uploadProgress).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!idToUse ? (
             <Alert variant="default">
                <UploadCloud className="h-4 w-4" />
                <AlertTitle>Initialize Required</AlertTitle>
                <AlertDescription>
                    Click "Add Attachments" to start uploading files.
                </AlertDescription>
            </Alert>
        ) : (
          <>
            <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'} ${!idToUse ? 'cursor-not-allowed opacity-50' : ''}`}>
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <UploadCloud className="w-10 h-10" />
                {isDragActive ? <p>Drop the files here ...</p> : <p>Drag & drop files here, or click to select files</p>}
                <p className="text-xs">JPG, PNG, WEBP, PDF (max 10MB each)</p>
              </div>
            </div>
            {fileRejectionItems.length > 0 && <ul className="mt-2 list-disc list-inside">{fileRejectionItems}</ul>}
            
            {loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin"/><span>Loading attachments...</span></div>}

            <div className="space-y-2">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-4 p-2 border rounded-md">
                  <FileIcon mimeType={att.mime_type} filePath={att.file_path} />
                  <div className="flex-1">
                    <p className="font-semibold truncate">{att.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {(att.size_bytes / 1024 / 1024).toFixed(2)} MB - {format(new Date(att.created_at), 'PPp')}
                    </p>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setPreviewUrl(getPublicUrl(att.file_path))}><Eye className="w-4 h-4"/></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader><DialogTitle>{att.filename}</DialogTitle></DialogHeader>
                      {previewUrl && att.mime_type.startsWith('image/') && <img-replace src={previewUrl} alt={att.filename} className="max-w-full max-h-[80vh] object-contain" />}
                      {previewUrl && att.mime_type === 'application/pdf' && <iframe src={previewUrl} className="w-full h-[80vh]" title={att.filename}></iframe>}
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the file. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAttachment(att.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              {hasUploadsInProgress && Object.entries(uploadProgress).map(([name, percent]) => (
                <div key={name} className="p-2 border rounded-md">
                   <p className="font-semibold truncate text-sm">{name}</p>
                   <Progress value={percent} className="w-full mt-1" />
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AttachmentsManager;