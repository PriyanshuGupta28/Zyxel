// components/Spreadsheet/SpreadsheetToolbar.tsx
import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Undo2,
  Redo2,
  Printer,
  PaintBucket,
  ZoomIn,
  DollarSign,
  Percent,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Search,
  Type,
  Palette,
  WrapText,
  Hash,
} from "lucide-react";
import {
  type SpreadsheetState,
  type CellFormat,
} from "@/types/claude/spreadsheet.types";

interface SpreadsheetToolbarProps {
  state: SpreadsheetState;
  onUndo: () => void;
  onRedo: () => void;
  onFormatChange: (format: Partial<CellFormat>) => void;
}

export const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  state,
  onUndo,
  onRedo,
  onFormatChange,
}) => {
  const fonts = [
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
    "Helvetica",
  ];

  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

  const getCurrentFormat = useCallback((): Partial<CellFormat> => {
    if (state.selectedCells.length === 0) return {};

    const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId);
    if (!activeSheet) return {};

    const firstCell = activeSheet.cells[state.selectedCells[0]];
    return firstCell?.format || {};
  }, [state]);

  const currentFormat = getCurrentFormat();

  const handleToolbarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 p-2 bg-background border-b flex-wrap"
      onClick={handleToolbarClick}
    >
      {/* Basic Actions */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={state.historyIndex <= 0}
          className="toolbar-button"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={state.historyIndex >= state.history.length - 1}
          className="toolbar-button"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="toolbar-button">
          <Printer className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="toolbar-button">
          <PaintBucket className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="toolbar-button">
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Number Formatting */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button
          variant={
            currentFormat.numberFormat === "currency" ? "default" : "ghost"
          }
          size="icon"
          onClick={() => onFormatChange({ numberFormat: "currency" })}
          className="toolbar-button"
        >
          <DollarSign className="h-4 w-4" />
        </Button>
        <Button
          variant={
            currentFormat.numberFormat === "percent" ? "default" : "ghost"
          }
          size="icon"
          onClick={() => onFormatChange({ numberFormat: "percent" })}
          className="toolbar-button"
        >
          <Percent className="h-4 w-4" />
        </Button>
        <Button
          variant={
            currentFormat.numberFormat === "number" ? "default" : "ghost"
          }
          size="icon"
          onClick={() => onFormatChange({ numberFormat: "number" })}
          className="toolbar-button"
        >
          <Hash className="h-4 w-4" />
        </Button>
      </div>

      {/* Font Formatting */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Select
          value={currentFormat.fontFamily || "Arial"}
          onValueChange={(value) => onFormatChange({ fontFamily: value })}
        >
          <SelectTrigger className="w-32 h-8 toolbar-button">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((font) => (
              <SelectItem key={font} value={font}>
                <span style={{ fontFamily: font }}>{font}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(currentFormat.fontSize || 11).toString()}
          onValueChange={(value) =>
            onFormatChange({ fontSize: parseInt(value) })
          }
        >
          <SelectTrigger className="w-16 h-8 toolbar-button">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontSizes.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={currentFormat.bold ? "default" : "ghost"}
          size="icon"
          onClick={() => onFormatChange({ bold: true })}
          className="toolbar-button"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={currentFormat.italic ? "default" : "ghost"}
          size="icon"
          onClick={() => onFormatChange({ italic: true })}
          className="toolbar-button"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={currentFormat.underline ? "default" : "ghost"}
          size="icon"
          onClick={() => onFormatChange({ underline: true })}
          className="toolbar-button"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant={currentFormat.strikethrough ? "default" : "ghost"}
          size="icon"
          onClick={() => onFormatChange({ strikethrough: true })}
          className="toolbar-button"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="toolbar-button">
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="grid grid-cols-6 gap-1">
              {[
                "#000000",
                "#FF0000",
                "#00FF00",
                "#0000FF",
                "#FFFF00",
                "#FF00FF",
              ].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: color }}
                  onClick={() => onFormatChange({ textColor: color })}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="toolbar-button">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="grid grid-cols-6 gap-1">
              {[
                "#FFFFFF",
                "#FFCCCC",
                "#CCFFCC",
                "#CCCCFF",
                "#FFFFCC",
                "#FFCCFF",
              ].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: color }}
                  onClick={() => onFormatChange({ backgroundColor: color })}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Layout and Alignment */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="ghost" size="icon" className="toolbar-button">
          {/* <BorderAll className="h-4 w-4" /> */}
        </Button>

        <ToggleGroup
          type="single"
          value={currentFormat.horizontalAlign || "left"}
          onValueChange={(value) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            value && onFormatChange({ horizontalAlign: value as any })
          }
        >
          <ToggleGroupItem value="left" className="toolbar-button">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" className="toolbar-button">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" className="toolbar-button">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={currentFormat.textWrap || "clip"}
          onValueChange={(value) =>
            value && onFormatChange({ textWrap: value as "clip" | "wrap" })
          }
        >
          <ToggleGroupItem value="clip" className="toolbar-button">
            Clip
          </ToggleGroupItem>
          <ToggleGroupItem value="wrap" className="toolbar-button">
            <WrapText className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Data Tools */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="toolbar-button">
          <Link className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="toolbar-button">
          {/* <Function className="h-4 w-4" /> */}
        </Button>
        <Button variant="ghost" size="icon" className="toolbar-button">
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};
