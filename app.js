嚜磨mport { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  getDocs,
  addDoc
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';

// -------------------- Firebase bootstrap --------------------
const firebaseConfig = {
  apiKey: 'AIzaSyADGfYlLyMB-W5A2JM6uF8VqTiF3LL9lEI',
  authDomain: 'secertmisson-19e11.firebaseapp.com',
  projectId: 'secertmisson-19e11',
  storageBucket: 'secertmisson-19e11.firebasestorage.app',
  messagingSenderId: '730645471093',
  appId: '1:730645471093:web:dacceb7a79256deb06fd3c'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -------------------- Constants --------------------
const wordPool = [
  'adventure','analysis','balance','beacon','bridge','canvas','celebration','challenge','clarity','compass','confidence','connection','courage','creative','dawn','discovery','dream','energy','focus','friend','future','galaxy','harmony','idea','insight','journey','knowledge','legend','light','logic','memory','mission','momentum','mystery','network','ocean','origin','pioneer','puzzle','quest','rhythm','rocket','science','signal','spirit','story','strategy','sunrise','teamwork','victory','vision','voice','whisper','wisdom','wonder','?除','?芯撈','?','蝒','靽∩遙','撠','?梯?','?嗆?','隤脫','蝑?','蝟餉齒','摰輯?','餈','蝚','憭乩撈','?','?','?菜?','暺?','??','?梯?','?勗','?','?','蝷曉?','蝟餃飛??,'?','?啁?','摮賊','摮詨?','?恕','?','??','憭','??','瘚琿?','??','?征','?怨','蝢','敶勗?','閮','甇乩?','撘批?','??,'靽∟?','撽?','擃?','?餃?','?怎悌','?賡?','蝭憟?
];


const wordSets = [
  ['?詨?','暺','?嗆?','??蝷?,'?','蝷曉?','?','??','?Ｘ平','?蝧?,'韏啣?','鋆???,'蝳蝷?,'????,'?⊥','擃擗?,'?∟?','撠葦','?','靘輻','璅０','獢?','??','雿平','?⊿'],
  ['YouTube','蝐?','?餌','?餃蔣','撠牧','?憤','??','?單?','蝬脰頃','瞍怎','??','?嗅?','餈賢?','蝷曄黎','皛','??','蝢?','?','??','??','?Ｗ?','KTV','瘚?','?極','憭找犖'],
  ['?啣?','?典?','?餉','?啁拳','摨?,'銵??','??,'??','蝑???,'璊?','?豢?','瘞湔','?潮','?單?','??','??','?','?','蝒','?∪?','?蝑?,'銵?蝝?,'??,'?啣?','?'],
  ['??,'憭Ｘ','?除','撣?','?芯?','?芰','甇⊥?','?望?','?像','甇?儔','??','閮','??','甇瑕','蝘飛','憟?','靽∪艙','?','?賡?','??','暺?','?','?脤','瘝?','甇颱滿']
];
const defaultRoomConfigs = [
  { id: 'room-alpha', name: '璈?隞?? A', capacity: 10 },
  { id: 'room-bravo', name: '璈?隞?? B', capacity: 10 },
  { id: 'room-charlie', name: '璈?隞?? C', capacity: 10 },
  { id: 'room-delta', name: '璈?隞?? D', capacity: 10 }
];

const localPlayerKey = 'codenamePlayerStore-v1';
const TEAM_KEYS = ['red','blue'];

const lastRoomKey = 'codenameLastRoomId';

// -------------------- Helpers --------------------
function normalizeRoomId(roomId) {
  const value = typeof roomId === 'string' ? roomId.trim() : '';
  if (!value) throw new Error('?輸?隞?Ⅳ?⊥?嚗???豢??輸?');
  return value;
}

function roomDoc(roomId, ...segments) {
  const safeId = normalizeRoomId(roomId);
  return doc(db, 'rooms', safeId, ...segments);
}

function roomCollection(roomId, ...segments) {
  const safeId = normalizeRoomId(roomId);
  return collection(db, 'rooms', safeId, ...segments);
}

function roomChatCollection(roomId) {
  const safeId = normalizeRoomId(roomId);
  return collection(db, 'rooms', safeId, 'chat');

}

function voteCollection(roomId) {
  const safeId = normalizeRoomId(roomId);
  return collection(db, 'rooms', safeId, 'votes');
}

function logAndAlert(message, error) {
  console.error(message, error || '');
  alert(message);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(value ?? '').replace(/[&<>"']/g, char => map[char] || char);
}

function otherTeam(team) {
  return team === 'red' ? 'blue' : 'red';
}

function generateBoard(startingTeam, wordSet = wordPool) {
  const selectedWords = shuffle([...wordSet]).slice(0, 25);
  const otherTeam = startingTeam === 'red' ? 'blue' : 'red';
  const roles = [
    ...Array(9).fill(startingTeam),
    ...Array(8).fill(otherTeam),
    ...Array(7).fill('neutral'),
    'assassin'
  ];
  const shuffledRoles = shuffle(roles);
  return selectedWords.map((word, index) => ({
    index,
    word,
    role: shuffledRoles[index],
    revealed: false
  }));
}

function getJoinedAtValue(data) {
  const ts = data.joinedAt;
  if (ts && typeof ts.seconds === 'number') {
    return ts.seconds + (ts.nanoseconds || 0) / 1_000_000_000;
  }
  return 0;
}

// -------------------- localStorage utilities --------------------
function loadPlayerStore() {
  if (!('localStorage' in window)) return {};
  try {
    const raw = localStorage.getItem(localPlayerKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('霈?摰嗆摮仃??, error);
    return {};
  }
}

function persistPlayerStore(store) {
  if (!('localStorage' in window)) return;
  try {
    localStorage.setItem(localPlayerKey, JSON.stringify(store));
  } catch (error) {
    console.warn('?脣??拙振?怠?憭望?', error);
  }
}

let playerStore = loadPlayerStore();

function setStoredPlayer(roomId, playerId) {
  try {
    const safeId = normalizeRoomId(roomId);
    playerStore[safeId] = { playerId };
    persistPlayerStore(playerStore);
  } catch (error) {
    console.warn(error.message);
  }
}

function removeStoredPlayer(roomId) {
  try {
    const safeId = normalizeRoomId(roomId);
    if (playerStore[safeId]) {
      delete playerStore[safeId];
      persistPlayerStore(playerStore);
    }
  } catch (error) {
    console.warn(error.message);
  }
}

function getStoredPlayer(roomId) {
  try {
    const safeId = normalizeRoomId(roomId);
    return playerStore[safeId];
  } catch {
    return undefined;
  }
}

function setLastRoom(roomId) {
  if (!('localStorage' in window)) return;
  try {
    const safeId = normalizeRoomId(roomId);
    localStorage.setItem(lastRoomKey, safeId);
  } catch (error) {
    console.warn('?脣??敺?仃??, error);
  }
}

function clearLastRoom() {
  if (!('localStorage' in window)) return;
  try {
    localStorage.removeItem(lastRoomKey);
  } catch (error) {
    console.warn('皜?敺?仃??, error);
  }
}

function getLastRoom() {
  if (!('localStorage' in window)) return null;
  try {
    return localStorage.getItem(lastRoomKey);
  } catch {
    return null;
  }
}

// -------------------- Global state --------------------
const state = {
  rooms: new Map(),
  roomData: null,
  players: [],
  cards: [],
  currentRoomId: null,
  currentPlayerId: null,
  unsubRooms: null,
  unsubRoom: null,
  unsubPlayers: null,
  unsubCards: null,
  unsubChat: null,
  unsubVotes: null,
  chatMessages: [],
  chatTeam: null,
  voteState: { round: null, byCard: new Map(), pass: new Set(), voters: new Set() }
};

const lobbyView = document.getElementById('lobby-view');
const roomView = document.getElementById('room-view');
const roomListEl = document.getElementById('room-list');
const playerListEl = document.getElementById('player-list');
const roomTitleEl = document.getElementById('room-title');
const roomMetaEl = document.getElementById('room-meta');
const roomStatusEl = document.getElementById('room-status');
const viewIndicatorEl = document.getElementById('view-indicator');
const boardGridEl = document.getElementById('board-grid');
const boardScoreEl = document.getElementById('board-score');
const winnerBannerEl = document.getElementById('winner-banner');
const teamChatPanelEl = document.getElementById('team-chat-panel');
const teamChatIndicatorEl = document.getElementById('team-chat-indicator');
const teamChatStatusEl = document.getElementById('team-chat-status');
const teamChatMessagesEl = document.getElementById('team-chat-messages');
const teamChatFormEl = document.getElementById('team-chat-form');
const teamChatInputEl = document.getElementById('team-chat-input');
const teamChatSendBtn = document.getElementById('team-chat-send');
const clueNumberButtons = Array.from(document.querySelectorAll('[data-clue-number]'));
if (clueNumberButtons.length) {
  clueNumberButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      clueNumberButtons.forEach(btn => btn.classList.toggle('selected', btn === button));
      const value = Number(button.dataset.clueNumber);
      submitClue(value);
    });
  });
}
const toggleReadyBtn = document.getElementById('toggle-ready');
const startGameBtn = document.getElementById('start-game');
const resetGameBtn = document.getElementById('reset-game');
const leaveRoomBtn = document.getElementById('leave-room');

// -------------------- Rendering helpers --------------------
function getCurrentPlayer() {
  if (!state.currentPlayerId) return null;
  return state.players.find(player => player.id === state.currentPlayerId) || null;
}

function updateViews() {
  const inRoom = Boolean(state.currentRoomId);
  lobbyView.classList.toggle('active', !inRoom);
  roomView.classList.toggle('active', inRoom);
}

function renderRoomList() {
  const items = defaultRoomConfigs.map(config => {
    const room = state.rooms.get(config.id);
    const name = room?.name || config.name;
    const capacity = room?.capacity || config.capacity;
    const occupied = room?.playerCount || 0;
    const status = room?.status || 'lobby';
    const owner = room?.ownerName || '撠??';
    const statusLabel = status === 'lobby' ? '蝑???' : status === 'in-progress' ? '??脰?銝? : '撌脩???;
    const disabled = status === 'in-progress' || occupied >= capacity;
    return `
      <div class="room-card">
        <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:flex-start;">
          <h3>${name}</h3>
          <span class="room-status">${statusLabel}</span>
        </div>
        <div class="room-meta">
          <span>?蹂蜓嚗?{owner}</span>
          <span>鈭箸嚗?{occupied}/${capacity}</span>
        </div>
        <div class="room-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <button data-room="${config.id}" class="join-room" ${disabled ? 'disabled' : ''}>??輸?</button>
          <button data-room="${config.id}" class="ghost danger reset-room" type="button">?蔭?輸?</button>
        </div>
      </div>`;
  }).join('');
  roomListEl.innerHTML = items;
}

function renderRoomDetail() {
  const room = state.roomData;
  if (!room) {
    playerListEl.innerHTML = '<div class="empty-state">頛?輸?銝?..</div>';
    boardGridEl.innerHTML = '';
    boardScoreEl.innerHTML = '';
    viewIndicatorEl.textContent = '隢??交??;
    winnerBannerEl.style.display = 'none';
    renderTeamChat();
    return;
  }

  roomTitleEl.textContent = room.name;
  const ownerLabel = room.ownerName || '撠??';
  roomMetaEl.textContent = `?蹂蜓嚗?{ownerLabel}嚚摰?${room.playerCount || 0}/${room.capacity}`;
  let statusText = room.status === 'lobby' ? '蝑?皞?銝? : room.status === 'in-progress' ? '??脰?銝? : '?砍?蝯?';
  if (room.status === 'in-progress' && room.currentTurn) {
    statusText += room.currentTurn === 'red' ? '嚚憚?啁??? : '嚚憚?啗???;
  }
  roomStatusEl.textContent = statusText;

  const currentPlayer = getCurrentPlayer();
  const isOwner = currentPlayer && room.ownerId === currentPlayer.id;

  const list = state.players.map(player => {
    const badges = [];
    if (player.id === room.ownerId) badges.push('<span class="badge owner">?蹂蜓</span>');
    if (player.team) badges.push(`<span class="badge team-${player.team}">${player.team === 'red' ? '蝝?' : '??'}</span>`);
    if (player.isCaptain) badges.push('<span class="badge captain">?</span>');
    badges.push(`<span class="badge ${player.ready ? 'ready' : 'waiting'}">${player.ready ? '撌脫??? : '蝑?銝?}</span>`);
    const canKick = isOwner && player.id !== room.ownerId;
    const kickButton = canKick ? `<button class="kick-btn" data-player-id="${player.id}">頦Ｗ</button>` : '';
    return `
      <div class="player-console">
        <div class="top-line">
          <span class="name">${player.name || '??'}</span>
          ${kickButton}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;">${badges.join('')}</div>
      </div>`;
  }).join('');
  playerListEl.innerHTML = list || '<div class="empty-state">撠?犖?嚗迭餈??箇洵銝雿??∴?</div>';

  if (currentPlayer) {
    toggleReadyBtn.textContent = currentPlayer.ready ? '??皞?' : '???末鈭?;
    toggleReadyBtn.disabled = room.status !== 'lobby';
  } else {
    toggleReadyBtn.textContent = '???末鈭?;
    toggleReadyBtn.disabled = true;
  }

  const everyoneReady = room.status === 'lobby' && state.players.length >= 2 && state.players.every(player => player.ready);
  startGameBtn.disabled = !(room.status === 'lobby' && isOwner && everyoneReady);
  resetGameBtn.disabled = !(isOwner && room.status !== 'lobby');

  updateViewIndicator();
  renderBoard();
  renderTeamChat();
}

function renderBoard() {
  const room = state.roomData;
  if (!room || !state.cards.length) {
    boardGridEl.innerHTML = '<div class="empty-state">蝑??蹂蜓???敺????遙???/div>';
    boardGridEl.classList.remove('captain-view');
    boardGridEl.classList.add('disabled');
    boardScoreEl.innerHTML = '';
    winnerBannerEl.style.display = 'none';
    renderTeamChat();
    return;
  }

  const currentPlayer = getCurrentPlayer();
  boardGridEl.classList.toggle('captain-view', Boolean(currentPlayer && currentPlayer.isCaptain));
  boardGridEl.classList.toggle('disabled', room.status !== 'in-progress');
  boardGridEl.innerHTML = state.cards.map(card => {
    const revealedClass = card.revealed ? ' revealed' : '';
    return `<div class="card role-${card.role}${revealedClass}" data-index="${card.index}"><span class="label">${card.word}</span></div>`;
  }).join('');

  updateScoreboard();
  if (room.status === 'finished' && room.winner) {
    winnerBannerEl.textContent = room.winner === 'red' ? '蝝??嚗? : '???嚗?;
    winnerBannerEl.style.display = 'block';
  } else {
    winnerBannerEl.style.display = 'none';
  }
}

function updateScoreboard() {
  if (!state.cards.length) {
    boardScoreEl.innerHTML = '';
    return;
  }
  const counts = { red: 0, blue: 0, neutral: 0, assassin: 0 };
  state.cards.forEach(card => {
    if (!card.revealed) counts[card.role] = (counts[card.role] || 0) + 1;
  });
  boardScoreEl.innerHTML = `
    <span class="score"><span class="dot" style="background:#ef4444"></span>蝝???${counts.red}</span>
    <span class="score"><span class="dot" style="background:#2563eb"></span>????${counts.blue}</span>
    <span class="score"><span class="dot" style="background:#94a3b8"></span>銝剔? ${counts.neutral}</span>
    <span class="score"><span class="dot" style="background:#0f172a"></span>?箏恥 ${counts.assassin}</span>`;
}

function updateViewIndicator() {
  const room = state.roomData;
  const currentPlayer = getCurrentPlayer();
  if (!room || !currentPlayer) {
    viewIndicatorEl.textContent = '隢??交??;
    return;
  }
  if (room.status === 'lobby') {
    viewIndicatorEl.textContent = '撠??';
  } else if (room.status === 'in-progress') {
    const turnInfo = room.currentTurn ? (room.currentTurn === 'red' ? '頛芸蝝?' : '頛芸??') : '頛芸隤啁?敺??;
    if (currentPlayer.isCaptain) {
      viewIndicatorEl.textContent = `雿?嚗?亦??券憿嚚?{turnInfo}`;
    } else if (currentPlayer.team) {
      viewIndicatorEl.textContent = `雿${currentPlayer.team === 'red' ? '蝝?' : '??'}?嚗?賜??啣歇蝧駁????${turnInfo}`;
    } else {
      viewIndicatorEl.textContent = '雿?閫?啗??芾??祇?鞈?';
    }
  } else {
    viewIndicatorEl.textContent = '?砍?蝯?嚗?敺銝駁?閮?;
  }
}


function cleanupChatSubscription() {
  if (state.unsubChat) {
    state.unsubChat();
    state.unsubChat = null;
  }
}

function resetChatState() {
  cleanupChatSubscription();
  state.chatMessages = [];
  state.chatTeam = null;
  if (teamChatInputEl) teamChatInputEl.value = '';
    if (teamChatInputEl) teamChatInputEl.disabled = true;
    renderTeamChat();
  setClueNumberAvailability(false);
}

function formatTeamChatTimestamp(value) {
  try {
    if (value && typeof value.toDate === 'function') {
      const date = value.toDate();
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
  } catch (error) {
    console.warn('嚙賭票嚙踝蕭w嚙褕案佗蕭嚙踝蕭嚙確', error);
  }
  return '';
}

function updateTeamChatControls() {
  if (!teamChatInputEl || !teamChatSendBtn) return;
  if (clueNumberButtons.length) {
    teamChatSendBtn.disabled = true;
    return;
  }
  const canSend = !teamChatInputEl.disabled && Boolean(teamChatInputEl.value.trim());
  teamChatSendBtn.disabled = !canSend;
}


function setClueNumberAvailability(enabled) {
  if (!clueNumberButtons.length) return;
  clueNumberButtons.forEach(button => {
    button.disabled = !enabled;
    if (!enabled) button.classList.remove('selected');
  });
}

function renderTeamChat() {
  if (!teamChatPanelEl || !teamChatIndicatorEl || !teamChatStatusEl || !teamChatMessagesEl || !teamChatInputEl) return;

  const room = state.roomData;
  const player = getCurrentPlayer();
  const team = player?.team || null;
  const status = room?.status;
  const isCaptain = Boolean(player?.isCaptain);
  const isTurn = room?.currentTurn ? room.currentTurn === team : false;
  const clueSubmitted = room?.clueSubmitted === true;

  let indicatorText = 'No Team';
  let statusText = 'Join a room to use the team chat.';
  let emptyMessage = 'Waiting for the game to start...';
  let allowSend = false;

  if (!room) {
    statusText = 'Join a room to see captain messages.';
    emptyMessage = 'No active room.';
  } else if (!player) {
    statusText = 'Confirm that you appear in the player list.';
  } else if (!team) {
    statusText = status === 'in-progress'
      ? 'You have not been assigned to a team yet.'
      : 'Wait for the host to start the match.';
  } else {
    indicatorText = team === 'red' ? 'Red Team' : 'Blue Team';
    if (status === 'in-progress') {
      if (isCaptain) {
        if (isTurn) {
          if (clueSubmitted) {
            statusText = 'Clue sent. Wait for teammates to act.';
            emptyMessage = 'Clue already posted.';
          } else {
            allowSend = true;
            statusText = 'Enter a one-word clue, then tap a number.';
            emptyMessage = 'No clue yet. Please provide one.';
          }
        } else {
          statusText = 'Not our turn yet. Please wait.';
          emptyMessage = 'Captains can speak once it is our turn.';
        }
      } else {
        if (isTurn) {
          statusText = clueSubmitted
            ? 'Discuss the clue and flip cards carefully.'
            : 'Waiting for the captain to send a clue.';
        } else {
          statusText = 'Waiting for the other team to finish their turn.';
        }
        emptyMessage = 'No clue yet.';
      }
    } else {
      statusText = 'The game has not started yet.';
      emptyMessage = 'Waiting for the host to start the match.';
    }
  }

  const hasClue = room?.clueSubmitted && typeof room?.clueWord === 'string' && room.clueWord.trim();
  if (hasClue) {
    const summary = room.clueWord.trim() + (typeof room.clueNumber === 'number' ? ' [' + room.clueNumber + ']' : '');
    const guessesLeft = typeof room.guessesRemaining === 'number' ? Math.max(0, room.guessesRemaining) : null;
    const clueInfo = 'Current clue: ' + summary + (guessesLeft !== null ? ' (' + guessesLeft + ' guesses left)' : '') + '.';
    statusText += (statusText ? ' ' : '') + clueInfo;
  }

  teamChatIndicatorEl.textContent = indicatorText;
  teamChatStatusEl.textContent = statusText;

  if (!state.chatMessages.length) {
    teamChatMessagesEl.classList.add('empty');
    teamChatMessagesEl.textContent = emptyMessage;
  } else {
    teamChatMessagesEl.classList.remove('empty');
    const items = state.chatMessages.map(message => {
      const senderName = escapeHtml(message.senderName || 'Captain');
      const roleFlag = message.senderRole || '';
      const roleLabel = roleFlag === 'red-captain'
        ? 'Red Captain'
        : roleFlag === 'blue-captain'
        ? 'Blue Captain'
        : message.team === 'red'
        ? 'Red Captain'
        : message.team === 'blue'
        ? 'Blue Captain'
        : 'Captain';
      const senderLabel = senderName + ' (' + roleLabel + ')';
      const content = escapeHtml(message.text || '');
      const numberLabel = typeof message.clueNumber === 'number' ? ' [' + message.clueNumber + ']' : '';
      const timeLabel = formatTeamChatTimestamp(message.createdAt);
      const meta = timeLabel ? '<span>' + escapeHtml(timeLabel) + '</span>' : '';
      return '<div class="chat-message"><div class="sender"><span>' + senderLabel + '</span>' + meta + '</div><div class="text">' + content + numberLabel + '</div></div>';
    }).join('');
    teamChatMessagesEl.innerHTML = items;
    teamChatMessagesEl.scrollTop = teamChatMessagesEl.scrollHeight;
  }

  setClueNumberAvailability(allowSend);
  teamChatInputEl.disabled = !allowSend;
  if (teamChatInputEl && allowSend) teamChatInputEl.focus();
  if (teamChatSendBtn) teamChatSendBtn.disabled = true;
  if (teamChatFormEl) teamChatFormEl.classList.toggle('disabled', !allowSend);
  updateTeamChatControls();
}

function ensureTeamChatSubscription() {
  if (!teamChatPanelEl) return;
  const roomId = state.currentRoomId;
  if (!roomId) {
    cleanupChatSubscription();
    state.chatMessages = [];
    renderTeamChat();
    return;
  }

  cleanupChatSubscription();
  try {
    const messagesQuery = query(roomChatCollection(roomId), orderBy('createdAt', 'asc'));
    state.unsubChat = onSnapshot(messagesQuery, snapshot => {
      state.chatMessages = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          text: data.text || '',
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          team: data.team || null,
          senderRole: data.senderRole || '',
          clueNumber: typeof data.clueNumber === 'number' ? data.clueNumber : null,
          createdAt: data.createdAt || null
        };
      });
      renderTeamChat();
    });
  } catch (error) {
    console.warn('Failed to subscribe to room chat', error);
  }
  renderTeamChat();
}

async function sendTeamMessage(clueNumber, clueWord) {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player || !player.team) return;

  const number = Number(clueNumber);
  const rawWord = clueWord ?? (teamChatInputEl ? teamChatInputEl.value : '');
  const word = rawWord.trim();

  if (!word) {
    logAndAlert('Please enter a clue word.');
    return;
  }
  if (word.split(/\s+/).filter(Boolean).length > 1) {
    logAndAlert("Clue must be a single word.");
    return;
  }
  if (!Number.isInteger(number) || number < 1 || number > 10) {
    logAndAlert('Choose a number between 1 and 10.');
    return;
  }
  if (!player.isCaptain) {
    logAndAlert('Only the captain can send team messages.');
    return;
  }

  const safeRoomId = normalizeRoomId(roomId);
  const guessesAllowed = number + 1;

  if (teamChatSendBtn) teamChatSendBtn.disabled = true;
  setClueNumberAvailability(false);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room no longer exists');
      const roomData = roomSnap.data();
      if (roomData.status !== 'in-progress') throw new Error('Game has not started');
      if (roomData.currentTurn && roomData.currentTurn !== player.team) throw new Error('It is not your team\'s turn');
      if (roomData.clueSubmitted) throw new Error('A clue has already been submitted this turn');
      transaction.update(roomRef, {
        clueSubmitted: true,
        clueWord: word,
        clueNumber: number,
        clueBy: player.name || '',
        guessesRemaining: guessesAllowed,
        extraGuessAvailable: false,
        lastClueAt: serverTimestamp()
      });
    });

    await addDoc(roomChatCollection(roomId, player.team), {
      text: word,
      clueNumber: number,
      senderId: player.id,
      senderName: player.name || '',
      senderRole: player.team === 'red' ? 'red-captain' : 'blue-captain',
      team: player.team,
      createdAt: serverTimestamp()
    });

    if (state.roomData && state.roomData.id === safeRoomId) {
      state.roomData = {
        ...state.roomData,
        clueSubmitted: true,
        clueWord: word,
        clueNumber: number,
        clueBy: player.name || '',
        guessesRemaining: guessesAllowed,
        extraGuessAvailable: false
      };
    }

    if (teamChatInputEl) {
      teamChatInputEl.value = '';
      teamChatInputEl.disabled = true;
    }
    renderTeamChat();
  } catch (error) {
    logAndAlert(error.message || 'Failed to send team message', error);
    setClueNumberAvailability(true);
    if (teamChatInputEl) teamChatInputEl.disabled = false;
  } finally {
    updateTeamChatControls();
  }
}

