// Automated live verification of Ready Check (Accept & Decline) flow
import assert from 'node:assert/strict';

const WebSocket = globalThis.WebSocket;
const WS_URL = 'ws://localhost:3000/duel';

console.log('=== TEST 1: Match proposal + 1 player declines -> re-queues other player ===');

async function runScenario1() {
  return new Promise((resolve, reject) => {
    const ws1 = new WebSocket(`${WS_URL}?playerName=Alice_ReadyCheck`);
    const ws2 = new WebSocket(`${WS_URL}?playerName=Bob_ReadyCheck`);

    let duelId = null;

    ws1.onopen = () => {
      ws1.send(JSON.stringify({
        type: 'DUEL_JOIN',
        payload: { playerId: 'alice_sc1', playerName: 'Alice_ReadyCheck' },
      }));
    };

    ws2.onopen = () => {
      ws2.send(JSON.stringify({
        type: 'DUEL_JOIN',
        payload: { playerId: 'bob_sc1', playerName: 'Bob_ReadyCheck' },
      }));
    };

    let p1Proposed = false;
    let p2Proposed = false;
    let p1Cancelled = false;
    let p2Cancelled = false;
    let bobRequeued = false;

    ws1.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'DUEL_MATCH_PROPOSED') {
        p1Proposed = true;
        duelId = msg.payload.duelId;
        console.log('[Scenario 1] Alice received DUEL_MATCH_PROPOSED. Declining...');
        // Alice declines
        ws1.send(JSON.stringify({
          type: 'DUEL_MATCH_DECLINE',
          payload: { duelId },
        }));
      }
      if (msg.type === 'DUEL_MATCH_CANCELLED') {
        p1Cancelled = true;
        assert.equal(msg.payload.reason, 'declined');
        console.log('[Scenario 1] Alice received DUEL_MATCH_CANCELLED (declined)');
        checkDone();
      }
    };

    ws2.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'DUEL_MATCH_PROPOSED') {
        p2Proposed = true;
        console.log('[Scenario 1] Bob received DUEL_MATCH_PROPOSED');
      }
      if (msg.type === 'DUEL_MATCH_CANCELLED') {
        p2Cancelled = true;
        assert.equal(msg.payload.reason, 'declined');
        console.log('[Scenario 1] Bob received DUEL_MATCH_CANCELLED (declined)');
      }
      if (msg.type === 'DUEL_QUEUE_WAITING' && p2Cancelled) {
        bobRequeued = true;
        console.log('[Scenario 1] Bob automatically re-queued at front! Position: #' + msg.payload.position);
        assert.equal(msg.payload.position, 1);
        checkDone();
      }
    };

    function checkDone() {
      if (p1Cancelled && bobRequeued) {
        setTimeout(() => {
          ws1.close();
          ws2.close();
          resolve({ p1Proposed, p2Proposed, p1Cancelled, p2Cancelled, bobRequeued });
        }, 50);
      }
    }

    setTimeout(() => {
      ws1.close();
      ws2.close();
      reject(new Error('Scenario 1 timeout'));
    }, 6000);
  });
}

console.log('=== TEST 2: Match proposal + double accept -> Round 1 starts ===');

