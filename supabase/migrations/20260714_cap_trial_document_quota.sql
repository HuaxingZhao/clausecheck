-- Cap Trial users whose main pool was over-migrated from legacy credits (e.g. limit=10).
-- Pro / Team subscribers are left unchanged (pro_until set or subscription_status active/trialing).

BEGIN;

UPDATE public.document_quota dq
   SET quota_limit = 1,
       used = LEAST(dq.used, 1),
       updated_at = now()
  FROM public.users u
 WHERE dq.user_id = u.id
   AND dq.pool_id = 'main'
   AND dq.quota_limit > 1
   AND COALESCE(u.subscription_status, 'none') NOT IN ('active', 'trialing')
   AND u.pro_until IS NULL;

COMMIT;
