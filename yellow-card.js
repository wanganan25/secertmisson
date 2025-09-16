import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADGfYlLyMB-W5A2JM6uF8VqTiF3LL9lEI",
  authDomain: "secertmisson-19e11.firebaseapp.com",
  projectId: "secertmisson-19e11",
  storageBucket: "secertmisson-19e11.firebasestorage.app",
  messagingSenderId: "730645471093",
  appId: "1:730645471093:web:dacceb7a79256deb06fd3c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ROOM_CONFIGS = [
  { id: "yellow-a", name: "黃牌 A", capacity: 7 },
  { id: "yellow-b", name: "黃牌 B", capacity: 7 },
  { id: "yellow-c", name: "黃牌 C", capacity: 7 },
  { id: "yellow-d", name: "黃牌 D", capacity: 7 },
  { id: "yellow-e", name: "黃牌 E", capacity: 7 },
  { id: "yellow-f", name: "黃牌 F", capacity: 7 }
];

const TOPIC_SOURCE = [
  "今天最想逃離的是：_____?",
  "如果學長姐突然出現在你家的洗浴室，為什麼？ _____",
  "假設你的人生是一大碗拉麵，缺了_____",
  "每個誰都應該擁有一張_____的照片",
  "最適合叫他/她的高中綽號是_____",
  "學校最需要升級的是_____",
  "今晚的萬聖節造型，我選_____",
  "你輕輕一捏，_____直接爆炸",
  "第一次看見你，感覺像_____",
  "所有人都在演戲，我只有_____",
  "學校 wifi 的密碼其實是_____",
  "如果連救援訓練都搞砸，一定是_____在拖累",
  "我們的合唱高潮，總是_____",
  "高中回憶簿裡只剩_____",
  "你一個人就能用_____擋死全班的老師",
  "交換心意禮物：_____",
  "最佩服的人使用_____拯救全班",
  "老師的電腦桌面，底部貼著_____",
  "聽到鼓聲，我還想_____",
  "班上突然熄燈，一定是_____",
  "昏倒醒來先看到_____",
  "學校的儀式感，濃縮成一口_____",
  "台上的預備答案是_____的手寫字",
  "高中必備的真心話是_____",
  "花名背後藏著_____"
];

const WORD_SOURCE_BASE = [
  "魔法掃帚","奶茶加珍珠","無限作業","期末考","學長的微笑","學姐的眼線","大遲到","八卦社團","懲罰抄寫","搶答鈴",
  "萬人宿舍","神祕傳說","晨跑廣播","圖書館香味","班級群組","學務主任","大量咖啡因","不帶作業","黑暗料理","檢討會議",
  "愚人節","手機沒電","暗戀對象","偷吃便當","床上被窩","夜唱後遺症","爆笑合照","神秘學長姐","暗黑籃球","神奇校車",
  "打工輪班","獎狀牆","熬夜追劇","K書中心","體育課","社團點名","創意告白","學校鬼故事","制服改造","寢室大掃除",
  "走廊奔跑","簽名衣服","虛擬偶像","畢旅金","吉祥物","露營大會","期末公演","惡作劇","獨家密碼","秘密暗語","校園美食",
  "整班放閃","神秘邀請卡","集體記憶","校園地圖","超級比一比","校園寶藏","討論區","筆記本","藍芽耳機","行動電源","捷運一卡通",
  "快篩包","制服領帶","班牌","畢業紀念冊","粉筆灰","桌面風景","小確幸","待辦清單","IG 限時","Discord 聊天室","雙面膠",
  "球鞋","午休枕頭","溫度計","噴霧酒精","自拍棒","立可白","白板筆","郵件通知","時間膠囊","絕交信","評鑑表","節奏天國"
];

const PLAYER_STORAGE_KEY = "yellowCardPlayer";

const nicknameInput = document.getElementById("nickname");
const roomCardsEl = document.getElementById("room-cards");
const currentRoomBox = document.getElementById("current-room-box");
const currentRoomNameEl = document.getElementById("current-room-name");
const currentRoomCountEl = document.getElementById("current-room-count");
const leaveRoomBtn = document.getElementById("leave-room-btn");
const playersPanel = document.getElementById("players-panel");
const topicsPanel = document.getElementById("topics-panel");
const wordsPanel = document.getElementById("words-panel");
const playerTableBody = document.getElementById("player-table");
const topicDisplay = document.getElementById("topic-display");
const topicRemainingEl = document.getElementById("topic-remaining");
const wordRemainingEl = document.getElementById("word-remaining");
const drawTopicBtn = document.getElementById("btn-draw-topic");
const resetTopicsBtn = document.getElementById("btn-reset-topics");
const dealCardsBtn = document.getElementById("btn-deal-cards");
const resetDeckBtn = document.getElementById("btn-reset-deck");
const nextRoundBtn = document.getElementById("btn-next-round");
const resetGameBtn = document.getElementById("btn-reset-game");

