-- Block with a far-future date: the sign-in service can't read 'infinity' (it failed with a database error).
update auth.users set banned_until = '2999-01-01' where banned_until = 'infinity';

-- Block (can't sign in; signed out everywhere) or unblock someone
create or replace function public.admin_set_blocked(target uuid, blocked boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if target = (select auth.uid()) then
    raise exception 'you can''t block yourself';
  end if;
  update auth.users set banned_until = case when blocked then '2999-01-01'::timestamptz else null end where id = target;
  if blocked then
    delete from auth.sessions where user_id = target;
  end if;
end;
$$;
