// components/Spreadsheet/SheetTabs.tsx
import React, { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { cn } from "@/lib/utils";
import { Plus, MoreVertical, X } from "lucide-react";
import { type Sheet } from "@/types/spreadsheet.types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";

interface SheetTabsProps {
  sheets: Sheet[];
  activeSheetId: string;
  onSheetSelect: (sheetId: string) => void;
  onAddSheet: () => void;
  onDeleteSheet: (sheetId: string) => void;
  onRenameSheet: (sheetId: string, name: string) => void;
  onDuplicateSheet: (sheetId: string) => void;
  onChangeColor: (sheetId: string, color: string) => void;
}

export const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets,
  activeSheetId,
  onSheetSelect,
  onAddSheet,
  onDeleteSheet,
  onRenameSheet,
  onDuplicateSheet,
  onChangeColor,
}) => {
  const [editingSheet, setEditingSheet] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempColor, setTempColor] = useState("");
  const [reorderSheets, setReorderSheets] = useState(sheets);

  const handleRename = () => {
    if (editingSheet && tempName) {
      onRenameSheet(editingSheet, tempName);
      setRenameDialogOpen(false);
      setEditingSheet(null);
      setTempName("");
    }
  };

  const handleColorChange = () => {
    if (editingSheet && tempColor) {
      onChangeColor(editingSheet, tempColor);
      setColorDialogOpen(false);
      setEditingSheet(null);
      setTempColor("");
    }
  };

  const colors = [
    "#EF4444",
    "#F97316",
    "#F59E0B",
    "#EAB308",
    "#84CC16",
    "#22C55E",
    "#10B981",
    "#14B8A6",
    "#06B6D4",
    "#0EA5E9",
    "#3B82F6",
    "#6366F1",
    "#8B5CF6",
    "#A855F7",
    "#D946EF",
    "#EC4899",
    "#F43F5E",
  ];

  return (
    <ScrollArea>
      <div className="bg-muted/50 flex w-full items-center gap-2 p-2">
        <Reorder.Group
          axis="x"
          values={reorderSheets}
          onReorder={setReorderSheets}
          className="flex items-center gap-1"
        >
          {sheets.map((sheet) => (
            <Reorder.Item key={sheet.id} value={sheet}>
              <motion.div
                className={cn(
                  "relative flex cursor-pointer items-center gap-2 rounded-t px-3 py-1",
                  "hover:bg-background group transition-colors",
                  activeSheetId === sheet.id && "bg-background"
                )}
                style={{
                  borderBottom: sheet.color
                    ? `2px solid ${sheet.color}`
                    : undefined,
                }}
                onClick={() => onSheetSelect(sheet.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-sm select-none">{sheet.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingSheet(sheet.id);
                        setTempName(sheet.name);
                        setRenameDialogOpen(true);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDuplicateSheet(sheet.id)}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingSheet(sheet.id);
                        setTempColor(sheet.color || "");
                        setColorDialogOpen(true);
                      }}
                    >
                      Change Color
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteSheet(sheet.id)}
                      disabled={sheets.length === 1}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {sheets.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSheet(sheet.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <Button
          variant="ghost"
          size="icon"
          onClick={onAddSheet}
          className="h-6 w-6"
        >
          <Plus className="h-4 w-4" />
        </Button>

        {/* Rename Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Sheet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Sheet Name</Label>
                <Input
                  id="name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRenameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleRename}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Color Dialog */}
        <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Sheet Color</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-6 gap-2 py-4">
              {colors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-10 w-10 rounded-md transition-transform hover:scale-110",
                    tempColor === color && "ring-primary ring-2 ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setTempColor(color)}
                />
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setColorDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleColorChange}>Apply</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