const state = {
  currentRoomId: null,
  currentPlayerId: null,
  currentPlayerName: "",
  roomSnapshot: null,
  players: [],
  unsubscribeRooms: null,
  unsubscribeRoomDoc: null,
  unsubscribePlayers: null,
  joining: false
};

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTopicDeck() {
  return shuffleArray(TOPIC_SOURCE);
}

function buildWordDeck() {
  let pool = shuffleArray(WORD_SOURCE_BASE);
  const deck = [];
  while (deck.length < 600) {
    if (!pool.length) pool = shuffleArray(WORD_SOURCE_BASE);
    deck.push(pool.pop());
  }
  return deck;
}

async function ensureYellowRooms() {
  await Promise.all(ROOM_CONFIGS.map(async config => {
    const roomRef = doc(db, "yellowRooms", config.id);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) {
      await setDoc(roomRef, {
        name: config.name,
        capacity: config.capacity,
        playerCount: 0,
        playerIds: [],
        topicDeck: buildTopicDeck(),
        usedTopics: [],
        currentTopic: "",
        wordDeck: buildWordDeck(),
        createdAt: serverTimestamp()
      });
    } else {
      const data = snap.data();
      const updates = {};
      if (data.name !== config.name) updates.name = config.name;
      if (data.capacity !== config.capacity) updates.capacity = config.capacity;
      if (!Array.isArray(data.topicDeck) || !data.topicDeck.length) updates.topicDeck = buildTopicDeck();
      if (!Array.isArray(data.usedTopics)) updates.usedTopics = [];
      if (typeof data.currentTopic !== "string") updates.currentTopic = "";
      if (!Array.isArray(data.wordDeck) || data.wordDeck.length < 100) updates.wordDeck = buildWordDeck();
      if (typeof data.playerCount !== "number") updates.playerCount = 0;
      if (!Array.isArray(data.playerIds)) updates.playerIds = [];
      if (Object.keys(updates).length) await updateDoc(roomRef, updates);
    }
  }));
}

function setGameVisible(flag) {
  [currentRoomBox, playersPanel, topicsPanel, wordsPanel].forEach(el => {
    el.classList.toggle("hidden", !flag);
  });
  if (!flag) {
    topicDisplay.textContent = "尚未抽題目";
    topicRemainingEl.textContent = "剩餘題目：--";
    wordRemainingEl.textContent = "牌庫剩餘：--";
    currentRoomNameEl.textContent = "目前未加入房間";
    currentRoomCountEl.textContent = "—";
    playerTableBody.innerHTML = "";
  }
}

function renderRoomCards(roomDocs) {
  const map = new Map(roomDocs.map(doc => [doc.id, doc.data()]));
  roomCardsEl.innerHTML = ROOM_CONFIGS.map(config => {
    const data = map.get(config.id) || {};
    const count = data.playerCount ?? (Array.isArray(data.playerIds) ? data.playerIds.length : 0) ?? 0;
    const full = count >= config.capacity;
    const isCurrent = state.currentRoomId === config.id;
    const disabled = state.currentRoomId && state.currentRoomId !== config.id;
    const buttonLabel = isCurrent ? "已加入" : full ? "已滿" : "加入房間";
    const buttonState = (full || (disabled && !isCurrent)) ? "disabled" : "";
    return `
      <div class="room-card ${isCurrent ? 'active' : ''}">
        <h3>${config.name}</h3>
        <div class="badges">
          <span class="pill">人數：${count}/${config.capacity}</span>
        </div>
        <button data-room="${config.id}" ${buttonState}>${buttonLabel}</button>
      </div>`;
  }).join('');
}

function subscribeRoomList() {
  const roomsCol = collection(db, "yellowRooms");
  if (state.unsubscribeRooms) state.unsubscribeRooms();
  state.unsubscribeRooms = onSnapshot(roomsCol, snapshot => {
    renderRoomCards(snapshot.docs);
  });
}

async function joinRoom(roomId) {
  if (state.joining) return;
  if (state.currentRoomId && state.currentRoomId !== roomId) {
    alert("請先離開目前的房間");
    return;
  }
  const name = nicknameInput.value.trim();
  if (!name) {
    alert("請輸入暱稱");
    nicknameInput.focus();
    return;
  }
  const playerId = uuid();
  state.joining = true;
  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, "yellowRooms", roomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      const count = data.playerCount ?? 0;
      const capacity = data.capacity ?? 7;
      if (count >= capacity) throw new Error("房間人數已滿");
      const playerRef = doc(roomRef, "players", playerId);
      transaction.set(playerRef, {
        name,
        yellow: 0,
        hand: [],
        joinedAt: serverTimestamp()
      });
      const playerIds = Array.isArray(data.playerIds) ? [...data.playerIds, playerId] : [playerId];
      transaction.update(roomRef, {
        playerCount: count + 1,
        playerIds
      });
    });
    state.currentRoomId = roomId;
    state.currentPlayerId = playerId;
    state.currentPlayerName = name;
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({ roomId, playerId, name }));
    setGameVisible(true);
    subscribeToRoom(roomId);
  } catch (error) {
    alert(error.message || "加入房間失敗");
  } finally {
    state.joining = false;
  }
}

