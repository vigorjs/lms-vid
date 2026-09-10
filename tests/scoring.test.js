import { describe, expect, it } from "vitest";
import { calculateWeightedScore, canPassReview } from "@/features/reviews/scoring";

const criteria = [{ id: "technique", weight: 40 }, { id: "coordination", weight: 35 }, { id: "rhythm", weight: 25 }];
describe("review scoring", () => {
  it("calculates a weighted score", () => { expect(calculateWeightedScore(criteria, [{ criterionId: "technique", score: 90 }, { criterionId: "coordination", score: 80 }, { criterionId: "rhythm", score: 70 }])).toBe(81.5); });
  it("enforces passing threshold", () => { expect(canPassReview(75, 75)).toBe(true); expect(canPassReview(74.9, 75)).toBe(false); });
  it("rejects invalid rubric totals", () => { expect(() => calculateWeightedScore([{ id: "a", weight: 90 }], [{ criterionId: "a", score: 80 }])).toThrow(/100/); });
});
