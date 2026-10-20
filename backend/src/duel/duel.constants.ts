import type { WebSocket } from 'ws';
import type { DuelServerEvent, Question } from './duel.types';

export const ROUND_DURATION_MS = 10_000;
export const RESOLUTION_DURATION_MS = 2_000;
export const MAX_ROUNDS = 10;
export const ACCEPT_TIMEOUT_MS = 10_000;

export const DEFAULT_DUEL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: "Que renvoie l'expression suivante en JavaScript moderne ?",
    snippet: 'typeof (async () => {})()',
    options: ['"function"', '"object"', '"promise"', '"undefined"'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    prompt: "Dans quel ordre ces messages s'affichent-ils dans la console ?",
    snippet: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');`,
    options: ['1, 2, 3, 4', '1, 4, 3, 2', '1, 4, 2, 3', '1, 3, 4, 2'],
    correctIndex: 1,
  },
  {
    id: 'q3',
    prompt:
      'En TypeScript, quelle est l\'utilité de l\'opérateur "satisfies" introduit en TS 4.9 ?',
    snippet:
      'const palette = { primary: "#0070f3" } satisfies Record<string, string>;',
    options: [
      'Il effectue un cast de type strict au runtime',
      'Il valide la compatibilité de type sans élargir (widen) le type inféré',
      "Il empêche la réassignation des propriétés de l'objet",
      'Il force le typage dynamique en contournant le compilateur',
    ],
    correctIndex: 1,
  },
  {
    id: 'q4',
    prompt: 'Quelle comparaison renvoie "true" en JavaScript ?',
    snippet: 'Object.is(NaN, NaN) vs (NaN === NaN)',
    options: [
      'NaN === NaN uniquement',
      'Object.is(NaN, NaN) uniquement',
      'Les deux renvoient true',
      'Les deux renvoient false',
    ],
    correctIndex: 1,
  },
  {
    id: 'q5',
    prompt:
      'Dans React 19, quelle fonction permet de consommer directement une Promesse dans le rendu ?',
    snippet: 'const data = use(fetchDataPromise);',
    options: ['use()', 'usePromise()', 'useAwait()', 'useAsync()'],
    correctIndex: 0,
  },
  {
    id: 'q6',
    prompt:
      "En CSS Flexbox, quelle propriété aligne les éléments le long de l'axe principal ?",
    snippet: '.container { display: flex; /* ??? */ }',
    options: [
      'align-items',
      'justify-content',
      'align-content',
      'place-items',
    ],
    correctIndex: 1,
  },
  {
    id: 'q7',
    prompt:
      "Quelle est la complexité temporelle moyenne d'une recherche par clé dans une Map JavaScript (Hash Table) ?",
    snippet: 'const map = new Map(); map.get("clef");',
    options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'],
    correctIndex: 2,
  },
  {
    id: 'q8',
    prompt:
      "Quel code HTTP correspond au refus d'accès en raison de permissions insuffisantes (bien qu'authentifié) ?",
    options: [
      '401 Unauthorized',
      '403 Forbidden',
      '405 Method Not Allowed',
      '422 Unprocessable Entity',
    ],
    correctIndex: 1,
  },
  {
    id: 'q9',
    prompt: "Que produit l'opération suivante avec le Garbage Collector JS ?",
    snippet: `let user = { name: "Dev" };
let admin = user;
user = null;`,
    options: [
      "L'objet est immédiatement garbage collected",
      'L\'objet reste en mémoire car "admin" y fait toujours référence',
      'Une erreur ReferenceError est levée',
      'La propriété "name" est passée à undefined',
    ],
    correctIndex: 1,
  },
  {
    id: 'q10',
    prompt:
      'En SQL, quelle clause filtre les lignes avant tout regroupement GROUP BY ?',
    snippet:
      'SELECT dept, count(*) FROM employees WHERE salary > 3000 GROUP BY dept HAVING count(*) > 5;',
    options: ['HAVING', 'WHERE', 'QUALIFY', 'FILTER'],
    correctIndex: 1,
  },
];

/**
 * Formule validée par SPEC-duel-websocket.md :
 * 0 si incorrect ou timeout
 * 500 + round((remainingMs / 10000) * 500) si correct
 */
export function calculatePoints(
  isCorrect: boolean,
  timeRemainingMs: number,
): number {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(ROUND_DURATION_MS, timeRemainingMs));
  return 500 + Math.round((clampedTime / ROUND_DURATION_MS) * 500);
}

export function safeSend(socket: WebSocket, event: DuelServerEvent): void {
  if (socket && socket.readyState === 1 /* WebSocket.OPEN */) {
    try {
      socket.send(JSON.stringify(event));
    } catch {
      // Socket write failure / closed
    }
  }
}
