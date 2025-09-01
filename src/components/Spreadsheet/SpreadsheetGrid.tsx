// components/Spreadsheet/SpreadsheetGrid.tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { type Sheet } from "@/types/claude/spreadsheet.types";
import { CellComponent } from "./Cell";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { VariableSizeGrid as Grid } from "react-window";
import { Edit2, Trash2 } from "lucide-react";

interface SpreadsheetGridProps {
  sheet: Sheet;
  selectedCells: string[];
  editingCell: string | null;
  onCellChange: (cellId: string, value: string) => void;
  onCellSelect: (cellIds: string[], multi?: boolean) => void;
  onCellEdit: (cellId: string | null) => void;
  onFillCells: (sourceCellIds: string[], targetCellIds: string[]) => void;
  onResizeColumn: (col: number, width: number) => void;
  onResizeRow: (row: number, height: number) => void;
  onDropdownEdit: (cellId: string) => void;
  onDropdownRemove: (cellId: string) => void;
}

const HEADER_HEIGHT = 30;
const HEADER_WIDTH = 50;
const DEFAULT_COLUMN_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 30;

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sheet,
  selectedCells,
  editingCell,
  onCellChange,
  onCellSelect,
  onCellEdit,
  onFillCells,
  onResizeColumn,
  onResizeRow,
  onDropdownEdit,
  onDropdownRemove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Grid>(null);
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [isFillDragging, setIsFillDragging] = useState(false);
  const [fillRange, setFillRange] = useState<string[]>([]);
  const [isResizingColumn, setIsResizingColumn] = useState<number | null>(null);
  const [isResizingRow, setIsResizingRow] = useState<number | null>(null);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const lastClickTimeRef = useRef<number>(0);
  const lastClickCellRef = useRef<string>("");

  const totalRows = 1000;
  const totalCols = 26;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const getColumnLabel = useCallback((index: number) => {
    let label = "";
    let i = index;
    while (i >= 0) {
      label = String.fromCharCode(65 + (i % 26)) + label;
      i = Math.floor(i / 26) - 1;
    }
    return label;
  }, []);

  const getColumnWidth = useCallback(
    (index: number) => {
      return sheet.columnWidths[index] || DEFAULT_COLUMN_WIDTH;
    },
    [sheet.columnWidths]
  );

  const getRowHeight = useCallback(
    (index: number) => {
      return sheet.rowHeights[index] || DEFAULT_ROW_HEIGHT;
    },
    [sheet.rowHeights]
  );

  const getCellId = useCallback(
    (row: number, col: number) => `${row}-${col}`,
    []
  );

  const getSelectedRange = useCallback(
    (start: string, end: string): string[] => {
      const [startRow, startCol] = start.split("-").map(Number);
      const [endRow, endCol] = end.split("-").map(Number);

      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);

      const range: string[] = [];
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          range.push(`${row}-${col}`);
        }
      }
      return range;
    },
    []
  );

  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, cellId: string) => {
      if (e.button === 2) return;

      e.preventDefault();
      e.stopPropagation();

      const currentTime = Date.now();
      const timeDiff = currentTime - lastClickTimeRef.current;

      if (timeDiff < 300 && lastClickCellRef.current === cellId) {
        onCellEdit(cellId);
        lastClickTimeRef.current = 0;
        lastClickCellRef.current = "";
        return;
      }

      lastClickTimeRef.current = currentTime;
      lastClickCellRef.current = cellId;

      const target = e.target as HTMLElement;
      const isFillHandle = target.classList.contains("fill-handle");

      if (isFillHandle && selectedCells.length > 0) {
        setIsFillDragging(true);
        setFillRange([]);
      } else if (!editingCell) {
        onCellSelect([cellId], e.shiftKey || e.ctrlKey);
        setIsDragging(true);
        setDragStart(cellId);
      }
    },
    [selectedCells, onCellSelect, onCellEdit, editingCell]
  );

  const handleCellMouseEnter = useCallback(
    (cellId: string) => {
      if (isDragging && dragStart && !editingCell) {
        const range = getSelectedRange(dragStart, cellId);
        onCellSelect(range, false);
      } else if (isFillDragging && selectedCells.length > 0) {
        const firstSelected = selectedCells[0];
        const range = getSelectedRange(firstSelected, cellId);
        setFillRange(range.filter((id) => !selectedCells.includes(id)));
      }
    },
    [
      isDragging,
      dragStart,
      isFillDragging,
      selectedCells,
      getSelectedRange,
      onCellSelect,
      editingCell,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (isFillDragging && selectedCells.length > 0 && fillRange.length > 0) {
      onFillCells(selectedCells, fillRange);
    }

    setIsDragging(false);
    setDragStart(null);
    setIsFillDragging(false);
    setFillRange([]);
  }, [isFillDragging, selectedCells, fillRange, onFillCells]);

  useEffect(() => {
    if (isDragging || isFillDragging) {
      const handleGlobalMouseUp = () => handleMouseUp();
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isDragging, isFillDragging, handleMouseUp]);

  const handleColumnResize = useCallback(
    (e: React.MouseEvent, col: number) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizingColumn(col);
      setResizeStart({
        x: e.clientX,
        y: 0,
        width: getColumnWidth(col),
        height: 0,
      });
    },
    [getColumnWidth]
  );

  const handleRowResize = useCallback(
    (e: React.MouseEvent, row: number) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizingRow(row);
      setResizeStart({
        x: 0,
        y: e.clientY,
        width: 0,
        height: getRowHeight(row),
      });
    },
    [getRowHeight]
  );

  const handleResizeMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizingColumn !== null) {
        const delta = e.clientX - resizeStart.x;
        const newWidth = Math.max(50, resizeStart.width + delta);
        onResizeColumn(isResizingColumn, newWidth);
        gridRef.current?.resetAfterColumnIndex(isResizingColumn);
      } else if (isResizingRow !== null) {
        const delta = e.clientY - resizeStart.y;
        const newHeight = Math.max(20, resizeStart.height + delta);
        onResizeRow(isResizingRow, newHeight);
        gridRef.current?.resetAfterRowIndex(isResizingRow);
      }
    },
    [isResizingColumn, isResizingRow, resizeStart, onResizeColumn, onResizeRow]
  );

  const handleResizeMouseUp = useCallback(() => {
    setIsResizingColumn(null);
    setIsResizingRow(null);
  }, []);

  useEffect(() => {
    if (isResizingColumn !== null || isResizingRow !== null) {
      window.addEventListener("mousemove", handleResizeMouseMove);
      window.addEventListener("mouseup", handleResizeMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleResizeMouseMove);
        window.removeEventListener("mouseup", handleResizeMouseUp);
      };
    }
  }, [
    isResizingColumn,
    isResizingRow,
    handleResizeMouseMove,
    handleResizeMouseUp,
  ]);

  const CellRenderer = useCallback(
    ({ columnIndex, rowIndex, style }: any) => {
      if (rowIndex === 0 && columnIndex === 0) {
        return <div style={style} className="border-r border-b bg-muted/50" />;
      }

      if (rowIndex === 0) {
        const colIndex = columnIndex - 1;
        return (
          <div
            style={style}
            className="border-r border-b bg-muted/50 flex items-center justify-center relative group select-none"
          >
            <span className="text-sm font-medium">
              {getColumnLabel(colIndex)}
            </span>
            <div
              className="absolute right-0 top-0 w-1 h-full cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 z-10"
              onMouseDown={(e) => handleColumnResize(e, colIndex)}
            />
          </div>
        );
      }

      if (columnIndex === 0) {
        const row = rowIndex - 1;
        return (
          <div
            style={style}
            className="border-r border-b bg-muted/50 flex items-center justify-center relative group select-none"
          >
            <span className="text-sm font-medium">{row + 1}</span>
            <div
              className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 z-10"
              onMouseDown={(e) => handleRowResize(e, row)}
            />
          </div>
        );
      }

      const actualRow = rowIndex - 1;
      const actualCol = columnIndex - 1;
      const cellId = getCellId(actualRow, actualCol);
      const cell = sheet.cells[cellId];
      const isSelected = selectedCells.includes(cellId);
      const isEditing = editingCell === cellId;
      const isFillHighlighted = fillRange.includes(cellId);
      const hasDropdown = cell?.dropdown !== undefined;

      return (
        <ContextMenu key={`context-${cellId}`}>
          <ContextMenuTrigger asChild>
            <div
              style={{
                ...style,
                zIndex: isEditing ? 100 : isSelected ? 10 : 1,
              }}
              className={cn(
                "border-r border-b relative group bg-background",
                isSelected && !isEditing && "ring-2 ring-primary ring-inset",
                isFillHighlighted && "bg-primary/10"
              )}
              onMouseDown={(e) => !isEditing && handleCellMouseDown(e, cellId)}
              onMouseEnter={() => !isEditing && handleCellMouseEnter(cellId)}
            >
              <CellComponent
                key={`cell-${cellId}-${isEditing}`}
                cell={cell}
                isSelected={isSelected}
                isEditing={isEditing}
                onChange={(value) => onCellChange(cellId, value)}
                onStopEdit={() => onCellEdit(null)}
              />
              {isSelected &&
                !isEditing &&
                selectedCells[selectedCells.length - 1] === cellId && (
                  <div
                    className="fill-handle absolute w-2 h-2 bg-primary border border-white cursor-crosshair"
                    style={{
                      bottom: "-4px",
                      right: "-4px",
                      zIndex: 200,
                    }}
                  />
                )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="z-[10000]">
            <ContextMenuItem onClick={() => onCellEdit(cellId)}>
              Edit Cell
            </ContextMenuItem>
            {hasDropdown ? (
              <>
                <ContextMenuItem onClick={() => onDropdownEdit(cellId)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Dropdown
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDropdownRemove(cellId)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Dropdown
                </ContextMenuItem>
              </>
            ) : (
              <ContextMenuItem onClick={() => onDropdownEdit(cellId)}>
                Add Dropdown
              </ContextMenuItem>
            )}
            <ContextMenuItem>Copy</ContextMenuItem>
            <ContextMenuItem>Paste</ContextMenuItem>
            <ContextMenuItem onClick={() => onCellChange(cellId, "")}>
              Clear
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    },
    [
      sheet.cells,
      selectedCells,
      editingCell,
      fillRange,
      getColumnLabel,
      getCellId,
      handleCellMouseDown,
      handleCellMouseEnter,
      handleColumnResize,
      handleRowResize,
      onCellChange,
      onCellEdit,
      onDropdownEdit,
      onDropdownRemove,
    ]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background"
    >
      <Grid
        ref={gridRef}
        className="scrollbar-thin"
        columnCount={totalCols + 1}
        columnWidth={(index) =>
          index === 0 ? HEADER_WIDTH : getColumnWidth(index - 1)
        }
        height={containerSize.height}
        rowCount={totalRows + 1}
        rowHeight={(index) =>
          index === 0 ? HEADER_HEIGHT : getRowHeight(index - 1)
        }
        width={containerSize.width}
        overscanRowCount={5}
        overscanColumnCount={3}
      >
        {CellRenderer}
      </Grid>
    </div>
  );
};
