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
  serverTimestamp,
  getDocs
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
  'adventure','analysis','balance','beacon','bridge','canvas','celebration','challenge','clarity','compass','confidence','connection','courage','creative','dawn','discovery','dream','energy','focus','friend','future','galaxy','harmony','idea','insight','journey','knowledge','legend','light','logic','memory','mission','momentum','mystery','network','ocean','origin','pioneer','puzzle','quest','rhythm','rocket','science','signal','spirit','story','strategy','sunrise','teamwork','victory','vision','voice','whisper','wisdom','wonder','勇氣','陪伴','舞台','突破','信任','導航','熱血','制服','課本','筆記','系辦','宿舍','迎新','笑聲','夥伴','挑戰','咖啡','創意','默契','藍圖','熱舞','報到','掌聲','合照','社團','系學會','冒險','新生','學長','學姐','教室','操場','期初','夜唱','旅行','海邊','燈塔','星空','火花','羅盤','影子','記憶','步伐','弧光','勇者','信號','驚喜','高歌','電光','火箭','能量','節奏'
];


const wordSets = [
  ['書包','黑板','制服','合作社','操場','社團','考卷','午餐','畢業','晚自習','走廊','補習班','福利社','園遊會','校慶','體育館','校車','導師','鐘聲','便當','樓梯','桌子','獎狀','作業','校長'],
  ['YouTube','籃球','電玩','電影','小說','動漫','手機','音樂','網購','漫畫','旅遊','偶像','追劇','社群','滑板','吉他','美食','咖啡','運動','朋友','錢包','KTV','流行','打工','大人'],
  ['鑰匙','雨傘','電腦','冰箱','床','衣櫃','燈','時鐘','筆記本','椅子','書桌','水杯','眼鏡','耳機','手機','鞋子','枕頭','門','窗戶','鏡子','手電筒','衛生紙','書','地圖','刀'],
  ['愛','夢想','勇氣','希望','未來','自由','歡樂','熱情','和平','正義','時間','記憶','藝術','歷史','科學','奇蹟','信念','生命','命運','靈魂','黑暗','恐懼','聲音','沉默','死亡']
];
const defaultRoomConfigs = [
  { id: 'room-alpha', name: '機密代號 A', capacity: 10 },
  { id: 'room-bravo', name: '機密代號 B', capacity: 10 },
  { id: 'room-charlie', name: '機密代號 C', capacity: 10 },
  { id: 'room-delta', name: '機密代號 D', capacity: 10 }
];

const localPlayerKey = 'codenamePlayerStore-v1';
const BASE_GUESSES = 1;

const lastRoomKey = 'codenameLastRoomId';

