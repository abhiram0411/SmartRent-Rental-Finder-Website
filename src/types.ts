export interface Property {
  id: string;
  title: string;
  city: string;
  locality: string;
  rent: number;
  bedrooms: number;
  area: number;
  furnishing: string;
  description: string;
  images: string[];
  latitude?: number | null;
  longitude?: number | null;
  demo?: boolean;
}
