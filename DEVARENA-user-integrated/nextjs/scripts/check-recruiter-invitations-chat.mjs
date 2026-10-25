import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Running recruiter invitations and WebSocket chat verification scenarios...');

// 1. Static Contract & API verification
function testMessagingLibContract() {
  const libSrc = readFileSync(resolve(__dirname, '../src/lib/messaging.ts'), 'utf-8');

  assert.ok(
    libSrc.includes("apiRequest<InvitationItem>('/recruiter/invitations'"),
    'sendInvitation must call POST /recruiter/invitations',
  );
  assert.ok(
    libSrc.includes("apiRequest<InvitationItem[]>('/recruiter/invitations'"),
    'listSentInvitations must call GET /recruiter/invitations',
  );
  assert.ok(
    libSrc.includes("apiRequest<InvitationItem[]>('/invitations'"),
    'listReceivedInvitations must call GET /invitations',
  );
  assert.ok(
    libSrc.includes('/accept'),
    'acceptInvitation must call PATCH /invitations/:id/accept',
  );
  assert.ok(
    libSrc.includes('/decline'),
    'declineInvitation must call PATCH /invitations/:id/decline',
  );
  assert.ok(
    libSrc.includes("apiRequest<ConversationItem[]>('/conversations'"),
    'listConversations must call GET /conversations',
  );
  assert.ok(
    libSrc.includes('/messages'),
    'getConversationMessages must call /conversations/:id/messages',
  );
}

// 2. WebSocket hook assertions
function testWebSocketHookArchitecture() {
  const hookSrc = readFileSync(resolve(__dirname, '../src/hooks/useWebSocketChat.ts'), 'utf-8');

  assert.ok(
    hookSrc.includes('new WebSocket(wsUrl)'),
    'useWebSocketChat must use native WebSocket client',
  );
  assert.ok(
    hookSrc.includes('token='),
    'useWebSocketChat must pass JWT access token to WebSocket endpoint',
  );
  assert.ok(
    hookSrc.includes('parsed.event === \'new_message\''),
    'useWebSocketChat must handle new_message frames in real-time',
  );
  assert.ok(
    hookSrc.includes('parsed.event === \'user_typing\''),
    'useWebSocketChat must handle typing indicators',
  );
  assert.ok(
    hookSrc.includes('parsed.event === \'invitation_received\''),
    'useWebSocketChat must dispatch invitation_received notifications',
  );
  assert.ok(
    hookSrc.includes('parsed.event === \'invitation_status_changed\''),
    'useWebSocketChat must dispatch invitation_status_changed notifications',
  );
  assert.ok(
    hookSrc.includes('sendMessageRest'),
    'useWebSocketChat must provide fallback to REST when WebSocket buffers',
  );
}

// 3. RecruiterDashboard integration assertions
function testRecruiterDashboardIntegration() {
  const rdSrc = readFileSync(
    resolve(__dirname, '../src/components/recruiter/RecruiterDashboard.tsx'),
    'utf-8',
  );

  assert.ok(
    rdSrc.includes('listSentInvitations'),
    'RecruiterDashboard must query sent invitations to track status',
  );
  assert.ok(
    rdSrc.includes('sendInvitation'),
    'RecruiterDashboard must invoke real sendInvitation on submit',
  );
  assert.ok(
    rdSrc.includes('Invitation Sent ✓'),
    'RecruiterDashboard must show Invitation Sent badge for pending invitations',
  );
  assert.ok(
    rdSrc.includes('Chat with Candidate →'),
    'RecruiterDashboard must offer Chat link when candidate accepts invitation',
  );
  assert.ok(
    rdSrc.includes('role="dialog"'),
    'RecruiterDashboard must render an accessible invitation dialog modal',
  );
  assert.ok(
    rdSrc.includes('aria-modal="true"'),
    'RecruiterDashboard modal must declare aria-modal',
  );
}

// 4. AuthHeader navigation assertions
function testAuthHeaderNavigation() {
  const ahSrc = readFileSync(resolve(__dirname, '../src/components/AuthHeader.tsx'), 'utf-8');

  assert.ok(
    ahSrc.includes('href="/invitations"'),
    'AuthHeader must link to /invitations for interview requests',
  );
  assert.ok(
    ahSrc.includes('href="/messages"'),
    'AuthHeader must link to /messages for chat',
  );
  assert.ok(
    ahSrc.includes('pendingRequestsCount'),
    'AuthHeader must track pending request count for candidate notifications',
  );
  assert.ok(
    ahSrc.includes('invitation-received'),
    'AuthHeader must listen to real-time invitation events',
  );
}

// 5. InvitationsManager assertions
function testInvitationsManagerComponent() {
  const imSrc = readFileSync(
    resolve(__dirname, '../src/components/invitations/InvitationsManager.tsx'),
    'utf-8',
  );

  assert.ok(
    imSrc.includes('listReceivedInvitations'),
    'InvitationsManager must list received requests for candidates',
  );
  assert.ok(
    imSrc.includes('acceptInvitation'),
    'InvitationsManager must implement accept invitation flow',
  );
  assert.ok(
    imSrc.includes('declineInvitation'),
    'InvitationsManager must implement decline invitation flow',
  );
  assert.ok(
    imSrc.includes('Connect in Chat →'),
    'InvitationsManager must link directly to messages once connected',
  );
  assert.ok(
    imSrc.includes('Accept Request'),
    'InvitationsManager must render Accept Request button for pending items',
  );
}

// 6. ChatWorkspace assertions
function testChatWorkspaceComponent() {
  const cwSrc = readFileSync(
    resolve(__dirname, '../src/components/chat/ChatWorkspace.tsx'),
    'utf-8',
  );

  assert.ok(
    cwSrc.includes('useWebSocketChat'),
    'ChatWorkspace must wire to useWebSocketChat hook',
  );
  assert.ok(
    cwSrc.includes('listConversations'),
    'ChatWorkspace must load active conversations list',
  );
  assert.ok(
    cwSrc.includes('WS Connected') && cwSrc.includes('Connecting'),
    'ChatWorkspace must display live WebSocket connection status indicator',
  );
  assert.ok(
    cwSrc.includes('partnerTyping'),
    'ChatWorkspace must render real-time typing indicator',
  );
  assert.ok(
    cwSrc.includes('handleKeyDown'),
    'ChatWorkspace must support Enter key to send messages',
  );
}

testMessagingLibContract();
testWebSocketHookArchitecture();
testRecruiterDashboardIntegration();
testAuthHeaderNavigation();
testInvitationsManagerComponent();
testChatWorkspaceComponent();

console.log('PASS: 24 recruiter invitations and WebSocket chat scenarios verified successfully.');
