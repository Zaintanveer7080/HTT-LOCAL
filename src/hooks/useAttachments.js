import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { validate as uuidValidate } from 'uuid';

export const useAttachments = (transactionType, transactionId) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState({});

  const tableName = transactionType === 'sale' ? 'sale_attachments' : 'purchase_attachments';
  const foreignKey = transactionType === 'sale' ? 'sale_id' : 'purchase_id';
  const draftKey = 'draft_id';

  const fetchAttachments = useCallback(async () => {
    if (!transactionId) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);

    // Ensure transactionId is a valid UUID for draft_id check
    const isTransactionIdUuid = uuidValidate(transactionId);
    let orFilter;

    if (isTransactionIdUuid) {
      orFilter = `${foreignKey}.eq.${transactionId},${draftKey}.eq.${transactionId}`;
    } else {
      // If not a UUID, it can't be a draft_id. Only check the foreignKey.
      orFilter = `${foreignKey}.eq.${transactionId}`;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .or(orFilter)
      .order('created_at', { ascending: true });

    if (error) {
      // Don't toast for known UUID errors if a draft ID was used
      if (!(error.code === '22P02' && !isTransactionIdUuid)) {
        toast({ title: 'Error fetching attachments', description: error.message, variant: 'destructive' });
      }
      setAttachments([]);
    } else {
      setAttachments(data || []);
    }
    setLoading(false);
  }, [tableName, foreignKey, draftKey, transactionId, toast]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const uploadFiles = async (files) => {
    if (!transactionId) {
      toast({ title: 'Cannot upload', description: 'Transaction not initialized.', variant: 'destructive' });
      return [];
    }
    if (!session?.user) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to upload files.', variant: 'destructive' });
        return [];
    }

    const newAttachments = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/${transactionId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            if (progress.lengthComputable) {
              const percentage = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(prev => ({ ...prev, [file.name]: percentage }));
            }
          }
        });

      if (uploadError) {
        toast({ title: `Upload failed for ${file.name}`, description: uploadError.message, variant: 'destructive' });
        continue;
      }
      
      const insertData = {
        file_path: filePath,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: session.user.id,
      };

      if (uuidValidate(transactionId)) {
        insertData[draftKey] = transactionId;
      } else {
        insertData[foreignKey] = transactionId;
      }

      const { data: dbData, error: dbError } = await supabase
        .from(tableName)
        .insert(insertData)
        .select()
        .single();
      
      if (dbError) {
        toast({ title: 'Database error after upload', description: dbError.message, variant: 'destructive' });
        await supabase.storage.from('attachments').remove([filePath]);
      } else {
        newAttachments.push(dbData);
      }
      setUploadProgress(prev => {
        const newProgress = {...prev};
        delete newProgress[file.name];
        return newProgress;
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    return newAttachments;
  };

  const deleteAttachment = async (attachmentId) => {
    const attachmentToDelete = attachments.find(a => a.id === attachmentId);
    if (!attachmentToDelete) return;
    
    const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachmentToDelete.file_path]);

    if (storageError) {
        toast({ title: 'Error deleting file from storage', description: storageError.message, variant: 'destructive' });
    }

    const { error: dbError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', attachmentId);
    
    if (dbError) {
      toast({ title: 'Error deleting record', description: dbError.message, variant: 'destructive' });
    } else {
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast({ title: 'Success', description: 'Attachment deleted.' });
    }
  };

  const getPublicUrl = (filePath) => {
    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
  };
  
  return { attachments, loading, uploadFiles, deleteAttachment, getPublicUrl, uploadProgress };
};