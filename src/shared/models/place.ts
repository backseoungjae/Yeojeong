export type ContentLanguage = 'ko' | 'en';
export type PlaceType = 'attraction' | 'culture' | 'restaurant' | 'other';
export type TourService = 'KorService2' | 'EngService2';

export interface Place {
  id: string;
  contentId: string;
  service: TourService;
  language: ContentLanguage;
  name: string;
  type: PlaceType;
  providerTypeCode: string;
  address?: string;
  regionCode?: string;
  districtCode?: string;
  classification?: string;
  subClassification?: string;
  detailClassification?: string;
  longitude?: number;
  latitude?: number;
  imageUrl?: string;
  listImageUrl?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
  modifiedAt?: string;
  source: '한국관광공사 TourAPI';
}
