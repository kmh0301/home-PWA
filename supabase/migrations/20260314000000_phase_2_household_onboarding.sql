-- Phase 2 household onboarding hardening.
-- Task 1: enforce single-household membership in v1 and persist household ownership.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT user_id
      FROM public.household_members
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) duplicate_memberships
  ) THEN
    RAISE EXCEPTION
      'Cannot apply Phase 2 household onboarding migration: duplicate household_members rows exist for one or more users.';
  END IF;
END;
$$;

ALTER TABLE public.households
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.households
ALTER COLUMN owner_user_id SET DEFAULT auth.uid();

WITH household_owners AS (
  SELECT DISTINCT ON (hm.household_id)
    hm.household_id,
    hm.user_id
  FROM public.household_members hm
  ORDER BY hm.household_id, hm.joined_at ASC, hm.id ASC
)
UPDATE public.households h
SET owner_user_id = ho.user_id
FROM household_owners ho
WHERE h.id = ho.household_id
  AND h.owner_user_id IS NULL;

ALTER TABLE public.households
ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_households_owner_user_id
ON public.households(owner_user_id);

ALTER TABLE public.household_members
ADD CONSTRAINT household_members_user_id_key UNIQUE (user_id);