function submitClue(number) {
  if (!teamChatInputEl || teamChatInputEl.disabled) return;
  const word = teamChatInputEl.value.trim();
  if (!word) {
    logAndAlert('Please enter a clue word.');
    return;
  }
  sendTeamMessage(number, word);
}


// -------------------- Firestore listeners --------------------
function cleanupRoomSubscriptions() {
  if (state.unsubRoom) { state.unsubRoom(); state.unsubRoom = null; }
  if (state.unsubPlayers) { state.unsubPlayers(); state.unsubPlayers = null; }
  if (state.unsubCards) { state.unsubCards(); state.unsubCards = null; }
  if (state.unsubChat) { state.unsubChat(); state.unsubChat = null; }
}

function subscribeToDirectory() {
  if (state.unsubRooms) state.unsubRooms();
  const roomsRef = collection(db, 'rooms');
  state.unsubRooms = onSnapshot(roomsRef, snapshot => {
    state.rooms.clear();
    snapshot.forEach(docSnap => {
      if (defaultRoomConfigs.some(config => config.id === docSnap.id)) {
        state.rooms.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      }
    });
    renderRoomList();
  });
}

function subscribeToRoom(roomId) {
  cleanupRoomSubscriptions();
  resetChatState();
  state.roomData = null;
  state.players = [];
  state.cards = [];
  renderTeamChat();

  if (!roomId) {
    renderRoomDetail();
    return;
  }

  let safeRoomId;
  try {
    safeRoomId = normalizeRoomId(roomId);
  } catch (error) {
    logAndAlert(error.message);
    return;
  }

  const roomRef = doc(db, 'rooms', safeRoomId);
  state.unsubRoom = onSnapshot(roomRef, snapshot => {
    if (!snapshot.exists()) {
      logAndAlert('?輸?撌脖?摮嚗?餈?憭批輒');
      state.currentRoomId = null;
      state.currentPlayerId = null;
      clearLastRoom();
      resetChatState();
      updateViews();
      renderRoomList();
      renderRoomDetail();
      return;
    }
    state.roomData = { id: snapshot.id, ...snapshot.data() };
    renderRoomDetail();
    ensureTeamChatSubscription();
  });

  const playersQuery = query(roomCollection(roomId, 'players'), orderBy('joinedAt', 'asc'));
  state.unsubPlayers = onSnapshot(playersQuery, snapshot => {
    state.players = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    const stored = getStoredPlayer(roomId);
    if (stored && !state.players.some(player => player.id === stored.playerId)) {
      removeStoredPlayer(roomId);
      state.currentPlayerId = null;
    }
    renderRoomDetail();
    ensureTeamChatSubscription();
  });

  state.unsubCards = onSnapshot(roomCollection(roomId, 'cards'), snapshot => {
    state.cards = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        index: typeof data.index === 'number' ? data.index : Number(docSnap.id)
      };
    }).sort((a, b) => a.index - b.index);
    renderBoard();
  });
}

