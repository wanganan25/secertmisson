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
  arrayUnion
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
const btnDrawTopic = document.getElementById("btn-draw-topic");
const btnPassJudge = document.getElementById("btn-pass-judge");
const topicRemainingEl = document.getElementById("topic-remaining");
const currentTopicEl = document.getElementById("current-topic");
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
const handEmptyEl = document.getElementById("hand-empty");\nconst supplyWordInput = document.getElementById("input-new-word");\nconst supplyTopicInput = document.getElementById("input-new-topic");\nconst btnAddWord = document.getElementById("btn-add-word");\nconst btnAddTopic = document.getElementById("btn-add-topic");

btnBack.addEventListener("click", () => {
  state.viewMode = "lobby";
  showLobbyView();
  lobbyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

btnLeave.addEventListener("click", () => {
  if (!state.currentRoomId) return;
  leaveRoom(state.currentRoomId);
});

btnToggleReady.addEventListener("click", () => {
  const player = state.playerMap.get(state.clientId);
  if (!state.currentRoomId || !player) {
    showToast("尚未加入任何房間");
    return;
  }
  toggleReady(state.currentRoomId, !player.ready);
});

btnResetReady.addEventListener("click", () => {
  if (!state.currentRoomId) return;
  resetReadyState(state.currentRoomId);
});

btnStartGame?.addEventListener("click", startGame);

btnDrawTopic.addEventListener("click", () => {
  if (!state.currentRoomId) return;
  drawTopic(state.currentRoomId);
});

btnPassJudge.addEventListener("click", () => {
  if (!state.currentRoomId) return;
  passJudge(state.currentRoomId);
});

btnAddWord?.addEventListener("click", handleAddWord);
btnAddTopic?.addEventListener("click", handleAddTopic);

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

function handleAddWord() {
  const value = (supplyWordInput?.value || "").trim();
  if (!value) {
    showToast("請先輸入黃卡字詞");
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
    showToast("請先輸入紫卡句子");
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

roomGrid.addEventListener("click", (event) => {
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

btnConfirmJoin.addEventListener("click", confirmJoin);
btnCancelJoin.addEventListener("click", closeJoinDialog);
nicknameInput.addEventListener("keydown", (event) => {
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
        handCount: hand.length
      };
      if (docSnap.id === state.clientId) {
        state.myHand = hand;
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
  renderHand();
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

      const existing = await getDocs(playersRef);
      const nameUsage = new Map();
      const suffixPattern = /(?:（|\()(\d+)(?:）|\))$/;
      existing.forEach((docSnap) => {
        const info = docSnap.data() || {};
        const nick = info.nickname || "";
        if (!nick) return;
        const base = nick.replace(suffixPattern, "");
        const match = nick.match(suffixPattern);
        const next = match ? Number(match[1]) + 1 : 2;
        const current = nameUsage.get(base) || 1;
        if (next > current) {
          nameUsage.set(base, next);
        } else if (!nameUsage.has(base)) {
          nameUsage.set(base, current);
        }
      });
      if (nameUsage.has(baseNickname)) {
        const index = nameUsage.get(baseNickname);
        finalNickname = `${baseNickname}（${index}）`;
        nameUsage.set(baseNickname, index + 1);
      } else {
        finalNickname = baseNickname;
        nameUsage.set(baseNickname, 2);
      }

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
  localStorage.removeItem("yellow-card-active-room");
  showLobbyView();
  renderLobby();
  renderHand();
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

async function drawTopic(roomId) {
  if (!isHost()) {
    showToast("只有房主可以抽題目");
    return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      let deck = Array.isArray(data.topicDeck) ? [...data.topicDeck] : [];
      let used = Array.isArray(data.usedTopics) ? [...data.usedTopics] : [];
      if (!deck.length) {
        if (!used.length) {
          deck = ensureTopicSupply([], 20);
        } else {
          deck = ensureTopicSupply([...used], 20);
          used = [];
        }
      }
      if (!deck.length) throw new Error("題庫已空，請先補充題目");
      const topic = deck.shift();
      used.push(topic);
      tx.update(roomRef, {
        topicDeck: deck,
        usedTopics: used,
        currentTopic: topic,
        phase: "playing",
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error(error);
    showToast(error.message || "抽題目失敗");
  }
}

async function passJudge(roomId) {
  if (!isHost()) {
    showToast("只有房主可以指定裁判");
    return;
  }
  if (!state.playerList.length) {
    showToast("房間內目前沒有玩家");
    return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      const ordered = state.playerList;
      const currentIndex = ordered.findIndex((player) => player.id === data.judgeId);
      const nextPlayer = currentIndex >= 0 ? ordered[(currentIndex + 1) % ordered.length] : ordered[0];
      tx.update(roomRef, {
        judgeId: nextPlayer.id,
        judgeNickname: nextPlayer.nickname || null,
        updatedAt: serverTimestamp()
      });
    });
    showToast("已指定下一位裁判");
  } catch (error) {
    console.error(error);
    showToast(error.message || "指定裁判失敗");
  }
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
    state.viewMode = "room";
    showRoomView();
    showToast("遊戲開始！已指派裁判並補滿手牌");
  } catch (error) {
    console.error(error);
    showToast(error.message || "開始遊戲失敗");
  }
}



async function giveYellowCard(roomId, playerId) {
  if (!isHost()) {
    showToast("只有房主可以給黃牌");
    return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, ROOM_COLLECTION, roomId);
      const playerRef = doc(db, ROOM_COLLECTION, roomId, "players", playerId);
      const snap = await tx.get(playerRef);
      if (!snap.exists()) throw new Error("找不到玩家");
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
      }
      tx.update(roomRef, roomUpdates);
    });
  } catch (error) {
    console.error(error);
    showToast(error.message || "給黃牌失敗");
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
    const submissionsRef = collection(doc(db, ROOM_COLLECTION, roomId), "submissions");
    const existing = await getDocs(submissionsRef);
    const removals = existing.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(removals);
  } catch (error) {
    console.error(error);
  }
}



function showLobbyView() {
  heroEl?.classList.remove("hidden");
  lobbyPanel?.classList.remove("hidden");
  roomPanel.classList.remove("active");
}

function showRoomView() {
  heroEl?.classList.add("hidden");
  lobbyPanel?.classList.add("hidden");
  roomPanel.classList.add("active");
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
      btnDrawTopic.disabled = true;
      btnPassJudge.disabled = true;
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
  btnDrawTopic.disabled = !isHost();
  btnPassJudge.disabled = !isHost() || totalPlayers === 0;
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
    currentTopicEl.textContent = "尚未加入房間";
    topicRemainingEl.textContent = "剩餘題目：--";
    topicRemainingEl.className = "pill";
    return;
  }
  currentTopicEl.textContent = roomData.currentTopic || "尚未抽題目";
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
  handCard.classList.toggle("hidden", !inRoom);
  if (!inRoom) {
    handCountEl.textContent = "0 張";
    handListEl.innerHTML = "";
    handEmptyEl.classList.remove("hidden");
    return;
  }

  const hasHand = Array.isArray(state.myHand) && state.myHand.length > 0;
  handCountEl.textContent = `${state.myHand.length} 張`;
  handEmptyEl.classList.toggle("hidden", hasHand);
  handListEl.innerHTML = "";

  if (!hasHand) return;
  state.myHand.forEach((word) => {
    const li = document.createElement("li");
    li.className = "card";
    li.textContent = word;
    handListEl.appendChild(li);
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
  joinRoomNameEl.textContent = roomName;
  nicknameInput.value = state.nickname;
  nicknameErrorEl.style.display = "none";
  joinDialog.classList.remove("hidden");
  setTimeout(() => nicknameInput.focus(), 50);
}

function closeJoinDialog() {
  state.pendingJoinRoomId = null;
  joinDialog.classList.add("hidden");
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
  if (event.key === "Escape" && !joinDialog.classList.contains("hidden")) {
    closeJoinDialog();
  }
});

window.addEventListener("beforeunload", () => {
  if (state.roomsUnsub) state.roomsUnsub();
  unsubscribeRoomStreams();
});








