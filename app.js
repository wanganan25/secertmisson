import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
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
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';

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

const wordPool = [
  'adventure', 'analysis', 'balance', 'beacon', 'bridge', 'canvas', 'celebration', 'challenge',
  'clarity', 'compass', 'confidence', 'connection', 'courage', 'creative', 'dawn', 'discovery',
  'dream', 'energy', 'focus', 'friend', 'future', 'galaxy', 'harmony', 'idea', 'insight', 'journey',
  'knowledge', 'legend', 'light', 'logic', 'memory', 'mission', 'momentum', 'mystery', 'network',
  'ocean', 'origin', 'pioneer', 'puzzle', 'quest', 'rhythm', 'rocket', 'science', 'signal', 'spirit',
  'story', 'strategy', 'sunrise', 'teamwork', 'victory', 'vision', 'voice', 'whisper', 'wisdom',
  'wonder', '勇氣', '陪伴', '舞台', '突破', '信任', '導航', '熱血', '制服', '課本', '筆記', '系辦',
  '宿舍', '迎新', '笑聲', '夥伴', '挑戰', '咖啡', '創意', '默契', '藍圖', '熱舞', '報到', '掌聲',
  '合照', '社團', '系學會', '冒險', '新生', '學長', '學姐', '教室', '操場', '期初', '夜唱', '旅行',
  '海邊', '燈塔', '星空', '火花', '羅盤', '影子', '記憶', '步伐', '弧光', '勇者', '信號', '驚喜',
  '高歌', '電光', '火箭', '能量', '節奏'
];

const defaultRoomConfigs = [
  { id: 'room-alpha', name: '迎新戰場 A', capacity: 8 },
  { id: 'room-bravo', name: '迎新戰場 B', capacity: 8 },
  { id: 'room-charlie', name: '默契挑戰 C', capacity: 8 },
  { id: 'room-delta', name: '默契挑戰 D', capacity: 8 }
];

const localPlayerKey = 'codenamePlayerStore-v1';
const lastRoomKey = 'codenameLastRoomId';

