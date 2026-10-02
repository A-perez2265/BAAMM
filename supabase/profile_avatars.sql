-- Add preset avatar selection; existing ownership policies still apply.
begin;
alter table public.profiles add column if not exists avatar_id text;
alter table public.profiles drop constraint if exists profiles_avatar_id_allowed;
alter table public.profiles add constraint profiles_avatar_id_allowed
check (avatar_id is null or avatar_id in ('black-cat','hound-dog','grizzly-bear','horse','axolotl','oranda-goldfish','wolf','capybara','frog','snake','penguin','rabbit','jaguar','otter','goose','black-mamba','tortoise','butterfly','cardinal','black-widow-spider','pig','skunk','orca','hedgehog','praying-mantis','white-lamb','pangolin','giraffe','hippo','seahorse','koala','jellyfish','chameleon','peacock','red-dragon'));
commit;
