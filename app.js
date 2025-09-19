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
  'adventure','analysis','balance','beacon','bridge','canvas','celebration','challenge','clarity','compass','confidence','connection','courage','creative','dawn','discovery','dream','energy','focus','friend','future','galaxy','harmony','idea','insight','journey','knowledge','legend','light','logic','memory','mission','momentum','mystery','network','ocean','origin','pioneer','puzzle','quest','rhythm','rocket','science','signal','spirit','story','strategy','sunrise','teamwork','victory','vision','voice','whisper','wisdom','wonder','勇氣','陪伴','舞台','突破','信任','導航','熱血','制服','課本','筆記','系辦','宿舍','迎新','笑聲','夥伴','挑戰','咖啡','創意','默契','藍圖','熱舞','報到','掌聲','合照','社團','系學會','冒險','新生','學長','學姐','教室','操場','期初','夜唱','旅行','海邊','燈塔','星空','火花','羅盤','影子','記憶','步伐','弧光','勇者','信號','驚喜','高歌','電光','火箭','能量','節奏'
];

const expandedWordPool = [
  "三輪車",
  "企鵝",
  "作家",
  "光",
  "兔子",
  "公園",
  "公車",
  "冰山",
  "冰淇淋",
  "冰箱",
  "劇院",
  "力量",
  "勇氣",
  "動物園",
  "化學",
  "博物館",
  "卡車",
  "原子筆",
  "司機",
  "和平",
  "咖啡",
  "商店",
  "啤酒",
  "圖書館",
  "地圖",
  "地鐵",
  "坦克",
  "城堡",
  "城市",
  "士兵",
  "外套",
  "夢",
  "大象",
  "太空船",
  "太陽",
  "學校",
  "學生",
  "導演",
  "導遊",
  "山",
  "岩石",
  "島嶼",
  "峽谷",
  "工人",
  "工廠",
  "工程師",
  "市場",
  "希望",
  "帽子",
  "店員",
  "廚師",
  "廟宇",
  "廣場",
  "建築師",
  "影子",
  "快樂",
  "快艇",
  "恐懼",
  "恨",
  "悲傷",
  "愛",
  "戰機",
  "戰爭",
  "手機",
  "拖拉機",
  "摩托車",
  "操場",
  "政府",
  "故事",
  "救護車",
  "教堂",
  "數學",
  "星星",
  "時間",
  "書",
  "書店",
  "月亮",
  "果汁",
  "校車",
  "桌子",
  "桥樑",
  "森林",
  "椅子",
  "樹木",
  "橋樑",
  "橘子",
  "機器人",
  "機場",
  "歷史",
  "死亡",
  "水手",
  "汽車",
  "沙漠",
  "沙灘",
  "河流",
  "洞穴",
  "海岸",
  "海洋",
  "消防員",
  "消防車",
  "港口",
  "湖泊",
  "演員",
  "潛水艇",
  "瀑布",
  "火山",
  "火箭",
  "火車",
  "灯泡",
  "烏龜",
  "熊",
  "熱氣球",
  "燈塔",
  "燈泡",
  "牛",
  "牛奶",
  "物理",
  "狗",
  "獅子",
  "生物",
  "番茄",
  "畫家",
  "相機",
  "眼鏡",
  "科學家",
  "秘密",
  "空間",
  "米飯",
  "糖果",
  "紙張",
  "羊",
  "老師",
  "老虎",
  "耳機",
  "聲音",
  "背包",
  "胡蘿蔔",
  "自由",
  "自行車",
  "舞者",
  "船",
  "芒果",
  "花園",
  "茶",
  "草原",
  "草莓",
  "葡萄",
  "蘋果",
  "蛇",
  "蛋糕",
  "蜘蛛",
  "蝴蝶",
  "蟲",
  "衝浪板",
  "西瓜",
  "記憶",
  "記者",
  "課本",
  "課桌",
  "警察",
  "警車",
  "豆腐",
  "豬",
  "貓",
  "足球",
  "車站",
  "農場",
  "農夫",
  "農舍",
  "遊戲",
  "運動員",
  "酒",
  "酒店",
  "醫生",
  "醫院",
  "鉛筆",
  "銀行",
  "鋼琴",
  "鋼筆",
  "錢包",
  "鍋子",
  "鏡子",
  "鐘錶",
  "鑰匙",
  "長頸鹿",
  "隧道",
  "雨",
  "雨傘",
  "雪",
  "雲",
  "雷",
  "電梯",
  "電腦",
  "電視",
  "青蛙",
  "鞋子",
  "音樂家",
  "顏色",
  "風",
  "風扇",
  "飛機",
  "餅乾",
  "餐廳",
  "香蕉",
  "馬",
  "馬車",
  "馬鈴薯",
  "高鐵",
  "魔法",
  "魔術師",
  "魚",
  "鯊魚",
  "鳥",
  "鳳梨",
  "鴨",
  "鷹",
  "麵包",
  "麵條",
  "黑暗",
  "黑板",
  "龍"
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
const TEAM_KEYS = ['red','blue'];

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

function roomChatCollection(roomId) {
  const safeId = normalizeRoomId(roomId);
  return collection(db, 'rooms', safeId, 'chat');
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

function getTeamGuessers(team) {
  if (!team) return [];
  return state.players.filter(player => player.team === team && !player.isCaptain);
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
  unsubCards: null,
  unsubChat: null,
  chatMessages: [],
  chatTeam: null
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
const flipAgreementEl = document.getElementById('flip-agreement');
const flipAgreementTextEl = document.getElementById('flip-agreement-text');
const flipAgreeBtn = document.getElementById('flip-agree');
const flipCancelBtn = document.getElementById('flip-cancel');
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
    renderTeamChat();
    renderFlipAgreement();
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
  renderTeamChat();
  renderFlipAgreement();
}


function renderBoard() {
  const room = state.roomData;
  if (!room || !state.cards.length) {
    boardGridEl.innerHTML = '<div class="empty-state">等待房主開始遊戲，遊戲開始後會出現 25 張卡片。</div>';
    boardGridEl.classList.remove('captain-view');
    boardGridEl.classList.add('disabled');
    boardScoreEl.innerHTML = '';
    winnerBannerEl.style.display = 'none';
    renderTeamChat();
    renderFlipAgreement();
    return;
  }

  const currentPlayer = getCurrentPlayer();

  boardGridEl.classList.toggle('captain-view', Boolean(currentPlayer && currentPlayer.isCaptain));
  boardGridEl.classList.toggle('disabled', room.status !== 'in-progress');

  boardGridEl.innerHTML = state.cards.map(card => {
    const classes = [`card`, `role-${card.role}`];
    if (card.revealed) classes.push('revealed');
    return `<div class="${classes.join(' ')}" data-index="${card.index}"><span class="label">${escapeHtml(card.word)}</span></div>`;
  }).join('');

  updateScoreboard();
  if (room.status === 'finished' && room.winner) {
    winnerBannerEl.textContent = room.winner === 'red' ? '紅隊獲勝' : '藍隊獲勝';
    winnerBannerEl.style.display = 'block';
  } else {
    winnerBannerEl.style.display = 'none';
  }
  renderFlipAgreement();
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
    <span class="score"><strong>剩餘卡片</strong></span>
    <span class="score"><span class="dot" style="background:#ef4444"></span>紅隊 ${counts.red}</span>
    <span class="score"><span class="dot" style="background:#2563eb"></span>藍隊 ${counts.blue}</span>
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
    viewIndicatorEl.textContent = '遊戲尚未開始';
  } else if (room.status === 'in-progress') {
    const turnInfo = room.currentTurn
      ? (room.currentTurn === 'red' ? '輪到紅隊行動' : '輪到藍隊行動')
      : '目前尚未輪到任何隊伍';
    if (currentPlayer.isCaptain) {
      const teamLabel = currentPlayer.team === 'red' ? '你是紅隊隊長' : currentPlayer.team === 'blue' ? '你是藍隊隊長' : '你是隊長';
      viewIndicatorEl.textContent = `${teamLabel}，請提供線索。${turnInfo}`;
    } else if (currentPlayer.team) {
      const teamLabel = currentPlayer.team === 'red' ? '你是紅隊成員' : '你是藍隊成員';
      viewIndicatorEl.textContent = `${teamLabel}，請依線索小心翻牌。${turnInfo}`;
    } else {
      viewIndicatorEl.textContent = '你尚未分隊，請等待主持人安排。';
    }
  } else {
    viewIndicatorEl.textContent = '本局已結束，請等待主持人的下一步。';
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
  if (teamChatInputEl) {
    teamChatInputEl.value = '';
    teamChatInputEl.disabled = true;
  }
  renderTeamChat();
  renderFlipAgreement();
  setClueNumberAvailability(false);
}

function formatTeamChatTimestamp(value) {
  try {
    if (value && typeof value.toDate === 'function') {
      const date = value.toDate();
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
  } catch (error) {
    console.warn('格式化聊天室時間失敗', error);
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

  let indicatorText = '尚未分隊';
  let statusText = '加入房間後即可使用隊伍聊天。';
  let emptyMessage = '等待遊戲開始…';
  let allowSend = false;

  if (!room) {
    statusText = '加入房間後可查看隊長發出的線索。';
    emptyMessage = '目前沒有進行中的房間。';
  } else if (!player) {
    statusText = '請確認自己已出現在玩家清單。';
  } else if (!team) {
    statusText = status === 'in-progress'
      ? '你尚未被分配到隊伍，請稍候。'
      : '請等待房主開始遊戲。';
  } else {
    indicatorText = team === 'red' ? '紅隊' : '藍隊';
    if (status === 'in-progress') {
      if (isCaptain) {
        if (isTurn) {
          if (clueSubmitted) {
            statusText = '線索已送出，請等待隊友行動。';
            emptyMessage = '線索已發佈。';
          } else {
            allowSend = true;
            statusText = '輸入一個線索詞，然後點選數字。';
            emptyMessage = '尚未發送線索。';
          }
        } else {
          statusText = '還沒輪到我們，請稍候。';
          emptyMessage = '輪到我們時才能發送線索。';
        }
      } else {
        if (isTurn) {
          statusText = clueSubmitted
            ? '討論隊長的線索，再謹慎翻牌。'
            : '等待隊長送出線索。';
        } else {
          statusText = '等待另一隊完成回合。';
        }
        emptyMessage = '尚未有新的線索。';
      }
    } else {
      statusText = '遊戲尚未開始。';
      emptyMessage = '等待房主開始遊戲。';
    }
  }

  const hasClue = room?.clueSubmitted && typeof room?.clueWord === 'string' && room.clueWord.trim();
  if (hasClue) {
    const summary = room.clueWord.trim() + (typeof room.clueNumber === 'number' ? ' [' + room.clueNumber + ']' : '');
    const guessesLeft = typeof room.guessesRemaining === 'number' ? Math.max(0, room.guessesRemaining) : null;
    const clueInfo = '目前線索：' + summary + (guessesLeft !== null ? '（剩餘 ' + guessesLeft + ' 次猜測）' : '') + '。';
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
      const senderName = escapeHtml(message.senderName || '隊長');
      const roleFlag = message.senderRole || '';
      const roleLabel = roleFlag === 'red-captain'
        ? '紅隊隊長'
        : roleFlag === 'blue-captain'
        ? '藍隊隊長'
        : message.team === 'red'
        ? '紅隊隊長'
        : message.team === 'blue'
        ? '藍隊隊長'
        : '隊長';
      const senderLabel = senderName + '（' + roleLabel + '）';
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
  renderFlipAgreement();
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
    logAndAlert('請輸入線索。');
    return;
  }
  if (word.split(/\s+/).filter(Boolean).length > 1) {
    logAndAlert('線索必須為單一詞語。');
    return;
  }
  if (!Number.isInteger(number) || number < 1 || number > 10) {
    logAndAlert('請選擇 1 到 10 的數字。');
    return;
  }
  if (!player.isCaptain) {
    logAndAlert('只有隊長可以送出線索。');
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
        lastClueAt: serverTimestamp(),
        pendingFlip: null
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
        extraGuessAvailable: false,
        pendingFlip: null
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
    logAndAlert('請輸入線索。');
    return;
  }
  sendTeamMessage(number, word);
}


function renderFlipAgreement() {
  if (!flipAgreementEl || !flipAgreementTextEl) return;

  const room = state.roomData;
  const player = getCurrentPlayer();
  const pending = room?.pendingFlip && typeof room.pendingFlip.index === 'number' ? room.pendingFlip : null;

  if (!pending) {
    flipAgreementEl.classList.add('hidden');
    flipAgreementEl.classList.remove('active');
    return;
  }

  const sameTeam = Boolean(player && pending.team && player.team === pending.team);
  if (!sameTeam) {
    flipAgreementEl.classList.add('hidden');
    flipAgreementEl.classList.remove('active');
    return;
  }

  const approvals = pending.approvals || {};
  const required = Array.isArray(pending.requiredApprovers) ? pending.requiredApprovers : [];
  const approvedCount = required.filter(id => approvals[id]).length;
  const remaining = Math.max(0, required.length - approvedCount);
  const card = state.cards.find(item => item.index === pending.index);
  const word = card ? card.word : `#${pending.index}`;
  const initiator = pending.initiatorName || '隊友';

  const baseMessage = `${initiator} 想翻牌「${word}」`;
  const message = remaining > 0 ? `${baseMessage}，尚需 ${remaining} 人同意。` : `${baseMessage}，等待翻牌。`;
  flipAgreementTextEl.textContent = message;
  flipAgreementEl.classList.remove('hidden');
  flipAgreementEl.classList.add('active');

  if (flipAgreeBtn) {
    const alreadyApproved = Boolean(approvals[player.id]);
    flipAgreeBtn.disabled = alreadyApproved;
    flipAgreeBtn.style.display = alreadyApproved ? 'none' : 'inline-flex';
  }

  if (flipCancelBtn) {
    const canCancel = Boolean(player && (player.id === pending.initiatedBy || player.isCaptain));
    flipCancelBtn.style.display = canCancel ? 'inline-flex' : 'none';
    flipCancelBtn.disabled = false;
  }
}

async function requestFlip(index) {
  const room = state.roomData;
  const player = getCurrentPlayer();
  const roomId = state.currentRoomId;
  if (!room || !player || !roomId) return;

  const card = state.cards.find(item => item.index === index);
  if (card?.revealed) {
    logAndAlert('此卡片已被翻開。');
    return;
  }

  if (player.isCaptain) {
    logAndAlert('隊長不能翻牌。');
    return;
  }

  if (!player.team) {
    logAndAlert('請先加入隊伍。');
    return;
  }

  if (room.currentTurn && room.currentTurn !== player.team) {
    logAndAlert('還沒輪到你們隊伍。');
    return;
  }

  if (!room.clueSubmitted) {
    logAndAlert('隊長尚未給線索。');
    return;
  }

  if (room.pendingFlip && typeof room.pendingFlip.index === 'number') {
    logAndAlert('已有翻牌請求等待同意。');
    return;
  }

  const teamMembers = getTeamGuessers(player.team);
  if (teamMembers.length <= 1) {
    try {
      await revealCard(index);
    } catch (error) {
      console.error('翻牌失敗', error);
      if (error?.message) logAndAlert(error.message);
    }
    return;
  }

  const safeRoomId = normalizeRoomId(roomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const cardRef = doc(db, 'rooms', safeRoomId, 'cards', String(index));

      const [roomSnap, cardSnap] = await Promise.all([
        transaction.get(roomRef),
        transaction.get(cardRef)
      ]);

      if (!roomSnap.exists()) throw new Error('房間已不存在');
      const roomData = roomSnap.data();
      if (roomData.status !== 'in-progress') throw new Error('目前無法翻牌');
      if (!roomData.clueSubmitted) throw new Error('隊長尚未給線索');
      if (roomData.currentTurn && roomData.currentTurn !== player.team) throw new Error('還沒輪到你們隊伍');
      if (roomData.pendingFlip && typeof roomData.pendingFlip.index === 'number') throw new Error('已有翻牌請求等待同意');
      if (!cardSnap.exists()) throw new Error('卡片不存在');
      const cardData = cardSnap.data();
      if (cardData.revealed) throw new Error('此卡片已被翻開');

      const approvals = { [player.id]: true };
      const requiredApprovers = teamMembers.map(member => member.id);
      const pendingFlip = {
        index,
        team: player.team,
        initiatedBy: player.id,
        initiatorName: player.name || '',
        requiredApprovers,
        approvals,
        createdAt: serverTimestamp()
      };

      transaction.update(roomRef, { pendingFlip });
    });
  } catch (error) {
    console.error('建立翻牌請求失敗', error);
    if (error?.message) logAndAlert(error.message);
  }
}

async function approvePendingFlip() {
  const room = state.roomData;
  const player = getCurrentPlayer();
  const roomId = state.currentRoomId;
  if (!room || !player || !roomId) return;

  const pending = room.pendingFlip;
  if (!pending || pending.team !== player.team) return;
  if (pending.approvals && pending.approvals[player.id]) {
    logAndAlert('你已同意這張卡片。');
    return;
  }

  const safeRoomId = normalizeRoomId(roomId);

  try {
    const result = await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('房間已不存在');
      const roomData = roomSnap.data();
      const pendingFlip = roomData.pendingFlip;
      if (!pendingFlip || typeof pendingFlip.index !== 'number') throw new Error('目前沒有待同意的翻牌');
      if (pendingFlip.team !== player.team) throw new Error('你不在此隊伍');

      const approvals = Object.assign({}, pendingFlip.approvals || {});
      approvals[player.id] = true;
      const required = Array.isArray(pendingFlip.requiredApprovers) ? pendingFlip.requiredApprovers : [];
      const allApproved = required.every(id => approvals[id]);

      if (allApproved) {
        transaction.update(roomRef, { pendingFlip: null });
        return { revealIndex: pendingFlip.index };
      }

      const updatePayload = {};
      updatePayload['pendingFlip.approvals'] = approvals;
      transaction.update(roomRef, updatePayload);
      return { revealIndex: null };
    });

    if (result && typeof result.revealIndex === 'number') {
      await revealCard(result.revealIndex);
    }
  } catch (error) {
    console.error('同意翻牌失敗', error);
    if (error?.message) logAndAlert(error.message);
  }
}

