import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  arrayUnion,
  arrayRemove
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
const auth = getAuth(app);
const db = getFirestore(app);

const ROOM_COLLECTION = "yellowRooms";

const DEFAULT_WORDS = [
  "business","strategy","friendship","creativity","勇者","暖男","表情包","宇宙飛船",
  "熱狗大叔","黑色幽默","阿公泡茶","蘇打綠","影分身之術","愛情靈藥","邪惡笑聲",
  "迪士尼公主","暗黑料理","滑手機","夢遊仙境","一週不洗澡"
];

const DEFAULT_TOPICS = [
  "今天的迎新主題是 ______。",
  "我最害怕的迎新橋段是 ______。",
  "如果抽到這題，我一定會說 ______。",
  "主持人看到你出牌時大喊：『______！』",
  "這張黃牌的懲罰居然是 ______。",
  "大家補救的方法只有 ______。",
  "裁判最想偷藏的一張黃卡是 ______。",
  "當我拿到第三張黃牌時，我會 ______。"
];

const MIN_WORD_SUPPLY = 150;
const MIN_TOPIC_SUPPLY = 40;

const state = {
  clientId: localStorage.getItem("yellow-card-client-id") || crypto.randomUUID(),
  nickname: localStorage.getItem("yellow-card-nickname") || "",
  rooms: [],
  roomsUnsub: null,
  roomDocUnsub: null,
  playersUnsub: null,
  submissionsUnsub: null,
  currentRoomId: localStorage.getItem("yellow-card-active-room") || null,
  currentRoomData: null,
  playerList: [],
  playerMap: new Map(),
  submissionList: [],
  pendingJoinRoomId: null,
  toastTimer: null,
  myHand: [],
  topicTemplate: "",
  topicSegments: [],
  topicFillValues: [],
  topicAssignments: new Map(),
  usedHandKeys: new Set(),
  pendingDiscard: 0,
  discardMode: false,
  viewMode: localStorage.getItem("yellow-card-active-room") ? "room" : "lobby"
};

localStorage.setItem("yellow-card-client-id", state.clientId);

const roomGrid = document.getElementById("room-grid");
const lobbyPanel = document.getElementById("lobby-panel");
const roomPanel = document.getElementById("room-panel");
const roomNameEl = document.getElementById("room-name");
const roomCapacityEl = document.getElementById("room-capacity");
const roomJudgeEl = document.getElementById("room-judge");
const playerTbody = document.getElementById("player-tbody");
const btnBack = document.getElementById("btn-back");
const btnLeave = document.getElementById("btn-leave");
const btnToggleReady = document.getElementById("btn-toggle-ready");
const btnStartGame = document.getElementById("btn-start-game");
const btnResetReady = document.getElementById("btn-reset-ready");
const topicRemainingEl = document.getElementById("topic-remaining");
const currentTopicEl = document.getElementById("current-topic") || document.getElementById("topic-text");
const activityLogEl = document.getElementById("activity-log");
const joinDialog = document.getElementById("join-dialog");
const joinRoomNameEl = document.getElementById("join-room-name");
const nicknameInput = document.getElementById("nickname-input");
const nicknameErrorEl = document.getElementById("nickname-error");
const btnConfirmJoin = document.getElementById("btn-confirm-join");
const btnCancelJoin = document.getElementById("btn-cancel-join");
const toastEl = document.getElementById("toast");
const heroEl = document.querySelector("header.hero");
const handCard = document.getElementById("hand-card");
const handCountEl = document.getElementById("hand-count");
const handListEl = document.getElementById("hand-list");
const handEmptyEl = document.getElementById("hand-empty");
const supplyWordInput = document.getElementById("input-new-word");
const supplyTopicInput = document.getElementById("input-new-topic");
const btnAddWord = document.getElementById("btn-add-word");
const btnAddTopic = document.getElementById("btn-add-topic");
const discardToolbar = document.getElementById("discard-toolbar");
const discardStatusEl = document.getElementById("discard-status");
const btnToggleDiscard = document.getElementById("btn-toggle-discard");

const btnOpenDeckManager = document.getElementById("btn-open-deck-manager");
const deckDialog = document.getElementById("deck-dialog");
const btnCloseDeck = document.getElementById("btn-close-deck");
const deckWordListEl = document.getElementById("deck-word-list");
const deckTopicListEl = document.getElementById("deck-topic-list");

btnBack?.addEventListener("click", () => {
  state.viewMode = "lobby";
  showLobbyView();
  lobbyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

btnLeave?.addEventListener("click", () => {
  if (!state.currentRoomId) return;
  leaveRoom(state.currentRoomId);
});

btnToggleReady?.addEventListener("click", () => {
  const player = state.playerMap.get(state.clientId);
  if (!state.currentRoomId || !player) {
    showToast("尚未加入任何房間");
    return;
  }
  toggleReady(state.currentRoomId, !player.ready);
});

btnResetReady?.addEventListener("click", () => {
  if (!state.currentRoomId) return;
  resetReadyState(state.currentRoomId);
});

btnStartGame?.addEventListener("click", startGame);

btnAddWord?.addEventListener("click", handleAddWord);
btnAddTopic?.addEventListener("click", handleAddTopic);
btnOpenDeckManager?.addEventListener("click", openDeckManager);
btnCloseDeck?.addEventListener("click", closeDeckManager);
deckDialog?.addEventListener("click", (event) => {
  if (event.target === deckDialog) {
    closeDeckManager();
  }
});
btnToggleDiscard?.addEventListener("click", () => {
  if (state.pendingDiscard <= 0) {
    state.discardMode = false;
    updateDiscardUI();
    return;
  }
  state.discardMode = !state.discardMode;
  updateDiscardUI();
  showToast(state.discardMode ? "點選要棄掉的手牌" : "已離開棄牌模式");
});

function ensureWordSupply(deck, minSize) {
  const target = Math.max(minSize, MIN_WORD_SUPPLY);
  const pool = new Set(deck);
  const candidates = DEFAULT_WORDS.filter((word) => !pool.has(word));
  while (deck.length < target && candidates.length) {
    const idx = Math.floor(Math.random() * candidates.length);
    deck.push(candidates.splice(idx, 1)[0]);
  }
  while (deck.length < target) {
    deck.push(DEFAULT_WORDS[Math.floor(Math.random() * DEFAULT_WORDS.length)]);
  }
  return deck;
}

function ensureTopicSupply(deck, minSize) {
  const target = Math.max(minSize, MIN_TOPIC_SUPPLY);
  const pool = new Set(deck);
  const candidates = DEFAULT_TOPICS.filter((topic) => !pool.has(topic));
  while (deck.length < target && candidates.length) {
    const idx = Math.floor(Math.random() * candidates.length);
    deck.push(candidates.splice(idx, 1)[0]);
  }
  while (deck.length < target) {
    deck.push(DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)]);
  }
  return deck;
}

