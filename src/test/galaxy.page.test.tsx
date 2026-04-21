import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Galaxy from "@/pages/Galaxy";

describe("Galaxy page", () => {
  it("renders the MVP galaxy layer", () => {
    render(
      <MemoryRouter>
        <Galaxy />
      </MemoryRouter>,
    );

    expect(screen.getByText("Q Galaxy Layer")).toBeInTheDocument();
    expect(screen.getByText("کنترل سفینه")).toBeInTheDocument();
  });
});