// -------------------- Firestore utilities --------------------
async function ensureDefaultRooms() {
  await Promise.all(defaultRoomConfigs.map(async config => {
    const roomRef = doc(db, 'rooms', config.id);
    const snapshot = await getDoc(roomRef);
    if (!snapshot.exists()) {
      await setDoc(roomRef, {
        name: config.name,
        capacity: config.capacity,
        status: 'lobby',
        ownerId: null,
        ownerName: '',
        startingTeam: 'red',
        winner: null,
        playerCount: 0,
        remainingRed: null,
        remainingBlue: null,
        currentTurn: null,
        guessesRemaining: null,
        extraGuessAvailable: null,
        clueSubmitted: false,
        clueWord: '',
        clueNumber: null,
        clueBy: '',
        lastClueAt: null,
        createdAt: serverTimestamp()
      });
    } else {
      const data = snapshot.data();
      const updates = {};
      if (data.name !== config.name) updates.name = config.name;
      if (data.capacity !== config.capacity) updates.capacity = config.capacity;
      if (typeof data.playerCount !== 'number') updates.playerCount = data.playerCount || 0;
      if (!('remainingRed' in data)) updates.remainingRed = null;
      if (!('remainingBlue' in data)) updates.remainingBlue = null;
      if (!('currentTurn' in data)) updates.currentTurn = null;
      if (!('guessesRemaining' in data)) updates.guessesRemaining = null;
      if (!('extraGuessAvailable' in data)) updates.extraGuessAvailable = null;
      if (!('clueSubmitted' in data)) updates.clueSubmitted = false;
      if (!('clueWord' in data)) updates.clueWord = '';
      if (!('clueNumber' in data)) updates.clueNumber = null;
      if (!('clueBy' in data)) updates.clueBy = '';
      if (!('lastClueAt' in data)) updates.lastClueAt = null;
      if (Object.keys(updates).length) await updateDoc(roomRef, updates);
    }
  }));
}

