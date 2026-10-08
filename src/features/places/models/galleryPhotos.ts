import type { PlaceDetail, PlacePhoto } from '../../../shared/models/placeDetail.ts';
export function galleryPhotos(photos: PlacePhoto[], detail?: PlaceDetail): PlacePhoto[] {
  if (photos.length || !detail?.place.imageSourceUrl) return photos;
  return [{ id: `${detail.place.id}:primary`, sourceUrl: detail.place.imageSourceUrl, url: detail.place.imageUrl, name: detail.place.name, license: detail.place.imageLicense }];
}
