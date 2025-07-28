// Database operations for file attachments
import { supabaseAdmin } from './supabase'
import { SupermemoryFile } from './supermemory-file-processor'

export interface FileAttachmentRecord {
  id: string
  message_id: string
  conversation_id?: string
  user_id: string
  file_name: string
  file_type: string
  mime_type: string
  file_size: number
  storage_path: string
  processed_content?: string
  metadata?: any
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_error?: string
  created_at: string
}

export class FileAttachmentsDB {
  // Save file attachment to database
  static async saveFileAttachment(
    file: SupermemoryFile,
    messageId: string,
    conversationId: string,
    userId: string
  ): Promise<FileAttachmentRecord | null> {
    try {
      // For images, upload to Supabase Storage instead of storing base64
      let storageUrl = ''
      if (file.fileType === 'image' && file.metadata?.base64Content) {
        try {
          // Convert base64 to buffer
          const base64Data = file.metadata.base64Content
          const buffer = Buffer.from(base64Data, 'base64')
          
          // Generate unique filename with user folder structure
          const fileName = `${userId}/${Date.now()}-${file.fileName}`
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('file-attachments')
            .upload(fileName, buffer, {
              contentType: file.mimeType,
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Error uploading file to storage:', uploadError)
            // Fall back to storing base64 reference
            storageUrl = 'base64://' + file.fileName
          } else {
            // Get public URL for the uploaded file
            const { data: urlData } = supabaseAdmin.storage
              .from('file-attachments')
              .getPublicUrl(fileName)
            
            storageUrl = urlData.publicUrl
            console.log('✅ File uploaded to storage:', storageUrl)
          }
        } catch (error) {
          console.error('Error processing file upload:', error)
          // Fall back to storing base64 reference
          storageUrl = 'base64://' + file.fileName
        }
      }

      const { data, error } = await supabaseAdmin
        .from('file_attachments')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          user_id: userId,
          file_name: file.fileName,
          file_type: file.fileType,
          mime_type: file.mimeType,
          file_size: file.size,
          storage_path: storageUrl || '', // Store URL reference instead of base64
          processed_content: file.content?.slice(0, 2000),
          content_preview: file.content?.slice(0, 500), // Short preview for quick display
          metadata: {
            supermemory_stored: file.supermemoryStored,
            supermemory_memory_id: file.memoryId,
            // Store only file reference, not base64 content for efficiency
            file_url: storageUrl || null,
            original_metadata: file.metadata
          },
          processing_status: file.error ? 'failed' : 'completed',
          processing_error: file.error
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving file attachment:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in saveFileAttachment:', error)
      return null
    }
  }

  // Get file attachments for a message
  static async getMessageAttachments(messageId: string): Promise<FileAttachmentRecord[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('file_attachments')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error getting message attachments:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getMessageAttachments:', error)
      return []
    }
  }