async function fetchPlayerRefs(roomId) {
  try {
    const refs = await getDocs(roomCollection(roomId, 'players'));
    return refs.docs
      .map(docSnap => ({ ref: docSnap.ref, id: docSnap.id, data: docSnap.data() }))
      .sort((a, b) => getJoinedAtValue(a.data) - getJoinedAtValue(b.data));
  } catch (error) {
    console.warn('霈?摰嗅?銵典仃??, error);
    return [];
  }
}

async function fetchCardRefs(roomId) {
  try {
    const refs = await getDocs(roomCollection(roomId, 'cards'));
    return refs.docs.map(docSnap => docSnap.ref);
  } catch (error) {
    console.warn('霈???銵典仃??, error);
    return [];
  }
}

async function fetchChatRefs(roomId) {
  try {
    const snapshot = await getDocs(roomChatCollection(roomId));
    return snapshot.docs.map(docSnap => docSnap.ref);
  } catch (error) {
    console.warn('Failed to load room chat messages', error);
    return [];
  }
}


// -------------------- Room flows --------------------
async function resetRoom(roomId) {
  const safeRoomId = normalizeRoomId(roomId);
  const confirmed = confirm(`蝣箄?閬?蝵?${roomId} ??`);
  if (!confirmed) return;
  try {
    const playersSnap = await getDocs(roomCollection(safeRoomId, 'players'));
    const cardsSnap = await getDocs(roomCollection(safeRoomId, 'cards'));
    const chatRefs = await fetchChatRefs(safeRoomId);
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;
      playersSnap.forEach(docSnap => transaction.delete(docSnap.ref));
      cardsSnap.forEach(docSnap => transaction.delete(docSnap.ref));
      chatRefs.forEach(ref => transaction.delete(ref));
      transaction.set(roomRef, {
        status: 'lobby',
        ownerId: null,
        ownerName: '',
        startingTeam: 'red',
        currentTurn: null,
        guessesRemaining: null,
        extraGuessAvailable: null,
        winner: null,
        playerCount: 0,
        remainingRed: null,
        remainingBlue: null,
        clueSubmitted: false,
        clueWord: '',
        clueNumber: null,
        clueBy: '',
        lastClueAt: null
      }, { merge: true });
    });
    if (playerStore[safeRoomId]) {
      delete playerStore[safeRoomId];
      persistPlayerStore(playerStore);
    }
    if (state.currentRoomId === roomId) {
      clearLastRoom();
      cleanupRoomSubscriptions();
      resetChatState();
      state.currentRoomId = null;
      state.currentPlayerId = null;
      state.roomData = null;
      state.players = [];
      state.cards = [];
      state.chatMessages = [];
      state.chatTeam = null;
      updateViews();
      renderRoomDetail();
      renderTeamChat();
    } else {
      renderRoomDetail();
      renderTeamChat();
    }
    renderRoomList();
  } catch (error) {
    logAndAlert('?蔭?輸?憭望?', error);
  }
}

