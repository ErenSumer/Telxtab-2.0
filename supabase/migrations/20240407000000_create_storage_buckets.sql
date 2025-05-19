-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true),
       ('lesson-videos', 'lesson-videos', true)
on conflict (id) do nothing;

-- Drop existing policies if they exist
drop policy if exists "Public course thumbnails" on storage.objects;
drop policy if exists "Public lesson videos" on storage.objects;
drop policy if exists "Admin can upload course thumbnails" on storage.objects;
drop policy if exists "Admin can upload lesson videos" on storage.objects;

-- Set up storage policies
create policy "Public course thumbnails"
on storage.objects for select
using ( bucket_id = 'course-thumbnails' );

create policy "Public lesson videos"
on storage.objects for select
using ( bucket_id = 'lesson-videos' );

create policy "Admin can upload course thumbnails"
on storage.objects for insert
with check (
  bucket_id = 'course-thumbnails' and
  auth.role() = 'authenticated' and
  exists (
    select 1 from profiles
    where id = auth.uid() and is_admin = true
  )
);

create policy "Admin can upload lesson videos"
on storage.objects for insert
with check (
  bucket_id = 'lesson-videos' and
  auth.role() = 'authenticated' and
  exists (
    select 1 from profiles
    where id = auth.uid() and is_admin = true
  )
);

-- Update courses table to use file paths
alter table courses
alter column thumbnail_url type text;

alter table courses
rename column thumbnail_url to thumbnail_path;

-- Update lessons table to use file paths
alter table lessons
alter column video_url type text;

alter table lessons
rename column video_url to video_path;

-- Add order_index to exercises table
alter table exercises
add column if not exists order_index integer not null default 0; 