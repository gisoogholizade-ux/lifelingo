-- get_learner_intelligence_v1 bootstraps missing learner rows through
-- ensure_learner_model_v1, so it must not run as a read-only STABLE function.
alter function public.get_learner_intelligence_v1() volatile;