async function cancelPendingFlip() {
  const room = state.roomData;
  const player = getCurrentPlayer();
  const roomId = state.currentRoomId;
  if (!room || !player || !roomId) return;

  const pending = room.pendingFlip;
  if (!pending || pending.team !== player.team) return;

  const canCancel = player.id === pending.initiatedBy || player.isCaptain;
  if (!canCancel) {
    logAndAlert('只有提案者或隊長可以取消翻牌請求。');
    return;
  }

  const safeRoomId = normalizeRoomId(roomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;
      const current = roomSnap.data().pendingFlip;
      if (!current || typeof current.index !== 'number') return;
      if (current.initiatedBy !== player.id && !player.isCaptain) throw new Error('無法取消他人的翻牌請求');
      transaction.update(roomRef, { pendingFlip: null });
    });
  } catch (error) {
    console.error('取消翻牌請求失敗', error);
    if (error?.message) logAndAlert(error.message);
  }
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
      logAndAlert('房間已不存在，將返回大廳');
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
        pendingFlip: null,
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
      if (!('pendingFlip' in data)) updates.pendingFlip = null;
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
  const confirmed = confirm(`確認要重置 ${roomId} 嗎？`);
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
        lastClueAt: null,
        pendingFlip: null
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
    if (!roomSnap.exists()) throw new Error('Room no longer exists');
    const room = roomSnap.data();
    if (room.status === 'in-progress') throw new Error('遊戲進行中，請稍候加入');
    const currentCount = room.playerCount || 0;
    if (currentCount >= (room.capacity || 10)) throw new Error('房間人數已滿');

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
  const chatRefs = await fetchChatRefs(safeRoomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room no longer exists');
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
        remainingBlue,
        pendingFlip: null
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
  const chatRefs = await fetchChatRefs(safeRoomId);

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room no longer exists');
      if (roomSnap.data().ownerId !== player.id) throw new Error('只有房主可以重設');

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
        lastClueAt: null,
        pendingFlip: null
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

      if (!roomSnap.exists()) throw new Error('Room no longer exists');
      const room = roomSnap.data();
      if (room.status !== 'in-progress') return;
      if (!room.clueSubmitted) throw new Error('隊長尚未給線索');
      if (!playerSnap.exists()) throw new Error('找不到玩家資料');
      if (!cardSnap.exists()) throw new Error('卡片不存在');
      const playerData = playerSnap.data();
      if (playerData.isCaptain) throw new Error('隊長不能翻牌');
      if (!playerData.team) throw new Error('觀戰者無法翻牌');
      if (room.currentTurn && playerData.team !== room.currentTurn) throw new Error("It is not your team's turn");
      const card = cardSnap.data();
      if (card.revealed) return;
      if (room.guessesRemaining !== null && room.guessesRemaining <= 0 && room.extraGuessAvailable === false) {
        throw new Error('本回合猜測次數已用完');
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
        updates.pendingFlip = null;
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
        updates.pendingFlip = null;
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
        updates.pendingFlip = null;
        updates.lastClueAt = null;
      } else if (turnChanged) {
        updates.currentTurn = nextTurn;
        updates.guessesRemaining = guessesRemaining;
        updates.extraGuessAvailable = extraGuessAvailable;
        updates.clueSubmitted = false;
        updates.clueWord = '';
        updates.clueNumber = null;
        updates.clueBy = '';
        updates.pendingFlip = null;
      } else {
        updates.guessesRemaining = guessesRemaining;
        updates.extraGuessAvailable = extraGuessAvailable;
      }

      updates.pendingFlip = null;
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
  const chatRefs = !remainingSnapshot.length ? await fetchChatRefs(safeRoomId) : [];

  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, 'rooms', safeRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room no longer exists');

      const targetRef = doc(db, 'rooms', safeRoomId, 'players', targetId);
      const targetSnap = await transaction.get(targetRef);
      if (!targetSnap.exists()) return;
      if (targetSnap.id === roomSnap.data().ownerId) throw new Error('不可踢出房主');

      transaction.delete(targetRef);

      const roomData = roomSnap.data();
      const updates = {};
      const pendingFlip = roomData.pendingFlip;
      if (pendingFlip && typeof pendingFlip.index === 'number') {
        const required = Array.isArray(pendingFlip.requiredApprovers) ? pendingFlip.requiredApprovers : [];
        if (pendingFlip.initiatedBy === targetId || required.includes(targetId)) {
          updates.pendingFlip = null;
        }
      }
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
        updates.pendingFlip = null;
        chatRefs.forEach(ref => transaction.delete(ref));
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
      const roomData = roomSnap.data();

      transaction.delete(doc(db, 'rooms', safeRoomId, 'players', playerId));

      const remaining = players.filter(p => p.id !== playerId);
      const updates = {
        playerCount: Math.max(0, (roomData.playerCount || players.length) - 1)
      };
      const pendingFlip = roomData.pendingFlip;
      if (pendingFlip && typeof pendingFlip.index === 'number') {
        const required = Array.isArray(pendingFlip.requiredApprovers) ? pendingFlip.requiredApprovers : [];
        if (pendingFlip.initiatedBy === playerId || required.includes(playerId)) {
          updates.pendingFlip = null;
        }
      }

      if (roomData.ownerId === playerId) {
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
        updates.pendingFlip = null;
        chatRefs.forEach(ref => transaction.delete(ref));
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
  if (Number.isNaN(index)) return;

  const room = state.roomData;
  const player = getCurrentPlayer();
  if (!room || !player) return;

  const card = state.cards.find(item => item.index === index);
  if (card && card.revealed) return;

  if (player.isCaptain) {
    logAndAlert('隊長不能翻牌。');
    return;
  }

  if (!player.team) {
    logAndAlert('請先加入隊伍。');
    return;
  }

  if (room.currentTurn && room.currentTurn !== player.team) {
    logAndAlert('還沒輪到你們隊伍。');
    return;
  }

  if (!room.clueSubmitted) {
    logAndAlert('隊長尚未給線索。');
    return;
  }

  if (room.pendingFlip && typeof room.pendingFlip.index === 'number') {
    logAndAlert('已有翻牌請求等待同意。');
    return;
  }

  requestFlip(index);
});

if (flipAgreeBtn) {
  flipAgreeBtn.addEventListener('click', async () => {
    flipAgreeBtn.disabled = true;
    await approvePendingFlip();
    renderFlipAgreement();
  });
}

if (flipCancelBtn) {
  flipCancelBtn.addEventListener('click', async () => {
    flipCancelBtn.disabled = true;
    await cancelPendingFlip();
    renderFlipAgreement();
  });
}

if (teamChatFormEl) {
  teamChatFormEl.addEventListener('submit', event => {
    event.preventDefault();
    logAndAlert('請點選數字按鈕傳送線索。');
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
    logAndAlert('初始化 Firebase 失敗', error);
  }
}

init();
