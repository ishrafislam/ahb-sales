# Keyboard Shortcuts

This document lists all keyboard shortcuts available in the AHB Sales
application.

## Global Shortcuts (Always Available)

### File Operations

- **Ctrl+N** (Cmd+N on Mac) - New File (only when no file is loaded)
- **Ctrl+O** (Cmd+O on Mac) - Open File (only when no file is loaded)
- **Ctrl+S** (Cmd+S on Mac) - Save File (only when file is loaded and has
  unsaved changes)

### Modal Navigation

- **Esc** - Close any open modal

## Modal-Specific Features

### Focus Management

- **Tab** - Move focus to next element within modal
- **Shift+Tab** - Move focus to previous element within modal
- Focus is trapped within the modal (cannot Tab outside)
- First input/button is automatically focused when modal opens

### Close Button

- Click the ✕ button in modal header
- Click outside modal (on the backdrop)
- Press **Esc** key

## Dashboard Shortcuts

### Customer Search

- **Arrow Down** - Move selection down in customer dropdown
- **Arrow Up** - Move selection up in customer dropdown
- **Enter** - Select highlighted customer
- **Esc** - Close customer dropdown

### Product Search

- **Arrow Down** - Move selection down in product dropdown
- **Arrow Up** - Move selection up in product dropdown
- **Enter** - Select highlighted product
- **Esc** - Close product dropdown

## Implementation Details

### Platform Differences

- On macOS: Shortcuts use **Cmd** (⌘) key
- On Windows/Linux: Shortcuts use **Ctrl** key
- The application automatically detects the platform and uses the appropriate
  modifier key

### Shortcut State

- **New/Open** shortcuts only work when no file is loaded (welcome screen)
- **Save** shortcut only works when:
  - A file is currently loaded
  - The file has unsaved changes (isDirty = true)
- **Esc** closes modals but doesn't interfere with input fields (handled by Vue
  event modifiers)

### Menu Integration

- Menu items show the current state (enabled/disabled)
- Save menu item is only enabled when file is dirty
- Menu rebuilds automatically when dirty state changes
- Keyboard shortcuts work independently of menu state

## Technical Notes

### Focus Trap

Modals implement a focus trap to improve accessibility:

1. Focus cycles through focusable elements (buttons, inputs, links)
2. Tab at the last element wraps to the first
3. Shift+Tab at the first element wraps to the last
4. Screen readers can properly navigate modal content

### Keyboard Event Handling

- Shortcuts use `preventDefault()` to avoid browser defaults
- Multiple shortcuts can be registered simultaneously
- The composable handles both keydown events and platform detection
- No conflicts with input field typing (shortcuts don't trigger in text inputs)

## Future Enhancements

Potential shortcuts that could be added:

- Ctrl+W - Close file
- Ctrl+1/2/3/4 - Navigate to specific views
- Ctrl+F - Focus search fields
- Ctrl+P - Quick product/customer picker