async function leaveRoom(silent = false) {
  if (!state.currentRoomId || !state.currentPlayerId) return;
  try {
    await runTransaction(db, async transaction => {
      const roomRef = doc(db, "yellowRooms", state.currentRoomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;
      const playerRef = doc(roomRef, "players", state.currentPlayerId);
      const playerSnap = await transaction.get(playerRef);
      if (!playerSnap.exists()) return;
      transaction.delete(playerRef);
      const data = roomSnap.data();
      const count = data.playerCount ?? 0;
      const ids = Array.isArray(data.playerIds) ? data.playerIds.filter(id => id !== state.currentPlayerId) : [];
      transaction.update(roomRef, {
        playerCount: Math.max(0, count - 1),
        playerIds: ids
      });
    });
  } catch (error) {
    if (!silent) alert("離開房間失敗");
  }
  cleanupSubscriptions();
  state.currentRoomId = null;
  state.currentPlayerId = null;
  state.currentPlayerName = "";
  state.roomSnapshot = null;
  state.players = [];
  localStorage.removeItem(PLAYER_STORAGE_KEY);
  setGameVisible(false);
}

function cleanupSubscriptions() {
  if (state.unsubscribeRoomDoc) { state.unsubscribeRoomDoc(); state.unsubscribeRoomDoc = null; }
  if (state.unsubscribePlayers) { state.unsubscribePlayers(); state.unsubscribePlayers = null; }
}

function subscribeToRoom(roomId) {
  cleanupSubscriptions();
  const roomRef = doc(db, "yellowRooms", roomId);
  state.unsubscribeRoomDoc = onSnapshot(roomRef, snapshot => {
    if (!snapshot.exists()) {
      alert("房間已被移除");
      leaveRoom();
      return;
    }
    state.roomSnapshot = { id: snapshot.id, ...snapshot.data() };
    updateRoomInfo();
    updateDeckIndicators();
  });

  const playersRef = collection(db, "yellowRooms", roomId, "players");
  state.unsubscribePlayers = onSnapshot(playersRef, snapshot => {
    state.players = snapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const ta = a.joinedAt?.toMillis?.() || 0;
        const tb = b.joinedAt?.toMillis?.() || 0;
        return ta - tb;
      });
    renderPlayers();
    updateRoomInfo();
  });
}

function updateRoomInfo() {
  if (!state.roomSnapshot) return;
  currentRoomNameEl.textContent = `${state.roomSnapshot.name || '黃牌房間'}（ID：${state.roomSnapshot.id}）`;
  const count = state.players.length;
  const cap = state.roomSnapshot.capacity ?? 7;
  currentRoomCountEl.textContent = `房間人數：${count}/${cap}`;
  topicRemainingEl.textContent = `剩餘題目：${state.roomSnapshot.topicDeck?.length ?? 0}`;
  topicDisplay.textContent = state.roomSnapshot.currentTopic || '尚未抽題目';
  wordRemainingEl.textContent = `牌庫剩餘：${state.roomSnapshot.wordDeck?.length ?? 0}`;
}

function updateDeckIndicators() {
  if (!state.roomSnapshot) return;
  topicRemainingEl.textContent = `剩餘題目：${state.roomSnapshot.topicDeck?.length ?? 0}`;
  wordRemainingEl.textContent = `牌庫剩餘：${state.roomSnapshot.wordDeck?.length ?? 0}`;
  topicDisplay.textContent = state.roomSnapshot.currentTopic || '尚未抽題目';
}

function renderPlayers() {
  if (!state.roomSnapshot) return;
  if (!state.players.length) {
    playerTableBody.innerHTML = '<tr><td colspan="4">尚未有玩家加入此房間</td></tr>';
    return;
  }
  playerTableBody.innerHTML = state.players.map(player => {
    const yellow = player.yellow ?? 0;
    const hand = Array.isArray(player.hand) ? player.hand : [];
    const isCurrent = player.id === state.currentPlayerId;
    const eliminated = yellow >= 3;
    const handHtml = hand.length ? hand.map((word, idx) => `<span>${idx + 1}. ${word}</span>`).join('') : '<span>尚未發牌</span>';
    return `
      <tr class="${isCurrent ? 'current-player' : ''} ${eliminated ? 'player-eliminated' : ''}" data-player-id="${player.id}">
        <td>${player.name || '玩家'}</td>
        <td><span class="pill">${yellow}</span></td>
        <td>
          <button class="ghost" data-action="add-yellow" data-player="${player.id}">+ 黃牌</button>
          <button class="ghost" data-action="minus-yellow" data-player="${player.id}" style="margin-left:.4rem;">- 黃牌</button>
        </td>
        <td>
          <div class="hand">${handHtml}</div>
          <button class="ghost" data-action="draw-word" data-player="${player.id}" style="margin-top:.4rem;">補一張</button>
        </td>
      </tr>`;
  }).join('');

  if (state.currentPlayerId && !state.playersลี่ย