function addCardToAllRooms(field, value) {
  if (!state.rooms.length) {
    return Promise.reject(new Error("尚未載入房間列表"));
  }
  const writes = state.rooms.map((room) =>
    updateDoc(doc(db, ROOM_COLLECTION, room.id), {
      [field]: arrayUnion(value),
      updatedAt: serverTimestamp()
    })
  );
  return Promise.all(writes);
}

function removeCardFromAllRooms(field, value, options = {}) {
  const { alsoRemoveUsedTopics = false } = options;
  if (!value) {
    return Promise.resolve();
  }
  if (!state.rooms.length) {
    return Promise.resolve();
  }
  const updates = state.rooms.map((room) => {
    const roomRef = doc(db, ROOM_COLLECTION, room.id);
    const payload = {
      [field]: arrayRemove(value),
      updatedAt: serverTimestamp()
    };
    if (alsoRemoveUsedTopics) {
      payload.usedTopics = arrayRemove(value);
    }
    return updateDoc(roomRef, payload);
  });
  return Promise.all(updates);
}

function handleAddWord() {
  const value = (supplyWordInput?.value || "").trim();
  if (!value) {
    showToast("請先輸入黃卡字詞");
    return;
  }
  const existsInDefaults = DEFAULT_WORDS.includes(value);
  const existsInRooms = state.rooms.some((room) => {
    const deck = Array.isArray(room.wordDeck) ? room.wordDeck : [];
    return deck.includes(value);
  });
  if (existsInDefaults || existsInRooms) {
    showToast(`已有此黃卡：${value}`);
    return;
  }
  addCardToAllRooms("wordDeck", value)
    .then(() => {
      DEFAULT_WORDS.push(value);
      if (supplyWordInput) supplyWordInput.value = "";
      showToast(`已補充黃卡：${value}`);
    })
    .catch((error) => {
      console.error(error);
      showToast(error.message || "補充黃卡失敗");
    });
}



function handleAddTopic() {
  const value = (supplyTopicInput?.value || "").trim();
  if (!value) {
    showToast("請先輸入紫卡題目");
    return;
  }
  const existsInDefaults = DEFAULT_TOPICS.includes(value);
  const existsInRooms = state.rooms.some((room) => {
    const deck = Array.isArray(room.topicDeck) ? room.topicDeck : [];
    const used = Array.isArray(room.usedTopics) ? room.usedTopics : [];
    return deck.includes(value) || used.includes(value);
  });
  if (existsInDefaults || existsInRooms) {
    showToast(`已有此紫卡：${value}`);
    return;
  }
  addCardToAllRooms("topicDeck", value)
    .then(() => {
      DEFAULT_TOPICS.push(value);
      if (supplyTopicInput) supplyTopicInput.value = "";
      showToast(`已補充紫卡：${value}`);
    })
    .catch((error) => {
      console.error(error);
      showToast(error.message || "補充紫卡失敗");
    });
}

function openDeckManager() {
  renderDeckManager();
  deckDialog?.classList.remove("hidden");
}

function closeDeckManager() {
  deckDialog?.classList.add("hidden");
}

function renderDeckManager() {
  renderDeckSection(DEFAULT_WORDS, deckWordListEl, "word");
  renderDeckSection(DEFAULT_TOPICS, deckTopicListEl, "topic");
}

function renderDeckSection(list, container, type) {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(list) || !list.length) {
    const empty = document.createElement("li");
    empty.className = "deck-empty";
    empty.textContent = type === "topic" ? "目前沒有題目卡。" : "目前沒有黃卡字詞。";
    container.appendChild(empty);
    return;
  }
  list.forEach((value) => {
    const li = document.createElement("li");
    li.className = "deck-item";
    const span = document.createElement("span");
    span.textContent = value;
    li.appendChild(span);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost deck-remove";
    button.textContent = "移除";
    button.addEventListener("click", () => handleRemoveDeckCard(value, type));
    li.appendChild(button);
    container.appendChild(li);
  });
}

async function handleRemoveDeckCard(value, type) {
  const list = type === "topic" ? DEFAULT_TOPICS : DEFAULT_WORDS;
  const index = list.indexOf(value);
  if (index === -1) return;
  const confirmMessage = type === "topic"
    ? `確定要移除題目：${value}？`
    : `確定要移除黃卡：${value}？`;
  if (!confirm(confirmMessage)) return;
  const [removed] = list.splice(index, 1);
  renderDeckManager();
  try {
    const field = type === "topic" ? "topicDeck" : "wordDeck";
    await removeCardFromAllRooms(field, removed, { alsoRemoveUsedTopics: type === "topic" });
    showToast(type === "topic"
      ? `已移除題目：${removed}`
      : `已移除黃卡：${removed}`);
  } catch (error) {
    list.splice(index, 0, removed);
    renderDeckManager();
    console.error(error);
    showToast(error.message || "移除卡片失敗");
  }
}



roomGrid?.addEventListener("click", (event) => {
  const resetButton = event.target.closest("button[data-reset-room-id]");
  if (resetButton) {
    const roomId = resetButton.dataset.resetRoomId;
    const password = prompt("請輸入重製密碼");
    if (password === null) {
      showToast("已取消重製");
      return;
    }
    if (password.trim() !== "remake") {
      showToast("密碼錯誤，無法重製房間");
      return;
    }
    resetRoom(roomId);
    return;
  }

  const button = event.target.closest("button[data-room-id]");
  if (!button) return;
  const roomId = button.dataset.roomId;
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return;

  const alreadyInRoom = room.playerIds && room.playerIds.includes(state.clientId);
  if (alreadyInRoom) {
    state.currentRoomId = roomId;
    state.viewMode = "room";
    localStorage.setItem("yellow-card-active-room", roomId);
    subscribeToRoom(roomId);
    showRoomView();
    updateRoomPanel();
    return;
  }

  if ((room.playerCount || 0) >= (room.capacity || 8)) {
    showToast("房間已滿員");
    return;
  }

  openJoinDialog(roomId, room.name || roomId);
});

