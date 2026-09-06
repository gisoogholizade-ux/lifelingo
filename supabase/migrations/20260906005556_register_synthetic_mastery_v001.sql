-- Development registry seed only (production migration 20260906005556). Metrics come from the reproducible synthetic
-- pipeline in ml-service; they do not represent production performance.
insert into private.dataset_versions(
  name,version,schema_version,consent_version,sanitizer_version,sample_count,
  sources,quality_distribution,split_information,artifact_uri
) values (
  'mastery','mastery-v001','1','synthetic-not-applicable','pii-v1',8689,
  '["SYNTHETIC_DEVELOPMENT_V1"]'::jsonb,
  '{"SYNTHETIC":8689}'::jsonb,
  '{"method":"grouped-by-learner","learners":600,"train":6068,"validation":1332,"test":1289}'::jsonb,
  'ml-service/data/mastery-v001.csv'
) on conflict(name,version) do update set
  sample_count=excluded.sample_count,
  sources=excluded.sources,
  quality_distribution=excluded.quality_distribution,
  split_information=excluded.split_information,
  artifact_uri=excluded.artifact_uri;

insert into private.model_registry(
  model_id,model_type,version,dataset_version,metrics,parameters,artifact_uri,status
) values (
  'mastery-logistic-regression-v001','NEXT_ANSWER_MASTERY','v001','mastery-v001',
  '{"accuracy":0.7750193948797518,"precision":0.7818181818181819,"recall":0.7794561933534743,"f1":0.7806354009077155,"rocAuc":0.8561967263668647,"brier":0.15459890417910327,"data":"SYNTHETIC"}'::jsonb,
  '{"algorithm":"logistic-regression","selection":"validation ROC-AUC minus 0.35 * Brier"}'::jsonb,
  'ml-service/artifacts/mastery-model.joblib','EXPERIMENTAL'
) on conflict(model_id,version) do update set
  dataset_version=excluded.dataset_version,
  metrics=excluded.metrics,
  parameters=excluded.parameters,
  artifact_uri=excluded.artifact_uri;

insert into private.training_runs(
  model_type,dataset_version,status,command,metrics,started_at,finished_at
) select
  'NEXT_ANSWER_MASTERY','mastery-v001','SUCCEEDED',
  'python scripts/train_mastery.py --dataset data/mastery-v001.csv',
  '{"selected":"logistic-regression","testRocAuc":0.8561967263668647,"testBrier":0.15459890417910327,"data":"SYNTHETIC"}'::jsonb,
  now(),now()
where not exists (
  select 1 from private.training_runs
  where model_type='NEXT_ANSWER_MASTERY' and dataset_version='mastery-v001' and status='SUCCEEDED'
);
