export interface Cell {
  id: string;
  value: string;
  formula?: string;
  format?: CellFormat;
  dropdown?: DropdownOptions;
  link?: CellLink;
  merged?: MergedCell;
}

export interface MergedCell {
  rowSpan: number;
  colSpan: number;
  isOrigin: boolean;
  originCell?: string;
}

export interface CellLink {
  url: string;
  title: string;
}

export interface CellFormat {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  backgroundColor?: string;
  numberFormat?: "text" | "number" | "currency" | "percent" | "date" | "time";
  horizontalAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  textWrap?: "clip" | "wrap";
  borders?: BorderStyle;
}

export interface BorderStyle {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  color?: string;
  style?: "solid" | "dashed" | "dotted";
}

export interface DropdownOptions {
  id: string;
  options: DropdownOption[];
}

export interface DropdownOption {
  value: string;
  label: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface Sheet {
  id: string;
  name: string;
  color?: string;
  cells: Record<string, Cell>;
  rowHeights: Record<number, number>;
  columnWidths: Record<number, number>;
  mergedCells: Record<string, MergedCell>;
  defaultRowHeight?: number;
  defaultColumnWidth?: number;
  hidden?: boolean;
  protected?: boolean;
}

export interface SpreadsheetState {
  sheets: Sheet[];
  activeSheetId: string;
  selectedCells: string[];
  editingCell: string | null;
  copiedCells: Cell[];
  history: HistoryEntry[];
  historyIndex: number;
}

export interface HistoryEntry {
  sheets: Sheet[];
  selectedCells: string[];
}

export interface GridCellData {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
}
