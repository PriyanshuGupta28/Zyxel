// components/Spreadsheet/DropdownEditor.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Palette } from "lucide-react";
import {
  type Sheet,
  type DropdownOption,
  type DropdownOptions,
} from "@/types/spreadsheet.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DropdownEditorProps {
  cellId: string | null;
  sheet?: Sheet;
  currentDropdown: DropdownOptions | undefined;
  onSave: (options: DropdownOption[]) => void;
  onClose: () => void;
}

export const DropdownEditor: React.FC<DropdownEditorProps> = ({
  // cellId,
  // sheet,
  onSave,
  onClose,
}) => {
  const [options, setOptions] = useState<DropdownOption[]>([
    {
      value: "option1",
      label: "Option 1",
      backgroundColor: "#FFFFFF",
      textColor: "#000000",
    },
  ]);

  const handleAddOption = () => {
    const newOption: DropdownOption = {
      value: `option${options.length + 1}`,
      label: `Option ${options.length + 1}`,
      backgroundColor: "trasnparent",
      textColor: "#000000",
    };
    setOptions([...options, newOption]);
  };

  const handleUpdateOption = (
    index: number,
    field: keyof DropdownOption,
    value: string
  ) => {
    const updatedOptions = [...options];
    updatedOptions[index] = {
      ...(updatedOptions[index] as DropdownOption),
      [field]: value,
    };
    setOptions(updatedOptions);
  };

  const handleDeleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(options);
  };

  const colors = [
    "#FFFFFF",
    "#000000",
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
  ];

  return (
    <SheetContent side="right" className="w-96 px-5">
      <SheetHeader>
        <SheetTitle>Dropdown Options</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 py-6">
        <div className="space-y-2">
          <Label>Dropdown Options</Label>
          <AnimatePresence>
            {options.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 rounded-lg border p-2"
              >
                <Input
                  value={option.label}
                  onChange={(e) =>
                    handleUpdateOption(index, "label", e.target.value)
                  }
                  className="flex-1"
                  autoFocus={index === 0}
                  style={{
                    backgroundColor: option.backgroundColor,
                    color: option.textColor,
                  }}
                />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <Label>Background Color</Label>
                      <div className="grid grid-cols-6 gap-1">
                        {colors.map((color) => (
                          <button
                            key={`bg-${color}`}
                            className="h-6 w-6 rounded border"
                            style={{ backgroundColor: color }}
                            onClick={() =>
                              handleUpdateOption(
                                index,
                                "backgroundColor",
                                color
                              )
                            }
                          />
                        ))}
                      </div>
                      <Label>Text Color</Label>
                      <div className="grid grid-cols-6 gap-1">
                        {colors.map((color) => (
                          <button
                            key={`text-${color}`}
                            className="h-6 w-6 rounded border"
                            style={{ backgroundColor: color }}
                            onClick={() =>
                              handleUpdateOption(index, "textColor", color)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteOption(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddOption}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Option
          </Button>
        </div>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </SheetFooter>
    </SheetContent>
  );
};
