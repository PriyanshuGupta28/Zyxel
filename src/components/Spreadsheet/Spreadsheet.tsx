// components/Spreadsheet/Spreadsheet.tsx
import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { SpreadsheetToolbar } from "./SpreadsheetToolbar";
import { SpreadsheetGrid } from "./SpreadsheetGrid";
import { SheetTabs } from "./SheetTabs";
import { DropdownEditor } from "./DropdownEditor";
import { useSpreadsheet } from "@/hooks/useSpreadsheet";
import { Sheet as SheetComponent } from "@/components/ui/sheet";
import {
  type SpreadsheetState,
  type Sheet,
  type DropdownOption,
} from "@/types/spreadsheet.types";

const initialSheet: Sheet = {
  id: "sheet-1",
  name: "Sheet1",
  cells: {},
  rowHeights: {},
  columnWidths: {},
};

const initialState: SpreadsheetState = {
  sheets: [initialSheet],
  activeSheetId: "sheet-1",
  selectedCells: [],
  editingCell: null,
  copiedCells: [],
  history: [],
  historyIndex: -1,
};

export const Spreadsheet: React.FC = () => {
  const [state, setState] = useState<SpreadsheetState>(initialState);
  const [dropdownEditorOpen, setDropdownEditorOpen] = useState(false);
  const [editingDropdownCell, setEditingDropdownCell] = useState<string | null>(
    null
  );

  const {
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
  } = useSpreadsheet(state, setState);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (state.editingCell) return;

      const activeSheet = state.sheets.find(
        (s) => s.id === state.activeSheetId
      );
      if (!activeSheet) return;

      if (state.selectedCells.length === 1) {
        const [row, col] = state.selectedCells[0]?.split("-").map(Number) ?? [];
        if (row === undefined || col === undefined) return; // add this line

        let newRow = row;
        let newCol = col;

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            newRow = Math.max(0, row - 1);
            break;
          case "ArrowDown":
            e.preventDefault();
            newRow = row + 1;
            break;
          case "ArrowLeft":
            e.preventDefault();
            newCol = Math.max(0, col - 1);
            break;
          case "ArrowRight":
            e.preventDefault();
            newCol = col + 1;
            break;
          case "Tab":
            e.preventDefault();
            newCol = e.shiftKey ? Math.max(0, col - 1) : col + 1;
            break;
          case "Enter":
            e.preventDefault();
            handleCellEdit(state.selectedCells[0] || "");
            return;
          case "F2":
            e.preventDefault();
            handleCellEdit(state.selectedCells[0] || "");
            return;
          case "Delete":
          case "Backspace":
            e.preventDefault();
            handleDelete();
            return;
        }

        if (newRow !== row || newCol !== col) {
          handleCellSelect([`${newRow}-${newCol}`], e.shiftKey);
        }
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault();
            handleUndo();
            break;
          case "y":
            e.preventDefault();
            handleRedo();
            break;
          case "c":
            e.preventDefault();
            handleCopy();
            break;
          case "v":
            e.preventDefault();
            handlePaste();
            break;
          case "x":
            e.preventDefault();
            handleCopy();
            handleDelete();
            break;
          case "b":
            e.preventDefault();
            handleCellFormatChange(state.selectedCells, { bold: true });
            break;
          case "i":
            e.preventDefault();
            handleCellFormatChange(state.selectedCells, { italic: true });
            break;
          case "u":
            e.preventDefault();
            handleCellFormatChange(state.selectedCells, { underline: true });
            break;
        }
      }
    },
    [
      state,
      handleCellSelect,
      handleCellEdit,
      handleDelete,
      handleUndo,
      handleRedo,
      handleCopy,
      handlePaste,
      handleCellFormatChange,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId);

  const handleDropdownSave = useCallback(
    (options: DropdownOption[]) => {
      if (editingDropdownCell) {
        handleCellDropdownChange(editingDropdownCell, {
          id: `dropdown-${Date.now()}`,
          options,
        });
        setDropdownEditorOpen(false);
        setEditingDropdownCell(null);
      }
    },
    [editingDropdownCell, handleCellDropdownChange]
  );

  const handleDropdownRemove = useCallback(
    (cellId: string) => {
      handleCellDropdownChange(cellId, null);
    },
    [handleCellDropdownChange]
  );

  return (
    <div className="bg-background flex h-full flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b"
      >
        <SpreadsheetToolbar
          state={state}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onFormatChange={(format) => {
            if (state.selectedCells.length > 0) {
              handleCellFormatChange(state.selectedCells, format);
            }
          }}
        />
      </motion.div>

      <div className="flex-1 overflow-hidden">
        {activeSheet && (
          <SpreadsheetGrid
            sheet={activeSheet}
            selectedCells={state.selectedCells}
            editingCell={state.editingCell}
            onCellChange={handleCellChange}
            onCellSelect={handleCellSelect}
            onCellEdit={handleCellEdit}
            onFillCells={handleFillCells}
            onResizeColumn={resizeColumn}
            onResizeRow={resizeRow}
            onDropdownEdit={(cellId) => {
              setEditingDropdownCell(cellId);
              setDropdownEditorOpen(true);
            }}
            onDropdownRemove={handleDropdownRemove}
          />
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t"
      >
        <SheetTabs
          sheets={state.sheets}
          activeSheetId={state.activeSheetId}
          onSheetSelect={(sheetId) =>
            setState((prev) => ({ ...prev, activeSheetId: sheetId }))
          }
          onAddSheet={addSheet}
          onDeleteSheet={deleteSheet}
          onRenameSheet={renameSheet}
          onDuplicateSheet={duplicateSheet}
          onChangeColor={changeSheetColor}
        />
      </motion.div>

      <SheetComponent
        open={dropdownEditorOpen}
        onOpenChange={setDropdownEditorOpen}
      >
        <DropdownEditor
          cellId={editingDropdownCell}
          // currentDropdown={
          //   editingDropdownCell
          //     ? activeSheet?.cells[editingDropdownCell]?.dropdown
          //     : undefined
          // }
          onSave={handleDropdownSave}
          onClose={() => {
            setDropdownEditorOpen(false);
            setEditingDropdownCell(null);
          }}
        />
      </SheetComponent>
    </div>
  );
};
