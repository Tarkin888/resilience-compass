UPDATE thresholds 
SET threshold_value = 3,
    qualifier_label = 'Governance figures confirmed by Rick, 12 Jun 2026 — to be reconfirmed 6 Jul',
    updated_at = now()
WHERE kri_id = 'sickness_absence';

UPDATE thresholds 
SET threshold_value = 8,
    qualifier_label = 'Governance figures confirmed by Rick, 12 Jun 2026 — to be reconfirmed 6 Jul',
    updated_at = now()
WHERE kri_id = 'vacancy';