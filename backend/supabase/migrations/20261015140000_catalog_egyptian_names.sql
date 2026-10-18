-- Product names in Egyptian Arabic (the app's copy is now Egyptian). Old names stay as search words,
-- and dialect-specific words are kept per dialect («عيش» = bread in Egypt, rice in the Gulf;
-- «لبن» = milk in Egypt, yogurt in the Gulf and the Levant). Items already on lists keep their names.

update public.catalog set name = 'لبن كامل الدسم' where id = 'c1';
update public.catalog set name = 'لبن خالي الدسم' where id = 'c2';
update public.catalog set name = 'عيش فينو' where id = 'c5';
update public.catalog set name = 'عيش توست' where id = 'c6';
update public.catalog set name = 'مياه' where id = 'c8';
update public.catalog set name = 'زبادي' where id = 'c9';
update public.catalog set name = 'بن' where id = 'c10';
update public.catalog set name = 'جبنة' where id = 'c15';
update public.catalog set name = 'مسحوق غسيل' where id = 'c19';
update public.catalog set name = 'حبهان' where id = 'c20';
update public.catalog set name = 'حبهان مطحون' where id = 'c21';

-- «لبن» means yogurt only outside Egypt now
delete from public.catalog_aliases where catalog_id = 'c9' and alias = 'لبن' and dialect is null;

insert into public.catalog_aliases (catalog_id, alias, dialect) values
  ('c1', 'لبن', 'egyptian'),
  ('c1', 'لبن كامل', null),
  ('c1', 'حليب كامل الدسم', null),
  ('c2', 'لبن', 'egyptian'),
  ('c2', 'لبن خالي', null),
  ('c2', 'حليب قليل الدسم', null),
  ('c5', 'عيش', 'egyptian'),
  ('c5', 'فينو', null),
  ('c5', 'خبز صامولي', null),
  ('c6', 'عيش', 'egyptian'),
  ('c6', 'خبز توست', null),
  ('c8', 'ماء', null),
  ('c8', 'ميه', null),
  ('c9', 'لبن', 'saudi'),
  ('c9', 'لبن', 'emirati'),
  ('c9', 'لبن', 'kuwaiti'),
  ('c9', 'لبن', 'levantine'),
  ('c9', 'لبن زبادي', null),
  ('c10', 'قهوة عربية', null),
  ('c15', 'جبن', null),
  ('c19', 'صابون غسيل', null),
  ('c20', 'هيل', null),
  ('c21', 'هيل مطحون', null)
on conflict do nothing;
