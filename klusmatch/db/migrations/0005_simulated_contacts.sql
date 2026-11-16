-- Conversations started from the local WhatsApp simulator are marked, so their replies always stay
-- in the simulator, also when the real WhatsApp Cloud API is enabled on the same deployment.
alter table wa_contacts add column simulated boolean not null default false;

-- Backfill: contacts that ever sent a simulator message are simulated conversations.
update wa_contacts c set simulated = true
where exists (select 1 from wa_inbound_events e where e.phone_e164 = c.phone_e164 and e.wa_message_id like 'wamid.sim.%');
