// components/Spreadsheet/Cell.tsx
import React, { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { type Cell } from "@/types/claude/spreadsheet.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CellComponentProps {
  cell?: Cell;
  isSelected: boolean;
  isEditing: boolean;
  onChange: (value: string) => void;
  onStopEdit: () => void;
}

export const CellComponent = memo(
  ({
    cell,
    isSelected,
    isEditing,
    onChange,
    onStopEdit,
  }: CellComponentProps) => {
    const [localValue, setLocalValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
      if (isEditing && !hasInitialized.current) {
        setLocalValue(cell?.value || "");
        hasInitialized.current = true;
      } else if (!isEditing) {
        hasInitialized.current = false;
      }
    }, [isEditing, cell?.value]);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
        return () => clearTimeout(timer);
      }
    }, [isEditing]);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();

      if (e.key === "Enter") {
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

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Don't blur if clicking on toolbar
      if (e.relatedTarget?.closest(".toolbar-button")) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      onChange(localValue);
      onStopEdit();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    };

    const formatValue = (value: string) => {
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
    };

    const getCellStyle = (): React.CSSProperties => {
      if (!cell?.format) return {};

      return {
        fontFamily: cell.format.fontFamily || "inherit",
        fontSize: cell.format.fontSize ? `${cell.format.fontSize}px` : "14px",
        fontWeight: cell.format.bold ? "bold" : "normal",
        fontStyle: cell.format.italic ? "italic" : "normal",
        textDecoration: cell.format.underline
          ? "underline"
          : cell.format.strikethrough
          ? "line-through"
          : "none",
        color: cell.format.textColor || "inherit",
        backgroundColor: cell.format.backgroundColor || "transparent",
        textAlign: cell.format.horizontalAlign || "left",
        justifyContent:
          cell.format.horizontalAlign === "center"
            ? "center"
            : cell.format.horizontalAlign === "right"
            ? "flex-end"
            : "flex-start",
        alignItems:
          cell.format.verticalAlign === "top"
            ? "flex-start"
            : cell.format.verticalAlign === "bottom"
            ? "flex-end"
            : "center",
        whiteSpace: cell.format.textWrap === "wrap" ? "pre-wrap" : "nowrap",
        overflow: cell.format.textWrap === "clip" ? "hidden" : "visible",
        textOverflow: cell.format.textWrap === "clip" ? "ellipsis" : "unset",
        wordBreak: cell.format.textWrap === "wrap" ? "break-word" : "normal",
      };
    };

    if (cell?.dropdown && !isEditing) {
      return (
        <div className="w-full h-full flex" style={getCellStyle()}>
          <Select value={cell.value || ""} onValueChange={onChange}>
            <SelectTrigger
              className="w-full h-full border-0 rounded-none focus:ring-0 focus:ring-offset-0"
              style={{
                backgroundColor: cell.format?.backgroundColor || "transparent",
                color: cell.format?.textColor || "inherit",
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              {cell.dropdown.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  style={{
                    backgroundColor: option.backgroundColor,
                    color: option.textColor,
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
      const currentStyle = getCellStyle();
      return (
        <input
          ref={inputRef}
          type="text"
          className="absolute inset-0 w-full h-full px-2 py-1 outline-none bg-background border-2 border-primary"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            ...currentStyle,
            zIndex: 1000,
          }}
        />
      );
    }

    return (
      <div
        className="w-full h-full px-2 py-1 flex overflow-hidden"
        style={getCellStyle()}
      >
        <span className={cn(cell?.format?.textWrap === "clip" && "truncate")}>
          {formatValue(cell?.value || "")}
        </span>
      </div>
    );
  }
);

CellComponent.displayName = "CellComponent";