async function attemptResume() {
  const lastRoom = getLastRoom();
  if (!lastRoom) return;
  const stored = getStoredPlayer(lastRoom);
  if (!stored) return;
  try {
    const playerSnap = await getDoc(doc(db, 'rooms', lastRoom, 'players', stored.playerId));
    if (playerSnap.exists()) {
      state.currentRoomId = lastRoom;
      state.currentPlayerId = stored.playerId;
      subscribeToRoom(lastRoom);
      updateViews();
    } else {
      removeStoredPlayer(lastRoom);
      clearLastRoom();
    }
  } catch (error) {
    console.warn('?Ｗ儔?輸?憭望?', error);
  }
}

async function handleJoinRoom(roomId) {
  if (!roomId) return;
  const trimmed = roomId.trim();
  if (!trimmed) return;
  const room = state.rooms.get(trimmed);
  if (room && room.status === 'in-progress') {
    logAndAlert('??脰?銝哨?隢????');
    return;
  }

  const stored = getStoredPlayer(trimmed);
  if (stored) {
    try {
      const playerSnap = await getDoc(doc(db, 'rooms', trimmed, 'players', stored.playerId));
      if (playerSnap.exists()) {
        state.currentRoomId = trimmed;
        state.currentPlayerId = stored.playerId;
        setLastRoom(trimmed);
        subscribeToRoom(trimmed);
        updateViews();
        return;
      }
      removeStoredPlayer(trimmed);
    } catch (error) {
      console.warn('瑼Ｘ撌脩?亦摰嗅仃??, error);
    }
  }

  const nickname = prompt('頛詨雿??梁迂');
  if (!nickname) return;
  const safeName = nickname.trim();
  if (!safeName) return;

  try {
    const playerId = await joinRoomTransaction(trimmed, safeName.slice(0, 16));
    state.currentRoomId = trimmed;
    state.currentPlayerId = playerId;
    setStoredPlayer(trimmed, playerId);
    setLastRoom(trimmed);
    subscribeToRoom(trimmed);
    updateViews();
  } catch (error) {
    logAndAlert(error.message || '??輸?憭望?', error);
  }
}

async function joinRoomTransaction(roomId, name) {
  const safeRoomId = normalizeRoomId(roomId);
  const playerId = crypto.randomUUID();
  await runTransaction(db, async transaction => {
    const roomRef = doc(db, 'rooms', safeRoomId);
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) throw new Error('Room no longer exists');
    const room = roomSnap.data();
    if (room.status === 'in-progress') throw new Error('??脰?銝哨?隢?????);
    const currentCount = room.playerCount || 0;
    if (currentCount >= (room.capacity || 10)) throw new Error('?輸?鈭箸撌脫遛');

    transaction.set(doc(db, 'rooms', safeRoomId, 'players', playerId), {
      name,
      ready: false,
      team: null,
      isCaptain: false,
      joinedAt: serverTimestamp()
    });

    const updates = { playerCount: currentCount + 1 };
    if (!room.ownerId) {
      updates.ownerId = playerId;
      updates.ownerName = name;
    }
    transaction.set(roomRef, updates, { merge: true });
  });
  return playerId;
}

async function toggleReady() {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  try {
    await updateDoc(doc(db, 'rooms', normalizeRoomId(roomId), 'players', player.id), { ready: !player.ready });
  } catch (error) {
    logAndAlert('?湔皞???仃??, error);
  }
}

async function startGame() {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  const safeRoomId = normalizeRoomId(roomId);
  const playerRefs = await fetchPlayerRefs(safeRoomId);
  const cardRefs = await fetchCardRefs(safeRoomId);
  const chatRefs = await fetchChatRefs(safeRoomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room no longer exists');
      const room = roomSnap.data();
      if (room.ownerId !== player.id) throw new Error('?芣??蹂蜓?臭誑???');
      if (room.status !== 'lobby') throw new Error('?????迂??');

      const players = [];
      for (const item of playerRefs) {
        const snap = await transaction.get(item.ref);
        if (snap.exists()) players.push({ id: snap.id, ...snap.data() });
      }
      if (players.length < 2) throw new Error('?喳??閬雿摰?);
      if (!players.every(p => p.ready)) throw new Error('隞?鈭箸????);

      const randomized = shuffle(players);
      const midpoint = Math.ceil(randomized.length / 2);
      const redTeam = randomized.slice(0, midpoint);
      const blueTeam = randomized.slice(midpoint);
      if (!redTeam.length || !blueTeam.length) throw new Error('?閬?霅?????);
      const redCaptain = redTeam[Math.floor(Math.random() * redTeam.length)];
      const blueCaptain = blueTeam[Math.floor(Math.random() * blueTeam.length)];
      const startingTeam = Math.random() < 0.5 ? 'red' : 'blue';
      const wordSet = wordSets[Math.floor(Math.random() * wordSets.length)];
      const cards = generateBoard(startingTeam, wordSet);
      const remainingRed = cards.filter(card => card.role === 'red').length;
      const remainingBlue = cards.filter(card => card.role === 'blue').length;

      cardRefs.forEach(ref => transaction.delete(ref));
      chatRefs.forEach(ref => transaction.delete(ref));
      cards.forEach(card => {
        transaction.set(doc(db, 'rooms', safeRoomId, 'cards', String(card.index)), card);
      });

      randomized.forEach((member, index) => {
        const team = index < midpoint ? 'red' : 'blue';
        const isCaptain = (team === 'red' && member.id === redCaptain.id) || (team === 'blue' && member.id === blueCaptain.id);
        transaction.set(doc(db, 'rooms', safeRoomId, 'players', member.id), {
          ready: false,
          team,
          isCaptain
        }, { merge: true });
      });

      transaction.set(roomRef, {
        status: 'in-progress',
        startingTeam,
        currentTurn: startingTeam,
        guessesRemaining: 0,
        extraGuessAvailable: true,
        clueSubmitted: false,
        clueWord: '',
        clueNumber: null,
        clueBy: '',
        lastClueAt: null,
        winner: null,
        remainingRed,
        remainingBlue
      }, { merge: true });
    });
  } catch (error) {
    logAndAlert(error.message || '???憭望?', error);
  }
}

async function resetGame() {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  const safeRoomId = normalizeRoomId(roomId);
  const playerRefs = await fetchPlayerRefs(safeRoomId);
  const cardRefs = await fetchCardRefs(safeRoomId);
  const chatRefs = await fetchChatRefs(safeRoomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room no longer exists');
      if (roomSnap.data().ownerId !== player.id) throw new Error('?芣??蹂蜓?臭誑?身');

      for (const item of playerRefs) {
        const ref = doc(db, 'rooms', safeRoomId, 'players', item.id);
        transaction.set(ref, { ready: false, team: null, isCaptain: false }, { merge: true });
      }
      cardRefs.forEach(ref => transaction.delete(ref));
      chatRefs.forEach(ref => transaction.delete(ref));
      transaction.set(roomRef, {
        status: 'lobby',
        winner: null,
        startingTeam: 'red',
        currentTurn: null,
        guessesRemaining: null,
        extraGuessAvailable: null,
        remainingRed: null,
        remainingBlue: null,
        clueSubmitted: false,
        clueWord: '',
        clueNumber: null,
        clueBy: '',
        lastClueAt: null
      }, { merge: true });
    });
  } catch (error) {
    logAndAlert(error.message || '?身?憭望?', error);
  }
}

async function revealCard(index) {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  const safeRoomId = normalizeRoomId(roomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const cardRef = doc(db, 'rooms', safeRoomId, 'cards', String(index));
      const playerRef = doc(db, 'rooms', safeRoomId, 'players', player.id);

      const [roomSnap, playerSnap, cardSnap] = await Promise.all([
        transaction.get(roomRef),
        transaction.get(playerRef),
        transaction.get(cardRef)
      ]);

      if (!roomSnap.exists()) throw new Error('Room no longer exists');
      const room = roomSnap.data();
      if (room.status !== 'in-progress') return;
      if (!playerSnap.exists()) throw new Error('?曆??啁摰嗉???);
      if (!cardSnap.exists()) throw new Error('?∠?銝???);
      const playerData = playerSnap.data();
      if (playerData.isCaptain) throw new Error('?銝蝧餌?');
      if (!playerData.team) throw new Error('閫?啗瘜蕃??);
      if (room.currentTurn && playerData.team !== room.currentTurn) throw new Error("It is not your team's turn");
      const card = cardSnap.data();
      if (card.revealed) return;
      if (room.guessesRemaining !== null && room.guessesRemaining <= 0 && room.extraGuessAvailable === false) {
        throw new Error('?砍???皜祆活?詨歇?典?');
      }

      transaction.update(cardRef, { revealed: true });

      const team = playerData.team;
      let winner = null;
      const updates = {};
      let guessesRemaining = typeof room.guessesRemaining === 'number' ? room.guessesRemaining : 0;
      let extraGuessAvailable = typeof room.extraGuessAvailable === 'boolean' ? room.extraGuessAvailable : true;
      let nextTurn = room.currentTurn || team;
      let turnChanged = false;

      if (card.role === 'assassin') {
        winner = otherTeam(team);
        turnChanged = true;
        nextTurn = null;
      } else if (card.role === 'red') {
        const next = Math.max(0, (room.remainingRed ?? 0) - 1);
        updates.remainingRed = next;
        if (next === 0) winner = 'red';
      } else if (card.role === 'blue') {
        const next = Math.max(0, (room.remainingBlue ?? 0) - 1);
        updates.remainingBlue = next;
        if (next === 0) winner = 'blue';
      }

      const correctGuess = card.role === team;
      const wrongGuess = card.role !== team && card.role !== 'assassin';

      if (!winner) {
        if (correctGuess) {
          guessesRemaining = Math.max(0, guessesRemaining - 1);
          if (guessesRemaining <= 0) {
            turnChanged = true;
            nextTurn = otherTeam(team);
            guessesRemaining = 0;
            extraGuessAvailable = false;
            updates.clueSubmitted = false;
            updates.clueWord = '';
            updates.clueNumber = null;
            updates.clueBy = '';
            updates.lastClueAt = null;
          }
        } else if (wrongGuess) {
          turnChanged = true;
          nextTurn = otherTeam(team);
          guessesRemaining = 0;
          extraGuessAvailable = false;
          updates.clueSubmitted = false;
          updates.clueWord = '';
          updates.clueNumber = null;
          updates.clueBy = '';
          updates.lastClueAt = null;
        }
      }

      if (winner) {
        updates.status = 'finished';
        updates.winner = winner;
        updates.currentTurn = null;
        updates.guessesRemaining = null;
        updates.extraGuessAvailable = null;
        updates.clueSubmitted = false;
        updates.clueWord = '';
        updates.clueNumber = null;
        updates.clueBy = '';
        updates.lastClueAt = null;
      } else if (turnChanged) {
        updates.currentTurn = nextTurn;
        updates.guessesRemaining = guessesRemaining;
        updates.extraGuessAvailable = extraGuessAvailable;
        updates.clueSubmitted = false;
        updates.clueWord = '';
        updates.clueNumber = null;
        updates.clueBy = '';
      } else {
        updates.guessesRemaining = guessesRemaining;
        updates.extraGuessAvailable = extraGuessAvailable;
      }

      if (Object.keys(updates).length) transaction.update(roomRef, updates);
    });
  } catch (error) {
    logAndAlert(error.message || '蝧餌?憭望?', error);
  }
}

async function kickPlayer(targetId) {
  const roomId = state.currentRoomId;
  const currentPlayer = getCurrentPlayer();
  if (!roomId || !currentPlayer) return;
  const room = state.roomData;
  if (!room || room.ownerId !== currentPlayer.id) {
    logAndAlert('?芣??蹂蜓?臭誑頦Ｖ犖');
    return;
  }
  if (!targetId || targetId === room.ownerId) {
    logAndAlert('銝頦Ｗ?蹂蜓');
    return;
  }
  if (targetId === currentPlayer.id) {
    logAndAlert('銝頦Ｗ?芸楛');
    return;
  }

  const safeRoomId = normalizeRoomId(roomId);
  const remainingSnapshot = state.players.filter(player => player.id !== targetId);
  const cardRefs = !remainingSnapshot.length ? await fetchCardRefs(safeRoomId) : [];
  const chatRefs = !remainingSnapshot.length ? await fetchChatRefs(safeRoomId) : [];

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room no longer exists');

      const targetRef = doc(db, 'rooms', safeRoomId, 'players', targetId);
      const targetSnap = await transaction.get(targetRef);
      if (!targetSnap.exists()) return;
      if (targetSnap.id === roomSnap.data().ownerId) throw new Error('銝頦Ｗ?蹂蜓');

      transaction.delete(targetRef);

      const roomData = roomSnap.data();
      const updates = {};
      const remainingCount = Math.max(0, (roomData.playerCount || state.players.length) - 1);
      updates.playerCount = remainingCount;

      if (roomData.ownerId === targetId) {
        if (remainingSnapshot.length) {
          updates.ownerId = remainingSnapshot[0].id;
          updates.ownerName = remainingSnapshot[0].name || '';
        } else {
          updates.ownerId = null;
          updates.ownerName = '';
        }
      }

      if (!remainingSnapshot.length) {
        updates.status = 'lobby';
        updates.winner = null;
        updates.startingTeam = 'red';
        updates.currentTurn = null;
        updates.guessesRemaining = null;
        updates.extraGuessAvailable = null;
        updates.remainingRed = null;
        updates.remainingBlue = null;
        updates.clueSubmitted = false;
        updates.clueWord = '';
        updates.clueNumber = null;
        updates.clueBy = '';
        chatRefs.forEach(ref => transaction.delete(ref));
        cardRefs.forEach(ref => transaction.delete(ref));
      }

      transaction.set(roomRef, updates, { merge: true });
    });
  } catch (error) {
    logAndAlert(error.message || '頦Ｗ?拙振憭望?', error);
  }
}

