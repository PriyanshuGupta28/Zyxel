// hooks/useSpreadsheet.ts
import { useCallback, useRef } from "react";
import {
  type SpreadsheetState,
  type Sheet,
  type Cell,
  type CellFormat,
  type DropdownOptions,
  type HistoryEntry,
  type CellLink,
} from "@/types/spreadsheet.types";

const DEFAULT_ROW_HEIGHT = 30;
const DEFAULT_COLUMN_WIDTH = 100;

export const useSpreadsheet = (
  state: SpreadsheetState,
  setState: React.Dispatch<React.SetStateAction<SpreadsheetState>>
) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>(null);

  const debouncedUpdate = useCallback(
    (
      updateFn: (prev: SpreadsheetState) => SpreadsheetState,
      immediate = false
    ) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      if (immediate) {
        setState(updateFn);
      } else {
        updateTimeoutRef.current = setTimeout(() => {
          setState(updateFn);
        }, 10);
      }
    },
    [setState]
  );

  const saveToHistory = useCallback(() => {
    setState((prev) => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      const historyEntry: HistoryEntry = {
        sheets: JSON.parse(JSON.stringify(prev.sheets)),
        selectedCells: [...prev.selectedCells],
      };
      newHistory.push(historyEntry);

      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, [setState]);

  const calculateRowHeight = useCallback(
    (row: number, sheet: Sheet): number => {
      let maxHeight = sheet.rowHeights[row] || DEFAULT_ROW_HEIGHT;

      for (let col = 0; col < 26; col++) {
        const cellId = `${row}-${col}`;
        const cell = sheet.cells[cellId];

        if (cell?.format?.textWrap === "wrap" && cell.value) {
          const columnWidth = sheet.columnWidths[col] || DEFAULT_COLUMN_WIDTH;
          const fontSize = cell.format.fontSize || 14;
          const lineHeight = fontSize * 1.5;

          const charsPerLine = Math.floor(columnWidth / (fontSize * 0.6));
          const lines = Math.ceil(cell.value.length / charsPerLine);
          const requiredHeight = Math.max(
            DEFAULT_ROW_HEIGHT,
            lines * lineHeight + 8
          );

          maxHeight = Math.max(maxHeight, requiredHeight);
        }
      }

      return maxHeight;
    },
    []
  );

  const handleCellChange = useCallback(
    (cellId: string, value: string, saveHistory = true) => {
      debouncedUpdate((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const existingCell = activeSheet.cells[cellId];
        const updatedCell: Cell = {
          id: cellId,
          value,
          format: existingCell?.format,
          dropdown: existingCell?.dropdown,
          link: existingCell?.link,
          merged: existingCell?.merged,
        };

        const updatedSheet: Sheet = {
          ...activeSheet,
          cells: {
            ...activeSheet.cells,
            [cellId]: updatedCell,
          },
        };

        if (updatedCell.format?.textWrap === "wrap") {
          const [row] = cellId.split("-").map(Number);
          const newHeight = calculateRowHeight(row, updatedSheet);
          if (
            newHeight > (updatedSheet.rowHeights[row] || DEFAULT_ROW_HEIGHT)
          ) {
            updatedSheet.rowHeights = {
              ...updatedSheet.rowHeights,
              [row]: newHeight,
            };
          }
        }

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      }, true);

      if (saveHistory) {
        saveToHistory();
      }
    },
    [debouncedUpdate, calculateRowHeight, saveToHistory]
  );

  const handleCellFormatChange = useCallback(
    (cellIds: string[], format: Partial<CellFormat>) => {
      debouncedUpdate((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const updatedCells = { ...activeSheet.cells };
        const updatedRowHeights = { ...activeSheet.rowHeights };
        const affectedRows = new Set<number>();

        cellIds.forEach((cellId) => {
          const existingCell = updatedCells[cellId] || {
            id: cellId,
            value: "",
          };
          const existingFormat = existingCell.format || {};

          const newFormat: CellFormat = { ...existingFormat };

          Object.entries(format).forEach(([key, value]) => {
            if (
              typeof value === "boolean" &&
              typeof existingFormat[key as keyof CellFormat] === "boolean"
            ) {
              (newFormat as Record<string, boolean>)[key] =
                !existingFormat[key as keyof CellFormat];
            } else {
              (newFormat as Record<string, any>)[key] = value;
            }
          });

          updatedCells[cellId] = {
            ...existingCell,
            format: newFormat,
          };

          if (format.textWrap !== undefined) {
            const [row] = cellId.split("-").map(Number);
            affectedRows.add(row);
          }
        });

        affectedRows.forEach((row) => {
          const newHeight = calculateRowHeight(row, {
            ...activeSheet,
            cells: updatedCells,
          });
          updatedRowHeights[row] = newHeight;
        });

        const updatedSheet: Sheet = {
          ...activeSheet,
          cells: updatedCells,
          rowHeights: updatedRowHeights,
        };

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      });
      saveToHistory();
    },
    [debouncedUpdate, calculateRowHeight, saveToHistory]
  );

  const handleMergeCells = useCallback(
    (cellIds: string[]) => {
      if (cellIds.length < 2) return;

      setState((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        // Find the bounds of selected cells
        const rows = cellIds.map((id) => parseInt(id.split("-")[0]));
        const cols = cellIds.map((id) => parseInt(id.split("-")[1]));
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);

        const originCellId = `${minRow}-${minCol}`;
        const rowSpan = maxRow - minRow + 1;
        const colSpan = maxCol - minCol + 1;

        const updatedCells = { ...activeSheet.cells };
        const updatedMergedCells = { ...activeSheet.mergedCells };

        // Mark origin cell
        updatedMergedCells[originCellId] = {
          rowSpan,
          colSpan,
          isOrigin: true,
        };

        // Mark other cells as merged
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            const cellId = `${r}-${c}`;
            if (cellId !== originCellId) {
              updatedMergedCells[cellId] = {
                rowSpan: 1,
                colSpan: 1,
                isOrigin: false,
                originCell: originCellId,
              };
              // Preserve the cell but mark it as merged
              if (!updatedCells[cellId]) {
                updatedCells[cellId] = { id: cellId, value: "" };
              }
              updatedCells[cellId].merged = updatedMergedCells[cellId];
            }
          }
        }

        // Update origin cell
        if (!updatedCells[originCellId]) {
          updatedCells[originCellId] = { id: originCellId, value: "" };
        }
        updatedCells[originCellId].merged = updatedMergedCells[originCellId];

        const updatedSheet: Sheet = {
          ...activeSheet,
          cells: updatedCells,
          mergedCells: updatedMergedCells,
        };

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      });
      saveToHistory();
    },
    [setState, saveToHistory]
  );

  const handleUnmergeCells = useCallback(
    (cellIds: string[]) => {
      setState((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const updatedCells = { ...activeSheet.cells };
        const updatedMergedCells = { ...activeSheet.mergedCells };

        cellIds.forEach((cellId) => {
          const mergedInfo = updatedMergedCells[cellId];
          if (mergedInfo?.isOrigin) {
            // Unmerge all cells in the merged range
            const [row, col] = cellId.split("-").map(Number);
            for (let r = row; r < row + mergedInfo.rowSpan; r++) {
              for (let c = col; c < col + mergedInfo.colSpan; c++) {
                const targetCellId = `${r}-${c}`;
                delete updatedMergedCells[targetCellId];
                if (updatedCells[targetCellId]) {
                  delete updatedCells[targetCellId].merged;
                }
              }
            }
          } else if (mergedInfo?.originCell) {
            // Find and unmerge from origin
            const originMerged = updatedMergedCells[mergedInfo.originCell];
            if (originMerged) {
              const [row, col] = mergedInfo.originCell.split("-").map(Number);
              for (let r = row; r < row + originMerged.rowSpan; r++) {
                for (let c = col; c < col + originMerged.colSpan; c++) {
                  const targetCellId = `${r}-${c}`;
                  delete updatedMergedCells[targetCellId];
                  if (updatedCells[targetCellId]) {
                    delete updatedCells[targetCellId].merged;
                  }
                }
              }
            }
          }
        });

        const updatedSheet: Sheet = {
          ...activeSheet,
          cells: updatedCells,
          mergedCells: updatedMergedCells,
        };

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      });
      saveToHistory();
    },
    [setState, saveToHistory]
  );

  const handleCellLinkChange = useCallback(
    (cellId: string, link: CellLink | null) => {
      setState((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const existingCell = activeSheet.cells[cellId] || {
          id: cellId,
          value: "",
        };

        const updatedCell: Cell = {
          ...existingCell,
          link: link || undefined,
        };

        const updatedSheet: Sheet = {
          ...activeSheet,
          cells: {
            ...activeSheet.cells,
            [cellId]: updatedCell,
          },
        };

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      });
      saveToHistory();
    },
    [setState, saveToHistory]
  );

  const handleCellDropdownChange = useCallback(
    (cellId: string, dropdown: DropdownOptions | null) => {
      setState((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const existingCell = activeSheet.cells[cellId] || {
          id: cellId,
          value: "",
        };

        const updatedCell: Cell = {
          ...existingCell,
          dropdown: dropdown || undefined,
        };

        if (dropdown && dropdown.options.length > 0 && !existingCell.value) {
          updatedCell.value = dropdown.options[0].value;
        }

        const updatedSheet: Sheet = {
          ...activeSheet,
          cells: {
            ...activeSheet.cells,
            [cellId]: updatedCell,
          },
        };

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      });
      saveToHistory();
    },
    [setState, saveToHistory]
  );

  const handleFillCells = useCallback(
    (sourceCellIds: string[], targetCellIds: string[]) => {
      debouncedUpdate((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const updatedCells = { ...activeSheet.cells };
        const updatedRowHeights = { ...activeSheet.rowHeights };
        const sourceCell = activeSheet.cells[sourceCellIds[0]];

        if (sourceCell) {
          const affectedRows = new Set<number>();

          targetCellIds.forEach((cellId) => {
            updatedCells[cellId] = {
              ...sourceCell,
              id: cellId,
              value: sourceCell.value,
              format: sourceCell.format ? { ...sourceCell.format } : undefined,
              dropdown: sourceCell.dropdown
                ? { ...sourceCell.dropdown }
                : undefined,
              link: sourceCell.link ? { ...sourceCell.link } : undefined,
            };

            if (sourceCell.format?.textWrap === "wrap") {
              const [row] = cellId.split("-").map(Number);
              affectedRows.add(row);
            }
          });

          affectedRows.forEach((row) => {
            const newHeight = calculateRowHeight(row, {
              ...activeSheet,
              cells: updatedCells,
            });
            updatedRowHeights[row] = newHeight;
          });
        }

        const updatedSheet: Sheet = {
          ...activeSheet,
          cells: updatedCells,
          rowHeights: updatedRowHeights,
        };

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      });
      saveToHistory();
    },
    [debouncedUpdate, calculateRowHeight, saveToHistory]
  );

  const handleCellSelect = useCallback(
    (cellIds: string[], multi?: boolean) => {
      debouncedUpdate(
        (prev) => ({
          ...prev,
          selectedCells:
            multi && prev.selectedCells.length > 0
              ? [...new Set([...prev.selectedCells, ...cellIds])]
              : cellIds,
        }),
        true
      );
    },
    [debouncedUpdate]
  );

  const handleCellEdit = useCallback(
    (cellId: string | null) => {
      setState((prev) => ({
        ...prev,
        editingCell: cellId,
        selectedCells: cellId ? [cellId] : prev.selectedCells,
      }));
    },
    [setState]
  );

  const handleUndo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        const historyState = prev.history[newIndex];
        return {
          ...prev,
          sheets: JSON.parse(JSON.stringify(historyState.sheets)),
          selectedCells: [...historyState.selectedCells],
          historyIndex: newIndex,
          editingCell: null,
        };
      }
      return prev;
    });
  }, [setState]);

  const handleRedo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        const historyState = prev.history[newIndex];
        return {
          ...prev,
          sheets: JSON.parse(JSON.stringify(historyState.sheets)),
          selectedCells: [...historyState.selectedCells],
          historyIndex: newIndex,
          editingCell: null,
        };
      }
      return prev;
    });
  }, [setState]);

  const handleCopy = useCallback(() => {
    setState((prev) => {
      const activeSheet = prev.sheets.find((s) => s.id === prev.activeSheetId);
      if (!activeSheet) return prev;

      const copiedCells = prev.selectedCells.map(
        (cellId) => activeSheet.cells[cellId] || { id: cellId, value: "" }
      );

      return {
        ...prev,
        copiedCells,
      };
    });
  }, [setState]);

  const handlePaste = useCallback(() => {
    debouncedUpdate((prev) => {
      if (prev.copiedCells.length === 0) return prev;

      const activeSheet = prev.sheets.find((s) => s.id === prev.activeSheetId);
      if (!activeSheet) return prev;

      const updatedCells = { ...activeSheet.cells };
      const updatedRowHeights = { ...activeSheet.rowHeights };
      const affectedRows = new Set<number>();

      prev.selectedCells.forEach((cellId, index) => {
        const sourceCell = prev.copiedCells[index % prev.copiedCells.length];
        updatedCells[cellId] = {
          ...sourceCell,
          id: cellId,
        };

        if (sourceCell.format?.textWrap === "wrap") {
          const [row] = cellId.split("-").map(Number);
          affectedRows.add(row);
        }
      });

      affectedRows.forEach((row) => {
        const newHeight = calculateRowHeight(row, {
          ...activeSheet,
          cells: updatedCells,
        });
        updatedRowHeights[row] = newHeight;
      });

      const updatedSheet: Sheet = {
        ...activeSheet,
        cells: updatedCells,
        rowHeights: updatedRowHeights,
      };

      return {
        ...prev,
        sheets: prev.sheets.map((s) =>
          s.id === activeSheet.id ? updatedSheet : s
        ),
      };
    });
    saveToHistory();
  }, [debouncedUpdate, calculateRowHeight, saveToHistory]);

  const handleDelete = useCallback(() => {
    debouncedUpdate((prev) => {
      const activeSheet = prev.sheets.find((s) => s.id === prev.activeSheetId);
      if (!activeSheet) return prev;

      const updatedCells = { ...activeSheet.cells };
      prev.selectedCells.forEach((cellId) => {
        if (updatedCells[cellId]) {
          updatedCells[cellId] = {
            ...updatedCells[cellId],
            value: "",
          };
        } else {
          updatedCells[cellId] = {
            id: cellId,
            value: "",
          };
        }
      });

      const updatedSheet: Sheet = {
        ...activeSheet,
        cells: updatedCells,
      };

      return {
        ...prev,
        sheets: prev.sheets.map((s) =>
          s.id === activeSheet.id ? updatedSheet : s
        ),
      };
    });
    saveToHistory();
  }, [debouncedUpdate, saveToHistory]);

  const resizeColumn = useCallback(
    (col: number, width: number) => {
      debouncedUpdate((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const updatedSheet: Sheet = {
          ...activeSheet,
          columnWidths: {
            ...activeSheet.columnWidths,
            [col]: width,
          },
        };

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      });
    },
    [debouncedUpdate]
  );

  const resizeRow = useCallback(
    (row: number, height: number) => {
      debouncedUpdate((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const updatedSheet: Sheet = {
          ...activeSheet,
          rowHeights: {
            ...activeSheet.rowHeights,
            [row]: height,
          },
        };

        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.id === activeSheet.id ? updatedSheet : s
          ),
        };
      });
    },
    [debouncedUpdate]
  );

  const addSheet = useCallback(() => {
    setState((prev) => {
      const newSheet: Sheet = {
        id: `sheet-${Date.now()}`,
        name: `Sheet${prev.sheets.length + 1}`,
        cells: {},
        rowHeights: {},
        columnWidths: {},
        mergedCells: {},
      };

      return {
        ...prev,
        sheets: [...prev.sheets, newSheet],
        activeSheetId: newSheet.id,
      };
    });
  }, [setState]);

  const deleteSheet = useCallback(
    (sheetId: string) => {
      setState((prev) => {
        if (prev.sheets.length === 1) return prev;

        const filteredSheets = prev.sheets.filter((s) => s.id !== sheetId);
        const newActiveSheet =
          prev.activeSheetId === sheetId
            ? filteredSheets[0].id
            : prev.activeSheetId;

        return {
          ...prev,
          sheets: filteredSheets,
          activeSheetId: newActiveSheet,
        };
      });
    },
    [setState]
  );

  const renameSheet = useCallback(
    (sheetId: string, name: string) => {
      setState((prev) => ({
        ...prev,
        sheets: prev.sheets.map((s) => (s.id === sheetId ? { ...s, name } : s)),
      }));
    },
    [setState]
  );

  const duplicateSheet = useCallback(
    (sheetId: string) => {
      setState((prev) => {
        const sheetToDuplicate = prev.sheets.find((s) => s.id === sheetId);
        if (!sheetToDuplicate) return prev;

        const newSheet: Sheet = {
          ...JSON.parse(JSON.stringify(sheetToDuplicate)),
          id: `sheet-${Date.now()}`,
          name: `${sheetToDuplicate.name} Copy`,
        };

        return {
          ...prev,
          sheets: [...prev.sheets, newSheet],
          activeSheetId: newSheet.id,
        };
      });
    },
    [setState]
  );

  const changeSheetColor = useCallback(
    (sheetId: string, color: string) => {
      setState((prev) => ({
        ...prev,
        sheets: prev.sheets.map((s) =>
          s.id === sheetId ? { ...s, color } : s
        ),
      }));
    },
    [setState]
  );

  return {
    handleCellChange,
    handleCellFormatChange,
    handleCellLinkChange,
    handleCellDropdownChange,
    handleMergeCells,
    handleUnmergeCells,
    handleFillCells,
    handleCellSelect,
    handleCellEdit,
    handleUndo,
    handleRedo,
    handleCopy,
    handlePaste,
    handleDelete,
    addSheet,
    deleteSheet,
    renameSheet,
    duplicateSheet,
    changeSheetColor,
    resizeColumn,
    resizeRow,
  };
};
