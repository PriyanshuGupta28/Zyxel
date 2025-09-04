import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { SpreadsheetToolbar } from "./SpreadsheetToolbar";
import { SpreadsheetGrid } from "./SpreadsheetGrid";
import { SheetTabs } from "./SheetTabs";
import { DropdownEditor } from "./DropdownEditor";
import { LinkDialog } from "./LinkDialog";
import { useSpreadsheet } from "@/hooks/useSpreadsheet";
import { Sheet as SheetComponent } from "@/components/ui/sheet";
import {
  type SpreadsheetState,
  type Sheet,
  type DropdownOption,
  type CellLink,
} from "@/types/spreadsheet.types";

const initialSheet: Sheet = {
  id: "sheet-1",
  name: "Sheet1",
  cells: {},
  rowHeights: {},
  columnWidths: {},
  mergedCells: {},
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
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLinkCell, setEditingLinkCell] = useState<string | null>(null);
  const [typingBuffer, setTypingBuffer] = useState("");
  const [typingCellId, setTypingCellId] = useState<string | null>(null);

  const {
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
  } = useSpreadsheet(state, setState);

  // Handle typing buffer save when cell changes
  useEffect(() => {
    if (typingCellId && typingBuffer && !state.editingCell) {
      // Save the typing buffer when we're no longer editing
      handleCellChange(typingCellId, typingBuffer, true);
      setTypingBuffer("");
      setTypingCellId(null);
    }
  }, [state.editingCell, typingCellId, typingBuffer, handleCellChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Save typing buffer if we're changing cells
      if (typingCellId && typingBuffer && state.editingCell !== typingCellId) {
        handleCellChange(typingCellId, typingBuffer, false);
        setTypingBuffer("");
        setTypingCellId(null);
      }

      // Handle typing when cell is selected but not editing
      if (
        state.selectedCells.length === 1 &&
        !state.editingCell &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const key = e.key;

        // Check if it's a printable character
        if (key.length === 1) {
          e.preventDefault();

          // Start typing in the cell
          const cellId = state.selectedCells[0];
          setTypingCellId(cellId);
          setTypingBuffer(key);
          handleCellEdit(cellId);

          return;
        } else if (key === "Backspace" || key === "Delete") {
          e.preventDefault();
          // Clear selected cells
          handleDelete();
          return;
        }
      }

      // Handle multiple cell selection delete
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        state.selectedCells.length > 0 &&
        !state.editingCell
      ) {
        e.preventDefault();
        handleDelete();
        return;
      }

      if (state.editingCell) return;

      const activeSheet = state.sheets.find(
        (s) => s.id === state.activeSheetId
      );
      if (!activeSheet) return;

      if (state.selectedCells.length === 1) {
        const [row, col] = state.selectedCells[0].split("-").map(Number);
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
            if (!e.shiftKey) {
              handleCellEdit(state.selectedCells[0]);
            } else {
              newRow = Math.max(0, row - 1);
            }
            return;
          case "F2":
            e.preventDefault();
            handleCellEdit(state.selectedCells[0]);
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
      handleCellChange,
      typingBuffer,
      typingCellId,
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

  const handleLinkSave = useCallback(
    (link: CellLink) => {
      if (editingLinkCell) {
        handleCellLinkChange(editingLinkCell, link);
        setLinkDialogOpen(false);
        setEditingLinkCell(null);
      }
    },
    [editingLinkCell, handleCellLinkChange]
  );

  return (
    <div className="flex flex-col h-screen bg-background">
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
          onMergeCells={() => {
            if (state.selectedCells.length > 1) {
              handleMergeCells(state.selectedCells);
            }
          }}
          onUnmergeCells={() => {
            if (state.selectedCells.length > 0) {
              handleUnmergeCells(state.selectedCells);
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
            typingBuffer={
              state.editingCell === typingCellId ? typingBuffer : ""
            }
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
            onLinkEdit={(cellId) => {
              setEditingLinkCell(cellId);
              setLinkDialogOpen(true);
            }}
            onMergeCells={handleMergeCells}
            onUnmergeCells={handleUnmergeCells}
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
          onSheetSelect={(sheetId) => {
            // Save typing buffer before switching sheets
            if (typingCellId && typingBuffer) {
              handleCellChange(typingCellId, typingBuffer, false);
              setTypingBuffer("");
              setTypingCellId(null);
            }
            setState((prev) => ({ ...prev, activeSheetId: sheetId }));
          }}
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
          currentDropdown={
            editingDropdownCell && activeSheet
              ? activeSheet.cells[editingDropdownCell]?.dropdown
              : undefined
          }
          onSave={handleDropdownSave}
          onClose={() => {
            setDropdownEditorOpen(false);
            setEditingDropdownCell(null);
          }}
        />
      </SheetComponent>

      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        currentLink={
          editingLinkCell && activeSheet
            ? activeSheet.cells[editingLinkCell]?.link
            : undefined
        }
        onSave={handleLinkSave}
      />
    </div>
  );
};
