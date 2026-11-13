-- Small raster icons are stored inline, independently of gallery screenshots.
alter table public.apps add column if not exists icon text;
alter table public.apps add constraint apps_icon_valid check (
  icon is null or (
    length(icon) <= 60000
    and icon ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
  )
);
