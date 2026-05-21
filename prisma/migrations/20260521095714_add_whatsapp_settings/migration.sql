-- Seed default WhatsApp contact settings (idempotent)
INSERT INTO "settings" ("id", "key", "value", "type", "updated_at") VALUES
  (gen_random_uuid(), 'whatsapp_number', '0822882231533', 'string', NOW()),
  (gen_random_uuid(), 'whatsapp_topup_message', 'Halo Admin, saya mau topup saldo Rp {amount} untuk akun {email}', 'string', NOW()),
  (gen_random_uuid(), 'whatsapp_withdraw_message', 'Halo Admin, saya mau withdraw saldo Rp {amount} untuk akun {email}', 'string', NOW())
ON CONFLICT ("key") DO NOTHING;