btnConfirmJoin?.addEventListener("click", confirmJoin);
btnCancelJoin?.addEventListener("click", closeJoinDialog);
nicknameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmJoin();
  }
});

signInAnonymously(auth)
  .then(() => {
    console.info("Firebase anonymous auth established");
  })
  .catch((error) => {
    console.warn("Firebase auth error", error);
    showToast("匿名登入未啟用，改為公開連線模式");
    if (!state.roomsUnsub) {
      subscribeLobby();
    }
  });

onAuthStateChanged(auth, (user) => {
  if (user && !state.roomsUnsub) {
    subscribeLobby();
  }
});

function subscribeLobby() {
  const roomsRef = collection(db, ROOM_COLLECTION);
  state.roomsUnsub = onSnapshot(roomsRef, (snapshot) => {
    state.rooms = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderLobby();
    ensureRoomSubscription();
  });
}

function ensureRoomSubscription() {
  if (state.currentRoomId) {
    subscribeToRoom(state.currentRoomId);
    return;
  }
  const storedId = localStorage.getItem("yellow-card-active-room");
  if (!storedId) return;
  const target = state.rooms.find((room) => Array.isArray(room.playerIds) && room.playerIds.includes(state.clientId));
  if (target) {
    state.currentRoomId = target.id;
    state.viewMode = "room";
    subscribeToRoom(target.id);
    showRoomView();
  } else {
    state.viewMode = "lobby";
    localStorage.removeItem("yellow-card-active-room");
    showLobbyView();
  }
}

function subscribeToRoom(roomId) {
  unsubscribeRoomStreams();
  const roomRef = doc(db, ROOM_COLLECTION, roomId);
  state.roomDocUnsub = onSnapshot(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      showToast("房間不存在或已被移除");
      cleanupAfterLeave();
      return;
    }
    state.currentRoomData = { id: roomId, ...snapshot.data() };
    updateRoomPanel();
  });

  const playersRef = collection(roomRef, "players");
  state.playersUnsub = onSnapshot(query(playersRef, orderBy("joinedAt", "asc")), (snapshot) => {
    const list = [];
    state.myHand = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const hand = Array.isArray(data.hand) ? [...data.hand] : [];
      const entry = {
        id: docSnap.id,
        nickname: data.nickname || "",
        yellowCards: data.yellowCards || 0,
        ready: !!data.ready,
        isHost: !!data.isHost,
        joinedAt: data.joinedAt,
        lastActive: data.lastActive,
        handCount: hand.length,
        pendingDiscard: Number(data.pendingDiscard) || 0
      };
      if (docSnap.id === state.clientId) {
        state.myHand = hand;
        state.pendingDiscard = entry.pendingDiscard;
        if (state.pendingDiscard <= 0) {
          state.discardMode = false;
        }
        entry.hand = hand;
      }
      list.push(entry);
    });
    state.playerList = list;
    state.playerMap = new Map(list.map((player) => [player.id, player]));
    updateRoomPanel();
    renderHand();
  });

  const submissionsRef = collection(roomRef, "submissions");
  state.submissionsUnsub = onSnapshot(query(submissionsRef, orderBy("createdAt", "desc")), (snapshot) => {
    state.submissionList = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderSubmissions();
  });

  if (state.viewMode === "room") {
    showRoomView();
  } else {
    showLobbyView();
  }
}

function unsubscribeRoomStreams() {
  if (state.roomDocUnsub) {
    state.roomDocUnsub();
    state.roomDocUnsub = null;
  }
  if (state.playersUnsub) {
    state.playersUnsub();
    state.playersUnsub = null;
  }
  if (state.submissionsUnsub) {
    state.submissionsUnsub();
    state.submissionsUnsub = null;
  }
  state.currentRoomData = null;
  state.playerList = [];
  state.playerMap = new Map();
  state.submissionList = [];
  state.myHand = [];
  state.topicTemplate = "";
  state.topicSegments = [];
  state.topicFillValues = [];
  state.topicAssignments = new Map();
  state.usedHandKeys = new Set();
  state.pendingDiscard = 0;
  state.discardMode = false;
  renderHand();
  updateTopicDisplay();
  updateDiscardUI();
}

async function confirmJoin() {
  if (!state.pendingJoinRoomId) return;
  const baseNickname = nicknameInput.value.trim();
  if (!baseNickname) {
    nicknameErrorEl.style.display = "block";
    nicknameErrorEl.textContent = "暱稱不可為空。";
    return;
  }

  const roomId = state.pendingJoinRoomId;
  let finalNickname = baseNickname;
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      const capacity = data.capacity || 8;
      const playerIds = Array.isArray(data.playerIds) ? [...data.playerIds] : [];
      const isAlready = playerIds.includes(state.clientId);
      const playersRef = collection(roomRef, "players");
      const meRef = doc(playersRef, state.clientId);


      if (!isAlready) {
        if (playerIds.length >= capacity) throw new Error("房間已滿員");
        playerIds.push(state.clientId);
        const isHost = !data.hostId;
        let wordDeck = Array.isArray(data.wordDeck) ? [...data.wordDeck] : [];
        wordDeck = ensureWordSupply(wordDeck, playerIds.length * 13 + 20);
        const hand = wordDeck.splice(0, 13);
        tx.update(roomRef, {
          playerIds,
          playerCount: playerIds.length,
          hostId: isHost ? state.clientId : (data.hostId || null),
          hostNickname: isHost ? finalNickname : (data.hostNickname || null),
          wordDeck,
          updatedAt: serverTimestamp()
        });
        tx.set(meRef, {
          nickname: finalNickname,
          hand,
          yellowCards: 0,
          ready: false,
          isHost,
          joinedAt: serverTimestamp(),
          lastActive: serverTimestamp()
        });
      } else {
        tx.update(meRef, {
          nickname: finalNickname,
          lastActive: serverTimestamp()
        });
      }
    });

    state.nickname = finalNickname;
    localStorage.setItem("yellow-card-nickname", finalNickname);
    state.currentRoomId = roomId;
    state.viewMode = "room";
    localStorage.setItem("yellow-card-active-room", roomId);
    subscribeToRoom(roomId);
    showRoomView();
    updateRoomPanel();
    renderHand();
    closeJoinDialog();
  } catch (error) {
    console.error(error);
    nicknameErrorEl.style.display = "block";
    nicknameErrorEl.textContent = error.message || "加入房間失敗";
  }
}