async function leaveRoom() {
  const roomId = state.currentRoomId;
  const playerId = state.currentPlayerId;
  if (!roomId || !playerId) return;
  const safeRoomId = normalizeRoomId(roomId);
  const playerRefs = await fetchPlayerRefs(safeRoomId);
  const cardRefs = await fetchCardRefs(safeRoomId);
  const chatRefs = await fetchChatRefs(safeRoomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;

      const players = [];
      for (const item of playerRefs) {
        const snap = await transaction.get(item.ref);
        if (snap.exists()) players.push({ id: snap.id, ...snap.data() });
      }
      if (!players.some(p => p.id === playerId)) return;

      transaction.delete(doc(db, 'rooms', safeRoomId, 'players', playerId));

      const remaining = players.filter(p => p.id !== playerId);
      const updates = {
        playerCount: Math.max(0, (roomSnap.data().playerCount || players.length) - 1)
      };

      if (roomSnap.data().ownerId === playerId) {
        if (remaining.length) {
          updates.ownerId = remaining[0].id;
          updates.ownerName = remaining[0].name || '';
        } else {
          updates.ownerId = null;
          updates.ownerName = '';
        }
      }

      if (!remaining.length) {
        updates.status = 'lobby';
        updates.winner = null;
        updates.startingTeam = 'red';
        updates.currentTurn = null;
        updates.guessesRemaining = null;
        updates.extraGuessAvailable = null;
        updates.remainingRed = null;
        updates.remainingBlue = null;
        updates.clueSubmitted = false;
        updates.clueWord = '';
        updates.clueNumber = null;
        updates.clueBy = '';
        chatRefs.forEach(ref => transaction.delete(ref));
        cardRefs.forEach(ref => transaction.delete(ref));
      }

      transaction.set(roomRef, updates, { merge: true });
    });
  } catch (error) {
    logAndAlert('?ａ??輸?憭望?', error);
  } finally {
    removeStoredPlayer(safeRoomId);
    clearLastRoom();
    cleanupRoomSubscriptions();
    resetChatState();
    state.currentRoomId = null;
    state.currentPlayerId = null;
    state.roomData = null;
    state.players = [];
    state.cards = [];
    state.chatMessages = [];
    state.chatTeam = null;
    updateViews();
    renderRoomDetail();
    renderTeamChat();
  }
}

