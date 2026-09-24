#!/usr/bin/env python3
"""Create aggregated, disclosure-safe inputs for the local explorer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pyreadstat

from timss_variance import timss_group_estimate


COUNTRIES = {
    "aus": "Australia",
    "eng": "England",
    "sgp": "Singapore",
    "are": "United Arab Emirates",
    "usa": "United States",
}

PV_COLUMNS = [f"BSMMAT0{number}" for number in range(1, 6)]

STUDENT_COLUMNS = [
    "CTY",
    "IDSCHOOL",
    "TOTWGT",
    "JKZONE",
    "JKREP",
    "BSBG03",
    "BSDGHER",
    *PV_COLUMNS,
]
SCHOOL_COLUMNS = ["CTY", "IDSCHOOL", "BCDGSBC"]

FACTORS = {
    "home_language": {
        "column": "BSBG03",
        "title": "Language of the test spoken at home",
        "question": "How often does the student speak the language of the mathematics test at home?",
        "groups": {
            1: "Always",
            2: "Almost always",
            3: "Sometimes",
            4: "Never",
        },
        "next_action": (
            "This pattern is consistent with a language-access demand, though other explanations "
            "remain open. Review the construct's language demand, then use cognitive "
            "interviews and multilingual comparability analysis before drawing conclusions "
            "about mathematics learning."
        ),
        "evidence_needed": [
            "Map the language demand of the assessment task, instructions, and response format.",
            "Compare how learners across language groups interpret and respond to the task.",
            "Test whether scores support comparable interpretations across language groups.",
        ],
        "decision_gate": (
            "Escalate to an assessment-design change only if follow-up evidence identifies "
            "construct-irrelevant language demand or non-comparable score interpretations."
        ),
    },
    "home_resources": {
        "column": "BSDGHER",
        "title": "Home educational resources",
        "question": "How do mathematics results vary by students' reported home educational resources?",
        "groups": {
            1: "Many resources",
            2: "Some resources",
            3: "Few resources",
        },
        "next_action": (
            "This pattern is consistent with an opportunity-to-learn gap, though other explanations "
            "remain open. Pair any score pattern with evidence on access to learning resources, "
            "instructional opportunity and support, and read it as a systemic condition rather "
            "than a student-level deficit."
        ),
        "evidence_needed": [
            "Document differences in access to instructional materials, support, and learning time.",
            "Check whether assessment conditions add avoidable barriers to demonstrating learning.",
            "Use local qualitative evidence before interpreting a contextual pattern as an inequity mechanism.",
        ],
        "decision_gate": (
            "Prioritize changes to support or assessment conditions only when the observed "
            "pattern is corroborated by evidence on opportunity to learn."
        ),
    },
    "school_context": {
        "column": "BCDGSBC",
        "title": "School socioeconomic composition",
        "question": "How do mathematics results vary by the school's socioeconomic composition?",
        "groups": {
            1: "More affluent",
            2: "Neither more affluent nor more disadvantaged",
            3: "More disadvantaged",
        },
        "next_action": (
            "This pattern is consistent with school-level clustering, though it does not on its own "
            "identify a mechanism. Model students nested within schools, examine "
            "opportunity-to-learn differences, and avoid attributing school-context patterns "
            "to individual learners."
        ),
        "evidence_needed": [
            "Estimate how much score variation lies between schools rather than only between students.",
            "Examine school-level opportunity, resources, and intake context alongside achievement.",
            "Triangulate model results with evidence from the affected school communities.",
        ],
        "decision_gate": (
            "Recommend a school-level response only after multilevel and contextual evidence "
            "shows the pattern holds at the school level, beyond what an individual-level "
            "comparison alone would show."
        ),
    },
}


def summarize_factor(frame: pd.DataFrame, factor: dict) -> list[dict]:
    rows = []
    column = factor["column"]
    valid_frame = frame.dropna(subset=[column, "math_score", "TOTWGT"])
    valid_total = len(valid_frame)
    for code, label in factor["groups"].items():
        group = valid_frame.loc[valid_frame[column] == code]
        if group.empty:
            continue
        estimate = timss_group_estimate(group, PV_COLUMNS)
        if estimate is None:
            continue
        rows.append(
            {
                "code": code,
                "label": label,
                "unweighted_n": estimate["unweighted_n"],
                "student_share": round(len(group) / valid_total, 4),
                "school_n": int(group["IDSCHOOL"].nunique()),
                "weighted_mean": estimate["weighted_mean"],
                "se": estimate["se"],
                "ci_low": estimate["ci_low"],
                "ci_high": estimate["ci_high"],
            }
        )
    return rows


TIMSS_BENCHMARK_INTERVAL = 75  # approx. points between adjacent TIMSS international benchmarks


def magnitude_note(rows: list[dict]) -> str:
    """Describe the observed span between a factor's extreme groups in this country,
    in TIMSS benchmark-interval terms, as an escalation cue for the decision gate."""
    means = [row["weighted_mean"] for row in rows]
    if len(means) < 2:
        return "Too few groups in this system to assess a span."
    span = max(means) - min(means)
    levels = span / TIMSS_BENCHMARK_INTERVAL
    if levels < 0.5:
        urgency = "a modest signal; record it, but it does not on its own warrant escalation"
    elif levels < 1.0:
        urgency = "a moderate signal; route it to the standard secondary review"
    else:
        urgency = "a large signal; prioritize it for immediate follow-up"
    return f"In this system, the observed span is {round(span)} points (about {levels:.1f} TIMSS benchmark intervals) — {urgency}."


def load_country(data_dir: Path, code: str, name: str) -> dict:
    students, _ = pyreadstat.read_sav(
        data_dir / f"bsg{code}m8.sav",
        usecols=STUDENT_COLUMNS,
        apply_value_formats=False,
    )
    schools, _ = pyreadstat.read_sav(
        data_dir / f"bcg{code}m8.sav",
        usecols=SCHOOL_COLUMNS,
        apply_value_formats=False,
    )

    students["math_score"] = students[PV_COLUMNS].mean(axis=1)
    merged = students.merge(
        schools,
        on=["CTY", "IDSCHOOL"],
        how="left",
        validate="many_to_one",
    )
    valid_scores = merged.dropna(subset=["math_score", "TOTWGT"])

    factor_summaries = {}
    for identifier, factor in FACTORS.items():
        rows = summarize_factor(merged, factor)
        factor_summaries[identifier] = {
            "title": factor["title"],
            "question": factor["question"],
            "next_action": factor["next_action"],
            "evidence_needed": factor["evidence_needed"],
            "decision_gate": f"{factor['decision_gate']} {magnitude_note(rows)}",
            "groups": rows,
        }

    overall_estimate = timss_group_estimate(valid_scores, PV_COLUMNS)

    return {
        "code": code,
        "name": name,
        "student_count": int(len(merged)),
        "valid_score_count": int(len(valid_scores)),
        "school_count": int(merged["IDSCHOOL"].nunique()),
        "weighted_math_mean": overall_estimate["weighted_mean"],
        "weighted_math_se": overall_estimate["se"],
        "weighted_math_ci_low": overall_estimate["ci_low"],
        "weighted_math_ci_high": overall_estimate["ci_high"],
        "factors": factor_summaries,
    }


def build_summary(data_dir: Path) -> dict:
    countries = [
        load_country(data_dir, code, name) for code, name in COUNTRIES.items()
    ]
    return {
        "schema_version": "1.3",
        "generated_from": "TIMSS 2023 Grade 8 SPSS Data",
        "prep_script": "analysis/prepare_data.py",
        "title": "Assessment fairness explorer",
        "subtitle": "TIMSS 2023 Grade 8 mathematics: context-aware interpretation prompts",
        "dataset": {
            "name": "TIMSS 2023 International Database",
            "population": "Grade 8 students in five illustrative participating systems",
            "outcome": "Mathematics achievement, summarized across five plausible values",
            "design_note": (
                "Displayed estimates use TIMSS total student weights. Standard errors and 95% "
                "confidence intervals follow the TIMSS jackknife repeated replication (JRR) "
                "procedure over JKZONE/JKREP, combined with Rubin's rules across the five "
                "mathematics plausible values (see analysis/timss_variance.py for the exact "
                "method and its verification status). This is a descriptive analysis, scoped "
                "to weighted point estimates and their sampling uncertainty; measurement "
                "invariance, differential item functioning, multilevel modelling, and causal "
                "inference are the next layer of analysis, not part of this version."
            ),
        },
        "selection_note": (
            "Australia, England, Singapore, the United Arab Emirates and the United States "
            "were selected as illustrative systems for an independent portfolio prototype, "
            "chosen for contrast in language, resourcing and school composition rather than "
            "as an IB sample, a ranking, or a representative regional comparison."
        ),
        "guardrails": [
            "Confidence intervals reflect sampling and plausible-value imputation uncertainty; measurement invariance and differential item functioning remain open, unexamined questions.",
            "Subgroup estimates by language, resources and school composition are unadjusted, so they read best as prompts for inquiry into opportunity and context, ahead of any claim about an inequity's cause.",
            "The interface presents fifteen group comparisons across five systems and three factors, each drawn from its own interval without adjustment for running several comparisons at once; each is one input to a judgment, ahead of a hypothesis test with a controlled error rate.",
            "An operational decision would draw on the full TIMSS analytical approach, local context and governance that sit beyond this tool's scope.",
            "A causal model and a multilevel model are the layer of analysis this version leaves for follow-up work; missing data, intersectional subgroups, test accommodations, item-level response processes, and consequences of score use are similarly out of scope.",
            "Its scope stays illustrative, a workflow demonstration built on public TIMSS data, separate from IB assessments, IB schools, or IB learners.",
        ],
        "countries": countries,
        "source": {
            "citation": "IEA. (2025). TIMSS 2023 International Database.",
            "url": "https://www.iea.nl/data-tools/repository/timss",
            "accessed": "2026-09-23",
        },
    }


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare aggregated data for the Assessment Fairness Explorer."
    )
    parser.add_argument(
        "--data-dir",
        required=True,
        type=Path,
        help="Path to TIMSS 2023 Grade 8 SPSS Data directory.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/summary.json"),
        help="Output JSON path (default: data/summary.json).",
    )
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    if not arguments.data_dir.is_dir():
        raise SystemExit(f"TIMSS data directory not found: {arguments.data_dir}")

    summary = build_summary(arguments.data_dir)
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {arguments.output}")


if __name__ == "__main__":
    main()
