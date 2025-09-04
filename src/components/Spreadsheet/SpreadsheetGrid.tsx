import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";
import { type Sheet, type GridCellData } from "@/types/spreadsheet.types";
import { CellComponent } from "./Cell";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { VariableSizeGrid as Grid } from "react-window";
import { Edit2, Trash2, Link2, Merge, SplitSquareVertical } from "lucide-react";

interface SpreadsheetGridProps {
  sheet: Sheet;
  selectedCells: string[];
  editingCell: string | null;
  typingBuffer?: string;
  onCellChange: (cellId: string, value: string) => void;
  onCellSelect: (cellIds: string[], multi?: boolean) => void;
  onCellEdit: (cellId: string | null) => void;
  onFillCells: (sourceCellIds: string[], targetCellIds: string[]) => void;
  onResizeColumn: (col: number, width: number) => void;
  onResizeRow: (row: number, height: number) => void;
  onDropdownEdit: (cellId: string) => void;
  onDropdownRemove: (cellId: string) => void;
  onLinkEdit: (cellId: string) => void;
  onMergeCells: (cellIds: string[]) => void;
  onUnmergeCells: (cellIds: string[]) => void;
}

const HEADER_HEIGHT = 30;
const HEADER_WIDTH = 50;
const DEFAULT_COLUMN_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 30;

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sheet,
  selectedCells,
  editingCell,
  typingBuffer = "",
  onCellChange,
  onCellSelect,
  onCellEdit,
  onFillCells,
  onResizeColumn,
  onResizeRow,
  onDropdownEdit,
  onDropdownRemove,
  onLinkEdit,
  onMergeCells,
  onUnmergeCells,
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
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
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
      return (
        sheet.columnWidths[index] ||
        sheet.defaultColumnWidth ||
        DEFAULT_COLUMN_WIDTH
      );
    },
    [sheet.columnWidths, sheet.defaultColumnWidth]
  );

  // Calculate row height considering text wrap
  const calculateRowHeightForWrappedText = useCallback(
    (row: number): number => {
      let maxHeight = sheet.rowHeights[row] || DEFAULT_ROW_HEIGHT;

      // Check all cells in this row for wrapped text
      for (let col = 0; col < totalCols; col++) {
        const cellId = `${row}-${col}`;
        const cell = sheet.cells[cellId];

        if (cell?.format?.textWrap === "wrap" && cell.value) {
          const columnWidth = getColumnWidth(col);
          const fontSize = cell.format.fontSize || 14;
          const padding = 16; // Account for cell padding

          // Create a temporary element to measure text
          const measureDiv = document.createElement("div");
          measureDiv.style.cssText = `
          position: absolute;
          visibility: hidden;
          width: ${columnWidth - padding}px;
          font-size: ${fontSize}px;
          font-family: ${cell.format.fontFamily || "inherit"};
          white-space: pre-wrap;
          word-break: break-word;
        `;
          measureDiv.textContent = cell.value;
          document.body.appendChild(measureDiv);

          const textHeight = measureDiv.offsetHeight;
          document.body.removeChild(measureDiv);

          const requiredHeight = Math.max(
            DEFAULT_ROW_HEIGHT,
            textHeight + padding
          );
          maxHeight = Math.max(maxHeight, requiredHeight);
        }
      }

      return maxHeight;
    },
    [sheet.cells, sheet.rowHeights, getColumnWidth, totalCols]
  );

  const getRowHeight = useCallback(
    (index: number) => {
      // Always calculate height for rows with wrapped text
      const calculatedHeight = calculateRowHeightForWrappedText(index);
      return calculatedHeight;
    },
    [calculateRowHeightForWrappedText]
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

  const canMergeCells = useCallback((): boolean => {
    if (selectedCells.length < 2) return false;

    // Check if any selected cell is already part of a merge
    for (const cellId of selectedCells) {
      const mergedInfo = sheet.mergedCells[cellId];
      if (mergedInfo) return false;
    }

    // Check if selection forms a rectangle
    const rows = selectedCells.map((id) => parseInt(id.split("-")[0]));
    const cols = selectedCells.map((id) => parseInt(id.split("-")[1]));
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    return selectedCells.length === expectedCount;
  }, [selectedCells, sheet.mergedCells]);

  const canUnmergeCells = useCallback((): boolean => {
    return selectedCells.some((cellId) => sheet.mergedCells[cellId]?.isOrigin);
  }, [selectedCells, sheet.mergedCells]);

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

  // Memoize cell renderer to prevent unnecessary re-renders
  const CellRenderer = useMemo(() => {
    return ({ columnIndex, rowIndex, style }: GridCellData) => {
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
      const hasLink = cell?.link !== undefined;
      const mergedInfo = sheet.mergedCells[cellId];

      // Skip rendering non-origin merged cells
      if (mergedInfo && !mergedInfo.isOrigin) {
        return null;
      }

      // Adjust style for merged cells
      let cellStyle = { ...style };
      if (mergedInfo?.isOrigin) {
        cellStyle = {
          ...cellStyle,
          width: (style.width as number) * mergedInfo.colSpan,
          height: (style.height as number) * mergedInfo.rowSpan,
          zIndex: 2,
        };
      }

      return (
        <ContextMenu key={`context-${cellId}`}>
          <ContextMenuTrigger asChild>
            <div
              style={{
                ...cellStyle,
                zIndex: isEditing
                  ? 100
                  : isSelected
                  ? 10
                  : cellStyle.zIndex || 1,
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
                initialValue={isEditing && typingBuffer ? typingBuffer : ""}
                isSelected={isSelected}
                isEditing={isEditing}
                onChange={(value) => onCellChange(cellId, value)}
                onStopEdit={() => onCellEdit(null)}
                onStartEdit={() => onCellEdit(cellId)}
                columnWidth={
                  getColumnWidth(actualCol) * (mergedInfo?.colSpan || 1)
                }
                rowHeight={getRowHeight(actualRow) * (mergedInfo?.rowSpan || 1)}
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
            {canMergeCells() && (
              <ContextMenuItem onClick={() => onMergeCells(selectedCells)}>
                <Merge className="w-4 h-4 mr-2" />
                Merge Cells
              </ContextMenuItem>
            )}
            {canUnmergeCells() && (
              <ContextMenuItem onClick={() => onUnmergeCells(selectedCells)}>
                <SplitSquareVertical className="w-4 h-4 mr-2" />
                Unmerge Cells
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            {hasLink ? (
              <ContextMenuItem onClick={() => onLinkEdit(cellId)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Link
              </ContextMenuItem>
            ) : (
              <ContextMenuItem onClick={() => onLinkEdit(cellId)}>
                <Link2 className="w-4 h-4 mr-2" />
                Insert Link
              </ContextMenuItem>
            )}
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
            <ContextMenuSeparator />
            <ContextMenuItem>Copy</ContextMenuItem>
            <ContextMenuItem>Paste</ContextMenuItem>
            <ContextMenuItem onClick={() => onCellChange(cellId, "")}>
              Clear
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    };
  }, [
    sheet.cells,
    sheet.mergedCells,
    selectedCells,
    typingBuffer,
    editingCell,
    fillRange,
    getColumnLabel,
    getCellId,
    getColumnWidth,
    getRowHeight,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleColumnResize,
    handleRowResize,
    onCellChange,
    onCellEdit,
    onDropdownEdit,
    onDropdownRemove,
    onLinkEdit,
    onMergeCells,
    onUnmergeCells,
    canMergeCells,
    canUnmergeCells,
  ]);

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
        overscanRowCount={3}
        overscanColumnCount={2}
        itemData={{ sheet, selectedCells, editingCell }}
      >
        {CellRenderer}
      </Grid>
    </div>
  );
};
