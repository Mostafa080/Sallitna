-- English / Hindi names that follow the Egyptian product names (helpers see these).
update public.catalog set translations = '{"en":"Fino bread","hi":"फ़िनो ब्रेड"}'::jsonb where id = 'c5';
update public.catalog set translations = '{"en":"Coffee","hi":"कॉफ़ी"}'::jsonb where id = 'c10';
update public.catalog set translations = '{"en":"Laundry detergent","hi":"कपड़े धोने का पाउडर"}'::jsonb where id = 'c19';