async function leaveRoom(roomId) {
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) return;
      const data = roomSnap.data();
      const playerIds = Array.isArray(data.playerIds) ? data.playerIds.filter((id) => id !== state.clientId) : [];
      const playersRef = collection(roomRef, "players");
      tx.delete(doc(playersRef, state.clientId));
      tx.delete(doc(collection(roomRef, "submissions"), state.clientId));

      const updates = {
        playerIds,
        playerCount: playerIds.length,
        updatedAt: serverTimestamp()
      };

      if (data.hostId === state.clientId) {
        const nextId = playerIds[0] || null;
        updates.hostId = nextId;
        if (nextId) {
          const nextSnap = await tx.get(doc(playersRef, nextId));
          updates.hostNickname = nextSnap.exists() ? nextSnap.data().nickname || null : null;
        } else {
          updates.hostNickname = null;
        }
      }

      if (data.judgeId === state.clientId) {
        const nextJudgeId = playerIds[0] || null;
        updates.judgeId = nextJudgeId;
        if (nextJudgeId) {
          const nextJudgeSnap = await tx.get(doc(playersRef, nextJudgeId));
          updates.judgeNickname = nextJudgeSnap.exists() ? nextJudgeSnap.data().nickname || null : null;
        } else {
          updates.judgeNickname = null;
        }
      }

      tx.update(roomRef, updates);
    });
  } catch (error) {
    console.error(error);
  }
  cleanupAfterLeave();
  showToast("已離開房間");
}

function cleanupAfterLeave() {
  unsubscribeRoomStreams();
  state.currentRoomId = null;
  state.currentRoomData = null;
  state.viewMode = "lobby";
  state.myHand = [];
  state.pendingDiscard = 0;
  state.discardMode = false;
  renderHand();
  updateDiscardUI();
  localStorage.removeItem("yellow-card-active-room");
  showLobbyView();
  renderLobby();
}


async function toggleReady(roomId, nextReady) {
  const player = state.playerMap.get(state.clientId);
  if (!player) return;
  try {
    await updateDoc(doc(db, ROOM_COLLECTION, roomId, "players", state.clientId), {
      ready: nextReady,
      lastActive: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    showToast("更新狀態失敗");
  }
}

async function resetReadyState(roomId) {
  if (!isHost()) {
    showToast("只有房主可以重置狀態");
    return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const playersRef = collection(roomRef, "players");
      const players = await getDocs(playersRef);
      players.forEach((player) => {
        tx.update(doc(playersRef, player.id), { ready: false });
      });
      tx.update(roomRef, { updatedAt: serverTimestamp() });
    });
    showToast("已重置所有玩家狀態");
  } catch (error) {
    console.error(error);
    showToast(error.message || "重置失敗");
  }
}

async function drawTopic(roomId, options = {}) {
  const { force = false, silent = false } = options;
  if (!force && !isHost()) {
    showToast("只有主持人可以抽題");
    return;
  }
  let pickedTopic = null;
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      let topicDeck = Array.isArray(data.topicDeck) ? [...data.topicDeck] : [];
      let usedTopics = Array.isArray(data.usedTopics) ? [...data.usedTopics] : [];
      let wordDeck = Array.isArray(data.wordDeck) ? [...data.wordDeck] : [];
      const playerIds = Array.isArray(data.playerIds) ? [...data.playerIds] : [];
      const judgeId = data.judgeId || null;
      const activePlayers = playerIds.filter((id) => id !== judgeId);
      const extraPerPlayer = 3;
      const playersRef = collection(roomRef, "players");

      const extraNeeded = activePlayers.length * extraPerPlayer;
      if (extraNeeded > 0) {
        if (wordDeck.length < extraNeeded) {
          wordDeck = ensureWordSupply(wordDeck, wordDeck.length + extraNeeded + 20);
        }
        for (const playerId of activePlayers) {
          const playerRef = doc(playersRef, playerId);
          const playerSnap = await tx.get(playerRef);
          if (!playerSnap.exists()) continue;
          const playerData = playerSnap.data();
          const hand = Array.isArray(playerData.hand) ? [...playerData.hand] : [];
          const extras = [];
          for (let i = 0; i < extraPerPlayer; i += 1) {
            if (!wordDeck.length) break;
            extras.push(wordDeck.shift());
          }
          if (extras.length) {
            hand.push(...extras);
            tx.update(playerRef, {
              hand,
              pendingDiscard: (playerData.pendingDiscard || 0) + extras.length,
              lastActive: serverTimestamp()
            });
          }
        }
      }

      if (!topicDeck.length) {
        if (!usedTopics.length) {
          topicDeck = ensureTopicSupply([], 20);
        } else {
          topicDeck = ensureTopicSupply([...usedTopics], 20);
          usedTopics = [];
        }
      }
      if (!topicDeck.length) throw new Error("題庫不足，請先補充題目");
      pickedTopic = topicDeck.shift();
      usedTopics.push(pickedTopic);
      tx.update(roomRef, {
        topicDeck,
        usedTopics,
        wordDeck,
        currentTopic: pickedTopic,
        phase: "playing",
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error(error);
    if (!silent) {
      showToast(error.message || "抽題失敗");
    }
  }
  return pickedTopic;
}

async function startGame() {
  const roomId = state.currentRoomId;
  const roomData = state.currentRoomData;
  if (!roomId || !roomData) return;
  if (!isHost()) {
    showToast("只有房主可以開始遊戲");
    return;
  }
  const players = state.playerList;
  if (!players.length) {
    showToast("目前沒有玩家可以開始");
    return;
  }
  const notReady = players.filter((player) => !player.ready);
  if (notReady.length) {
    showToast("還有人沒有按下我準備好了");
    return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      const playerIds = Array.isArray(data.playerIds) ? [...data.playerIds] : [];
      if (!playerIds.length) throw new Error("房間內沒有玩家");
      const playersRef = collection(roomRef, "players");
      let deck = Array.isArray(data.wordDeck) ? [...data.wordDeck] : [];
      const requiredCards = playerIds.length * 13;
      if (deck.length < requiredCards) {
        deck = ensureWordSupply(deck, requiredCards + 20);
      }
      const judgeId = playerIds[Math.floor(Math.random() * playerIds.length)];
      let judgeNickname = null;
      for (const playerId of playerIds) {
        const playerRef = doc(playersRef, playerId);
        const playerSnap = await tx.get(playerRef);
        if (!playerSnap.exists()) continue;
        const playerData = playerSnap.data();
        const hand = Array.isArray(playerData.hand) ? [...playerData.hand] : [];
        const needed = Math.max(0, 13 - hand.length);
        if (needed > 0) {
          if (deck.length < needed) {
            throw new Error("詞語卡不足，無法補齊 13 張手牌");
          }
          hand.push(...deck.splice(0, needed));
        }
        if (playerId === judgeId) {
          judgeNickname = playerData.nickname || null;
        }
        tx.update(playerRef, {
          hand,
          pendingDiscard: 0,
          ready: false,
          lastActive: serverTimestamp()
        });
      }
      tx.update(roomRef, {
        judgeId,
        judgeNickname,
        wordDeck: deck,
        currentTopic: "",
        phase: "in_game",
        updatedAt: serverTimestamp()
      });
    });
    await clearSubmissions(roomId);
    const firstTopic = await drawTopic(roomId, { force: true });
    if (firstTopic) {
      state.currentRoomData = { ...(state.currentRoomData || {}), currentTopic: firstTopic };
      setTopicTemplate(firstTopic);
      updateTopicDisplay();
    }
    state.viewMode = "room";
    showRoomView();
    showToast("遊戲開始！已抽出第一題，準備對決");
  } catch (error) {
    console.error(error);
    showToast(error.message || "開始遊戲失敗");
  }
}



