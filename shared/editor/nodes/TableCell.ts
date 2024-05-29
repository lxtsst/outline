import Token from "markdown-it/lib/token";
import { NodeSpec } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { addRow, selectedRect } from "prosemirror-tables";
import { DecorationSet, Decoration } from "prosemirror-view";
import { selectRow, selectTable } from "../commands/table";
import {
  getCellsInColumn,
  isRowSelected,
  isTableSelected,
} from "../queries/table";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { cn } from "../styles/utils";
import Node from "./Node";

export default class TableCell extends Node {
  get name() {
    return "td";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      tableRole: "cell",
      isolating: true,
      parseDOM: [{ tag: "td" }],
      toDOM(node) {
        return [
          "td",
          node.attrs.alignment
            ? { style: `text-align: ${node.attrs.alignment}` }
            : {},
          0,
        ];
      },
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        alignment: { default: null },
        colwidth: { default: null },
      },
    };
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return {
      block: "td",
      getAttrs: (tok: Token) => ({ alignment: tok.info }),
    };
  }

  get plugins() {
    function buildAddRowDecoration(pos: number, index: number) {
      const className = cn(EditorStyleHelper.tableAddRow, {
        first: index === 0,
      });

      return Decoration.widget(
        pos + 1,
        () => {
          const plus = document.createElement("a");
          plus.role = "button";
          plus.className = className;
          plus.dataset.index = index.toString();
          return plus;
        },
        {
          key: cn(className, index),
        }
      );
    }

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              if (!(event.target instanceof HTMLElement)) {
                return false;
              }

              const targetAddRow = event.target.closest(
                `.${EditorStyleHelper.tableAddRow}`
              );
              if (targetAddRow) {
                event.preventDefault();
                event.stopImmediatePropagation();
                view.dispatch(
                  addRow(
                    view.state.tr,
                    selectedRect(view.state),
                    Number(targetAddRow.getAttribute("data-index"))
                  )
                );
                return true;
              }

              const targetGrip = event.target.closest(
                `.${EditorStyleHelper.tableGrip}`
              );
              if (targetGrip) {
                event.preventDefault();
                event.stopImmediatePropagation();
                view.dispatch(selectTable(view.state));
                return true;
              }

              const targetGripRow = event.target.closest(
                `.${EditorStyleHelper.tableGripRow}`
              );
              if (targetGripRow) {
                event.preventDefault();
                event.stopImmediatePropagation();
                view.dispatch(
                  selectRow(
                    Number(targetGripRow.getAttribute("data-index")),
                    event.metaKey || event.shiftKey
                  )(view.state)
                );
                return true;
              }

              return false;
            },
          },
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            const rows = getCellsInColumn(0)(state);

            if (rows) {
              rows.forEach((pos, index) => {
                if (index === 0) {
                  const className = cn(EditorStyleHelper.tableGrip, {
                    selected: isTableSelected(state),
                  });

                  decorations.push(
                    Decoration.widget(
                      pos + 1,
                      () => {
                        const grip = document.createElement("a");
                        grip.role = "button";
                        grip.className = className;
                        return grip;
                      },
                      {
                        key: className,
                      }
                    )
                  );
                }

                const className = cn(EditorStyleHelper.tableGripRow, {
                  selected: isRowSelected(index)(state),
                  first: index === 0,
                  last: index === rows.length - 1,
                });

                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const grip = document.createElement("a");
                      grip.role = "button";
                      grip.className = className;
                      grip.dataset.index = index.toString();
                      return grip;
                    },
                    {
                      key: cn(className, index),
                    }
                  )
                );

                if (index === 0) {
                  decorations.push(buildAddRowDecoration(pos, index));
                }

                decorations.push(buildAddRowDecoration(pos, index + 1));
              });
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  }
}
