import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CellLink } from "@/types/spreadsheet.types";

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLink?: CellLink;
  onSave: (link: CellLink) => void;
}

export const LinkDialog: React.FC<LinkDialogProps> = ({
  open,
  onOpenChange,
  currentLink,
  onSave,
}) => {
  const [title, setTitle] = useState(currentLink?.title || "");
  const [url, setUrl] = useState(currentLink?.url || "");

  const handleSave = () => {
    if (url) {
      onSave({ title: title || url, url });
      onOpenChange(false);
      setTitle("");
      setUrl("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Link title (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!url}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
