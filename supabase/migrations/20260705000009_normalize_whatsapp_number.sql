-- Normalize whatsapp_number to bare digits (no +, no spaces, no dashes)
-- so it matches the format Meta's webhook sends in msg.from (e.g. "14695550112")
update providers
set whatsapp_number = regexp_replace(whatsapp_number, '\D', '', 'g')
where whatsapp_number is not null
  and whatsapp_number != regexp_replace(whatsapp_number, '\D', '', 'g');