function loadPlayerStore() {
  if (!('localStorage' in window)) return {};
  try {
    const raw = localStorage.getItem(localPlayerKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('讀取玩家暫存失敗', error);
    return {};
  }
}

function persistPlayerStore(store) {
  if (!('localStorage' in window)) return;
  try {
    localStorage.setItem(localPlayerKey, JSON.stringify(store));
  } catch (error) {
    console.warn('儲存玩家暫存失敗', error);
  }
}

let playerStore = loadPlayerStore();
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
  unsubCards: null
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
const toggleReadyBtn = document.getElementById('toggle-ready');
const startGameBtn = document.getElementById('start-game');
const resetGameBtn = document.getElementById('reset-game');
const leaveRoomBtn = document.getElementById('leave-room');

function setStoredPlayer(roomId, playerId) {
  playerStore[roomId] = { playerId };
  persistPlayerStore(playerStore);
}
function removeStoredPlayer(roomId) {
  if (playerStore[roomId]) {
    delete playerStore[roomId];
    persistPlayerStore(playerStore);
  }
}
function getStoredPlayer(roomId) {
  return playerStore[roomId];
}
function setLastRoom(roomId) {
  if (!('localStorage' in window)) return;
  try {
    localStorage.setItem(lastRoomKey, roomId);
  } catch (error) {
    console.warn('儲存最後房間失敗', error);
  }
}
function clearLastRoom() {
  if (!('localStorage' in window)) return;
  try {
    localStorage.removeItem(lastRoomKey);
  } catch (error) {
    console.warn('清除最後房間失敗', error);
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

function showError(message, error) {
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
function generateBoard(startingTeam) {
  const boardWords = shuffle(wordPool).slice(0, 25);
  const otherTeam = startingTeam === 'red' ? 'blue' : 'red';
  const roles = [
    ...Array(9).fill(startingTeam),
    ...Array(8).fill(otherTeam),
    ...Array(7).fill('neutral'),
    'assassin'
  ];
  const shuffledRoles = shuffle(roles);
  return boardWords.map((word, index) => ({
    index,
    word,
    role: shuffledRoles[index],
    revealed: false
  }));
}
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
    const owner = room?.ownerName || '尚未指定';
    const statusLabel = status === 'lobby' ? '等待開始' : status === 'in-progress' ? '遊戲進行中' : '已結束';
    const disabled = status === 'in-progress' || occupied >= capacity;
    return `
      <div class="room-card">
        <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:flex-start;">
          <h3>${name}</h3>
          <span class="room-status">${statusLabel}</span>
        </div>
        <div class="room-meta">
          <span>房主：${owner}</span>
          <span>人數：${occupied}/${capacity}</span>
        </div>
        <button data-room="${config.id}" class="join-room" ${disabled ? 'disabled' : ''}>加入房間</button>
      </div>`;
  }).join('');
  roomListEl.innerHTML = items;
}

function renderRoomDetail() {
  const room = state.roomData;
  if (!room) {
    playerListEl.innerHTML = '<div class="empty-state">載入房間中...</div>';
    boardGridEl.innerHTML = '';
    boardScoreEl.innerHTML = '';
    viewIndicatorEl.textContent = '請加入房間';
    winnerBannerEl.style.display = 'none';
    return;
  }
  roomTitleEl.textContent = room.name;
  const ownerLabel = room.ownerName || '尚未指定';
  roomMetaEl.textContent = `房主：${ownerLabel}｜玩家 ${room.playerCount || 0}/${room.capacity}`;
  const statusText = room.status === 'lobby' ? '等待準備中' : room.status === 'in-progress' ? '遊戲進行中' : '本局結束';
  roomStatusEl.textContent = statusText;

  const list = state.players.map(player => {
    const badges = [];
    if (player.id === room.ownerId) badges.push('<span class="badge owner">房主</span>');
    if (player.team) badges.push(`<span class="badge team-${player.team}">${player.team === 'red' ? '紅隊' : '藍隊'}</span>`);
    if (player.isCaptain) badges.push('<span class="badge captain">隊長</span>');
    badges.push(`<span class="badge ${player.ready ? 'ready' : 'waiting'}">${player.ready ? '已準備' : '等待中'}</span>`);
    return `
      <div class="player-card">
        <div class="top-line">
          <span class="name">${player.name || '隊友'}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;">${badges.join('')}</div>
      </div>`;
  }).join('');
  playerListEl.innerHTML = list || '<div class="empty-state">尚未有人加入，歡迎成為第一位成員！</div>';

  const currentPlayer = getCurrentPlayer();
  if (currentPlayer) {
    toggleReadyBtn.textContent = currentPlayer.ready ? '取消準備' : '我準備好了';
    toggleReadyBtn.disabled = room.status !== 'lobby';
  } else {
    toggleReadyBtn.textContent = '我準備好了';
    toggleReadyBtn.disabled = true;
  }

  const everyoneReady = room.status === 'lobby' && state.players.length >= 2 && state.players.every(player => player.ready);
  const isOwner = currentPlayer && room.ownerId === currentPlayer.id;
  startGameBtn.disabled = !(room.status === 'lobby' && isOwner && everyoneReady);
  resetGameBtn.disabled = !(isOwner && room.status !== 'lobby');

  updateViewIndicator();
  renderBoard();
}

function renderBoard() {
  const room = state.roomData;
  if (!room || !state.cards.length) {
    boardGridEl.innerHTML = '<div class="empty-state">等待房主開始遊戲後才會生成任務地圖。</div>';
    boardGridEl.classList.remove('captain-view');
    boardGridEl.classList.add('disabled');
    boardScoreEl.innerHTML = '';
    winnerBannerEl.style.display = 'none';
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
    winnerBannerEl.textContent = room.winner === 'red' ? '紅隊勝利！' : '藍隊勝利！';
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
    <span class="score"><span class="dot" style="background:#ef4444"></span>紅隊剩 ${counts.red}</span>
    <span class="score"><span class="dot" style="background:#2563eb"></span>藍隊剩 ${counts.blue}</span>
    <span class="score"><span class="dot" style="background:#94a3b8"></span>中立 ${counts.neutral}</span>
    <span class="score"><span class="dot" style="background:#0f172a"></span>刺客 ${counts.assassin}</span>`;
}

function updateViewIndicator() {
  const room = state.roomData;
  const currentPlayer = getCurrentPlayer();
  if (!room || !currentPlayer) {
    viewIndicatorEl.textContent = '請加入房間';
    return;
  }
  if (room.status === 'lobby') {
    viewIndicatorEl.textContent = '尚未開始';
  } else if (room.status === 'in-progress') {
    if (currentPlayer.isCaptain) {
      viewIndicatorEl.textContent = '你是隊長，可查看全部顏色';
    } else if (currentPlayer.team) {
      viewIndicatorEl.textContent = `你是${currentPlayer.team === 'red' ? '紅隊' : '藍隊'}成員，只能看到已翻開的卡片`;
    } else {
      viewIndicatorEl.textContent = '你目前為觀戰者，只能看到公開資訊';
    }
  } else {
    viewIndicatorEl.textContent = '本局結束，等待房主重設';
  }
}

function cleanupRoomSubscriptions() {
  if (state.unsubRoom) { state.unsubRoom(); state.unsubRoom = null; }
  if (state.unsubPlayers) { state.unsubPlayers(); state.unsubPlayers = null; }
  if (state.unsubCards) { state.unsubCards(); state.unsubCards = null; }
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
  state.roomData = null;
  state.players = [];
  state.cards = [];
  if (!roomId) {
    renderRoomDetail();
    return;
  }
  const roomRef = doc(db, 'rooms', roomId);
  state.unsubRoom = onSnapshot(roomRef, snapshot => {
    if (!snapshot.exists()) {
      showError('房間已不存在，將返回大廳');
      state.currentRoomId = null;
      state.currentPlayerId = null;
      clearLastRoom();
      updateViews();
      renderRoomList();
      renderRoomDetail();
      return;
    }
    state.roomData = { id: snapshot.id, ...snapshot.data() };
    renderRoomDetail();
  });

  const playersQuery = query(collection(roomRef, 'players'), orderBy('joinedAt', 'asc'));
  state.unsubPlayers = onSnapshot(playersQuery, snapshot => {
    state.players = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    const stored = getStoredPlayer(roomId);
    if (stored && !state.players.some(player => player.id === stored.playerId)) {
      removeStoredPlayer(roomId);
      state.currentPlayerId = null;
    }
    renderRoomDetail();
  });

  state.unsubCards = onSnapshot(collection(roomRef, 'cards'), snapshot => {
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
        createdAt: serverTimestamp()
      });
    } else {
      const data = snapshot.data();
      const updates = {};
      if (data.name !== config.name) updates.name = config.name;
      if (data.capacity !== config.capacity) updates.capacity = config.capacity;
      if (typeof data.playerCount !== 'number') updates.playerCount = data.playerCount || 0;
      if (Object.keys(updates).length) await updateDoc(roomRef, updates);
    }
  }));
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
    console.warn('恢復房間失敗', error);
  }
}

async function handleJoinRoom(roomId) {
  if (!roomId) return;
  const room = state.rooms.get(roomId);
  if (room && room.status === 'in-progress') {
    showError('遊戲進行中，請稍候再加入');
    return;
  }
  const stored = getStoredPlayer(roomId);
  if (stored) {
    try {
      const playerSnap = await getDoc(doc(db, 'rooms', roomId, 'players', stored.playerId));
      if (playerSnap.exists()) {
        state.currentRoomId = roomId;
        state.currentPlayerId = stored.playerId;
        setLastRoom(roomId);
        subscribeToRoom(roomId);
        updateViews();
        return;
      }
      removeStoredPlayer(roomId);
    } catch (error) {
      console.warn('檢查已登入玩家失敗', error);
    }
  }
  const nickname = prompt('輸入你的暱稱');
  if (!nickname) return;
  const trimmed = nickname.trim();
  if (!trimmed) return;
  try {
    const playerId = await joinRoomTransaction(roomId, trimmed.slice(0, 16));
    state.currentRoomId = roomId;
    state.currentPlayerId = playerId;
    setStoredPlayer(roomId, playerId);
    setLastRoom(roomId);
    subscribeToRoom(roomId);
    updateViews();
  } catch (error) {
    showError(error.message || '加入房間失敗', error);
  }
}

async function joinRoomTransaction(roomId, name) {
  if (!roomId) throw new Error('無效的房間編號');
  const playerId = crypto.randomUUID();
  await runTransaction(db, async transaction => {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) throw new Error('房間不存在');
    const room = roomSnap.data();
    if (room.status === 'in-progress') throw new Error('遊戲進行中，請稍候加入');
    const playersQuery = query(collection(roomRef, 'players'), orderBy('joinedAt', 'asc'));
    const playersSnap = await transaction.get(playersQuery);
    if (playersSnap.size >= (room.capacity || 8)) throw new Error('房間人數已滿');

    transaction.set(doc(db, 'rooms', roomId, 'players', playerId), {
      name,
      ready: false,
      team: null,
      isCaptain: false,
      joinedAt: serverTimestamp()
    });
    const updates = { playerCount: playersSnap.size + 1 };
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
    await updateDoc(doc(db, 'rooms', roomId, 'players', player.id), { ready: !player.ready });
  } catch (error) {
    showError('更新準備狀態失敗', error);
  }
}

async function startGame() {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('房間不存在');
      const room = roomSnap.data();
      if (room.ownerId !== player.id) throw new Error('只有房主可以開始遊戲');
      if (room.status !== 'lobby') throw new Error('遊戲狀態不允許開始');

      const playersQuery = query(collection(roomRef, 'players'), orderBy('joinedAt', 'asc'));
      const playersSnap = await transaction.get(playersQuery);
      const players = playersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      if (players.length < 2) throw new Error('至少需要兩位玩家');
      if (!players.every(item => item.ready)) throw new Error('仍有人未按準備');

      const randomized = shuffle(players);
      const midpoint = Math.ceil(randomized.length / 2);
      const captain = randomized[Math.floor(Math.random() * randomized.length)];
      const startingTeam = Math.random() < 0.5 ? 'red' : 'blue';
      const cards = generateBoard(startingTeam);

      const cardsSnap = await transaction.get(collection(roomRef, 'cards'));
      cardsSnap.forEach(docSnap => transaction.delete(docSnap.ref));

      cards.forEach(card => {
        transaction.set(doc(db, 'rooms', roomId, 'cards', String(card.index)), card);
      });

      randomized.forEach((member, index) => {
        const team = index < midpoint ? 'red' : 'blue';
        transaction.set(doc(db, 'rooms', roomId, 'players', member.id), {
          ready: false,
          team,
          isCaptain: member.id === captain.id
        }, { merge: true });
      });

      transaction.set(roomRef, {
        status: 'in-progress',
        startingTeam,
        winner: null
      }, { merge: true });
    });
  } catch (error) {
    showError(error.message || '開始遊戲失敗', error);
  }
}

async function resetGame() {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('房間不存在');
      const room = roomSnap.data();
      if (room.ownerId !== player.id) throw new Error('只有房主可以重設');

      const playersSnap = await transaction.get(collection(roomRef, 'players'));
      playersSnap.forEach(docSnap => {
        transaction.set(docSnap.ref, { ready: false, team: null, isCaptain: false }, { merge: true });
      });

      const cardsSnap = await transaction.get(collection(roomRef, 'cards'));
      cardsSnap.forEach(docSnap => transaction.delete(docSnap.ref));

      transaction.set(roomRef, {
        status: 'lobby',
        winner: null,
        startingTeam: 'red'
      }, { merge: true });
    });
  } catch (error) {
    showError(error.message || '重設遊戲失敗', error);
  }
}

async function revealCard(index) {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', roomId);
      const cardRef = doc(db, 'rooms', roomId, 'cards', String(index));
      const playerRef = doc(db, 'rooms', roomId, 'players', player.id);

      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('房間不存在');
      if (roomSnap.data().status !== 'in-progress') return;

      const playerSnap = await transaction.get(playerRef);
      if (!playerSnap.exists()) throw new Error('找不到玩家資料');

      const cardSnap = await transaction.get(cardRef);
      if (!cardSnap.exists()) throw new Error('卡片不存在');
      const card = cardSnap.data();
      if (card.revealed) return;

      transaction.update(cardRef, { revealed: true });

      let winner = null;
      if (card.role === 'assassin') {
        const team = playerSnap.data().team;
        winner = team === 'red' ? 'blue' : 'red';
      } else {
        const cardsSnap = await transaction.get(collection(roomRef, 'cards'));
        let redRemaining = 0;
        let blueRemaining = 0;
        cardsSnap.forEach(docSnap => {
          const data = docSnap.id === String(index) ? { ...docSnap.data(), revealed: true } : docSnap.data();
          if (!data.revealed) {
            if (data.role === 'red') redRemaining += 1;
            if (data.role === 'blue') blueRemaining += 1;
          }
        });
        if (redRemaining === 0) winner = 'red';
        if (blueRemaining === 0) winner = 'blue';
      }
      if (winner) transaction.update(roomRef, { status: 'finished', winner });
    });
  } catch (error) {
    showError('翻牌失敗', error);
  }
}

async function leaveRoom() {
  const roomId = state.currentRoomId;
  const playerId = state.currentPlayerId;
  if (!roomId || !playerId) return;
  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', roomId);
      const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;

      const playersQuery = query(collection(roomRef, 'players'), orderBy('joinedAt', 'asc'));
      const playersSnap = await transaction.get(playersQuery);
      const players = playersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      if (!players.some(item => item.id === playerId)) return;

      transaction.delete(playerRef);
      const remaining = players.filter(item => item.id !== playerId);
      const updates = { playerCount: remaining.length };

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
        const cardsSnap = await transaction.get(collection(roomRef, 'cards'));
        cardsSnap.forEach(docSnap => transaction.delete(docSnap.ref));
      }
      transaction.set(roomRef, updates, { merge: true });
    });
  } catch (error) {
    showError('離開房間失敗', error);
  } finally {
    removeStoredPlayer(roomId);
    clearLastRoom();
    cleanupRoomSubscriptions();
    state.currentRoomId = null;
    state.currentPlayerId = null;
    state.roomData = null;
    state.players = [];
    state.cards = [];
    updateViews();
    renderRoomDetail();
  }
}

roomListEl.addEventListener('click', event => {
  const target = event.target.closest('.join-room');
  if (!target) return;
  handleJoinRoom(target.dataset.room);
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

async function init() {
  try {
    await ensureDefaultRooms();
    subscribeToDirectory();
    renderRoomList();
    updateViews();
    await attemptResume();
  } catch (error) {
    showError('初始化 Firebase 失敗', error);
  }
}

init();
