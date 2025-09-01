# Zyxel Spreadsheet App

Zyxel is a modern, interactive spreadsheet application built with React, TypeScript, and Vite. It features multiple sheets, cell formatting, dropdown editors, undo/redo, and more—delivering a familiar spreadsheet experience in your browser.

## Features

- Multiple sheets with tabs
- Cell selection, editing, and formatting (bold, italic, underline)
- Dropdown cell editor
- Copy, paste, undo, redo, and fill handle
- Row and column resizing
- Sheet management: add, delete, rename, duplicate, color
- Keyboard shortcuts for productivity

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/PriyanshuGupta28/Zyxel.git
cd Zyxel
npm install
# or
yarn install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app in your browser.

## Project Structure

- `src/components/Spreadsheet/` – Main spreadsheet components (grid, toolbar, tabs, editors)
- `src/components/ui/` – UI primitives and reusable components
- `src/hooks/` – Custom React hooks
- `src/types/` – TypeScript types
- `public/` – Static assets

## Usage

- Click cells to select and edit
- Use toolbar or keyboard shortcuts for formatting
- Right-click or use toolbar for sheet actions
- Drag to resize rows/columns

## Keyboard Shortcuts

- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Y**: Redo
- **Ctrl/Cmd + C/V/X**: Copy/Paste/Cut
- **Ctrl/Cmd + B/I/U**: Bold/Italic/Underline
- **Arrow keys, Tab, Enter**: Navigate cells

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, features, or improvements.

## License

MIT
