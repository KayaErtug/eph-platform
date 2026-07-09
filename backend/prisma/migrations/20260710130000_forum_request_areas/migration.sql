-- Madde 35/36: Forum talebine çoklu il/ilçe/mahalle (düz {city,district,neighborhood}[] JSON dizisi)
ALTER TABLE "NetworkPost" ADD COLUMN IF NOT EXISTS "areas" JSONB;
