# Assessment Fairness Explorer

## A context-aware interpretation prototype using TIMSS 2023 Grade 8 mathematics

### Purpose

This study stems from my curiosity to understand when observed differences in assessment results reflect true differences in learning and when they may indicate unequal opportunities to demonstrate learning. The tool curated aims to provide a structured approach to interpreting these differences in the context of TIMSS 2023 Grade 8 mathematics, asking:

> When should a difference in assessment results prompt an investigation into unequal opportunity to demonstrate learning?

The tool converts three common contextual patterns into an appropriate next research action, the evidence needed before that action, and a decision threshold for escalation. 

### Dataset and scope

The prototype uses the TIMSS 2023 Grade 8 International Database for five illustrative participating systems: Australia, England, Singapore, the United Arab Emirates, and the United States, chosen to demonstrate how the same interpretation workflow applies across different education systems. 

The outcome is mathematics achievement, and each displayed estimate is a student-weighted descriptive mean across TIMSS's five mathematics plausible values. The analysis joins student records to the school-context file through the TIMSS school identifier and retains only aggregated results in the application.

The explorer presents the accompanying unweighted student count, share of valid group records, and number of represented schools so that a visible score pattern is not separated from the practical size of the group it describes.

Three contextual signals are presented:

1. <u>Language of the test spoken at home</u>: a prompt to investigate construct-irrelevant language demands, translation, response processes, and multilingual comparability.
2. <u>Home educational resources</u>: a prompt to investigate opportunity to learn and access to the conditions needed to demonstrate competence.
3. <u>School socioeconomic composition</u>: a prompt to model students nested within schools and examine whether school-level opportunity structures shape score patterns.

### What the initial summaries show

The home-educational-resources comparison produced an observed span of about 90 to 116 TIMSS scale points between the `Many resources` and `Few resources` groups in each selected system. Each mean is shown with its 95% confidence interval (TIMSS jackknife repeated replication across `JKZONE`/`JKREP`, combined with Rubin's rules across the five mathematics plausible values):

| System | Many resources (95% CI) | Few resources (95% CI) | Observed span |
|---|---:|---:|---:|
| Australia | 549.7 [543.7, 555.7] | 439.6 [425.9, 453.4] | 110.1 |
| England | 574.7 [565.8, 583.7] | 458.9 [447.1, 470.6] | 115.8 |
| Singapore | 648.5 [639.4, 657.7] | 545.0 [527.1, 563.0] | 103.5 |
| United Arab Emirates | 537.0 [531.9, 542.0] | 447.4 [442.7, 452.1] | 89.6 |
| United States | 545.4 [537.1, 553.7] | 436.7 [427.2, 446.2] | 108.7 |

In every system shown, the two groups' confidence intervals stay separate, so each span is a statistically stable descriptive difference rather than sampling noise, a stronger claim than the point estimate alone, and a descriptive one rather than a causal or bias claim (see below).

School socioeconomic composition also showed substantial descriptive spans, ranging from 47.8 points in the United Arab Emirates to 110.8 points in Singapore between `More affluent` and `More disadvantaged` schools.

These are descriptive spans that establish why an assessment or programme team should avoid a simple learner-level explanation and commission further inquiry into resources, school composition, or bias, rather than establishing that any of those actually caused the score difference.

### From a signal to a defensible action

| Observed pattern | Inappropriate conclusion | Appropriate next step |
|---|---|---|
| Differences by test language spoken at home | “Students who use another language are weaker in mathematics.” | Examine language demand and translation; conduct cognitive interviews; test comparability across language groups. |
| Differences by home educational resources | “Students with fewer resources have lower ability.” | Examine opportunity to learn, access to instructional support, and whether assessment conditions introduce avoidable disadvantage. |
| Differences by school composition | “Individual students explain the pattern.” | Fit a multilevel model and combine quantitative findings with school-context evidence before recommending change. |

### Analytical limitations

This version implements one piece of formal inference by design, and draws a deliberate line around it:

- It computes 95% confidence intervals via the TIMSS jackknife repeated replication procedure combined with Rubin's rules across the five plausible values (`analysis/timss_variance.py`). The national mean and SE calculations were externally verified against Exhibit 1.2.1 of the TIMSS 2023 International Results in Mathematics and Science for all five selected systems: Australia 508.7 (3.48) vs. published 509 (3.5); England 524.8 (4.54) vs. 525 (4.5); Singapore 605.3 (6.05) vs. 605 (6.1); United Arab Emirates 488.5 (1.73) vs. 489 (1.7); and United States 488.0 (4.19) vs. 488 (4.2). Subgroup values use the same method but have no corresponding official publication table, so remain descriptive.
- A causal model, a multilevel model, measurement invariance, and differential item functioning are the layer of analysis this version leaves for follow-up work.
- Missing data, intersectional subgroups, test accommodations, item-level response processes, and consequences of score use are similarly out of scope here.
- The interface presents 15 group comparisons (5 systems × 3 factors), each read from its own confidence interval with no multiple-comparison adjustment. That is consistent with the tool's descriptive, triage purpose — treat each interval as one input to a judgment call, not as a hypothesis test with a controlled error rate.
- Its scope stays illustrative of a workflow demonstration built on public TIMSS data, separate from IB assessments, IB schools, or IB learners.

That boundary is part of the tool's purpose: a responsible assessment dashboard makes the line between an early-warning signal and a defensible conclusion visible.

### Reproducibility

`analysis/prepare_data.py` reads the relevant public TIMSS SPSS files, calculates the weighted summaries, and writes the only app data file: `data/summary.json`. No student-level record is copied into the interface.

**Source:** IEA. (2025). *TIMSS 2023 International Database*. https://www.iea.nl/data-tools/repository/timss


> **Assessment Fairness Explorer | TIMSS 2023**  
> An independent evidence prototype that uses international assessment data to show how contextual score patterns should guide follow-up validity and equity research rather than be over-interpreted as explanations.