// -------------------- Event bindings --------------------
roomListEl.addEventListener('click', event => {
  const resetBtn = event.target.closest('.reset-room');
  if (resetBtn) {
    resetRoom(resetBtn.dataset.room);
    return;
  }
  const joinBtn = event.target.closest('.join-room');
  if (!joinBtn) return;
  handleJoinRoom(joinBtn.dataset.room);
});

playerListEl.addEventListener('click', event => {
  const button = event.target.closest('.kick-btn');
  if (!button) return;
  const playerId = button.dataset.playerId;
  if (playerId) kickPlayer(playerId);
});

toggleReadyBtn.addEventListener('click', toggleReady);
startGameBtn.addEventListener('click', startGame);
resetGameBtn.addEventListener('click', resetGame);
leaveRoomBtn.addEventListener('click', leaveRoom);

boardGridEl.addEventListener('click', event => {
  const cardEl = event.target.closest('.card');
  if (!cardEl) return;
  const index = Number(cardEl.dataset.index);
  if (!Number.isNaN(index)) revealCard(index);
});

if (teamChatFormEl) {
  teamChatFormEl.addEventListener('submit', event => {
    event.preventDefault();
    logAndAlert('Tap a number button to send the clue.');
  });
}

if (teamChatInputEl) {
  teamChatInputEl.addEventListener('input', updateTeamChatControls);
}




// -------------------- Init --------------------
async function init() {
  try {
    await ensureDefaultRooms();
    subscribeToDirectory();
    renderRoomList();
    updateViews();
    renderTeamChat();
    await attemptResume();
  } catch (error) {
    logAndAlert('????Firebase 憭望?', error);
  }
}

init();

