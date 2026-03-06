import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';

export const onPhotoUpload = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  if (!filePath?.startsWith('trips/') || !filePath.endsWith('.jpg')) {
    return;
  }

  // TODO: Generate thumbnail using sharp or similar
  // 1. Download original from Storage
  // 2. Resize to 300px width
  // 3. Upload thumbnail
  // 4. Update Firestore photo document with thumbnailURL
  console.log(`Photo uploaded: ${filePath}`);
});
