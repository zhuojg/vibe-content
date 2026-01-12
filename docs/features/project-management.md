# Feature: Project Management

## Overview
Users can create, view, and manage projects. Projects serve as containers for tasks and chat conversations with the AI agent.

## Project Status Flow
```
clarifying → active → completed → archived
```

- **clarifying**: Initial state, user discussing project with AI
- **active**: Project has tasks and is being worked on
- **completed**: All tasks done
- **archived**: Project no longer active

## User Flows

### Flow 1: Create New Project
1. User is on the landing page (`/`)
2. User enters project name in the input field
3. User clicks "Create Project" button
4. System creates project and navigates to project page

### Flow 2: View Project List
1. User navigates to landing page (`/`)
2. System displays list of existing projects
3. Each project shows name and status

### Flow 3: Open Project
1. User clicks on a project in the list
2. System navigates to `/project/:projectId`
3. System displays kanban board for that project

## UI Elements

### Landing Page (`/`)
- **Project Name Input**: Text input for new project name
- **Create Project Button**: Submits new project creation
- **Project List**: List of existing projects, each clickable

### Project Page (`/project/:projectId`)
- **Project Title**: Displays project name
- **Kanban Board**: Main task management interface
- **Chat Panel**: Collapsible chat interface

## Test Scenarios

### Scenario: Create project with valid name
**Given** user is on the landing page
**When** user enters "My New Project" and clicks Create
**Then** project is created and user is navigated to project page

### Scenario: View empty project list
**Given** no projects exist
**When** user navigates to landing page
**Then** empty state message is displayed

### Scenario: Navigate to existing project
**Given** a project "Test Project" exists
**When** user clicks on "Test Project"
**Then** user is navigated to the project's kanban board

## Edge Cases
- Empty project name should show validation error
- Project not found should show 404 state
- Loading state while fetching projects
