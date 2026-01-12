# Feature: Kanban Board

## Overview
The kanban board provides visual task management with columns representing task status. Users can create tasks, move them between columns, and track progress.

## Task Status Columns
```
todo → processing → in_review → done
                              → cancel
```

- **todo**: Task created but not started
- **processing**: Task being worked on (by user or agent)
- **in_review**: Task completed, awaiting review
- **done**: Task successfully completed
- **cancel**: Task cancelled/abandoned

## User Flows

### Flow 1: Create New Task
1. User is on project page with kanban board
2. User clicks "Add Task" button in todo column
3. User enters task title
4. User clicks confirm or presses Enter
5. Task appears in todo column

### Flow 2: Move Task Between Columns
1. User drags task card
2. User drops task in target column
3. Task status updates to match column
4. Task appears in new column

### Flow 3: View Task Details
1. User clicks on a task card
2. Task detail panel opens
3. Panel shows task info and chat history

### Flow 4: Assign Agent to Task
1. User clicks on a task in todo/processing
2. User selects agent type (execution)
3. Agent begins working on task
4. Task moves to processing status

## UI Elements

### Kanban Board
- **Column Headers**: todo, processing, in_review, done
- **Task Cards**: Draggable cards showing task title
- **Add Task Button**: In todo column header
- **Task Count Badge**: Number of tasks per column

### Task Card
- **Task Title**: Main text on card
- **Status Indicator**: Visual status representation
- **Agent Badge**: Shows assigned agent if any

### Task Detail Panel
- **Task Title**: Editable task name
- **Description**: Task description/requirements
- **Agent Assignment**: Dropdown to assign agent
- **Chat History**: Messages related to this task

## Test Scenarios

### Scenario: Create task via quick add
**Given** user is on a project kanban board
**When** user clicks Add Task and enters "Fix login bug"
**Then** task "Fix login bug" appears in todo column

### Scenario: Drag task to processing
**Given** a task "Setup database" exists in todo
**When** user drags task to processing column
**Then** task appears in processing column
**And** task status is updated to "processing"

### Scenario: View task with chat history
**Given** a task with agent chat exists
**When** user clicks on the task
**Then** detail panel shows chat messages

### Scenario: Assign execution agent
**Given** a task in todo status
**When** user assigns execution agent
**Then** task moves to processing
**And** agent begins working

## Edge Cases
- Empty kanban board shows helpful message
- Drag to same column should not trigger update
- Loading state while tasks are fetching
- Error state if task update fails