async function resetRoom(roomId) {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) {
    showToast("房間不存在");
    return;
  }
  if (!confirm("重製房間會清除所有玩家與紀錄，確定要繼續嗎？")) return;

  const freshWordDeck = ensureWordSupply([], MIN_WORD_SUPPLY);
  const freshTopicDeck = ensureTopicSupply([], MIN_TOPIC_SUPPLY);

  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      const playersRef = collection(roomRef, "players");
      const playerIds = Array.isArray(data.playerIds) ? [...data.playerIds] : [];
      playerIds.forEach((playerId) => {
        tx.delete(doc(playersRef, playerId));
      });
      tx.update(roomRef, {
        playerIds: [],
        playerCount: 0,
        hostId: null,
        hostNickname: null,
        judgeId: null,
        judgeNickname: null,
        wordDeck: [...freshWordDeck],
        topicDeck: [...freshTopicDeck],
        usedTopics: [],
        currentTopic: "",
        phase: "",
        updatedAt: serverTimestamp()
      });
    });
    await clearSubmissions(roomId);
    if (state.currentRoomId === roomId) {
      cleanupAfterLeave();
    }
    showToast("房間已重製");
  } catch (error) {
    console.error(error);
    showToast(error.message || "重製房間失敗");
  }
}


async function giveYellowCard(roomId, playerId) {
  if (!isHost()) {
    showToast("只有主持人可以發黃牌");
    return;
  }
  let shouldDrawNextTopic = false;
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const playerRef = doc(db, ROOM_COLLECTION, roomId, "players", playerId);
      const snap = await tx.get(playerRef);
      if (!snap.exists()) throw new Error("找不到該玩家");
      const data = snap.data();
      const nextCount = (data.yellowCards || 0) + 1;
      tx.update(playerRef, { yellowCards: nextCount });
      const roomUpdates = {
        judgeId: playerId,
        judgeNickname: data.nickname || null,
        updatedAt: serverTimestamp()
      };
      if (nextCount >= 3) {
        roomUpdates.phase = "finished";
      } else {
        shouldDrawNextTopic = true;
      }
      tx.update(roomRef, roomUpdates);
    });
    if (shouldDrawNextTopic) {
      await drawTopic(roomId, { force: true });
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || "發黃牌失敗");
  }
}

