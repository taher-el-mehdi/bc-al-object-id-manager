# AL Object ID Manager

This extension provides a feature focused on keeping AL object IDs within your `idRanges` in `app.json`.

## Fix AL Objects Id

- Run from the Command Palette: **`EMT: Fix Object IDs`**
- Behavior:
  - Reassigns out-of-range objects per object type from the lowest available ID in your ranges
  - Never exceeds your range limits
  - Shows a preview/confirmation dialog before applying changes

## Requirements

- An AL workspace with an `app.json` at the workspace root including `idRanges`, for example:

```json
{
  "idRanges": [
    { "from": 50100, "to": 50200 }
  ]
}
```
*PS: If `idRanges` is missing or invalid, the command is disabled and a warning is shown.*