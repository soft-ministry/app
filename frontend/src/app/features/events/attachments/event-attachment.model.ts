export interface EventAttachment {
  id: number;
  eventId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
}

export interface EventAttachmentView extends EventAttachment {
  previewUrl?: string;
}
