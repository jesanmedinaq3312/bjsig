-- Permite imágenes enlazadas en el hero de la landing principal, editables desde Identidad visual.
create or replace function public.update_public_landing_settings(_visual_assets jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  field record;
  asset_url text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not public.is_platform_owner() then
    raise exception 'Only an authorized platform developer may update the main landing'
      using errcode = '42501';
  end if;
  if _visual_assets is null
     or jsonb_typeof(_visual_assets) <> 'object'
     or octet_length(_visual_assets::text) > 32768 then
    raise exception 'Invalid public landing settings';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(_visual_assets) as keys(key)
    where key not in (
      'favicon_url', 'header_image_url', 'hero_image_url', 'hero_opacity', 'icon_urls', 'landing',
      'hero_images'
    )
  ) then
    raise exception 'Unsupported public landing setting';
  end if;

  for field in
    select key, value
    from jsonb_each(_visual_assets)
    where key in ('favicon_url', 'header_image_url', 'hero_image_url')
  loop
    if jsonb_typeof(field.value) <> 'string' then
      raise exception 'Image settings must be strings';
    end if;
    asset_url := field.value #>> '{}';
    if asset_url <> '' and (
      char_length(asset_url) > 2048
      or asset_url !~* '^https://[^[:space:]"<>]+$'
    ) then
      raise exception 'Image URLs must be valid HTTPS URLs';
    end if;
  end loop;

  if _visual_assets ? 'hero_opacity' then
    if jsonb_typeof(_visual_assets -> 'hero_opacity') <> 'number' then
      raise exception 'Hero opacity must be a number';
    end if;
    if (_visual_assets ->> 'hero_opacity')::numeric < 0
       or (_visual_assets ->> 'hero_opacity')::numeric > 1 then
      raise exception 'Hero opacity must be between 0 and 1';
    end if;
  end if;

  if _visual_assets ? 'landing' then
    if jsonb_typeof(_visual_assets -> 'landing') <> 'object' then
      raise exception 'Landing content must be an object';
    end if;
    if exists (
      select 1
      from jsonb_object_keys(_visual_assets -> 'landing') as keys(key)
      where key not in ('hero_title', 'hero_description', 'cta_label')
    ) then
      raise exception 'Unsupported landing content field';
    end if;
    for field in select key, value from jsonb_each(_visual_assets -> 'landing') loop
      if jsonb_typeof(field.value) <> 'string' then
        raise exception 'Landing copy must be text';
      end if;
      if (field.key = 'hero_title' and char_length(field.value #>> '{}') > 160)
         or (field.key = 'hero_description' and char_length(field.value #>> '{}') > 400)
         or (field.key = 'cta_label' and char_length(field.value #>> '{}') > 100) then
        raise exception 'Landing copy exceeds its allowed length';
      end if;
    end loop;
  end if;

  if _visual_assets ? 'icon_urls' then
    if jsonb_typeof(_visual_assets -> 'icon_urls') <> 'object' then
      raise exception 'Icon URLs must be an object';
    end if;
    if exists (
      select 1
      from jsonb_object_keys(_visual_assets -> 'icon_urls') as keys(key)
      where key not in ('brand', 'hero', 'feature', 'cta')
    ) then
      raise exception 'Unsupported landing icon';
    end if;
    for field in select key, value from jsonb_each(_visual_assets -> 'icon_urls') loop
      if jsonb_typeof(field.value) <> 'string' then
        raise exception 'Icon URLs must be strings';
      end if;
      asset_url := field.value #>> '{}';
      if asset_url <> '' and (
        char_length(asset_url) > 2048
        or asset_url !~* '^https://[^[:space:]"<>]+$'
      ) then
        raise exception 'Icon URLs must be valid HTTPS URLs';
      end if;
    end loop;
  end if;

  if _visual_assets ? 'hero_images' then
    if jsonb_typeof(_visual_assets -> 'hero_images') <> 'array'
       or jsonb_array_length(_visual_assets -> 'hero_images') > 6 then
      raise exception 'Hero images must be a list of at most 6 items';
    end if;
    for field in select null as key, value from jsonb_array_elements(_visual_assets -> 'hero_images') loop
      if jsonb_typeof(field.value) <> 'object' or exists (
        select 1 from jsonb_object_keys(field.value) as keys(key)
        where key not in ('image_url', 'alt', 'link_url')
      ) then
        raise exception 'Unsupported hero image field';
      end if;
      if jsonb_typeof(field.value -> 'image_url') is distinct from 'string'
         or char_length(field.value ->> 'image_url') > 2048
         or (field.value ->> 'image_url') !~* '^https://[^[:space:]"<>]+$' then
        raise exception 'Hero image URLs must be valid HTTPS URLs';
      end if;
      if field.value ? 'alt' and (
        jsonb_typeof(field.value -> 'alt') <> 'string'
        or char_length(field.value ->> 'alt') > 120
      ) then
        raise exception 'Hero image alt text is invalid';
      end if;
      if field.value ? 'link_url' then
        if jsonb_typeof(field.value -> 'link_url') <> 'string' then
          raise exception 'Hero image links must be text';
        end if;
        asset_url := field.value ->> 'link_url';
        if asset_url <> '' and (
          char_length(asset_url) > 2048
          or not (
            asset_url ~* '^https://[^[:space:]"<>]+$'
            or asset_url ~ '^/(?!/)[^[:space:]"<>]*$'
            or asset_url ~ '^#[A-Za-z0-9_-]+$'
          )
        ) then
          raise exception 'Hero image links must be HTTPS URLs or site paths';
        end if;
      end if;
    end loop;
  end if;

  insert into public.public_landing_settings (id, visual_assets, updated_at)
  values (1, _visual_assets, now())
  on conflict (id) do update
    set visual_assets = excluded.visual_assets,
        updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.update_public_landing_settings(jsonb) from public, anon, authenticated;
grant execute on function public.update_public_landing_settings(jsonb) to authenticated;
