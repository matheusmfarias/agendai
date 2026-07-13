import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ComponentProps, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { Select } from "@/components/ui/select";

function select(
  props: Omit<ComponentProps<typeof Select>, "children">,
  children: ReactNode,
) {
  return createElement(
    Select,
    props as ComponentProps<typeof Select>,
    children,
  );
}

describe("Select accessibility and clear behavior", () => {
  it("forwards the accessible name to the interactive trigger", () => {
    const markup = renderToStaticMarkup(
      select(
        {
          value: "all",
          "aria-label": "Filtrar por categoria",
        },
        [
          createElement(
            "option",
            { key: "all", value: "all" },
            "Todas as categorias",
          ),
          createElement(
            "option",
            { key: "bookings", value: "bookings" },
            "Agendamentos",
          ),
        ],
      ),
    );

    expect(markup).toContain('aria-label="Filtrar por categoria"');
    expect(markup).toContain('aria-haspopup="listbox"');
    expect(markup).toContain('aria-expanded="false"');
  });

  it("does not render a clear action when clearable is false", () => {
    const markup = renderToStaticMarkup(
      select(
        { value: "all", clearable: false },
        createElement(
          "option",
          { value: "all" },
          "Todas as categorias",
        ),
      ),
    );

    expect(markup).not.toContain("Limpar seleção");
    expect(markup).toContain("Todas as categorias");
  });

  it("keeps the reusable default clear action for optional selected values", () => {
    const markup = renderToStaticMarkup(
      select(
        { value: "bookings" },
        createElement(
          "option",
          { value: "bookings" },
          "Agendamentos",
        ),
      ),
    );

    expect(markup).toContain("Limpar seleção");
  });
});
