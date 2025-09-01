// hooks/useSpreadsheet.ts
import { useCallback } from "react";
import {
  type SpreadsheetState,
  type Sheet,
  type Cell,
  type CellFormat,
  type DropdownOptions,
  type HistoryEntry,
} from "@/types/claude/spreadsheet.types";

export const useSpreadsheet = (
  state: SpreadsheetState,
  setState: React.Dispatch<React.SetStateAction<SpreadsheetState>>
) => {
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

  const handleCellChange = useCallback(
    (cellId: string, value: string, saveHistory = true) => {
      setState((prev) => {
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

      if (saveHistory) {
        saveToHistory();
      }
    },
    [setState, saveToHistory]
  );

  const handleCellFormatChange = useCallback(
    (cellIds: string[], format: Partial<CellFormat>) => {
      setState((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const updatedCells = { ...activeSheet.cells };

        cellIds.forEach((cellId) => {
          const existingCell = updatedCells[cellId] || {
            id: cellId,
            value: "",
          };
          const existingFormat = existingCell.format || {};

          // Toggle boolean properties
          const newFormat: CellFormat = { ...existingFormat };

          Object.entries(format).forEach(([key, value]) => {
            if (
              typeof value === "boolean" &&
              typeof existingFormat[key as keyof CellFormat] === "boolean"
            ) {
              // Toggle if it's a boolean property
              (newFormat as any)[key] =
                !existingFormat[key as keyof CellFormat];
            } else {
              // Otherwise just set the value
              (newFormat as any)[key] = value;
            }
          });

          updatedCells[cellId] = {
            ...existingCell,
            format: newFormat,
          };
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
      setState((prev) => {
        const activeSheet = prev.sheets.find(
          (s) => s.id === prev.activeSheetId
        );
        if (!activeSheet) return prev;

        const updatedCells = { ...activeSheet.cells };
        const sourceCell = activeSheet.cells[sourceCellIds[0]];

        if (sourceCell) {
          targetCellIds.forEach((cellId) => {
            updatedCells[cellId] = {
              ...sourceCell,
              id: cellId,
              value: sourceCell.value,
              format: sourceCell.format ? { ...sourceCell.format } : undefined,
              dropdown: sourceCell.dropdown
                ? { ...sourceCell.dropdown }
                : undefined,
            };
          });
        }

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
    },
    [setState, saveToHistory]
  );

  const handleCellSelect = useCallback(
    (cellIds: string[], multi?: boolean) => {
      setState((prev) => ({
        ...prev,
        selectedCells:
          multi && prev.selectedCells.length > 0
            ? [...new Set([...prev.selectedCells, ...cellIds])]
            : cellIds,
      }));
    },
    [setState]
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
    setState((prev) => {
      if (prev.copiedCells.length === 0) return prev;

      const activeSheet = prev.sheets.find((s) => s.id === prev.activeSheetId);
      if (!activeSheet) return prev;

      const updatedCells = { ...activeSheet.cells };

      prev.selectedCells.forEach((cellId, index) => {
        const sourceCell = prev.copiedCells[index % prev.copiedCells.length];
        updatedCells[cellId] = {
          ...sourceCell,
          id: cellId,
        };
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
  }, [setState, saveToHistory]);

  const handleDelete = useCallback(() => {
    setState((prev) => {
      const activeSheet = prev.sheets.find((s) => s.id === prev.activeSheetId);
      if (!activeSheet) return prev;

      const updatedCells = { ...activeSheet.cells };
      prev.selectedCells.forEach((cellId) => {
        if (updatedCells[cellId]) {
          updatedCells[cellId] = {
            ...updatedCells[cellId],
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
  }, [setState, saveToHistory]);

  const addSheet = useCallback(() => {
    setState((prev) => {
      const newSheet: Sheet = {
        id: `sheet-${Date.now()}`,
        name: `Sheet${prev.sheets.length + 1}`,
        cells: {},
        rowHeights: {},
        columnWidths: {},
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

  const resizeColumn = useCallback(
    (col: number, width: number) => {
      setState((prev) => {
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
    [setState]
  );

  const resizeRow = useCallback(
    (row: number, height: number) => {
      setState((prev) => {
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
    [setState]
  );

  return {
    handleCellChange,
    handleCellFormatChange,
    handleCellDropdownChange,
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