async function kickPlayer(roomId, playerId) {
  if (!isHost()) {
    showToast("只有房主可以移除玩家");
    return;
  }
  if (!confirm("確定要請該玩家離開房間嗎？")) return;
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      const playerIds = Array.isArray(data.playerIds) ? data.playerIds.filter((id) => id !== playerId) : [];
      const playersRef = collection(roomRef, "players");
      tx.delete(doc(playersRef, playerId));
      tx.delete(doc(collection(roomRef, "submissions"), playerId));

      const updates = {
        playerIds,
        playerCount: playerIds.length,
        updatedAt: serverTimestamp()
      };

      if (data.hostId === playerId) {
        const nextId = playerIds[0] || null;
        updates.hostId = nextId;
        if (nextId) {
          const nextSnap = await tx.get(doc(playersRef, nextId));
          updates.hostNickname = nextSnap.exists() ? nextSnap.data().nickname || null : null;
        } else {
          updates.hostNickname = null;
        }
      }

      if (data.judgeId === playerId) {
        const nextJudgeId = playerIds[0] || null;
        updates.judgeId = nextJudgeId;
        if (nextJudgeId) {
          const nextJudgeSnap = await tx.get(doc(playersRef, nextJudgeId));
          updates.judgeNickname = nextJudgeSnap.exists() ? nextJudgeSnap.data().nickname || null : null;
        } else {
          updates.judgeNickname = null;
        }
      }

      tx.update(roomRef, updates);
    });
    showToast("已請該玩家離開房間");
  } catch (error) {
    console.error(error);
    showToast(error.message || "移除玩家失敗");
  }
}
async function clearSubmissions(roomId) {
  try {
    const roomRef = doc(db, ROOM_COLLECTION, roomId);
    const submissionsRef = collection(roomRef, "submissions");
    const existing = await getDocs(submissionsRef);
    if (existing.empty) {
      return;
    }
    const submissions = existing.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    await runTransaction(db, async (tx) => {
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) return;
      const data = roomSnap.data() || {};
      const wordDeck = Array.isArray(data.wordDeck) ? [...data.wordDeck] : [];
      submissions.forEach((submission) => {
        const word = typeof submission.word === "string" ? submission.word.trim() : "";
        if (word) {
          wordDeck.push(word);
        }
        tx.delete(doc(submissionsRef, submission.id));
      });
      tx.update(roomRef, {
        wordDeck,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error(error);
  }
}



function showLobbyView() {
  if (heroEl) heroEl.classList.remove("hidden");
  if (lobbyPanel) lobbyPanel.classList.remove("hidden");
  if (roomPanel) {
    roomPanel.classList.remove("active");
    roomPanel.classList.add("hidden");
  }
}

function showRoomView() {
  if (heroEl) heroEl.classList.add("hidden");
  if (lobbyPanel) lobbyPanel.classList.add("hidden");
  if (roomPanel) {
    roomPanel.classList.remove("hidden");
    roomPanel.classList.add("active");
  }
}

if (state.viewMode === "room") {
  showRoomView();
} else {
  showLobbyView();
}


function renderLobby() {
  if (state.viewMode === "room") {
    showRoomView();
  } else {
    showLobbyView();
  }
  if (!roomGrid) return;
  roomGrid.innerHTML = "";
  if (!state.rooms.length) {
    roomGrid.innerHTML = "<p style=\"color:var(--ink-soft);\">尚未建立任何房間。</p>";
    return;
  }
  state.rooms.forEach((room) => {
    const card = document.createElement("article");
    card.className = "room-card";
    card.innerHTML = `
      <div>
        <h3>${room.name || room.id}</h3>
        <p style="margin:0;color:var(--ink-soft);font-size:.95rem;">${room.description || "黃牌破冰房"}</p>
      </div>
      <div class="room-meta">
        <span>👥 ${room.playerCount || (room.playerIds ? room.playerIds.length : 0)} / ${room.capacity || 8}</span>
        <span>👑 ${room.hostNickname || "尚未指定"}</span>
        <span>⚖️ ${room.judgeNickname || "等候中"}</span>
      </div>
      <div>
        <span class="badge">主題：破冰桌遊</span>
      </div>
    `;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary";
    button.dataset.roomId = room.id;
    const playerIds = Array.isArray(room.playerIds) ? room.playerIds : [];
    const alreadyInRoom = playerIds.includes(state.clientId);
    const capacity = room.capacity || 8;
    const currentCount = room.playerCount || playerIds.length;
    if (alreadyInRoom) {
      button.textContent = "回到此房間";
    } else if (currentCount >= capacity) {
      button.textContent = "已滿員";
      button.disabled = true;
    } else {
      button.textContent = "加入房間";
    }
    card.appendChild(button);
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "ghost";
    resetButton.dataset.resetRoomId = room.id;
    resetButton.textContent = "重製房間";
    resetButton.style.marginTop = "0.4rem";
    card.appendChild(resetButton);
    roomGrid.appendChild(card);
  });
}

function updateRoomPanel() {
  const roomData = state.currentRoomData;
  const player = state.playerMap.get(state.clientId);
  if (!state.currentRoomId || !roomData || !player) {
    if (!state.currentRoomId || !roomData) {
      btnToggleReady.disabled = true;
      btnResetReady.disabled = true;
      btnLeave.disabled = true;
    }
  }
  if (!roomData) {
    if (state.viewMode === "room") {
      showRoomView();
    } else {
      showLobbyView();
    }
    renderPlayerTable([]);
    renderTopic(null);
    renderSubmissions();
    renderHand();
    return;
  }

  if (state.viewMode === "room") {
    showRoomView();
  } else {
    showLobbyView();
  }

  const totalPlayers = state.playerList.length;
  const allReady = totalPlayers > 0 && state.playerList.every((player) => player.ready);
  const enoughPlayers = totalPlayers >= 2;
  roomNameEl.textContent = roomData.name || state.currentRoomId;
  roomCapacityEl.textContent = `${totalPlayers} / ${roomData.capacity || 8} 人在場`;
  roomJudgeEl.textContent = `裁判：${roomData.judgeNickname || "尚未指定"}`;

  btnLeave.disabled = !player;
  btnToggleReady.disabled = !player;
  btnToggleReady.textContent = player?.ready ? "取消準備" : "我準備好了";
  btnResetReady.disabled = !isHost() || !totalPlayers;
  if (btnStartGame) {
    btnStartGame.classList.toggle("hidden", !isHost());
    btnStartGame.disabled = !isHost() || !allReady || !enoughPlayers;
  }

  renderPlayerTable(state.playerList);
  renderTopic(roomData);
  renderSubmissions();
}

function renderPlayerTable(players) {
  playerTbody.innerHTML = "";
  if (!players.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.style.textAlign = "center";
    cell.style.color = "var(--ink-soft)";
    cell.style.padding = "1.2rem";
    cell.textContent = "尚未有玩家加入";
    row.appendChild(cell);
    playerTbody.appendChild(row);
    return;
  }

  players.forEach((player) => {
    const row = document.createElement("tr");
    const role = player.id === state.currentRoomData?.hostId
      ? "房主"
      : (player.id === state.currentRoomData?.judgeId ? "裁判" : "玩家");
    const status = player.ready ? "✅ 準備完成" : "⏳ 等待中";
    const handCount = typeof player.handCount === "number" ? player.handCount : 0;
    row.innerHTML = `
      <td>${player.nickname || "未命名"}${player.id === state.clientId ? "（我）" : ""}</td>
      <td>${role}</td>
      <td>${player.yellowCards || 0}</td>
      <td>${handCount}</td>
      <td>${status}</td>
      <td></td>
    `;
    const actionsCell = row.querySelector("td:last-child");
    actionsCell.className = "table-actions";

    if (player.id === state.clientId) {
      const btn = document.createElement("button");
      btn.className = "ghost";
      btn.textContent = player.ready ? "取消準備" : "我要準備";
      btn.addEventListener("click", () => toggleReady(state.currentRoomId, !player.ready));
      actionsCell.appendChild(btn);
    } else if (isHost()) {
      const yellowBtn = document.createElement("button");
      yellowBtn.className = "ghost";
      yellowBtn.textContent = "給黃牌";
      yellowBtn.addEventListener("click", () => giveYellowCard(state.currentRoomId, player.id));
      actionsCell.appendChild(yellowBtn);

      const judgeBtn = document.createElement("button");
      judgeBtn.className = "ghost";
      judgeBtn.textContent = "設為裁判";
      judgeBtn.addEventListener("click", () => manualSetJudge(player.id, player.nickname));
      actionsCell.appendChild(judgeBtn);

      const kickBtn = document.createElement("button");
      kickBtn.className = "ghost";
      kickBtn.textContent = "移出";
      kickBtn.addEventListener("click", () => kickPlayer(state.currentRoomId, player.id));
      actionsCell.appendChild(kickBtn);
    }

    playerTbody.appendChild(row);
  });
}

function renderTopic(roomData) {
  if (!roomData) {
    setTopicTemplate("");
    currentTopicEl.textContent = "尚未加入房間";
    topicRemainingEl.textContent = "剩餘題目：--";
    topicRemainingEl.className = "pill";
    return;
  }
  const topicText = roomData.currentTopic || "";
  setTopicTemplate(topicText);
  if (!topicText) {
    currentTopicEl.textContent = "尚未抽題";
  }
  const remaining = Array.isArray(roomData.topicDeck) ? roomData.topicDeck.length : 0;
  topicRemainingEl.textContent = `剩餘題目：${remaining}`;
  topicRemainingEl.className = "pill" + (remaining ? "" : " danger");
}

function renderSubmissions() {
  activityLogEl.innerHTML = "";
  if (!state.currentRoomId || !state.submissionList.length) {
    const li = document.createElement("li");
    li.className = "card";
    li.style.color = "var(--ink-soft)";
    li.textContent = "目前尚無投稿";
    activityLogEl.appendChild(li);
    return;
  }

  state.submissionList.forEach((submission) => {
    const player = state.playerMap.get(submission.playerId);
    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `
      <span class="meta-title">${submission.nickname || player?.nickname || "匿名"}</span>
      <span>${submission.word || "(未填寫)"}</span>
    `;
    if (isHost()) {
      const button = document.createElement("button");
      button.className = "ghost";
      button.style.marginTop = ".35rem";
      button.textContent = "給這位玩家黃牌";
      button.addEventListener("click", () => giveYellowCard(state.currentRoomId, submission.playerId));
      li.appendChild(button);
    }
    activityLogEl.appendChild(li);
  });
}

function renderHand() {
  if (!handCard) return;
  const inRoom = !!state.currentRoomId;
  const phase = state.currentRoomData?.phase;
  const inGame = phase === "in_game";
  const shouldShow = inRoom && inGame;
  if (!shouldShow) {
    state.discardMode = false;
    state.pendingDiscard = state.pendingDiscard || 0;
  }
  handCard.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) {
    handCountEl.textContent = "0 張";
    handListEl.innerHTML = "";
    handEmptyEl.classList.remove("hidden");
    updateDiscardUI();
    return;
  }

  syncTopicAssignmentsWithHand();

  state.discardMode = state.discardMode && state.pendingDiscard > 0;
  const hasHand = Array.isArray(state.myHand) && state.myHand.length > 0;
  handCountEl.textContent = `${state.myHand.length} 張`;
  handEmptyEl.classList.toggle("hidden", hasHand);
  handListEl.innerHTML = "";
  updateDiscardUI();

  if (!hasHand) return;
  state.myHand.forEach((word, index) => {
    const li = document.createElement("li");
    li.className = "card";
    const handKey = `${index}:${word}`;
    li.dataset.handKey = handKey;
    li.dataset.handIndex = String(index);
    li.dataset.word = word;
    li.textContent = word;
    li.addEventListener("click", handleHandCardClick);
    if (state.usedHandKeys.has(handKey)) {
      markHandCardUsed(li, true);
    }
    if (state.discardMode) {
      li.classList.add("discard-mode");
    }
    handListEl.appendChild(li);
  });
}

function markHandCardUsed(element, used) {
  if (!element) return;
  if (used) {
    element.dataset.used = "true";
    element.style.opacity = "0.55";
    element.style.pointerEvents = "none";
  } else {
    delete element.dataset.used;
    element.style.opacity = "";
    element.style.pointerEvents = "";
  }
}

function updateDiscardUI() {
  if (!discardToolbar || !discardStatusEl || !btnToggleDiscard) return;
  const needDiscard = state.pendingDiscard > 0;
  const active = state.discardMode && needDiscard;
  const shouldShow = needDiscard || state.discardMode;
  discardToolbar.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) {
    discardStatusEl.textContent = "目前無需棄牌";
    btnToggleDiscard.textContent = "選擇棄牌";
    btnToggleDiscard.disabled = true;
    return;
  }
  if (needDiscard) {
    discardStatusEl.textContent = active
      ? `請再棄掉 ${state.pendingDiscard} 張`
      : `需棄牌 ${state.pendingDiscard} 張`;
    btnToggleDiscard.disabled = false;
    btnToggleDiscard.textContent = active ? "退出棄牌" : "開始棄牌";
  } else {
    discardStatusEl.textContent = "棄牌完成";
    btnToggleDiscard.disabled = true;
    btnToggleDiscard.textContent = "開始棄牌";
  }
}

async function discardSelectedCard(element) {
  if (!state.currentRoomId) return;
  if (state.pendingDiscard <= 0) {
    state.discardMode = false;
    updateDiscardUI();
    return;
  }
  const index = Number(element.dataset.handIndex);
  if (Number.isNaN(index)) return;
  let result = null;
  try {
    result = await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, state.currentRoomId);
      const playerRef = doc(roomRef, "players", state.clientId);
      const playerSnap = await tx.get(playerRef);
      if (!playerSnap.exists()) throw new Error("找不到玩家資料");
      const playerData = playerSnap.data() || {};
      const hand = Array.isArray(playerData.hand) ? [...playerData.hand] : [];
      if (index < 0 || index >= hand.length) throw new Error("無法棄牌，手牌不同步");
      const [removedCard] = hand.splice(index, 1);
      const nextPending = Math.max(0, (playerData.pendingDiscard || 0) - 1);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const roomData = roomSnap.data() || {};
      let wordDeck = Array.isArray(roomData.wordDeck) ? [...roomData.wordDeck] : [];
      if (removedCard) {
        wordDeck.push(removedCard);
      }
      tx.update(playerRef, {
        hand,
        pendingDiscard: nextPending,
        lastActive: serverTimestamp()
      });
      tx.update(roomRef, {
        wordDeck,
        updatedAt: serverTimestamp()
      });
      return { hand, nextPending };
    });
  } catch (error) {
    console.error(error);
    showToast(error.message || "棄牌失敗");
    return;
  }
  state.myHand = Array.isArray(result?.hand) ? result.hand : [];
  state.pendingDiscard = result?.nextPending ?? 0;
  state.discardMode = state.pendingDiscard > 0;
  if (Array.isArray(state.topicFillValues) && state.topicFillValues.length) {
    state.topicFillValues = state.topicFillValues.map(() => "");
  }
  state.topicAssignments = new Map();
  state.usedHandKeys = new Set();
  updateTopicDisplay();
  renderHand();
  updateDiscardUI();
  if (state.pendingDiscard > 0) {
    showToast(`還需棄牌 ${state.pendingDiscard} 張`);
  } else {
    showToast("棄牌完成");
  }
}