  // Get file attachments for a conversation
  static async getConversationAttachments(conversationId: string): Promise<FileAttachmentRecord[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('file_attachments')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error getting conversation attachments:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getConversationAttachments:', error)
      return []
    }
  }

  // Get user file statistics
  static async getUserFileStats(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_file_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error getting user file stats:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getUserFileStats:', error)
      return null
    }
  }

  // Search file attachments by content or filename - FIXED SQL injection
  static async searchFileAttachments(
    userId: string,
    query: string,
    fileType?: string,
    limit: number = 10
  ): Promise<FileAttachmentRecord[]> {
    try {
      // Sanitize query to prevent SQL injection by escaping special characters
      const sanitizedQuery = query.replace(/[%_]/g, (match) => '\\' + match)
      
      let queryBuilder = supabaseAdmin
        .from('file_attachments')
        .select('*')
        .eq('user_id', userId)
        .or(`file_name.ilike.%${sanitizedQuery}%,processed_content.ilike.%${sanitizedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fileType) {
        queryBuilder = queryBuilder.eq('file_type', fileType)
      }

      const { data, error } = await queryBuilder

      if (error) {
        console.error('Error searching file attachments:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in searchFileAttachments:', error)
      return []
    }
  }

  // Update Supermemory reference for a file attachment
  static async updateSupermemoryReference(
    attachmentId: string,
    memoryId: string,
    stored: boolean
  ): Promise<boolean> {
    try {
      // First get the current metadata
      const { data: currentData, error: fetchError } = await supabaseAdmin
        .from('file_attachments')
        .select('metadata')
        .eq('id', attachmentId)
        .single()

      if (fetchError) {
        console.error('Error fetching current metadata:', fetchError)
        return false
      }

      // Update the metadata with Supermemory info
      const updatedMetadata = {
        ...currentData.metadata,
        supermemory_memory_id: memoryId,
        supermemory_stored: stored
      }

      const { error } = await supabaseAdmin
        .from('file_attachments')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', attachmentId)

      if (error) {
        console.error('Error updating Supermemory reference:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateSupermemoryReference:', error)
      return false
    }
  }

  // Delete file attachment (including from storage)
  static async deleteFileAttachment(attachmentId: string): Promise<boolean> {
    try {
      // First get the file info to delete from storage
      const { data: fileData, error: fetchError } = await supabaseAdmin
        .from('file_attachments')
        .select('storage_path, user_id')
        .eq('id', attachmentId)
        .single()

      if (fetchError) {
        console.error('Error fetching file for deletion:', fetchError)
        return false
      }

      // Delete from storage if it's a storage URL
      if (fileData?.storage_path && fileData.storage_path.startsWith('http')) {
        try {
          // Extract the file path from the storage URL
          const url = new URL(fileData.storage_path)
          const pathParts = url.pathname.split('/')
          const fileName = pathParts[pathParts.length - 1]
          const storagePath = `${fileData.user_id}/${fileName}`

          const { error: storageError } = await supabaseAdmin.storage
            .from('file-attachments')
            .remove([storagePath])

          if (storageError) {
            console.error('Error deleting file from storage:', storageError)
            // Continue with database deletion even if storage deletion fails
          } else {
            console.log('✅ File deleted from storage:', storagePath)
          }
        } catch (error) {
          console.error('Error processing storage deletion:', error)
          // Continue with database deletion
        }
      }

      // Delete from database
      const { error } = await supabaseAdmin
        .from('file_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) {
        console.error('Error deleting file attachment from database:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteFileAttachment:', error)
      return false
    }
  }

  // Get recent file attachments for a user
  static async getRecentUserAttachments(
    userId: string,
    limit: number = 20
  ): Promise<FileAttachmentRecord[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('file_attachments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error getting recent user attachments:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getRecentUserAttachments:', error)
      return []
    }
  }

  // Get signed URL for file access (for private files)
  static async getFileSignedUrl(
    attachmentId: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<string | null> {
    try {
      const { data: fileData, error: fetchError } = await supabaseAdmin
        .from('file_attachments')
        .select('storage_path, user_id, file_name')
        .eq('id', attachmentId)
        .single()

      if (fetchError || !fileData) {
        console.error('Error fetching file for signed URL:', fetchError)
        return null
      }

      // If it's already a public URL, return it
      if (fileData.storage_path && fileData.storage_path.startsWith('http')) {
        return fileData.storage_path
      }

      // Generate signed URL for storage path
      if (fileData.storage_path && fileData.storage_path.includes('/')) {
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('file-attachments')
          .createSignedUrl(fileData.storage_path, expiresIn)

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError)
          return null
        }

        return signedUrlData.signedUrl
      }

      return null
    } catch (error) {
      console.error('Error in getFileSignedUrl:', error)
      return null
    }
  }

  // Cleanup orphaned files (files without associated messages)
  static async cleanupOrphanedFiles(): Promise<number> {
    try {
      // Find file attachments that don't have corresponding messages
      const { data: orphanedFiles, error } = await supabaseAdmin
        .from('file_attachments')
        .select('id, storage_path, user_id')
        .not('message_id', 'in', 
          supabaseAdmin
            .from('messages')
            .select('id')
        )

      if (error) {
        console.error('Error finding orphaned files:', error)
        return 0
      }

      if (!orphanedFiles || orphanedFiles.length === 0) {
        return 0
      }

      // Delete orphaned files
      let deletedCount = 0
      for (const file of orphanedFiles) {
        const success = await FileAttachmentsDB.deleteFileAttachment(file.id)
        if (success) {
          deletedCount++
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} orphaned files`)
      return deletedCount
    } catch (error) {
      console.error('Error in cleanupOrphanedFiles:', error)
      return 0
    }
  }
}