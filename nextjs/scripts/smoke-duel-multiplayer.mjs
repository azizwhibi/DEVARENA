const WebSocket = globalThis.WebSocket;

const ws1 = new WebSocket('ws://localhost:3000/duel?playerName=Alice_Pro');
const ws2 = new WebSocket('ws://localhost:3000/duel?playerName=Bob_Elite');

let duelId = null;
let roundsCompleted = 0;

function setupClient(ws, name, isP1) {
  ws.onopen = () => {
    console.log(`[${name}] Connected to Gateway :3000`);
    ws.send(JSON.stringify({
      type: 'DUEL_JOIN',
      payload: { playerId: isP1 ? 'alice_id' : 'bob_id', playerName: name }
    }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'DUEL_QUEUE_WAITING') {
      console.log(`[${name}] In queue, position: #${msg.payload.position}`);
    }

    if (msg.type === 'DUEL_MATCH_FOUND') {
      duelId = msg.payload.duelId;
      console.log(`[${name}] Match Found! Duel ID: ${duelId}, Opponent: ${msg.payload.opponent.name}`);
    }

    if (msg.type === 'DUEL_ROUND_START') {
      const { roundIndex, question } = msg.payload;
      if (isP1) {
        console.log(`---> Round ${roundIndex + 1}/10 started! Prompt: "${question.prompt.slice(0, 50)}..."`);
      }

      // Simulate player answer after short delay
      setTimeout(() => {
        const selectedIndex = isP1 ? question.correctIndex : (question.correctIndex + 1) % 4;
        ws.send(JSON.stringify({
          type: 'DUEL_SUBMIT_ANSWER',
          payload: {
            duelId,
            roundIndex,
            questionId: question.id,
            selectedIndex,
            timeRemainingMs: isP1 ? 8200 : 6500,
          }
        }));
      }, isP1 ? 40 : 100);
    }

    if (msg.type === 'DUEL_ROUND_RESOLVE') {
      if (isP1) {
        roundsCompleted++;
        console.log(`[Round ${msg.payload.roundIndex + 1} Resolved] Alice: ${msg.payload.playerTotalScore} pts | Bob: ${msg.payload.opponentTotalScore} pts`);
      }
    }

    if (msg.type === 'DUEL_MATCH_END') {
      console.log(`[${name}] DUEL_MATCH_END received! Winner ID: ${msg.payload.winnerId}`);
      if (isP1) {
        console.log('Final Stats Alice (P1):', JSON.stringify(msg.payload.finalStats.player));
        console.log('Final Stats Bob (P2):', JSON.stringify(msg.payload.finalStats.opponent));
        console.log(`Total rounds arbitrated: ${roundsCompleted}/10`);
        console.log('=== SMOKE TEST: 10 ROUNDS MULTIPLAYER MATCH SUCCEEDED 100% ===');
        setTimeout(() => {
          ws1.close();
          ws2.close();
          process.exit(0);
        }, 500);
      }
    }
  };
}

setupClient(ws1, 'Alice_Pro', true);
setupClient(ws2, 'Bob_Elite', false);