// -------------------- Helpers --------------------
function normalizeRoomId(roomId) {
  const value = typeof roomId === 'string' ? roomId.trim() : '';
  if (!value) throw new Error('房間代碼無效，請重新選擇房間');
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
        <div class="room-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <button data-room="${config.id}" class="join-room" ${disabled ? 'disabled' : ''}>加入房間</button>
          <button data-room="${config.id}" class="ghost danger reset-room" type="button">重置房間</button>
        </div>
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
  let statusText = room.status === 'lobby' ? '等待準備中' : room.status === 'in-progress' ? '遊戲進行中' : '本局結束';
  if (room.status === 'in-progress' && room.currentTurn) {
    statusText += room.currentTurn === 'red' ? '｜輪到紅隊' : '｜輪到藍隊';
  }
  roomStatusEl.textContent = statusText;

  const currentPlayer = getCurrentPlayer();
  const isOwner = currentPlayer && room.ownerId === currentPlayer.id;

  const list = state.players.map(player => {
    const badges = [];
    if (player.id === room.ownerId) badges.push('<span class="badge owner">房主</span>');
    if (player.team) badges.push(`<span class="badge team-${player.team}">${player.team === 'red' ? '紅隊' : '藍隊'}</span>`);
    if (player.isCaptain) badges.push('<span class="badge captain">隊長</span>');
    badges.push(`<span class="badge ${player.ready ? 'ready' : 'waiting'}">${player.ready ? '已準備' : '等待中'}</span>`);
    const canKick = isOwner && player.id !== room.ownerId;
    const kickButton = canKick ? `<button class="kick-btn" data-player-id="${player.id}">踢出</button>` : '';
    return `
      <div class="player-console">
        <div class="top-line">
          <span class="name">${player.name || '隊友'}</span>
          ${kickButton}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;">${badges.join('')}</div>
      </div>`;
  }).join('');
  playerListEl.innerHTML = list || '<div class="empty-state">尚未有人加入，歡迎成為第一位成員！</div>';

  if (currentPlayer) {
    toggleReadyBtn.textContent = currentPlayer.ready ? '取消準備' : '我準備好了';
    toggleReadyBtn.disabled = room.status !== 'lobby';
  } else {
    toggleReadyBtn.textContent = '我準備好了';
    toggleReadyBtn.disabled = true;
  }

  const everyoneReady = room.status === 'lobby' && state.players.length >= 2 && state.players.every(player => player.ready);
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
    const turnInfo = room.currentTurn ? (room.currentTurn === 'red' ? '輪到紅隊' : '輪到藍隊') : '輪到誰等待更新';
    if (currentPlayer.isCaptain) {
      viewIndicatorEl.textContent = `你是隊長，可查看全部顏色｜${turnInfo}`;
    } else if (currentPlayer.team) {
      viewIndicatorEl.textContent = `你是${currentPlayer.team === 'red' ? '紅隊' : '藍隊'}成員，只能看到已翻開的卡片｜${turnInfo}`;
    } else {
      viewIndicatorEl.textContent = '你目前為觀戰者，只能看到公開資訊';
    }
  } else {
    viewIndicatorEl.textContent = '本局結束，等待房主重設';
  }
}

// -------------------- Firestore listeners --------------------
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
      logAndAlert('房間已不存在，將返回大廳');
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

  const playersQuery = query(roomCollection(roomId, 'players'), orderBy('joinedAt', 'asc'));
  state.unsubPlayers = onSnapshot(playersQuery, snapshot => {
    state.players = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    const stored = getStoredPlayer(roomId);
    if (stored && !state.players.some(player => player.id === stored.playerId)) {
      removeStoredPlayer(roomId);
      state.currentPlayerId = null;
    }
    renderRoomDetail();
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
    console.warn('讀取玩家列表失敗', error);
    return [];
  }
}

async function fetchCardRefs(roomId) {
  try {
    const refs = await getDocs(roomCollection(roomId, 'cards'));
    return refs.docs.map(docSnap => docSnap.ref);
  } catch (error) {
    console.warn('讀取卡片列表失敗', error);
    return [];
  }
}

// -------------------- Room flows --------------------
async function resetRoom(roomId) {
  const safeRoomId = normalizeRoomId(roomId);
  const confirmed = confirm(`確認要重置 ${roomId} 嗎？`);
  if (!confirmed) return;
  try {
    const playersSnap = await getDocs(roomCollection(safeRoomId, 'players'));
    const cardsSnap = await getDocs(roomCollection(safeRoomId, 'cards'));
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;
      playersSnap.forEach(docSnap => transaction.delete(docSnap.ref));
      cardsSnap.forEach(docSnap => transaction.delete(docSnap.ref));
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
        remainingBlue: null
      }, { merge: true });
    });
    if (playerStore[safeRoomId]) {
      delete playerStore[safeRoomId];
      persistPlayerStore(playerStore);
    }
    if (state.currentRoomId === roomId) {
      clearLastRoom();
      cleanupRoomSubscriptions();
      state.currentRoomId = null;
      state.currentPlayerId = null;
      state.roomData = null;
      state.players = [];
      state.cards = [];
      updateViews();
      renderRoomDetail();
    } else {
      renderRoomDetail();
    }
    renderRoomList();
  } catch (error) {
    logAndAlert('重置房間失敗', error);
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
    console.warn('恢復房間失敗', error);
  }
}

async function handleJoinRoom(roomId) {
  if (!roomId) return;
  const trimmed = roomId.trim();
  if (!trimmed) return;
  const room = state.rooms.get(trimmed);
  if (room && room.status === 'in-progress') {
    logAndAlert('遊戲進行中，請稍候再加入');
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
      console.warn('檢查已登入玩家失敗', error);
    }
  }

  const nickname = prompt('輸入你的暱稱');
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
    logAndAlert(error.message || '加入房間失敗', error);
  }
}

