-- Run only in the dedicated SmartRent project, after 01-schema.sql.
-- Browser users must access application tables through the NestJS API.
ALTER TABLE public."Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Favourite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Enquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RateLimit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Property", public."Favourite", public."Enquiry", public."RateLimit" FROM anon, authenticated;

-- The API database connection is privileged: NestJS MUST check ownership.
-- For deployment create a dedicated login through the admin console, grant only
-- CRUD on these tables, and provide RLS policies for that role. Do not expose
-- a database password or service-role key in VITE_ variables.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-images','property-images',true,2097152,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET file_size_limit=2097152, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];

CREATE POLICY "SmartRent upload own photos" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id='property-images' AND (storage.foldername(name))[1]=(SELECT auth.uid()::text)
);
CREATE POLICY "SmartRent read own photo metadata" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id='property-images' AND (storage.foldername(name))[1]=(SELECT auth.uid()::text)
);
CREATE POLICY "SmartRent remove own photos" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id='property-images' AND (storage.foldername(name))[1]=(SELECT auth.uid()::text)
);
