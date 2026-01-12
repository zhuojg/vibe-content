# Feature Documentation

This directory contains feature specifications that serve as both documentation and test specifications for browser-based testing with Chrome DevTools MCP.

## Structure

```
features/
├── project-management.md    # Project CRUD and status workflows
├── kanban-board.md          # Task board, drag-and-drop, columns
└── chat-interface.md        # AI chat, message history, streaming
```

## Writing Feature Specs

Each feature spec should include:

1. **Overview** - What the feature does
2. **User Flows** - Step-by-step interactions
3. **UI Elements** - Elements that need to be interactable
4. **Test Scenarios** - Given/When/Then format
5. **Edge Cases** - Error states, empty states, loading states

## Using Specs for Testing

When testing with Chrome DevTools MCP:

1. Read the feature spec to understand expected behavior
2. Use `take_snapshot` to get current UI state and element UIDs
3. Use `click`, `fill`, `press_key` to interact with elements
4. Verify behavior matches the spec's test scenarios

## Updating Specs

When adding or modifying features:

1. Update the relevant feature spec FIRST
2. Implement the feature
3. Test using Chrome DevTools against the updated spec