async function joinRoomTransaction(roomId, name) {
  const safeRoomId = normalizeRoomId(roomId);
  const playerId = crypto.randomUUID();
  await runTransaction(db, async transaction => {
    const roomRef = doc(db, 'rooms', safeRoomId);
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) throw new Error('房間不存在');
    const room = roomSnap.data();
    if (room.status === 'in-progress') throw new Error('遊戲進行中，請稍候加入');
    const currentCount = room.playerCount || 0;
    if (currentCount >= (room.capacity || 8)) throw new Error('房間人數已滿');

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
    logAndAlert('更新準備狀態失敗', error);
  }
}

async function startGame() {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  const safeRoomId = normalizeRoomId(roomId);
  const playerRefs = await fetchPlayerRefs(safeRoomId);
  const cardRefs = await fetchCardRefs(safeRoomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('房間不存在');
      const room = roomSnap.data();
      if (room.ownerId !== player.id) throw new Error('只有房主可以開始遊戲');
      if (room.status !== 'lobby') throw new Error('遊戲狀態不允許開始');

      const players = [];
      for (const item of playerRefs) {
        const snap = await transaction.get(item.ref);
        if (snap.exists()) players.push({ id: snap.id, ...snap.data() });
      }
      if (players.length < 2) throw new Error('至少需要兩位玩家');
      if (!players.every(p => p.ready)) throw new Error('仍有人未按準備');

      const randomized = shuffle(players);
      const midpoint = Math.ceil(randomized.length / 2);
      const redTeam = randomized.slice(0, midpoint);
      const blueTeam = randomized.slice(midpoint);
      if (!redTeam.length || !blueTeam.length) throw new Error('需要保證兩隊都有成員');
      const redCaptain = redTeam[Math.floor(Math.random() * redTeam.length)];
      const blueCaptain = blueTeam[Math.floor(Math.random() * blueTeam.length)];
      const startingTeam = Math.random() < 0.5 ? 'red' : 'blue';
      const wordSet = wordSets[Math.floor(Math.random() * wordSets.length)];
      const cards = generateBoard(startingTeam, wordSet);
      const remainingRed = cards.filter(card => card.role === 'red').length;
      const remainingBlue = cards.filter(card => card.role === 'blue').length;

      cardRefs.forEach(ref => transaction.delete(ref));
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
        guessesRemaining: BASE_GUESSES,
        extraGuessAvailable: true,
        winner: null,
        remainingRed,
        remainingBlue
      }, { merge: true });
    });
  } catch (error) {
    logAndAlert(error.message || '開始遊戲失敗', error);
  }
}

