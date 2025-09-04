import React, { useState, useRef, useEffect, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { type Cell } from "@/types/spreadsheet.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Link2, ChevronDown } from "lucide-react";

interface CellComponentProps {
  cell?: Cell;
  isSelected: boolean;
  isEditing: boolean;
  onChange: (value: string) => void;
  onStopEdit: () => void;
  onStartEdit: () => void;
  columnWidth?: number;
  rowHeight?: number;
  initialValue?: string;
}

export const CellComponent = memo(
  ({
    cell,
    // isSelected,
    isEditing,
    onChange,
    onStopEdit,
    onStartEdit,
    columnWidth = 100,
    rowHeight = 30,
    initialValue = "",
  }: CellComponentProps) => {
    const [localValue, setLocalValue] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
      if (isEditing && !hasInitialized.current) {
        // Use initialValue if provided (for typing), otherwise use cell value
        setLocalValue(initialValue || cell?.value || "");
        hasInitialized.current = true;
      } else if (!isEditing) {
        hasInitialized.current = false;
      }
    }, [isEditing, cell?.value, initialValue]);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
          // Position cursor at the end if there's an initial value
          if (initialValue) {
            const len = inputRef.current?.value.length || 0;
            inputRef.current?.setSelectionRange(len, len);
          } else {
            inputRef.current?.select();
          }
        }, 0);
        return () => clearTimeout(timer);
      }
    }, [isEditing, initialValue]);

    const handleInputKeyDown = (
      e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
      e.stopPropagation();

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onChange(localValue);
        onStopEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLocalValue(cell?.value || "");
        onStopEdit();
      } else if (e.key === "Tab") {
        e.preventDefault();
        onChange(localValue);
        onStopEdit();
      }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (e.relatedTarget?.closest(".toolbar-button")) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      onChange(localValue);
      onStopEdit();
    };

    const formatValue = useMemo(() => {
      const value = cell?.value || "";
      if (!cell?.format || !value) return value;

      try {
        switch (cell.format.numberFormat) {
          case "currency": {
            const currencyNum = parseFloat(value);
            return isNaN(currencyNum) ? value : `$${currencyNum.toFixed(2)}`;
          }
          case "percent": {
            const percentNum = parseFloat(value);
            return isNaN(percentNum)
              ? value
              : `${(percentNum * 100).toFixed(2)}%`;
          }
          case "number": {
            const num = parseFloat(value);
            return isNaN(num) ? value : num.toLocaleString();
          }
          default:
            return value;
        }
      } catch {
        return value;
      }
    }, [cell?.value, cell?.format]);

    // Get the selected dropdown option to show its colors
    const getSelectedDropdownOption = useMemo(() => {
      if (!cell?.dropdown || !cell.value) return null;
      return cell.dropdown.options.find((opt) => opt.value === cell.value);
    }, [cell?.dropdown, cell?.value]);

    const cellStyle = useMemo((): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        fontFamily: cell?.format?.fontFamily || "inherit",
        fontSize: cell?.format?.fontSize
          ? `${cell?.format.fontSize}px`
          : "14px",
        fontWeight: cell?.format?.bold ? "bold" : "normal",
        fontStyle: cell?.format?.italic ? "italic" : "normal",
        textDecoration: cell?.format?.underline
          ? "underline"
          : cell?.format?.strikethrough
          ? "line-through"
          : "none",
        color: cell?.format?.textColor || "inherit",
        backgroundColor: cell?.format?.backgroundColor || "transparent",
        textAlign: cell?.format?.horizontalAlign || "left",
        justifyContent:
          cell?.format?.horizontalAlign === "center"
            ? "center"
            : cell?.format?.horizontalAlign === "right"
            ? "flex-end"
            : "flex-start",
        alignItems:
          cell?.format?.verticalAlign === "top"
            ? "flex-start"
            : cell?.format?.verticalAlign === "bottom"
            ? "flex-end"
            : "top",
        whiteSpace: cell?.format?.textWrap === "wrap" ? "break-word" : "nowrap",
        overflow: cell?.format?.textWrap === "clip" ? "hidden" : "visible",
        textOverflow: cell?.format?.textWrap === "clip" ? "ellipsis" : "unset",
        wordBreak: cell?.format?.textWrap === "wrap" ? "break-word" : "normal",
        minHeight: cell?.format?.textWrap === "wrap" ? "auto" : rowHeight,
        height: cell?.format?.textWrap === "wrap" ? "auto" : "100%",
      };

      // Apply dropdown option colors if available
      if (getSelectedDropdownOption) {
        baseStyle.backgroundColor =
          getSelectedDropdownOption.backgroundColor ||
          baseStyle.backgroundColor;
        baseStyle.color =
          getSelectedDropdownOption.textColor || baseStyle.color;
      }

      return baseStyle;
    }, [cell?.format, rowHeight, getSelectedDropdownOption]);

    // Handle merged cells
    if (cell?.merged && !cell.merged.isOrigin) {
      return null;
    }

    const mergedStyle: React.CSSProperties = cell?.merged?.isOrigin
      ? {
          gridColumn: `span ${cell.merged.colSpan}`,
          gridRow: `span ${cell.merged.rowSpan}`,
          zIndex: 2,
        }
      : {};

    if (cell?.dropdown && !isEditing) {
      const selectedOption = getSelectedDropdownOption;

      return (
        <div
          className="w-full h-full flex relative group"
          style={{
            ...cellStyle,
            ...mergedStyle,
            backgroundColor:
              selectedOption?.backgroundColor || cellStyle.backgroundColor,
            color: selectedOption?.textColor || cellStyle.color,
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest(".dropdown-trigger")) {
              onStartEdit();
            }
          }}
        >
          <div className="flex-1 flex items-center px-2">
            <span>{selectedOption?.label || cell.value || ""}</span>
          </div>
          <Select
            value={cell.value || ""}
            onValueChange={(value) => {
              onChange(value);
              setIsDropdownOpen(false);
            }}
            open={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
          >
            <SelectTrigger
              className="dropdown-trigger w-8 h-full border-0 rounded-none focus:ring-0 focus:ring-offset-0 p-0"
              style={{
                backgroundColor: "transparent",
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <ChevronDown className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent
              className="z-[10000]"
              onPointerDownOutside={(e) => {
                e.preventDefault();
              }}
            >
              {cell.dropdown.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  style={{
                    backgroundColor: option.backgroundColor,
                    color: option.textColor,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (isEditing) {
      // Calculate minimum width for input (like Excel/Google Sheets)
      const minInputWidth = Math.max(columnWidth || 100, 200);
      const minInputHeight = Math.max(rowHeight || 30, 60);

      return (
        <div
          className="fixed"
          style={{
            left: "auto",
            top: "auto",
            zIndex: 9999,
            minWidth: minInputWidth,
            minHeight: minInputHeight,
          }}
        >
          <textarea
            ref={inputRef}
            className="w-full h-full px-2 py-1 outline-none bg-background border-2 border-primary shadow-lg resize-none overflow-auto"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              ...cellStyle,
              minWidth: minInputWidth,
              minHeight: minInputHeight,
              width: "auto",
              height: "auto",
              maxWidth: "500px",
              maxHeight: "300px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          />
        </div>
      );
    }

    return (
      <div
        className="w-full h-full px-2 py-1 flex overflow-hidden relative"
        style={{ ...cellStyle, ...mergedStyle }}
      >
        {cell?.link && (
          <Link2 className="w-3 h-3 mr-1 text-blue-500 flex-shrink-0" />
        )}
        {cell?.link ? (
          <a
            href={cell.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline hover:text-blue-700"
            title={cell.link.title}
            onClick={(e) => e.stopPropagation()}
          >
            {cell.link.title || formatValue}
          </a>
        ) : (
          <span
            className={cn(
              cell?.format?.textWrap === "clip" && "truncate block",
              cell?.format?.textWrap === "wrap" &&
                "whitespace-pre-wrap break-words"
            )}
          >
            {formatValue}
          </span>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.cell?.value === nextProps.cell?.value &&
      prevProps.cell?.format === nextProps.cell?.format &&
      prevProps.cell?.dropdown === nextProps.cell?.dropdown &&
      prevProps.cell?.link === nextProps.cell?.link &&
      prevProps.cell?.merged === nextProps.cell?.merged &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.columnWidth === nextProps.columnWidth &&
      prevProps.rowHeight === nextProps.rowHeight &&
      prevProps.initialValue === nextProps.initialValue
    );
  }
);

CellComponent.displayName = "CellComponent";