function syncTopicAssignmentsWithHand() {
  if (!Array.isArray(state.myHand)) {
    state.usedHandKeys = new Set();
    state.topicAssignments = new Map();
    state.topicFillValues = [];
    return;
  }
  if (!Array.isArray(state.topicFillValues) || !state.topicFillValues.length) {
    state.topicAssignments = new Map();
    state.usedHandKeys = new Set();
    return;
  }
  const availableKeys = new Set(state.myHand.map((word, index) => `${index}:${word}`));
  let changed = false;
  const nextAssignments = new Map();
  state.topicAssignments.forEach((assignment, blankIndex) => {
    if (assignment && availableKeys.has(assignment.handKey)) {
      nextAssignments.set(blankIndex, assignment);
    } else {
      state.topicFillValues[blankIndex] = "";
      changed = true;
    }
  });
  state.topicAssignments = nextAssignments;
  state.usedHandKeys = new Set(Array.from(nextAssignments.values(), (entry) => entry.handKey));
  if (changed) {
    updateTopicDisplay();
  }
}

function handleHandCardClick(event) {
  const item = event.target.closest("li.card");
  if (!item || !item.dataset.handKey) return;
  if (state.discardMode) {
    discardSelectedCard(item);
    return;
  }
  const handKey = item.dataset.handKey;
  if (state.usedHandKeys.has(handKey)) {
    showToast("這張黃卡已經使用過");
    return;
  }
  const blankIndex = findNextBlankIndex();
  if (blankIndex === -1) {
    showToast("題目沒有空格可以填了");
    return;
  }
  const word = item.dataset.word || item.textContent || "";
  state.topicFillValues[blankIndex] = word;
  state.topicAssignments.set(blankIndex, { handKey, word });
  state.usedHandKeys.add(handKey);
  markHandCardUsed(item, true);
  updateTopicDisplay();
}

