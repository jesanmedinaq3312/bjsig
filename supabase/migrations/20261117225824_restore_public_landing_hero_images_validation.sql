BEGIN;

-- Preserve the existing hero gallery contract while accepting the new single
-- hero_link_url setting. This replaces the prior RPC without changing history.
CREATE OR REPLACE FUNCTION public.update_public_landing_settings(_visual_assets jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  field record;
  asset_url text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING errcode = '42501';
  END IF;
  IF NOT public.is_platform_owner() THEN
    RAISE EXCEPTION 'Only an authorized platform developer may update the main landing'
      USING errcode = '42501';
  END IF;
  IF _visual_assets IS NULL
     OR jsonb_typeof(_visual_assets) <> 'object'
     OR octet_length(_visual_assets::text) > 32768 THEN
    RAISE EXCEPTION 'Invalid public landing settings';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(_visual_assets) AS keys(key)
    WHERE key NOT IN (
      'favicon_url', 'header_image_url', 'hero_image_url', 'hero_link_url',
      'hero_opacity', 'icon_urls', 'landing', 'hero_images'
    )
  ) THEN
    RAISE EXCEPTION 'Unsupported public landing setting';
  END IF;

  FOR field IN
    SELECT key, value
    FROM jsonb_each(_visual_assets)
    WHERE key IN ('favicon_url', 'header_image_url', 'hero_image_url')
  LOOP
    IF jsonb_typeof(field.value) <> 'string' THEN
      RAISE EXCEPTION 'Image settings must be strings';
    END IF;
    asset_url := field.value #>> '{}';
    IF asset_url <> '' AND (
      char_length(asset_url) > 2048
      OR asset_url !~* '^https://[^[:space:]"<>]+$'
    ) THEN
      RAISE EXCEPTION 'Image URLs must be valid HTTPS URLs';
    END IF;
  END LOOP;

  IF _visual_assets ? 'hero_link_url' THEN
    IF jsonb_typeof(_visual_assets -> 'hero_link_url') <> 'string' THEN
      RAISE EXCEPTION 'Hero link must be a string';
    END IF;
    asset_url := _visual_assets ->> 'hero_link_url';
    IF asset_url <> '' AND (
      char_length(asset_url) > 2048
      OR NOT (
        asset_url = '/'
        OR asset_url ~ '^/(?!/)[^[:space:]"<>]*$'
        OR asset_url ~ '^#[[:alnum:]_-]+$'
        OR asset_url ~* '^https://[^[:space:]"<>]+$'
      )
    ) THEN
      RAISE EXCEPTION 'Hero link must be HTTPS or a same-site path';
    END IF;
  END IF;

  IF _visual_assets ? 'hero_opacity' THEN
    IF jsonb_typeof(_visual_assets -> 'hero_opacity') <> 'number' THEN
      RAISE EXCEPTION 'Hero opacity must be a number';
    END IF;
    IF (_visual_assets ->> 'hero_opacity')::numeric < 0
       OR (_visual_assets ->> 'hero_opacity')::numeric > 1 THEN
      RAISE EXCEPTION 'Hero opacity must be between 0 and 1';
    END IF;
  END IF;

  IF _visual_assets ? 'landing' THEN
    IF jsonb_typeof(_visual_assets -> 'landing') <> 'object' THEN
      RAISE EXCEPTION 'Landing content must be an object';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(_visual_assets -> 'landing') AS keys(key)
      WHERE key NOT IN ('hero_title', 'hero_description', 'cta_label')
    ) THEN
      RAISE EXCEPTION 'Unsupported landing content field';
    END IF;
    FOR field IN
      SELECT key, value
      FROM jsonb_each(_visual_assets -> 'landing')
    LOOP
      IF jsonb_typeof(field.value) <> 'string' THEN
        RAISE EXCEPTION 'Landing copy must be text';
      END IF;
      IF (field.key = 'hero_title' AND char_length(field.value #>> '{}') > 160)
         OR (field.key = 'hero_description' AND char_length(field.value #>> '{}') > 400)
         OR (field.key = 'cta_label' AND char_length(field.value #>> '{}') > 100) THEN
        RAISE EXCEPTION 'Landing copy exceeds its allowed length';
      END IF;
    END LOOP;
  END IF;

  IF _visual_assets ? 'icon_urls' THEN
    IF jsonb_typeof(_visual_assets -> 'icon_urls') <> 'object' THEN
      RAISE EXCEPTION 'Icon URLs must be an object';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(_visual_assets -> 'icon_urls') AS keys(key)
      WHERE key NOT IN ('brand', 'hero', 'feature', 'cta')
    ) THEN
      RAISE EXCEPTION 'Unsupported landing icon';
    END IF;
    FOR field IN
      SELECT key, value
      FROM jsonb_each(_visual_assets -> 'icon_urls')
    LOOP
      IF jsonb_typeof(field.value) <> 'string' THEN
        RAISE EXCEPTION 'Icon URLs must be strings';
      END IF;
      asset_url := field.value #>> '{}';
      IF asset_url <> '' AND (
        char_length(asset_url) > 2048
        OR asset_url !~* '^https://[^[:space:]"<>]+$'
      ) THEN
        RAISE EXCEPTION 'Icon URLs must be valid HTTPS URLs';
      END IF;
    END LOOP;
  END IF;

  IF _visual_assets ? 'hero_images' THEN
    IF jsonb_typeof(_visual_assets -> 'hero_images') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Hero images must be a list of at most 6 items';
    END IF;
    IF jsonb_array_length(_visual_assets -> 'hero_images') > 6 THEN
      RAISE EXCEPTION 'Hero images must be a list of at most 6 items';
    END IF;
    FOR field IN
      SELECT value
      FROM jsonb_array_elements(_visual_assets -> 'hero_images')
    LOOP
      IF jsonb_typeof(field.value) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Unsupported hero image field';
      END IF;
      IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(field.value) AS keys(key)
        WHERE key NOT IN ('image_url', 'alt', 'link_url')
      ) THEN
        RAISE EXCEPTION 'Unsupported hero image field';
      END IF;
      IF jsonb_typeof(field.value -> 'image_url') IS DISTINCT FROM 'string'
         OR char_length(field.value ->> 'image_url') > 2048
         OR (field.value ->> 'image_url') !~* '^https://[^[:space:]"<>]+$' THEN
        RAISE EXCEPTION 'Hero image URLs must be valid HTTPS URLs';
      END IF;
      IF field.value ? 'alt' AND (
        jsonb_typeof(field.value -> 'alt') <> 'string'
        OR char_length(field.value ->> 'alt') > 120
      ) THEN
        RAISE EXCEPTION 'Hero image alt text is invalid';
      END IF;
      IF field.value ? 'link_url' THEN
        IF jsonb_typeof(field.value -> 'link_url') <> 'string' THEN
          RAISE EXCEPTION 'Hero image links must be text';
        END IF;
        asset_url := field.value ->> 'link_url';
        IF asset_url <> '' AND (
          char_length(asset_url) > 2048
          OR NOT (
            asset_url ~* '^https://[^[:space:]"<>]+$'
            OR asset_url ~ '^/(?!/)[^[:space:]"<>]*$'
            OR asset_url ~ '^#[A-Za-z0-9_-]+$'
          )
        ) THEN
          RAISE EXCEPTION 'Hero image links must be HTTPS URLs or site paths';
        END IF;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.public_landing_settings (id, visual_assets, updated_at)
  VALUES (1, _visual_assets, now())
  ON CONFLICT (id) DO UPDATE
    SET visual_assets = EXCLUDED.visual_assets,
        updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.update_public_landing_settings(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_public_landing_settings(jsonb)
  TO authenticated;

COMMIT;
