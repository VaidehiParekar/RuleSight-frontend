import { describe, expect, it } from "vitest";

import { GAPS, MAPPINGS, OBLIGATIONS, REMEDIATIONS } from "@/mocks/fixtures";

describe("demo fixtures", () => {
  it("follow the risk formula and priority bands in TEAM_PLAN_ONE_NIGHT.md §6", () => {
    for (const gap of GAPS) {
      const { criticality, severity, urgency } = gap.risk_factors;
      expect(gap.risk_score).toBe(criticality * severity * urgency);
      const expected = gap.risk_score >= 6 ? "P1" : gap.risk_score >= 3 ? "P2" : "P3";
      expect(gap.priority, gap.code).toBe(expected);
    }
  });

  it("match the 12 gaps and priorities in the answer key", () => {
    const priorities = Object.fromEntries(GAPS.map((gap) => [gap.code, gap.priority]));
    expect(priorities).toEqual({
      "G-01": "P2",
      "G-02": "P3",
      "G-03": "P2",
      "G-04": "P2",
      "G-05": "P3",
      "G-06": "P2",
      "G-07": "P1",
      "G-08": "P2",
      "NG-01": "P1",
      "NG-02": "P2",
      "NG-03": "P1",
      "NG-04": "P2",
    });
  });

  it("highlight only phrases that occur verbatim in each quote", () => {
    for (const obligation of OBLIGATIONS) {
      if (obligation.key_phrase) {
        expect(obligation.source_quote, obligation.code).toContain(obligation.key_phrase);
      }
    }
  });

  it("reference only obligations and gaps that exist", () => {
    const obligationIds = new Set(OBLIGATIONS.map((item) => item.id));
    const gapIds = new Set(GAPS.map((item) => item.id));
    for (const mapping of MAPPINGS)
      expect(obligationIds.has(mapping.obligation_id), mapping.id).toBe(true);
    for (const gap of GAPS) expect(obligationIds.has(gap.obligation_id), gap.code).toBe(true);
    for (const remediation of REMEDIATIONS)
      expect(gapIds.has(remediation.gap_id), remediation.id).toBe(true);
  });
});
