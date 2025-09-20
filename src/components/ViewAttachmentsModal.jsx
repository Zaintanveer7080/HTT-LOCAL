import React from 'react';
import { useAttachments } from '@/hooks/useAttachments';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, File, FileText, Image as ImageIcon, Download, Paperclip } from 'lucide-react';
import { format } from 'date-fns';

const FileIcon = ({ mimeType }) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
};

const ViewAttachmentsModal = ({ transactionType, transactionId, open, onClose }) => {
  const { attachments, loading, getPublicUrl } = useAttachments(transactionType, transactionId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Paperclip className="mr-2 h-5 w-5" />
            View Attachments
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No attachments found for this transaction.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attachments.map((att) => (
                  <TableRow key={att.id}>
                    <TableCell>
                      <FileIcon mimeType={att.mime_type} />
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-xs">{att.filename}</TableCell>
                    <TableCell>{(att.size_bytes / 1024 / 1024).toFixed(2)} MB</TableCell>
                    <TableCell>{format(new Date(att.created_at), 'PP')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={getPublicUrl(att.file_path)} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewAttachmentsModal;