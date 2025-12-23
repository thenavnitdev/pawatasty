export type VenueCategory = 'restaurant' | 'cafe' | 'bar' | 'shop' | 'train_station' | 'charging_station';

export interface Deal {
  id: string;
  title: string;
  description: string;
  discount?: number | string;
  price?: number;
  saveValue?: number;
  averagePrice?: number;
  image?: string;
  imageUrl?: string;
  imageIds?: string[];
  bookable?: boolean;
  bookable_qty?: number;
  location?: string;
  repeatDays?: string;
  badge?: string;
  savings?: number;
  duration?: number;
  isOnsite?: boolean;
  merchantId?: string;
  validFrom?: string;
  validUntil?: string;
  terms?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  city?: string;
  category: VenueCategory;
  merchantCategory?: string;
  businessType?: string;
  subcategoryName?: string;
  specialty?: string[];
  status?: 'Open' | 'Closed';
  created_at?: string;
  image_url?: string;
  logoId?: string | null;
  coverImageIds?: string[] | null;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  website?: string;
  opening_hours?: string;
  open_days?: string;
  open_time?: string;
  deals?: Deal[];
  availableSlots?: number;
  partnershipType?: string;
  occupiedSlots?: number;
  totalSlots?: number;
  returnSlots?: number;
  hasStation?: boolean;
  unitPrice?: string;
  unitMin?: string;
  parentMerchantId?: string;
}

export interface Booking {
  id: string;
  user_id: string;
  restaurant_id: string;
  booking_date: string;
  booking_time: string;
  party_size: number;
  booking_type: 'single' | 'group';
  deal_description?: string;
  dealImage?: string;
  status: 'reserved' | 'confirmed' | 'cancelled' | 'completed' | 'expired';
  created_at: string;
  restaurant?: Restaurant;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_user: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  target_type: 'merchant' | 'deal' | 'station';
  target_id: string;
  rating: number;
  comment?: string;
  food_rating?: number;
  service_rating?: number;
  ambiance_rating?: number;
  value_rating?: number;
  images?: string[];
  helpful_count: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface ReviewStats {
  merchant_id: string;
  total_reviews: number;
  average_rating: number;
  average_food_rating?: number;
  average_service_rating?: number;
  average_ambiance_rating?: number;
  average_value_rating?: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}

export interface CreateReviewRequest {
  target_type: 'merchant' | 'deal' | 'station';
  target_id: string;
  rating: number;
  comment?: string;
  food_rating?: number;
  service_rating?: number;
  ambiance_rating?: number;
  value_rating?: number;
  images?: string[];
}
