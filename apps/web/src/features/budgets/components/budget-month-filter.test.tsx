import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BudgetMonthFilter } from "./budget-month-filter";

describe("BudgetMonthFilter", () => {
  it("renders the month field with default value", () => {
    render(<BudgetMonthFilter month="2026-04" />);

    const monthInput = screen.getByLabelText("Mes") as HTMLInputElement;
    expect(monthInput).toHaveAttribute("type", "month");
    expect(monthInput.value).toBe("2026-04");
  });

  it("renders submit button for budget query flow", () => {
    render(<BudgetMonthFilter month="2026-04" />);

    expect(screen.getByRole("button", { name: "Ver presupuesto" })).toBeInTheDocument();
  });
});
