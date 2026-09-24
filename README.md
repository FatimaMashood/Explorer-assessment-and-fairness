# Assessment fairness explorer

An independent, local prototype that turns TIMSS 2023 Grade 8 mathematics patterns into **next research questions** for assessment teams. 

The explorer is designed to show how an observed outcome gap should trigger a specific, context-aware validity or equity investigation.

## What the prototype does

For Australia, England, Singapore, the United Arab Emirates, and the United States, the interface presents weighted descriptive mathematics results by:

1. How often students speak the language of the test at home;
2. Home educational resources; and
3. School socioeconomic composition.

For each comparison, the explorer recommends a suitable next action, such as cognitive interviews, a multilingual comparability study, opportunity-to-learn research, or multilevel modelling.

## How to read the explorer

1. Choose one illustrative system and one context signal.
2. Read the **descriptive span** and the plain-language interpretation before treating the visual as evidence.
3. Use the recommended next research action to decide what should be investigated, ahead of what the score difference proves.
4. Inspect the table for the unweighted student count, share of valid records, and number of represented schools. Small descriptive groups require particularly careful interpretation.

The selected view is reflected in the URL, so it can be reopened or shared locally, for example: `app/?system=eng&factor=home_resources`.

## Research design

- **Dataset:** TIMSS 2023 International Database, Grade 8.
- **Outcome:** Mathematics achievement, summarized across five plausible values.
- **Weighting:** TIMSS total student weight is applied to displayed point estimates.
- **School context:** Student records are joined to the corresponding school-context file.
- **Scope:** The output reports weighted descriptive point estimates with 95% confidence intervals from the TIMSS jackknife repeated replication procedure (JKZONE/JKREP) combined with Rubin's rules across the five mathematics plausible values, scoped to that descriptive layer — see `analysis/timss_variance.py` for the exact method, its verification status, and the further analyses (measurement invariance, differential item functioning, multilevel modelling, causal inference) this version leaves for follow-up work.
- **App behavior:** The browser interface handles loading and failed-data states explicitly, and must be opened through a local web server rather than directly as a `file://` page.

The included script reads only the selected source columns and writes aggregated summary data to `data/summary.json`. Raw TIMSS microdata are not copied into the app.

## Run locally in VS Code

### 1. Create the local environment

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

### 2. Build the aggregated data

```bash
.venv/bin/python analysis/prepare_data.py \
  --data-dir "/path/to/TIMSS 2023/datasets/SPSS Data"
```

### 3. Serve the project

The browser blocks local module/data requests from `file://`. Use VS Code's Live Server extension, or:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000/app/](http://localhost:8000/app/).

> **Assessment fairness explorer | TIMSS 2023**  
> An independent evidence prototype that uses international assessment data to show how contextual score patterns should guide follow-up validity and equity research rather than be over-interpreted as explanations.

## Source

IEA. (2025). *TIMSS 2023 International Database*. https://www.iea.nl/data-tools/repository/timss
