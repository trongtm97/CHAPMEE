-- Thời gian xử lý rút tiền hiển thị cho tác giả (tách khỏi payout.hold_days).
insert into public.monetization_settings (key, value, description, is_public)
values
  (
    'payout.processing_days_min',
    '1'::jsonb,
    'So ngay lam viec toi thieu hien thi khi xu ly rut tien.',
    true
  ),
  (
    'payout.processing_days_max',
    '5'::jsonb,
    'So ngay lam viec toi da hien thi khi xu ly rut tien.',
    true
  )
on conflict (key) do update
set
  value = excluded.value,
  description = excluded.description,
  is_public = excluded.is_public;

update public.monetization_settings
set value = '5'::jsonb
where key = 'payout.processing_days'
  and (value::text = '7' or value::text = '14');