function handleTopicBlankClick(event) {
  const blankEl = event.target.closest("span.topic-blank");
  if (!blankEl) return;
  const index = Number(blankEl.dataset.blankIndex);
  if (Number.isNaN(index)) return;
  const assignment = state.topicAssignments.get(index);
  state.topicAssignments.delete(index);
  state.topicFillValues[index] = "";
  if (assignment && assignment.handKey) {
    state.usedHandKeys.delete(assignment.handKey);
    const cardEl = handListEl?.querySelector(`li.card[data-hand-key=\"${assignment.handKey}\"]`);
    if (cardEl) {
      markHandCardUsed(cardEl, false);
    }
  }
  updateTopicDisplay();
}

function findNextBlankIndex() {
  if (!Array.isArray(state.topicFillValues) || !state.topicFillValues.length) return -1;
  return state.topicFillValues.findIndex((value) => !value);
}

function updateTopicDisplay() {
  if (!currentTopicEl) return;
  const segments = Array.isArray(state.topicSegments) ? state.topicSegments : [];
  const fills = Array.isArray(state.topicFillValues) ? state.topicFillValues : [];
  if (!segments.length) {
    currentTopicEl.textContent = state.topicTemplate || "尚未抽題";
    return;
  }
  currentTopicEl.innerHTML = "";
  segments.forEach((segment, index) => {
    if (segment) currentTopicEl.appendChild(document.createTextNode(segment));
    if (index < fills.length) {
      const span = document.createElement("span");
      const value = fills[index] || "______";
      span.className = "topic-blank" + (fills[index] ? " filled" : "");
      span.dataset.blankIndex = String(index);
      span.textContent = value;
      currentTopicEl.appendChild(span);
    }
  });
  refreshTopicBlankElements();
}

function setTopicTemplate(rawTopic) {
  if (typeof rawTopic !== "string" || !rawTopic.length) {
    state.topicTemplate = "";
    state.topicSegments = [];
    state.topicFillValues = [];
    state.topicAssignments = new Map();
    state.usedHandKeys = new Set();
    updateTopicDisplay();
    renderHand();
    return;
  }
  if (rawTopic === state.topicTemplate) {
    updateTopicDisplay();
    renderHand();
    return;
  }
  state.topicTemplate = rawTopic;
  const blankRegex = /_{2,}/g;
  let matchBlanks;
  let lastIndex = 0;
  const segments = [];
  const fillValues = [];
  while ((matchBlanks = blankRegex.exec(rawTopic))) {
    segments.push(rawTopic.slice(lastIndex, matchBlanks.index));
    fillValues.push("");
    lastIndex = matchBlanks.index + matchBlanks[0].length;
  }
  segments.push(rawTopic.slice(lastIndex));
  state.topicSegments = segments;
  state.topicFillValues = fillValues;
  state.topicAssignments = new Map();
  state.usedHandKeys = new Set();
  updateTopicDisplay();
  renderHand();
}

function refreshTopicBlankElements() {
  const blanks = currentTopicEl?.querySelectorAll("span.topic-blank");
  if (!blanks) return;
  blanks.forEach((span) => {
    span.removeEventListener("click", handleTopicBlankClick);
    span.addEventListener("click", handleTopicBlankClick);
  });
}

function manualSetJudge(playerId, nickname) {
  if (!isHost()) {
    showToast("只有房主可以指定裁判");
    return;
  }
  runTransaction(db, async (tx) => {
    const roomRef = doc(db, ROOM_COLLECTION, state.currentRoomId);
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists()) throw new Error("房間不存在");
    tx.update(roomRef, {
      judgeId: playerId,
      judgeNickname: nickname || null,
      updatedAt: serverTimestamp()
    });
  }).catch((error) => {
    console.error(error);
    showToast(error.message || "指定裁判失敗");
  });
}

function openJoinDialog(roomId, roomName) {
  state.pendingJoinRoomId = roomId;
  if (joinRoomNameEl) joinRoomNameEl.textContent = roomName || roomId;
  if (nicknameInput) nicknameInput.value = state.nickname;
  if (nicknameErrorEl) nicknameErrorEl.style.display = "none";
  joinDialog?.classList.remove("hidden");
  setTimeout(() => nicknameInput?.focus(), 50);
}

function closeJoinDialog() {
  state.pendingJoinRoomId = null;
  joinDialog?.classList.add("hidden");
}

function isHost() {
  return state.currentRoomData && state.currentRoomData.hostId === state.clientId;
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }
  state.toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3200);
}

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (joinDialog && !joinDialog.classList.contains("hidden")) {
      closeJoinDialog();
    }
    if (deckDialog && !deckDialog.classList.contains("hidden")) {
      closeDeckManager();
    }
  }
});

window.addEventListener("beforeunload", () => {
  if (state.roomsUnsub) state.roomsUnsub();
  unsubscribeRoomStreams();
});








