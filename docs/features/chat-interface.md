# Feature: Chat Interface

## Overview
AI-powered chat interface for project planning and task execution. Uses streaming responses from the agent system.

## Chat Types

### Project Chat (Leading Agent)
- Associated with a project
- Used for initial project planning and clarification
- Leading agent asks questions and suggests tasks
- Multiple chat sessions per project supported

### Task Chat (Execution Agent)
- Associated with a specific task
- Used for task execution and progress updates
- Execution agent works on completing the task

## User Flows

### Flow 1: Start Project Conversation
1. User creates new project or opens existing one
2. Chat panel opens automatically for new projects
3. User types message and presses Enter or clicks Send
4. AI responds with streaming text
5. Messages persist and can be viewed later

### Flow 2: Create New Chat Session
1. User is on project page with chat open
2. User clicks "New Chat" button
3. New empty chat session is created
4. User can switch between chat sessions

### Flow 3: Continue Task Chat
1. User clicks on a task with assigned agent
2. Task chat panel opens
3. Shows history of agent work
4. User can send additional messages

### Flow 4: View Chat History
1. User opens chat panel
2. User selects a chat session from list
3. Previous messages are loaded and displayed

## UI Elements

### Chat Panel
- **Chat Header**: Shows chat type (project/task)
- **Session Selector**: Dropdown to switch sessions
- **New Chat Button**: Creates new session
- **Messages Area**: Scrollable message list
- **Input Area**: Text input and send button

### Message Display
- **User Messages**: Right-aligned, distinct styling
- **Assistant Messages**: Left-aligned with AI indicator
- **Streaming Indicator**: Shows when AI is typing
- **Tool Usage**: Shows when agent uses tools/skills

### Chat Input
- **Text Input**: Multi-line capable
- **Send Button**: Submits message
- **Disabled State**: While AI is responding

## Test Scenarios

### Scenario: Send first message
**Given** user is on a new project
**When** user types "I want to build a todo app" and sends
**Then** message appears in chat
**And** AI streams a response

### Scenario: Stream response display
**Given** user has sent a message
**When** AI is generating response
**Then** streaming indicator is shown
**And** text appears incrementally

### Scenario: Load existing chat history
**Given** project has previous chat messages
**When** user opens the project
**Then** previous messages are displayed

### Scenario: Switch chat sessions
**Given** project has multiple chat sessions
**When** user selects different session
**Then** messages for that session are displayed

### Scenario: Send message during streaming
**Given** AI is currently streaming a response
**When** user tries to send another message
**Then** send button is disabled
**And** input shows waiting state

## Edge Cases
- Empty chat shows welcome message
- Network error during streaming shows retry option
- Very long messages should be scrollable
- Code blocks in AI responses are syntax highlighted
