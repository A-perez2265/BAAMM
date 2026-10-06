
-- best attempt at detection of recognizable contact details (email, phone, street address) in public text fields
begin;
create or replace function public.reject_public_contact_details()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  field_name text;
  content text;
  public_fields text[];
begin
  if TG_TABLE_NAME = 'profiles' then
    public_fields := array['display_name', 'username', 'bio', 'location'];
  else
    public_fields := array['title', 'description', 'category', 'listing_type', 'tags', 'experience_level', 'format', 'language', 'location'];
  end if;
  foreach field_name in array public_fields loop
    -- JSON tags arrays retain whitespace after punctuation is replaced.
    content := normalize(coalesce(to_jsonb(NEW)->>field_name, ''), NFKC);
    content := replace(replace(replace(content, chr(8203), ''), chr(8204), ''), chr(8205), '');
    content := replace(content, chr(65279), '');
    content := regexp_replace(content, '\s*\[at\]\s*', '@', 'gi');
    content := regexp_replace(content, '\s*\[dot\]\s*', '.', 'gi');
    content := regexp_replace(content, '[#"\[\],]', ' ', 'g');
    -- Normalize common (at)/(dot) disguises before testing.
    content := regexp_replace(content, '\s*\(at\)\s*', '@', 'gi');
    content := regexp_replace(content, '\s*\(dot\)\s*', '.', 'gi');
    if content ~* '[a-z0-9.!$%&''*+/=?^_`{|}~-]+\s*@\s*[a-z0-9-]+(\s*\.\s*[a-z0-9-]+)+'
      or content ~* '(\+?[0-9][[:space:]().-]*){7,}'
      or content ~* '[0-9]+[a-z]?\s+([a-z0-9.''-]+\s+){0,6}(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|way|parkway|pkwy|terrace|ter|trail|trl|place|pl|highway|hwy)\M'
      or content ~* '[0-9]+[a-z]?\s*[a-z[:space:].''-]{1,100}(street|avenue|road|drive|lane|boulevard|court|circle|parkway|terrace|trail|place|highway)'
      or content ~* '(p\.?\s*o\.?|post office)\s*box\s*[0-9]+'
    then
      raise exception using errcode = '23514', message = 'PUBLIC_CONTACT_DETAILS: Remove email addresses, phone numbers, and street addresses from public details.';
    end if;
  end loop;
  return NEW;
end;
$$;

drop trigger if exists profiles_public_text_privacy on public.profiles;
create trigger profiles_public_text_privacy before insert or update on public.profiles
for each row execute function public.reject_public_contact_details();
drop trigger if exists skills_public_text_privacy on public.skills;
create trigger skills_public_text_privacy before insert or update on public.skills
for each row execute function public.reject_public_contact_details();
commit;
