-- Signed-out visitors can't reach the phone-address functions at all (Supabase grants new functions to `anon`
-- by default; the previous migration only took it back from `public`). They already refused anyone without a
-- sign-in — this closes the door before that.
revoke all on function public.save_push_token(text, text, text) from anon;
revoke all on function public.forget_push_token(text) from anon;