async function resetGame() {
  const roomId = state.currentRoomId;
  const player = getCurrentPlayer();
  if (!roomId || !player) return;
  const safeRoomId = normalizeRoomId(roomId);
  const playerRefs = await fetchPlayerRefs(safeRoomId);
  const cardRefs = await fetchCardRefs(safeRoomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('房間不存在');
      if (roomSnap.data().ownerId !== player.id) throw new Error('只有房主可以重設');

      for (const item of playerRefs) {
        const ref = doc(db, 'rooms', safeRoomId, 'players', item.id);
        transaction.set(ref, { ready: false, team: null, isCaptain: false }, { merge: true });
      }
      cardRefs.forEach(ref => transaction.delete(ref));
      transaction.set(roomRef, {
        status: 'lobby',
        winner: null,
        startingTeam: 'red',
        currentTurn: null,
        guessesRemaining: null,
        extraGuessAvailable: null,
        remainingRed: null,
        remainingBlue: null
      }, { merge: true });
    });
  } catch (error) {
    logAndAlert(error.message || '重設遊戲失敗', error);
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

      if (!roomSnap.exists()) throw new Error('房間不存在');
      const room = roomSnap.data();
      if (room.status !== 'in-progress') return;
      if (!playerSnap.exists()) throw new Error('找不到玩家資料');
      if (!cardSnap.exists()) throw new Error('卡片不存在');
      const playerData = playerSnap.data();
      if (playerData.isCaptain) throw new Error('隊長不能翻牌');
      if (!playerData.team) throw new Error('觀戰者無法翻牌');
      if (room.currentTurn && playerData.team !== room.currentTurn) throw new Error('尚未輪到你的隊伍');
      const card = cardSnap.data();
      if (card.revealed) return;
      if (room.guessesRemaining !== null && room.guessesRemaining <= 0 && room.extraGuessAvailable === false) {
        throw new Error('本回合猜測次數已用完');
      }

      transaction.update(cardRef, { revealed: true });

      const team = playerData.team;
      let winner = null;
      const updates = {};
      let guessesRemaining = typeof room.guessesRemaining === 'number' ? room.guessesRemaining : BASE_GUESSES;
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
          if (guessesRemaining > 0) {
            guessesRemaining -= 1;
          } else if (extraGuessAvailable) {
            extraGuessAvailable = false;
            turnChanged = true;
            nextTurn = otherTeam(team);
            guessesRemaining = BASE_GUESSES;
            extraGuessAvailable = true;
          } else {
            turnChanged = true;
            nextTurn = otherTeam(team);
            guessesRemaining = BASE_GUESSES;
            extraGuessAvailable = true;
          }
        } else if (wrongGuess) {
          turnChanged = true;
          nextTurn = otherTeam(team);
          guessesRemaining = BASE_GUESSES;
          extraGuessAvailable = true;
        }
      }

      if (winner) {
        updates.status = 'finished';
        updates.winner = winner;
        updates.currentTurn = null;
        updates.guessesRemaining = null;
        updates.extraGuessAvailable = null;
      } else if (turnChanged) {
        updates.currentTurn = nextTurn;
        updates.guessesRemaining = guessesRemaining;
        updates.extraGuessAvailable = extraGuessAvailable;
      } else {
        updates.guessesRemaining = guessesRemaining;
        updates.extraGuessAvailable = extraGuessAvailable;
      }

      if (Object.keys(updates).length) transaction.update(roomRef, updates);
    });
  } catch (error) {
    logAndAlert(error.message || '翻牌失敗', error);
  }
}

async function kickPlayer(targetId) {
  const roomId = state.currentRoomId;
  const currentPlayer = getCurrentPlayer();
  if (!roomId || !currentPlayer) return;
  const room = state.roomData;
  if (!room || room.ownerId !== currentPlayer.id) {
    logAndAlert('只有房主可以踢人');
    return;
  }
  if (!targetId || targetId === room.ownerId) {
    logAndAlert('不可踢出房主');
    return;
  }
  if (targetId === currentPlayer.id) {
    logAndAlert('不可踢出自己');
    return;
  }

  const safeRoomId = normalizeRoomId(roomId);
  const remainingSnapshot = state.players.filter(player => player.id !== targetId);
  const cardRefs = !remainingSnapshot.length ? await fetchCardRefs(safeRoomId) : [];

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('房間不存在');

      const targetRef = doc(db, 'rooms', safeRoomId, 'players', targetId);
      const targetSnap = await transaction.get(targetRef);
      if (!targetSnap.exists()) return;
      if (targetSnap.id === roomSnap.data().ownerId) throw new Error('不可踢出房主');

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
        cardRefs.forEach(ref => transaction.delete(ref));
      }

      transaction.set(roomRef, updates, { merge: true });
    });
  } catch (error) {
    logAndAlert(error.message || '踢出玩家失敗', error);
  }
}

async function leaveRoom() {
  const roomId = state.currentRoomId;
  const playerId = state.currentPlayerId;
  if (!roomId || !playerId) return;
  const safeRoomId = normalizeRoomId(roomId);
  const playerRefs = await fetchPlayerRefs(safeRoomId);
  const cardRefs = await fetchCardRefs(safeRoomId);

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
        cardRefs.forEach(ref => transaction.delete(ref));
      }

      transaction.set(roomRef, updates, { merge: true });
    });
  } catch (error) {
    logAndAlert('離開房間失敗', error);
  } finally {
    removeStoredPlayer(safeRoomId);
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

// -------------------- Init --------------------
async function init() {
  try {
    await ensureDefaultRooms();
    subscribeToDirectory();
    renderRoomList();
    updateViews();
    await attemptResume();
  } catch (error) {
    logAndAlert('初始化 Firebase 失敗', error);
  }
}

init();