async function runScenario2() {
  return new Promise((resolve, reject) => {
    const ws1 = new WebSocket(`${WS_URL}?playerName=Charlie_ReadyCheck`);
    const ws2 = new WebSocket(`${WS_URL}?playerName=David_ReadyCheck`);

    let duelId = null;

    ws1.onopen = () => {
      ws1.send(JSON.stringify({
        type: 'DUEL_JOIN',
        payload: { playerId: 'charlie_sc2', playerName: 'Charlie_ReadyCheck' },
      }));
    };

    ws2.onopen = () => {
      ws2.send(JSON.stringify({
        type: 'DUEL_JOIN',
        payload: { playerId: 'david_sc2', playerName: 'David_ReadyCheck' },
      }));
    };

    let p1AcceptedUpdate = false;
    let p2AcceptedUpdate = false;
    let p1RoundStarted = false;
    let p2RoundStarted = false;

    ws1.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'DUEL_MATCH_PROPOSED') {
        duelId = msg.payload.duelId;
        console.log('[Scenario 2] Charlie received DUEL_MATCH_PROPOSED. Accepting...');
        ws1.send(JSON.stringify({
          type: 'DUEL_MATCH_ACCEPT',
          payload: { duelId },
        }));
      }
      if (msg.type === 'DUEL_MATCH_ACCEPTED_UPDATE') {
        p1AcceptedUpdate = true;
        console.log('[Scenario 2] Charlie received DUEL_MATCH_ACCEPTED_UPDATE:', msg.payload.acceptedPlayerIds);
      }
      if (msg.type === 'DUEL_ROUND_START') {
        p1RoundStarted = true;
        console.log('[Scenario 2] Charlie received DUEL_ROUND_START! Round 1 started.');
        if (p1RoundStarted && p2RoundStarted) {
          setTimeout(() => {
            ws1.close();
            ws2.close();
            resolve({ p1AcceptedUpdate, p2AcceptedUpdate, p1RoundStarted, p2RoundStarted });
          }, 50);
        }
      }
    };

    ws2.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'DUEL_MATCH_PROPOSED') {
        duelId = msg.payload.duelId;
        console.log('[Scenario 2] David received DUEL_MATCH_PROPOSED. Accepting after 100ms...');
        setTimeout(() => {
          ws2.send(JSON.stringify({
            type: 'DUEL_MATCH_ACCEPT',
            payload: { duelId },
          }));
        }, 100);
      }
      if (msg.type === 'DUEL_MATCH_ACCEPTED_UPDATE') {
        p2AcceptedUpdate = true;
        console.log('[Scenario 2] David received DUEL_MATCH_ACCEPTED_UPDATE:', msg.payload.acceptedPlayerIds);
      }
      if (msg.type === 'DUEL_ROUND_START') {
        p2RoundStarted = true;
        console.log('[Scenario 2] David received DUEL_ROUND_START! Round 1 started.');
        if (p1RoundStarted && p2RoundStarted) {
          setTimeout(() => {
            ws1.close();
            ws2.close();
            resolve({ p1AcceptedUpdate, p2AcceptedUpdate, p1RoundStarted, p2RoundStarted });
          }, 50);
        }
      }
    };

    setTimeout(() => {
      ws1.close();
      ws2.close();
      reject(new Error('Scenario 2 timeout'));
    }, 6000);
  });
}

async function main() {
  try {
    const sc1 = await runScenario1();
    assert.ok(sc1.p1Proposed && sc1.p2Proposed, 'Both players received DUEL_MATCH_PROPOSED');
    assert.ok(sc1.p1Cancelled && sc1.p2Cancelled, 'Both players received DUEL_MATCH_CANCELLED');
    assert.ok(sc1.bobRequeued, 'Non-declining player re-queued at front');
    console.log('✔ PASS: Scenario 1 (Decline & Re-queue) verified successfully!\n');

    // Small delay between scenarios
    await new Promise((r) => setTimeout(r, 500));

    const sc2 = await runScenario2();
    assert.ok(sc2.p1AcceptedUpdate && sc2.p2AcceptedUpdate, 'Accepted updates received');
    assert.ok(sc2.p1RoundStarted && sc2.p2RoundStarted, 'Round 1 started after double accept');
    console.log('✔ PASS: Scenario 2 (Double Accept -> Round 1 start) verified successfully!\n');

    console.log('======================================================');
    console.log('ALL READY CHECK WEBSOCKET LIVE SCENARIOS PASSED 100%');
    console.log('======================================================');
    setTimeout(() => {
      process.exit(0);
    }, 200);
  } catch (err) {
    console.error('FAILED:', err);
    process.exit(1);
  }
}

main();
